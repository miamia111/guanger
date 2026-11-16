import * as THREE from 'three';

const heroArt = document.querySelector('#heroArt');
const heroCanvas = document.querySelector('#heroDepthCanvas');
const enterButton = document.querySelector('#enterPainting');
const layer = document.querySelector('#transitionLayer');
const expandingArt = document.querySelector('#expandingArt');
const canvas = document.querySelector('#depthCanvas');
const washCanvas = document.querySelector('#paintWashCanvas');
const washContext = washCanvas.getContext('2d');
const arrival = document.querySelector('#guideArrival');
const replay = document.querySelector('#replay');
const statusLabel = layer.querySelector('.transition-status span');

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let renderer;
let scene;
let camera;
let mesh;
let animationFrame = 0;
let runId = 0;
let cameraStartZ = 4.86;
const artPlaneWidth = 4;
const artPlaneHeight = artPlaneWidth / (1080 / 931);
const parallaxTarget = { x: 0, y: 0 };
const parallaxCurrent = { x: 0, y: 0 };
let washAssetsPromise;
let spatialAssetsPromise;
let transitionRunning = false;

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const ease = (t) => 1 - Math.pow(1 - t, 3);
const mix = (from, to, t) => from + (to - from) * t;

function loadBrowserImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.addEventListener('load', () => resolve(image), { once: true });
    image.addEventListener('error', reject, { once: true });
    image.src = source;
  });
}

function loadWashAssets() {
  if (!washAssetsPromise) {
    washAssetsPromise = Promise.all([
      loadBrowserImage('/prototype/gray-blue-impasto-v1.png'),
      loadBrowserImage('/prototype/brush-impasto.webp'),
      loadBrowserImage('/prototype/brush-dry.webp'),
    ]);
  }
  return washAssetsPromise;
}

