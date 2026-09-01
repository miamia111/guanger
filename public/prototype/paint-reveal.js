const canvas = document.querySelector('#paintCanvas');
const loadingLabel = document.querySelector('#loadingLabel');
const replayButton = document.querySelector('#replay');
const progressBar = document.querySelector('#progressBar');
const statusText = document.querySelector('#statusText');
const artStage = document.querySelector('.art-stage');
const artworkTitle = document.querySelector('#artworkTitle');
const artistName = document.querySelector('#artistName');
const chapterLabel = document.querySelector('#chapterLabel');
const homeMode = document.querySelector('#homeMode');
const rabbitMode = document.querySelector('#rabbitMode');

const ctx = canvas.getContext('2d', { alpha: false });
const mask = document.createElement('canvas');
const maskCtx = mask.getContext('2d');
const painted = document.createElement('canvas');
const paintedCtx = painted.getContext('2d');
const relief = document.createElement('canvas');
const reliefCtx = relief.getContext('2d');

let animationFrame = 0;
let runId = 0;

const loadImage = (source) => new Promise((resolve, reject) => {
  const image = new Image();
  image.decoding = 'async';
  image.addEventListener('load', () => resolve(image));
  image.addEventListener('error', reject);
  image.src = source;
});

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const easePaint = (t) => 1 - Math.pow(1 - t, 2.4);

const requestedArtwork = new URLSearchParams(location.search).get('art') === 'rabbit' ? 'rabbit' : 'home';
const artworkConfig = requestedArtwork === 'home' ? {
  key: 'home',
  source: '../artworks/chen-temple-home-1080.webp',
  title: '庙埕午后',
  artist: '陈致远',
  chapter: '首页主视觉',
  ratio: 1080 / 931,
} : {
  key: 'rabbit',
  source: '../artworks/wu-rabbit-large.webp',
  title: '白兔',
  artist: '吴偲',
  chapter: '各自成章',
  ratio: 1445 / 1800,
};

artStage.style.setProperty('--stage-padding', `${100 / artworkConfig.ratio}%`);
artworkTitle.textContent = artworkConfig.title;
artistName.textContent = artworkConfig.artist;
chapterLabel.textContent = artworkConfig.chapter;
homeMode.classList.toggle('is-active', artworkConfig.key === 'home');
rabbitMode.classList.toggle('is-active', artworkConfig.key === 'rabbit');

const [artwork, impastoBrush, dryBrush, impastoRelief, dryRelief] = await Promise.all([
  loadImage(artworkConfig.source),
  loadImage('./brush-impasto.webp'),
  loadImage('./brush-dry.webp'),
  loadImage('./brush-impasto-relief.webp'),
  loadImage('./brush-dry-relief.webp'),
]);

function sizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 1.55);
  const bounds = canvas.getBoundingClientRect();
  canvas.width = Math.round(bounds.width * ratio);
  canvas.height = Math.round(bounds.height * ratio);
  mask.width = painted.width = canvas.width;
  mask.height = painted.height = canvas.height;
  relief.width = canvas.width;
  relief.height = canvas.height;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function buildBrushMarks(width, height) {
  const random = seededRandom(271828);
  const marks = [];
  const isLandscape = artworkConfig.key === 'home';
  const broadCount = isLandscape ? 12 : 18;
  const broadBands = isLandscape ? 5 : 6;

  // Broad, loosely placed background strokes. Their positions intentionally
  // avoid a grid so the reveal feels composed by hand rather than scanned.
  for (let index = 0; index < broadCount; index += 1) {
    const band = index % broadBands;
    const flip = random() > .56;
    const markWidth = width * (.98 + random() * .42);
    const x = flip ? width * (.94 + random() * .10) : width * (-.16 + random() * .12);
    const y = height * (.03 + band * (isLandscape ? .235 : .19) + (random() - .5) * (isLandscape ? .16 : .13));
    const usesDryBrush = index % 4 === 0;
    marks.push({
      brush: usesDryBrush ? dryBrush : impastoBrush,
      relief: usesDryBrush ? dryRelief : impastoRelief,
      x,
      y,
      width: markWidth,
      height: height * (isLandscape ? (.255 + random() * .16) : (.16 + random() * .12)),
      rotation: (random() - .5) * .42,
      flip,
      opacity: .68 + random() * .27,
      start: index * (isLandscape ? .032 : .023) + random() * .045,
      duration: (isLandscape ? .36 : .30) + random() * .16,
    });
  }

  // Landscape canvases need an early middle bridge. Without it, the large
  // top and bottom passes can read as two separate islands while the centre
  // waits for the later architectural marks. These two wide, overlapping
  // deposits cross that seam without bringing back a swarm of small strokes.
  if (isLandscape) {
    [
      [.16, .43, 1.02, .38, -.08, .11, false],
      [.86, .58, 1.04, .40,  .07, .19, true],
    ].forEach(([nx, ny, nw, nh, rotation, start, flip], index) => {
      marks.push({
        brush: index === 0 ? impastoBrush : dryBrush,
        relief: index === 0 ? impastoRelief : dryRelief,
        x: nx * width,
        y: ny * height,
        width: nw * width,
        height: nh * height,
        rotation,
        flip,
        opacity: .84,
        start,
        duration: .39,
      });
    });
  }

  // Curated marks follow the rabbit's anatomy: ears, forehead, muzzle,
  // chest and body. This breaks the mechanical horizontal rhythm.
  const rabbitSubject = [
    [.31,.06,.13,.48,-1.28,.38], [.42,.04,.12,.44,-1.18,.42],
    [.38,.25,.34,.14,-.18,.46], [.53,.28,.28,.12,.08,.49],
    [.46,.38,.31,.14,.62,.53], [.39,.46,.32,.15,1.02,.56],
    [.34,.61,.42,.19,1.10,.60], [.42,.78,.48,.20,.22,.66],
  ];
  const templeSubject = [
    [.06,.16,.58,.23,.08,.27], [.39,.12,.56,.24,-.12,.31],
    [.49,.28,.48,.24,1.18,.36], [.27,.46,.61,.25,-.08,.41],
    [.12,.66,.76,.28,.16,.48], [.31,.83,.78,.27,-.06,.56],
  ];
  const subject = artworkConfig.key === 'home' ? templeSubject : rabbitSubject;
  subject.forEach(([nx, ny, nw, nh, rotation, start], index) => {
    const usesImpastoBrush = index % 3 === 0;
    marks.push({
    brush: usesImpastoBrush ? impastoBrush : dryBrush,
    relief: usesImpastoBrush ? impastoRelief : dryRelief,
    x: nx * width,
    y: ny * height,
    width: nw * width,
    height: nh * height,
    rotation,
    flip: index % 2 === 0,
    opacity: .88,
    start,
    duration: .22 + (index % 3) * .035,
  });
  });

  // A few dry-brush accents articulate edges without turning the reveal into
  // a cloud of small electronic-looking marks.
  const accentCount = isLandscape ? 3 : 7;
  for (let index = 0; index < accentCount; index += 1) {
    marks.push({
      brush: dryBrush,
      relief: dryRelief,
      x: width * (-.04 + random() * .92),
      y: height * (.03 + random() * .94),
      width: width * (isLandscape ? (.46 + random() * .30) : (.32 + random() * .30)),
      height: height * (isLandscape ? (.13 + random() * .10) : (.07 + random() * .075)),
      rotation: (random() - .5) * 1.7,
      flip: random() > .5,
      opacity: .62 + random() * .28,
      start: .58 + random() * .19,
      duration: .18 + random() * .14,
    });
  }

  // Five broad closing passes deliberately cover both edges and replace the
  // previous last-frame full-image jump. Alternate direction like a painter
  // working back and forth across the canvas.
  const closingRows = isLandscape ? [0.13, 0.40, 0.68, 0.92] : [0.10, 0.31, 0.52, 0.73, 0.92];
  closingRows.forEach((ny, index) => {
    const flip = index % 2 === 1;
    marks.push({
      brush: index === 4 ? dryBrush : impastoBrush,
      relief: index === 4 ? dryRelief : impastoRelief,
      x: flip ? width * 1.07 : width * -.13,
      y: height * ny,
      width: width * 1.28,
      height: height * (isLandscape ? (index === closingRows.length - 1 ? .25 : .34) : (index === 4 ? .17 : .24)),
      rotation: (index - 2) * .035,
      flip,
      opacity: .90,
      start: .70 + index * (isLandscape ? .06 : .045),
      duration: isLandscape ? .30 : .24,
    });
  });
  return marks.sort((a, b) => a.start - b.start);
}

