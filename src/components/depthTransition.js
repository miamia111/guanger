import * as THREE from 'three';

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.addEventListener('load', () => resolve(image), { once: true });
    image.addEventListener('error', reject, { once: true });
    image.src = source;
  });
}

function createFeatherTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const pixels = context.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / (size - 1);
      const v = y / (size - 1);
      const edge = Math.min(u, 1 - u, v, 1 - v);
      const t = clamp(edge / .05);
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
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

function createDepthMesh(texture, depthImage, dimensions) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  const planeWidth = 4;
  const planeHeight = planeWidth / (dimensions.width / dimensions.height);
  const mobile = matchMedia('(max-width: 700px)').matches;
  const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, mobile ? 96 : 128, mobile ? 80 : 110);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const samplingCanvas = document.createElement('canvas');
  samplingCanvas.width = depthImage.naturalWidth;
  samplingCanvas.height = depthImage.naturalHeight;
  const context = samplingCanvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(depthImage, 0, 0);
  const pixels = context.getImageData(0, 0, samplingCanvas.width, samplingCanvas.height).data;
  for (let index = 0; index < position.count; index += 1) {
    const pixelX = Math.round(uv.getX(index) * (samplingCanvas.width - 1));
    const pixelY = Math.round((1 - uv.getY(index)) * (samplingCanvas.height - 1));
    const depth = pixels[(pixelY * samplingCanvas.width + pixelX) * 4] / 255;
    position.setZ(index, (depth - .43) * 1.06);
  }
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    alphaMap: createFeatherTexture(),
    transparent: true,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.setScalar(1.065);
  return { mesh, planeWidth, planeHeight };
}

function fitDistance(camera, planeWidth, planeHeight, mode = 'cover') {
  const halfFov = THREE.MathUtils.degToRad(camera.fov * .5);
  const fitHeight = planeHeight / (2 * Math.tan(halfFov));
  const fitWidth = planeWidth / (2 * Math.tan(halfFov) * camera.aspect);
  return (mode === 'cover' ? Math.min(fitHeight, fitWidth) : Math.max(fitHeight, fitWidth)) * 1.015;
}

