const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const easePaint = (t) => 1 - Math.pow(1 - t, 2.4);

function loadImage(source, retries = 2) {
  return new Promise((resolve, reject) => {
    const attempt = (remaining) => {
      const image = new Image();
      image.decoding = 'async';
      image.addEventListener('load', () => resolve(image), { once: true });
      image.addEventListener('error', (error) => {
        if (remaining <= 0) {
          reject(error);
          return;
        }
        setTimeout(() => attempt(remaining - 1), (retries - remaining + 1) * 700);
      }, { once: true });
      image.src = source;
    };
    attempt(retries);
  });
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function artworkRect(image, width, height, fit = 'cover') {
  const imageRatio = image.width / image.height;
  const canvasRatio = width / height;
  if (fit === 'contain') {
    if (imageRatio > canvasRatio) {
      const drawHeight = width / imageRatio;
      return { x: 0, y: (height - drawHeight) / 2, width, height: drawHeight };
    }
    const drawWidth = height * imageRatio;
    return { x: (width - drawWidth) / 2, y: 0, width: drawWidth, height };
  }
  if (imageRatio > canvasRatio) {
    const drawWidth = height * imageRatio;
    return { x: (width - drawWidth) / 2, y: 0, width: drawWidth, height };
  }
  const drawHeight = width / imageRatio;
  return { x: 0, y: (height - drawHeight) / 2, width, height: drawHeight };
}

function buildLandscapeMarks(width, height, brushes) {
  const { impasto, dry, impastoRelief, dryRelief } = brushes;
  const random = seededRandom(271828);
  const marks = [];

  for (let index = 0; index < 12; index += 1) {
    const band = index % 5;
    const flip = random() > .56;
    const usesDryBrush = index % 4 === 0;
    marks.push({
      brush: usesDryBrush ? dry : impasto,
      relief: usesDryBrush ? dryRelief : impastoRelief,
      x: flip ? width * (.94 + random() * .10) : width * (-.16 + random() * .12),
      y: height * (.03 + band * .235 + (random() - .5) * .16),
      width: width * (.98 + random() * .42),
      height: height * (.255 + random() * .16),
      rotation: (random() - .5) * .42,
      flip,
      opacity: .68 + random() * .27,
      start: index * .032 + random() * .045,
      duration: .36 + random() * .16,
    });
  }

  [
    [.16, .43, 1.02, .38, -.08, .11, false],
    [.86, .58, 1.04, .40, .07, .19, true],
  ].forEach(([nx, ny, nw, nh, rotation, start, flip], index) => {
    marks.push({
      brush: index === 0 ? impasto : dry,
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

  const subject = [
    [.06,.16,.58,.23,.08,.27], [.39,.12,.56,.24,-.12,.31],
    [.49,.28,.48,.24,1.18,.36], [.27,.46,.61,.25,-.08,.41],
    [.12,.66,.76,.28,.16,.48], [.31,.83,.78,.27,-.06,.56],
  ];
  subject.forEach(([nx, ny, nw, nh, rotation, start], index) => {
    const usesImpasto = index % 3 === 0;
    marks.push({
      brush: usesImpasto ? impasto : dry,
      relief: usesImpasto ? impastoRelief : dryRelief,
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

  for (let index = 0; index < 3; index += 1) {
    marks.push({
      brush: dry,
      relief: dryRelief,
      x: width * (-.04 + random() * .92),
      y: height * (.03 + random() * .94),
      width: width * (.46 + random() * .30),
      height: height * (.13 + random() * .10),
      rotation: (random() - .5) * 1.7,
      flip: random() > .5,
      opacity: .62 + random() * .28,
      start: .58 + random() * .19,
      duration: .18 + random() * .14,
    });
  }

  [0.13, 0.40, 0.68, 0.92].forEach((ny, index, rows) => {
    const flip = index % 2 === 1;
    marks.push({
      brush: impasto,
      relief: impastoRelief,
      x: flip ? width * 1.07 : width * -.13,
      y: height * ny,
      width: width * 1.28,
      height: height * (index === rows.length - 1 ? .25 : .34),
      rotation: (index - 2) * .035,
      flip,
      opacity: .90,
      start: .70 + index * .06,
      duration: .30,
    });
  });

  return marks.sort((a, b) => a.start - b.start);
}

function buildPortraitMarks(width, height, brushes) {
  const { impasto, dry, impastoRelief, dryRelief } = brushes;
  const random = seededRandom(271828);
  const marks = [];

  for (let index = 0; index < 18; index += 1) {
    const band = index % 6;
    const flip = random() > .56;
    const usesDryBrush = index % 4 === 0;
    marks.push({
      brush: usesDryBrush ? dry : impasto,
      relief: usesDryBrush ? dryRelief : impastoRelief,
      x: flip ? width * (.94 + random() * .10) : width * (-.16 + random() * .12),
      y: height * (.03 + band * .19 + (random() - .5) * .13),
      width: width * (.98 + random() * .42),
      height: height * (.16 + random() * .12),
      rotation: (random() - .5) * .42,
      flip,
      opacity: .68 + random() * .27,
      start: index * .023 + random() * .045,
      duration: .30 + random() * .16,
    });
  }

  const subject = [
    [.31,.06,.13,.48,-1.28,.38], [.42,.04,.12,.44,-1.18,.42],
    [.38,.25,.34,.14,-.18,.46], [.53,.28,.28,.12,.08,.49],
    [.46,.38,.31,.14,.62,.53], [.39,.46,.32,.15,1.02,.56],
    [.34,.61,.42,.19,1.10,.60], [.42,.78,.48,.20,.22,.66],
  ];
  subject.forEach(([nx, ny, nw, nh, rotation, start], index) => {
    const usesImpasto = index % 3 === 0;
    marks.push({
      brush: usesImpasto ? impasto : dry,
      relief: usesImpasto ? impastoRelief : dryRelief,
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

  for (let index = 0; index < 7; index += 1) {
    marks.push({
      brush: dry,
      relief: dryRelief,
      x: width * (-.04 + random() * .92),
      y: height * (.03 + random() * .94),
      width: width * (.32 + random() * .30),
      height: height * (.07 + random() * .075),
      rotation: (random() - .5) * 1.7,
      flip: random() > .5,
      opacity: .62 + random() * .28,
      start: .58 + random() * .19,
      duration: .18 + random() * .14,
    });
  }

  [0.10, 0.31, 0.52, 0.73, 0.92].forEach((ny, index) => {
    const flip = index % 2 === 1;
    const usesDryBrush = index === 4;
    marks.push({
      brush: usesDryBrush ? dry : impasto,
      relief: usesDryBrush ? dryRelief : impastoRelief,
      x: flip ? width * 1.07 : width * -.13,
      y: height * ny,
      width: width * 1.28,
      height: height * (usesDryBrush ? .17 : .24),
      rotation: (index - 2) * .035,
      flip,
      opacity: .90,
      start: .70 + index * .045,
      duration: .24,
    });
  });

  return marks.sort((a, b) => a.start - b.start);
}

function paintMark(maskCtx, reliefCtx, mark, progress) {
  if (progress <= 0) return;
  const reveal = easePaint(progress);
  maskCtx.save();
  maskCtx.translate(mark.x, mark.y);
  maskCtx.rotate(mark.rotation);
  if (mark.flip) maskCtx.scale(-1, 1);
  maskCtx.beginPath();
  maskCtx.rect(0, -mark.height / 2, mark.width * reveal, mark.height);
  maskCtx.clip();
  maskCtx.drawImage(mark.brush, 0, -mark.height / 2, mark.width, mark.height);
  maskCtx.restore();

  reliefCtx.save();
  reliefCtx.translate(mark.x, mark.y);
  reliefCtx.rotate(mark.rotation);
  reliefCtx.globalAlpha = mark.opacity * (.72 + reveal * .28);
  const reliefX = mark.flip ? -mark.width : 0;
  const clipX = mark.flip ? -mark.width * reveal : 0;
  reliefCtx.beginPath();
  reliefCtx.rect(clipX, -mark.height / 2, mark.width * reveal, mark.height);
  reliefCtx.clip();
  reliefCtx.drawImage(mark.relief, reliefX, -mark.height / 2, mark.width, mark.height);
  reliefCtx.restore();
}

export function mountPaintReveal(canvas, urls, options = {}) {
  if (!canvas) return () => {};
  const ctx = canvas.getContext('2d', { alpha: false });
  const mask = document.createElement('canvas');
  const maskCtx = mask.getContext('2d');
  const painted = document.createElement('canvas');
  const paintedCtx = painted.getContext('2d');
  const relief = document.createElement('canvas');
  const reliefCtx = relief.getContext('2d');
  let artwork;
  let brushes;
  let frameId = 0;
  let runId = 0;
  let disposed = false;

  function sizeCanvas() {
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 1.35);
    canvas.width = Math.max(1, Math.round(bounds.width * ratio));
    canvas.height = Math.max(1, Math.round(bounds.height * ratio));
    mask.width = painted.width = relief.width = canvas.width;
    mask.height = painted.height = relief.height = canvas.height;
  }

  function composite(finalOpacity = 0) {
    const rect = artworkRect(artwork, canvas.width, canvas.height, options.fit);
    paintedCtx.clearRect(0, 0, canvas.width, canvas.height);
    paintedCtx.drawImage(artwork, rect.x, rect.y, rect.width, rect.height);
    paintedCtx.globalCompositeOperation = 'destination-in';
    paintedCtx.drawImage(mask, 0, 0);
    paintedCtx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#d9d2c7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(painted, 0, 0);
    if (finalOpacity > 0) {
      ctx.globalAlpha = finalOpacity;
      ctx.drawImage(artwork, rect.x, rect.y, rect.width, rect.height);
      ctx.globalAlpha = 1;
    }
    const reliefStrength = 1 - finalOpacity * .72;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = .34 * reliefStrength;
    ctx.filter = 'blur(1.6px) brightness(.54) contrast(1.5)';
    ctx.translate(0, Math.max(1.5, canvas.height * .0035));
    ctx.drawImage(relief, 0, 0);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = .82 * reliefStrength;
    ctx.filter = 'contrast(1.55)';
    ctx.drawImage(relief, 0, 0);
    ctx.restore();
  }

  function play() {
    cancelAnimationFrame(frameId);
    const currentRun = ++runId;
    maskCtx.clearRect(0, 0, mask.width, mask.height);
    reliefCtx.clearRect(0, 0, relief.width, relief.height);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      composite(1);
      canvas.classList.add('is-ready');
      return;
    }
    const useLandscapeMarks = options.mode === 'landscape'
      || (options.mode !== 'portrait' && artwork.width / artwork.height >= 1);
    const marks = useLandscapeMarks
      ? buildLandscapeMarks(canvas.width, canvas.height, brushes)
      : buildPortraitMarks(canvas.width, canvas.height, brushes);
    const startTime = performance.now();
    const duration = 2350;
    function frame(now) {
      if (disposed || currentRun !== runId) return;
      const progress = clamp((now - startTime) / duration);
      maskCtx.clearRect(0, 0, mask.width, mask.height);
      reliefCtx.clearRect(0, 0, relief.width, relief.height);
      marks.forEach((mark) => paintMark(maskCtx, reliefCtx, mark, clamp((progress - mark.start) / mark.duration)));
      composite(easePaint(clamp((progress - .90) / .10)));
      canvas.classList.add('is-ready');
      if (progress < 1) frameId = requestAnimationFrame(frame);
    }
    frameId = requestAnimationFrame(frame);
  }

  const observer = new ResizeObserver(() => {
    if (!artwork || !brushes || disposed) return;
    sizeCanvas();
    play();
  });
  observer.observe(canvas);

  Promise.all([
    loadImage(urls.artwork),
    loadImage(urls.impasto),
    loadImage(urls.dry),
    loadImage(urls.impastoRelief),
    loadImage(urls.dryRelief),
  ]).then(([image, impasto, dry, impastoRelief, dryRelief]) => {
    if (disposed) return;
    artwork = image;
    brushes = { impasto, dry, impastoRelief, dryRelief };
    sizeCanvas();
    play();
  }).catch(() => canvas.classList.add('is-unavailable'));

  return () => {
    disposed = true;
    runId += 1;
    cancelAnimationFrame(frameId);
    observer.disconnect();
  };
}

export function mountHomePaintReveal(canvas, urls) {
  return mountPaintReveal(canvas, urls, { mode: 'landscape' });
}
