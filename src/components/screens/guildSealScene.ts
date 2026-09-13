import {
  AmbientLight,
  Color,
  CylinderGeometry,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Shape,
  TorusGeometry,
  WebGLRenderer,
} from 'three';

/** A small real 3D medallion. No full-screen passes, shadows or texture downloads. */
export function createGuildSeal(host: HTMLElement, onUnavailable: () => void): (() => void) | undefined {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2', {
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  if (!context) return;
  const renderer = new WebGLRenderer({ canvas, context, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(34, 1, 0.1, 20);
  camera.position.set(0, 0, 6.5);
  const seal = new Group();
  scene.add(seal);
  const gold = new MeshStandardMaterial({
    color: new Color('#d4a345'),
    metalness: 0.72,
    roughness: 0.32,
  });
  const brightGold = new MeshStandardMaterial({
    color: new Color('#f6d486'),
    metalness: 0.6,
    roughness: 0.28,
  });
  const enamel = new MeshStandardMaterial({
    color: new Color('#1c2526'),
    metalness: 0.35,
    roughness: 0.48,
  });
  const bodyGeometry = new CylinderGeometry(1.05, 1.05, 0.16, 64);
  const insetGeometry = new CylinderGeometry(0.91, 0.91, 0.175, 64);
  const rimGeometry = new TorusGeometry(1.01, 0.055, 8, 64);
  const innerRimGeometry = new TorusGeometry(0.83, 0.016, 6, 64);
  const body = new Mesh(bodyGeometry, gold);
  const inset = new Mesh(insetGeometry, enamel);
  body.rotation.x = Math.PI / 2;
  inset.rotation.x = Math.PI / 2;
  const rim = new Mesh(rimGeometry, brightGold);
  rim.position.z = 0.09;
  const innerRim = new Mesh(innerRimGeometry, gold);
  innerRim.position.z = 0.1;
  seal.add(body, inset, rim, innerRim);
  const rose = new Shape();
  for (let i = 0; i < 16; i++) {
    const angle = (i * Math.PI) / 8;
    const radius = i % 2 ? 0.2 : i % 4 === 0 ? 0.76 : 0.52;
    const x = Math.sin(angle) * radius;
    const y = Math.cos(angle) * radius;
    if (i === 0) rose.moveTo(x, y);
    else rose.lineTo(x, y);
  }
  rose.closePath();
  const roseGeometry = new ExtrudeGeometry(rose, {
    depth: 0.045,
    bevelEnabled: true,
    bevelThickness: 0.022,
    bevelSize: 0.016,
    bevelSegments: 2,
    steps: 1,
  });
  const compass = new Mesh(roseGeometry, brightGold);
  compass.position.z = 0.1;
  seal.add(compass);
  const centerGeometry = new CylinderGeometry(0.085, 0.085, 0.045, 16);
  const center = new Mesh(centerGeometry, gold);
  center.rotation.x = Math.PI / 2;
  center.position.z = 0.18;
  seal.add(center);
  scene.add(new AmbientLight(0xffe0a0, 1.8));
  const key = new DirectionalLight(0xffe4a8, 4);
  key.position.set(-2, 3, 4);
  const fill = new DirectionalLight(0xa6c9e1, 2);
  fill.position.set(3, -1, 2);
  scene.add(key, fill);
  let disposed = false;
  let lost = false;
  let frame = 0;
  let elapsed = 0;
  let lastTime = 0;
  let targetX = 0;
  let targetY = 0;
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  const tick = (time: number) => {
    if (disposed || lost || document.hidden) return;
    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
    lastTime = time;
    elapsed += delta;
    const ease = 1 - Math.exp(-4 * delta);
    seal.rotation.x += (targetY + Math.sin(elapsed * 0.45) * 0.045 - seal.rotation.x) * ease;
    seal.rotation.y += (targetX + Math.sin(elapsed * 0.32) * 0.12 - seal.rotation.y) * ease;
    seal.position.y = Math.sin(elapsed * 0.65) * 0.035;
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  };
  const visibility = () => {
    cancelAnimationFrame(frame);
    lastTime = 0;
    if (!document.hidden && !disposed && !lost) frame = requestAnimationFrame(tick);
  };
  const pointer = (event: PointerEvent) => {
    // Mouse only: tablet scrolling and gestures are never captured.
    if (event.pointerType !== 'mouse') return;
    targetX = (event.clientX / window.innerWidth - 0.5) * 0.3;
    targetY = (event.clientY / window.innerHeight - 0.5) * 0.15;
  };
  const contextLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    cancelAnimationFrame(frame);
    onUnavailable();
  };
  const observer = new ResizeObserver(resize);
  host.append(canvas);
  observer.observe(host);
  canvas.addEventListener('webglcontextlost', contextLost);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pointermove', pointer, { passive: true });
  resize();
  visibility();
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('pointermove', pointer);
    canvas.removeEventListener('webglcontextlost', contextLost);
    [bodyGeometry, insetGeometry, rimGeometry, innerRimGeometry, roseGeometry, centerGeometry].forEach(
      (g) => g.dispose(),
    );
    [gold, brightGold, enamel].forEach((m) => m.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  };
}