function paintMark(mark, progress) {
  if (progress <= 0) return;
  const reveal = easePaint(progress);
  maskCtx.save();
  maskCtx.translate(mark.x, mark.y);
  maskCtx.rotate(mark.rotation);
  if (mark.flip) maskCtx.scale(-1, 1);
  // The artwork colour must remain exact inside a deposited stroke. Brush
  // alpha supplies the ragged edge; an extra global opacity would mix the
  // painting with the beige canvas and make every colour look washed out.
  maskCtx.globalAlpha = 1;
  maskCtx.beginPath();
  maskCtx.rect(0, -mark.height / 2, mark.width * reveal, mark.height);
  maskCtx.clip();
  maskCtx.drawImage(mark.brush, 0, -mark.height / 2, mark.width, mark.height);
  maskCtx.restore();

  // Preserve the brush photograph itself on a separate relief layer. The
  // mask reveals colour; this layer contributes ridges, grooves and raised
  // edges without permanently recolouring the finished artwork.
  reliefCtx.save();
  reliefCtx.translate(mark.x, mark.y);
  reliefCtx.rotate(mark.rotation);
  reliefCtx.globalAlpha = mark.opacity * (.72 + reveal * .28);
  const reliefX = mark.flip ? -mark.width : 0;
  const reliefClipX = mark.flip ? -mark.width * reveal : 0;
  reliefCtx.beginPath();
  reliefCtx.rect(reliefClipX, -mark.height / 2, mark.width * reveal, mark.height);
  reliefCtx.clip();
  reliefCtx.drawImage(mark.relief, reliefX, -mark.height / 2, mark.width, mark.height);
  reliefCtx.restore();
}

function artworkRect(width, height) {
  const imageRatio = artwork.width / artwork.height;
  const canvasRatio = width / height;
  if (imageRatio > canvasRatio) {
    const drawWidth = height * imageRatio;
    return { x: (width - drawWidth) / 2, y: 0, width: drawWidth, height };
  }
  const drawHeight = width / imageRatio;
  return { x: 0, y: (height - drawHeight) / 2, width, height: drawHeight };
}

function composite(finalOpacity = 0) {
  const width = canvas.width;
  const height = canvas.height;
  const rect = artworkRect(width, height);
  paintedCtx.clearRect(0, 0, width, height);
  paintedCtx.drawImage(artwork, rect.x, rect.y, rect.width, rect.height);
  paintedCtx.globalCompositeOperation = 'destination-in';
  paintedCtx.drawImage(mask, 0, 0);
  paintedCtx.globalCompositeOperation = 'source-over';

  ctx.fillStyle = '#d9d2c7';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(painted, 0, 0);

  if (finalOpacity > 0) {
    ctx.globalAlpha = finalOpacity;
    ctx.drawImage(artwork, rect.x, rect.y, rect.width, rect.height);
    ctx.globalAlpha = 1;
  }

  // Contact shadow under each deposited stroke. This makes later strokes
  // appear to sit physically above earlier layers.
  const reliefStrength = 1 - finalOpacity * .72;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = .34 * reliefStrength;
  ctx.filter = 'blur(1.6px) brightness(.54) contrast(1.5)';
  ctx.translate(0, Math.max(1.5, height * .0035));
  ctx.drawImage(relief, 0, 0);
  ctx.restore();

  // The generated emboss map is neutral grey: overlay mode turns values above
  // 128 into highlights and values below 128 into grooves without adding a
  // white veil or changing the artwork's hue.
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = .82 * reliefStrength;
  ctx.filter = 'contrast(1.55)';
  ctx.drawImage(relief, 0, 0);
  ctx.restore();
}

function updateStatus(progress) {
  if (progress < .42) statusText.textContent = '宽刮刀铺陈背景';
  else if (progress < .76) statusText.textContent = artworkConfig.key === 'home' ? '结构笔触显露建筑' : '干刷笔触塑造白兔';
  else if (progress < .98) statusText.textContent = '断色与毛边补充细节';
  else statusText.textContent = '作品完成';
  progressBar.style.width = `${Math.round(progress * 100)}%`;
}

function play() {
  cancelAnimationFrame(animationFrame);
  const currentRun = ++runId;
  maskCtx.clearRect(0, 0, mask.width, mask.height);
  reliefCtx.clearRect(0, 0, relief.width, relief.height);
  const marks = buildBrushMarks(canvas.width, canvas.height);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = reduceMotion ? 1 : 2350;
  const startTime = performance.now();

  function frame(now) {
    if (currentRun !== runId) return;
    const progress = clamp((now - startTime) / duration);
    maskCtx.clearRect(0, 0, mask.width, mask.height);
    reliefCtx.clearRect(0, 0, relief.width, relief.height);
    marks.forEach((mark) => paintMark(mark, clamp((progress - mark.start) / mark.duration)));
    // Broad passes complete the visual painting first; the last 200-250 ms
    // then settle smoothly to the exact, fully opaque source artwork. Because
    // the canvas is already almost covered, this reads as drying/clarifying
    // rather than a separate electronic final frame.
    const finalOpacity = easePaint(clamp((progress - .90) / .10));
    composite(finalOpacity);
    updateStatus(progress);
    if (progress < 1) animationFrame = requestAnimationFrame(frame);
  }
  animationFrame = requestAnimationFrame(frame);
}

sizeCanvas();
loadingLabel.classList.add('is-hidden');
play();
replayButton.addEventListener('click', play);

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    sizeCanvas();
    play();
  }, 120);
});