function createFeatherMask() {
  const size = 512;
  const featherCanvas = document.createElement('canvas');
  featherCanvas.width = size;
  featherCanvas.height = size;
  const context = featherCanvas.getContext('2d');
  const pixels = context.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / (size - 1);
      const v = y / (size - 1);
      const edge = Math.min(u, 1 - u, v, 1 - v);
      const t = clamp(edge / .055);
      const alpha = t * t * (3 - 2 * t);
      const offset = (y * size + x) * 4;
      const value = Math.round(alpha * 255);
      pixels.data[offset] = value;
      pixels.data[offset + 1] = value;
      pixels.data[offset + 2] = value;
      pixels.data[offset + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(featherCanvas);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

function loadSpatialAssets() {
  if (!spatialAssetsPromise) {
    const texturePromise = new Promise((resolve, reject) => {
      new THREE.TextureLoader().load('/artworks/chen-temple-home-1080.webp', resolve, undefined, reject);
    });
    spatialAssetsPromise = Promise.all([
      texturePromise,
      loadBrowserImage('/prototype/temple-depth-v1.png'),
    ]);
  }
  return spatialAssetsPromise;
}

function createDepthMesh(texture, depthImage) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  const geometry = new THREE.PlaneGeometry(artPlaneWidth, artPlaneHeight, 128, 110);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const depthCanvas = document.createElement('canvas');
  depthCanvas.width = depthImage.naturalWidth;
  depthCanvas.height = depthImage.naturalHeight;
  const depthContext = depthCanvas.getContext('2d', { willReadFrequently: true });
  depthContext.drawImage(depthImage, 0, 0);
  const depthPixels = depthContext.getImageData(0, 0, depthCanvas.width, depthCanvas.height).data;
  for (let index = 0; index < position.count; index += 1) {
    const u = uv.getX(index);
    const v = uv.getY(index);
    const pixelX = Math.round(u * (depthCanvas.width - 1));
    const pixelY = Math.round((1 - v) * (depthCanvas.height - 1));
    const offset = (pixelY * depthCanvas.width + pixelX) * 4;
    const depth = depthPixels[offset] / 255;
    position.setZ(index, (depth - .43) * 1.06);
  }
  geometry.computeVertexNormals();
  const material = new THREE.MeshBasicMaterial({ map: texture, alphaMap: createFeatherMask(), transparent: true, side: THREE.DoubleSide });
  const depthMesh = new THREE.Mesh(geometry, material);
  depthMesh.scale.setScalar(1.055);
  return depthMesh;
}

function initHeroSpatialScene() {
  if (!heroCanvas || reduceMotion.matches) return;
  loadSpatialAssets().then(([texture, depthImage]) => {
    const heroRenderer = new THREE.WebGLRenderer({ canvas: heroCanvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    heroRenderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
    heroRenderer.outputColorSpace = THREE.SRGBColorSpace;
    heroRenderer.setClearColor(0x000000, 0);
    const heroScene = new THREE.Scene();
    const heroCamera = new THREE.PerspectiveCamera(40, 1, .1, 30);
    const heroMesh = createDepthMesh(texture, depthImage);
    heroScene.add(heroMesh);
    const current = { x: 0, y: 0 };
    let lastFrame = 0;

    function renderHero(now) {
      requestAnimationFrame(renderHero);
      if (transitionRunning || document.hidden || now - lastFrame < 28) return;
      lastFrame = now;
      const bounds = heroCanvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const ratio = Math.min(devicePixelRatio || 1, 1.25);
      const targetWidth = Math.round(bounds.width * ratio);
      const targetHeight = Math.round(bounds.height * ratio);
      if (heroCanvas.width !== targetWidth || heroCanvas.height !== targetHeight) {
        heroRenderer.setSize(bounds.width, bounds.height, false);
        heroCamera.aspect = bounds.width / bounds.height;
        heroCamera.updateProjectionMatrix();
      }
      current.x += (parallaxTarget.x - current.x) * .075;
      current.y += (parallaxTarget.y - current.y) * .075;
      const halfFov = THREE.MathUtils.degToRad(heroCamera.fov * .5);
      const fitHeight = artPlaneHeight / (2 * Math.tan(halfFov));
      const fitWidth = artPlaneWidth / (2 * Math.tan(halfFov) * heroCamera.aspect);
      const z = Math.max(fitHeight, fitWidth) * 1.025;
      heroCamera.position.set(current.x * 2.15, current.y * 1.05, z);
      heroCamera.lookAt(0, 0, 0);
      heroRenderer.render(heroScene, heroCamera);
      heroCanvas.classList.add('is-ready');
      heroArt.classList.add('is-depth-ready');
    }
    requestAnimationFrame(renderHero);
  }).catch(() => {});
}

function paintBackdrop(currentRun) {
  return loadWashAssets().then(([backdrop, impasto, dry]) => new Promise((resolve) => {
    const ratio = Math.min(devicePixelRatio || 1, 1.3);
    washCanvas.width = Math.round(innerWidth * ratio);
    washCanvas.height = Math.round(innerHeight * ratio);
    const width = washCanvas.width;
    const height = washCanvas.height;
    const backdropCanvas = document.createElement('canvas');
    backdropCanvas.width = width;
    backdropCanvas.height = height;
    const backdropContext = backdropCanvas.getContext('2d');
    const imageRatio = backdrop.width / backdrop.height;
    const canvasRatio = width / height;
    const drawWidth = imageRatio > canvasRatio ? height * imageRatio : width;
    const drawHeight = imageRatio > canvasRatio ? height : width / imageRatio;
    backdropContext.drawImage(backdrop, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);

    const mask = document.createElement('canvas');
    mask.width = width;
    mask.height = height;
    const maskContext = mask.getContext('2d');
    const masked = document.createElement('canvas');
    masked.width = width;
    masked.height = height;
    const maskedContext = masked.getContext('2d');
    const marks = [
      [impasto,-.12,.08,1.28,.30,-.04,0], [dry,.96,.27,1.18,.27,.06,.08],
      [impasto,-.10,.48,1.30,.34,.03,.16], [dry,.98,.69,1.22,.28,-.07,.24],
      [impasto,-.14,.91,1.34,.31,.04,.32], [dry,.12,.16,.70,.22,-.62,.18],
      [impasto,.88,.53,.76,.25,.72,.29], [dry,.18,.80,.82,.24,.28,.39],
    ];
    const start = performance.now();
    const duration = 1580;
    function frame(now) {
      if (currentRun !== runId) return;
      const progress = clamp((now - start) / duration);
      maskContext.clearRect(0, 0, width, height);
      marks.forEach(([brush, nx, ny, nw, nh, rotation, delay], index) => {
        const local = ease(clamp((progress - delay) / .46));
        if (!local) return;
        const markWidth = nw * width;
        const markHeight = nh * height;
        maskContext.save();
        maskContext.translate(nx * width, ny * height);
        maskContext.rotate(rotation);
        if (index % 2) maskContext.scale(-1, 1);
        maskContext.beginPath();
        maskContext.rect(0, -markHeight / 2, markWidth * local, markHeight);
        maskContext.clip();
        maskContext.drawImage(brush, 0, -markHeight / 2, markWidth, markHeight);
        maskContext.restore();
      });

      washContext.clearRect(0, 0, width, height);
      const settling = ease(clamp((progress - .68) / .32));
      if (settling > 0) {
        washContext.globalAlpha = settling * .88;
        washContext.drawImage(backdropCanvas, 0, 0);
        washContext.globalAlpha = 1;
      }
      maskedContext.clearRect(0, 0, width, height);
      maskedContext.globalCompositeOperation = 'source-over';
      maskedContext.drawImage(backdropCanvas, 0, 0);
      maskedContext.globalCompositeOperation = 'destination-in';
      maskedContext.drawImage(mask, 0, 0);
      washContext.drawImage(masked, 0, 0);
      if (progress < 1) animationFrame = requestAnimationFrame(frame);
      else resolve();
    }
    animationFrame = requestAnimationFrame(frame);
  }));
}

function createScene() {
  if (renderer) return Promise.resolve();
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.4));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  scene = new THREE.Scene();
  scene.background = null;
  camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, .1, 30);

  return loadSpatialAssets().then(([texture, depthImage]) => {
      mesh = createDepthMesh(texture, depthImage);
      scene.add(mesh);
      resize();
  });
}