export function mountHomeDepthExperience(root, options) {
  const canvas = root?.querySelector('[data-home-depth]');
  const trigger = document.querySelector('.enter-button');
  if (!root || !canvas || !trigger) return () => {};

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointerTarget = { x: 0, y: 0 };
  let disposed = false;
  let transitioning = false;
  let heroFrame = 0;
  let heroRenderer;
  let heroGeometry;
  let heroMaterial;
  let assetsPromise;

  const loadAssets = () => {
    if (!assetsPromise) {
      const texture = new Promise((resolve, reject) => {
        new THREE.TextureLoader().load(options.artwork, resolve, undefined, reject);
      });
      assetsPromise = Promise.all([texture, loadImage(options.depthMap)]);
    }
    return assetsPromise;
  };

  const requestMotionPermission = () => {
    if (typeof DeviceOrientationEvent === 'undefined' || typeof DeviceOrientationEvent.requestPermission !== 'function') return;
    DeviceOrientationEvent.requestPermission().catch(() => {});
  };

  const onPointerMove = (event) => {
    pointerTarget.x = (event.clientX / innerWidth - .5) * .72;
    pointerTarget.y = -(event.clientY / innerHeight - .5) * .20;
  };
  const onPointerLeave = () => {
    pointerTarget.x = 0;
    pointerTarget.y = 0;
  };
  const onOrientation = (event) => {
    if (event.gamma == null || event.beta == null) return;
    pointerTarget.x = clamp(event.gamma / 22, -1, 1) * .56;
    pointerTarget.y = clamp((event.beta - 45) / 30, -1, 1) * .16;
  };

  addEventListener('pointermove', onPointerMove, { passive: true });
  addEventListener('pointerleave', onPointerLeave, { passive: true });
  addEventListener('deviceorientation', onOrientation, { passive: true });
  root.addEventListener('pointerdown', requestMotionPermission, { once: true });

  if (!reduceMotion.matches) {
    loadAssets().then(([texture, depthImage]) => {
      if (disposed) return;
      heroRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
      heroRenderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
      heroRenderer.outputColorSpace = THREE.SRGBColorSpace;
      heroRenderer.setClearColor(0x000000, 0);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 1, .1, 30);
      const depth = createDepthMesh(texture, depthImage, options.dimensions);
      heroGeometry = depth.mesh.geometry;
      heroMaterial = depth.mesh.material;
      scene.add(depth.mesh);
      const current = { x: 0, y: 0 };
      let lastFrame = 0;

      const renderHero = (now) => {
        if (disposed) return;
        heroFrame = requestAnimationFrame(renderHero);
        if (transitioning || document.hidden || now - lastFrame < 28) return;
        lastFrame = now;
        const bounds = canvas.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        const ratio = Math.min(devicePixelRatio || 1, 1.25);
        if (canvas.width !== Math.round(bounds.width * ratio) || canvas.height !== Math.round(bounds.height * ratio)) {
          heroRenderer.setSize(bounds.width, bounds.height, false);
          camera.aspect = bounds.width / bounds.height;
          camera.updateProjectionMatrix();
        }
        current.x += (pointerTarget.x - current.x) * .075;
        current.y += (pointerTarget.y - current.y) * .075;
        camera.position.set(current.x * 2.15, current.y * 1.05, fitDistance(camera, depth.planeWidth, depth.planeHeight, 'cover'));
        camera.lookAt(0, 0, 0);
        heroRenderer.render(scene, camera);
        canvas.classList.add('is-ready');
        root.classList.add('is-depth-ready');
      };
      heroFrame = requestAnimationFrame(renderHero);
    }).catch(() => canvas.classList.add('is-unavailable'));
  }

  const playTransition = async (event) => {
    event.preventDefault();
    if (transitioning) return;
    requestMotionPermission();
    if (reduceMotion.matches) {
      location.hash = '#/guide';
      return;
    }
    transitioning = true;
    trigger.setAttribute('aria-disabled', 'true');
    const rect = root.getBoundingClientRect();
    const overlay = document.createElement('div');
    overlay.className = 'depth-transition-layer';
    overlay.style.setProperty('--depth-backdrop', `url("${options.backdrop}")`);
    overlay.innerHTML = `<img class="depth-transition-image" src="${options.artwork}" alt="" /><canvas class="depth-transition-canvas" aria-hidden="true"></canvas><div class="depth-transition-vignette"></div><div class="depth-transition-copy" role="status" aria-live="polite"><p>让目光沿着笔触，抵达画面深处</p><span><i aria-hidden="true"></i>正在进入展览</span></div>`;
    document.body.append(overlay);
    const expandingImage = overlay.querySelector('.depth-transition-image');
    const transitionCanvas = overlay.querySelector('.depth-transition-canvas');
    Object.assign(expandingImage.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    requestAnimationFrame(() => overlay.classList.add('is-visible'));

    let transitionRenderer;
    let transitionGeometry;
    let transitionMaterial;
    try {
      const [texture, depthImage] = await loadAssets();
      transitionRenderer = new THREE.WebGLRenderer({ canvas: transitionCanvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
      transitionRenderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.4));
      transitionRenderer.outputColorSpace = THREE.SRGBColorSpace;
      transitionRenderer.setClearColor(0x000000, 0);
      transitionRenderer.setSize(innerWidth, innerHeight, false);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, .1, 30);
      const depth = createDepthMesh(texture, depthImage, options.dimensions);
      transitionGeometry = depth.mesh.geometry;
      transitionMaterial = depth.mesh.material;
      scene.add(depth.mesh);
      const distance = fitDistance(camera, depth.planeWidth, depth.planeHeight, 'cover');
      camera.position.set(0, 0, distance);
      camera.lookAt(0, 0, 0);
      transitionRenderer.render(scene, camera);

      const scale = Math.max(innerWidth / rect.width, innerHeight / rect.height) * 1.015;
      const targetX = (innerWidth - rect.width * scale) / 2 - rect.left;
      const targetY = (innerHeight - rect.height * scale) / 2 - rect.top;
      await expandingImage.animate([
        { transform: 'translate3d(0,0,0) scale(1)' },
        { transform: `translate3d(${targetX}px,${targetY}px,0) scale(${scale})` },
      ], { duration: 2800, easing: 'cubic-bezier(.62,0,.18,1)', fill: 'forwards' }).finished;

      overlay.classList.add('is-three');
      await expandingImage.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).finished;
      const driftStart = performance.now();
      await new Promise((resolve) => {
        const drift = (now) => {
          const progress = clamp((now - driftStart) / 3100);
          const envelope = Math.sin(Math.PI * progress) ** .7;
          const autoX = Math.sin(progress * Math.PI * 2.4) * .22 * envelope;
          const autoY = Math.sin(progress * Math.PI * 3.6 + .5) * .035 * envelope;
          camera.position.set(autoX + pointerTarget.x, autoY + pointerTarget.y, distance);
          camera.lookAt(0, 0, 0);
          camera.rotateZ(Math.sin(progress * Math.PI * 2.4 + .35) * .006 * envelope);
          depth.mesh.rotation.y = autoX * -.025;
          depth.mesh.rotation.x = autoY * .018;
          transitionRenderer.render(scene, camera);
          if (progress < 1) requestAnimationFrame(drift);
          else resolve();
        };
        requestAnimationFrame(drift);
      });
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 900));
    }

    location.hash = '#/guide';
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('is-leaving')));
    setTimeout(() => {
      overlay.remove();
      transitionGeometry?.dispose();
      transitionMaterial?.map?.dispose();
      transitionMaterial?.alphaMap?.dispose();
      transitionMaterial?.dispose();
      transitionRenderer?.dispose();
    }, 1250);
  };

  trigger.addEventListener('click', playTransition);

  return () => {
    disposed = true;
    cancelAnimationFrame(heroFrame);
    trigger.removeEventListener('click', playTransition);
    removeEventListener('pointermove', onPointerMove);
    removeEventListener('pointerleave', onPointerLeave);
    removeEventListener('deviceorientation', onOrientation);
    heroGeometry?.dispose();
    heroMaterial?.map?.dispose();
    heroMaterial?.alphaMap?.dispose();
    heroMaterial?.dispose();
    heroRenderer?.dispose();
  };
}