function resize() {
  if (!renderer || !camera) return;
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  const halfFov = THREE.MathUtils.degToRad(camera.fov * .5);
  const fitHeight = artPlaneHeight / (2 * Math.tan(halfFov));
  const fitWidth = artPlaneWidth / (2 * Math.tan(halfFov) * camera.aspect);
  cameraStartZ = Math.min(fitHeight, fitWidth) * .995;
}

function positionCamera(progress = 0, autoX = 0, autoY = 0) {
  parallaxCurrent.x += (parallaxTarget.x - parallaxCurrent.x) * .075;
  parallaxCurrent.y += (parallaxTarget.y - parallaxCurrent.y) * .075;
  const swayEnvelope = Math.sin(Math.PI * progress) ** .7;
  const lateralSway = Math.sin(progress * Math.PI * 2.4) * .22 * swayEnvelope;
  const verticalSway = Math.sin(progress * Math.PI * 3.6 + .5) * .035 * swayEnvelope;
  const cameraRoll = Math.sin(progress * Math.PI * 2.4 + .35) * .006 * swayEnvelope;
  camera.position.set(
    lateralSway + parallaxCurrent.x + autoX,
    verticalSway + parallaxCurrent.y + autoY,
    cameraStartZ,
  );
  camera.lookAt(0, 0, 0);
  camera.rotateZ(cameraRoll);
  mesh.rotation.y = lateralSway * -.025;
  mesh.rotation.x = verticalSway * .018;
}

function animateSpatialDrift(currentRun) {
  const start = performance.now();
  const duration = 3100;
  function frame(now) {
    if (currentRun !== runId) return;
    const progress = clamp((now - start) / duration);
    positionCamera(progress);
    renderer.render(scene, camera);
    if (progress < 1) animationFrame = requestAnimationFrame(frame);
    else finishTransition();
  }
  animationFrame = requestAnimationFrame(frame);
}

function finishTransition() {
  layer.querySelector('.transition-status').style.opacity = '0';
  arrival.classList.add('is-visible');
  replay.classList.add('is-visible');
}

function requestMotionPermission() {
  if (typeof DeviceOrientationEvent === 'undefined' || typeof DeviceOrientationEvent.requestPermission !== 'function') return;
  DeviceOrientationEvent.requestPermission().catch(() => {});
}

async function playTransition() {
  transitionRunning = true;
  const currentRun = ++runId;
  cancelAnimationFrame(animationFrame);
  replay.classList.remove('is-visible');
  arrival.classList.remove('is-visible');
  layer.querySelector('.transition-status').style.opacity = '';

  if (reduceMotion.matches) {
    arrival.classList.add('is-visible');
    replay.classList.add('is-visible');
    return;
  }

  const rect = heroArt.getBoundingClientRect();
  expandingArt.style.left = `${rect.left}px`;
  expandingArt.style.top = `${rect.top}px`;
  expandingArt.style.width = `${rect.width}px`;
  expandingArt.style.height = `${rect.height}px`;
  expandingArt.style.opacity = '1';
  expandingArt.style.transform = 'none';
  expandingArt.style.clipPath = 'inset(0 0 10% 0)';
  layer.classList.remove('is-three', 'is-expanding');
  layer.classList.add('is-active');
  requestAnimationFrame(() => layer.classList.add('is-expanding'));
  statusLabel.textContent = '正在展开空间场景';

  requestMotionPermission();

  await createScene();
  if (currentRun !== runId) return;
  positionCamera(0);
  renderer.render(scene, camera);

  // Cover the viewport, but arrive there slowly enough that the artwork feels
  // as though it is opening into a space rather than popping into a lightbox.
  const scale = Math.max(innerWidth / rect.width, innerHeight / rect.height) * 1.015;
  const targetX = (innerWidth - rect.width * scale) / 2 - rect.left;
  const targetY = (innerHeight - rect.height * scale) / 2 - rect.top;
  const expansion = expandingArt.animate([
    { transform: 'translate3d(0,0,0) scale(1)', filter: 'saturate(1)', clipPath: 'inset(0 0 10% 0)' },
    { transform: 'translate3d(0,-3px,0) scale(1.018)', filter: 'saturate(1.01)', clipPath: 'inset(0 0 0 0)', offset: .24 },
    { transform: `translate3d(${targetX}px,${targetY}px,0) scale(${scale})`, filter: 'saturate(1.04)', clipPath: 'inset(0 0 0 0)' },
  ], { duration: 2800, easing: 'cubic-bezier(.62,0,.18,1)', fill: 'forwards' });
  await expansion.finished;
  if (currentRun !== runId) return;

  layer.classList.add('is-three');
  const crossfade = expandingArt.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-out', fill: 'forwards' });
  await crossfade.finished;
  if (currentRun !== runId) return;
  statusLabel.textContent = '画面正在展开';
  animateSpatialDrift(currentRun);
}

function reset() {
  runId += 1;
  cancelAnimationFrame(animationFrame);
  layer.classList.remove('is-active', 'is-three', 'is-expanding');
  washContext.clearRect(0, 0, washCanvas.width, washCanvas.height);
  transitionRunning = false;
  arrival.classList.remove('is-visible');
  replay.classList.remove('is-visible');
  expandingArt.getAnimations().forEach((animation) => animation.cancel());
  window.scrollTo(0, 0);
}

enterButton.addEventListener('click', playTransition);
heroArt.addEventListener('pointerdown', requestMotionPermission, { once: true });
replay.addEventListener('click', () => {
  reset();
  requestAnimationFrame(playTransition);
});
addEventListener('resize', resize);
addEventListener('pointermove', (event) => {
  parallaxTarget.x = (event.clientX / innerWidth - .5) * .72;
  parallaxTarget.y = -(event.clientY / innerHeight - .5) * .20;
});
addEventListener('pointerleave', () => {
  parallaxTarget.x = 0;
  parallaxTarget.y = 0;
});
addEventListener('deviceorientation', (event) => {
  if (event.gamma == null || event.beta == null) return;
  parallaxTarget.x = clamp(event.gamma / 22, -1, 1) * .56;
  parallaxTarget.y = clamp((event.beta - 45) / 30, -1, 1) * .16;
});
initHeroSpatialScene();
