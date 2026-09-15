import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Euler,
  Fog,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  type Object3D,
  PerspectiveCamera,
  CanvasTexture,
  RingGeometry,
  Raycaster,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { LocationId } from '@/types/game.types';
import { BOARD_3D_BY_ID, BOARD_3D_LOCATIONS } from '@/data/board3d';
import { BOARD_PATH, getPath } from '@/data/locations';
import './board3d.css';

interface Board3DProps {
  modelUrl?: string;
}

const MODEL_URL = `${import.meta.env.BASE_URL}board3d/guildholm_3d_board.glb`;
const START_LOCATION: LocationId = 'slums';
const START_HOURS = 12;

function createLabelTexture(text: string, color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(15, 20, 18, 0.78)';
  context.strokeStyle = 'rgba(232, 196, 107, 0.85)';
  context.lineWidth = 5;
  context.roundRect(8, 8, 496, 112, 18);
  context.fill();
  context.stroke();
  context.fillStyle = color;
  context.font = '700 34px Georgia, serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 1);
  return canvas;
}

function makeLabelSprite(text: string, color: string) {
  const textureCanvas = createLabelTexture(text, color);
  if (!textureCanvas) return null;
  const canvasTexture = new CanvasTexture(textureCanvas);
  canvasTexture.needsUpdate = true;
  const material = new SpriteMaterial({ map: canvasTexture, transparent: true, depthWrite: false, depthTest: false });
  const sprite = new Sprite(material);
  sprite.scale.set(2.15, 0.54, 1);
  return sprite;
}

function locationPathPoints(path: LocationId[]) {
  return path.map((id) => {
    const location = BOARD_3D_BY_ID[id];
    return new Vector3(location.x, 0.55, location.z);
  });
}

interface BirdFlock {
  group: Group;
  update: (time: number) => void;
  dispose: () => void;
}

function createBirdFlock(): BirdFlock {
  const group = new Group();
  group.name = 'guildholm-3d-bird-flock';
  const bodyGeometry = new SphereGeometry(0.16, 6, 4);
  const wingGeometry = new BoxGeometry(0.34, 0.035, 0.12);
  const bodyMaterial = new MeshStandardMaterial({ color: '#324853', roughness: 0.82, metalness: 0.05 });
  const wingMaterial = new MeshStandardMaterial({ color: '#6f8e8d', roughness: 0.84, metalness: 0.02 });
  const states = [
    { x: -8.2, z: 4.1, height: 7.2, radius: 1.7, speed: 0.72, phase: 0.2, scale: 1.0 },
    { x: -1.8, z: 5.8, height: 6.4, radius: 1.4, speed: 0.92, phase: 1.7, scale: 0.82 },
    { x: 7.1, z: 2.4, height: 7.0, radius: 1.8, speed: 0.64, phase: 3.1, scale: 1.12 },
    { x: 8.0, z: -4.4, height: 5.8, radius: 1.5, speed: 0.84, phase: 4.4, scale: 0.9 },
    { x: -6.3, z: -4.8, height: 6.1, radius: 1.2, speed: 0.76, phase: 5.6, scale: 0.74 },
    { x: 2.4, z: -7.4, height: 6.8, radius: 1.35, speed: 0.68, phase: 6.9, scale: 0.86 },
  ];
  const bodies = new InstancedMesh(bodyGeometry, bodyMaterial, states.length);
  const wings = new InstancedMesh(wingGeometry, wingMaterial, states.length * 2);
  bodies.name = '3d-birds-bodies';
  wings.name = '3d-birds-wings';
  bodies.castShadow = true;
  wings.castShadow = true;
  group.add(bodies, wings);

  const bodyMatrix = new Matrix4();
  const wingMatrix = new Matrix4();
  const position = new Vector3();
  const wingPosition = new Vector3();
  const bodyRotation = new Quaternion();
  const wingRotation = new Quaternion();
  const scale = new Vector3();
  const offsetAxis = new Vector3(0, 1, 0);

  const update = (time: number) => {
    states.forEach((bird, index) => {
      const angle = bird.phase + time * 0.00032 * bird.speed;
      const nextAngle = angle + 0.015;
      position.set(
        bird.x + Math.cos(angle) * bird.radius,
        bird.height + Math.sin(time * 0.004 + bird.phase) * 0.16,
        bird.z + Math.sin(angle * 0.86) * bird.radius,
      );
      const heading = Math.atan2(
        Math.sin(nextAngle * 0.86) - Math.sin(angle * 0.86),
        Math.cos(nextAngle) - Math.cos(angle),
      );
      bodyRotation.setFromEuler(new Euler(0, heading, 0));
      scale.set(bird.scale * 1.45, bird.scale * 0.72, bird.scale * 0.72);
      bodyMatrix.compose(position, bodyRotation, scale);
      bodies.setMatrixAt(index, bodyMatrix);

      const flap = Math.sin(time * 0.014 + bird.phase) * 0.5;
      [-1, 1].forEach((side, sideIndex) => {
        wingPosition.set(side * bird.scale * 0.22, bird.scale * 0.02, 0)
          .applyAxisAngle(offsetAxis, heading)
          .add(position);
        wingRotation.setFromEuler(new Euler(0, heading, side * (0.42 + flap)));
        scale.set(bird.scale, bird.scale, bird.scale);
        wingMatrix.compose(wingPosition, wingRotation, scale);
        wings.setMatrixAt(index * 2 + sideIndex, wingMatrix);
      });
    });
    bodies.instanceMatrix.needsUpdate = true;
    wings.instanceMatrix.needsUpdate = true;
  };

  return {
    group,
    update,
    dispose: () => {
      bodyGeometry.dispose();
      wingGeometry.dispose();
      bodyMaterial.dispose();
      wingMaterial.dispose();
    },
  };
}

export function Board3D({ modelUrl = MODEL_URL }: Board3DProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [modelReady, setModelReady] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationId | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationId>(START_LOCATION);
  const [hours, setHours] = useState(START_HOURS);
  const [week, setWeek] = useState(1);
  const [gold, setGold] = useState(120);
  const [health, setHealth] = useState(82);
  const [education, setEducation] = useState(0);
  const [happiness, setHappiness] = useState(40);
  const [toast, setToast] = useState('Klikk en lokasjon for å planlegge reisen.');
  const [busy, setBusy] = useState(false);
  const currentLocationRef = useRef(currentLocation);
  const selectedLocationRef = useRef(selectedLocation);
  const busyRef = useRef(busy);
  const travelAnimationRef = useRef<{ path: LocationId[]; startedAt: number; duration: number } | null>(null);

  useEffect(() => { currentLocationRef.current = currentLocation; }, [currentLocation]);
  useEffect(() => { selectedLocationRef.current = selectedLocation; }, [selectedLocation]);
  useEffect(() => { busyRef.current = busy; }, [busy]);

  const selected = selectedLocation ? BOARD_3D_BY_ID[selectedLocation] : null;
  const current = BOARD_3D_BY_ID[currentLocation];
  const route = useMemo(() => {
    if (!selectedLocation || selectedLocation === currentLocation) return [];
    return getPath(currentLocation, selectedLocation);
  }, [currentLocation, selectedLocation]);
  const travelCost = Math.max(0, route.length - 1);
  const actionLocation = selected ?? current;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const scene = new Scene();
    scene.background = new Color('#132326');
    scene.fog = new Fog('#132326', 28, 70);

    const camera = new PerspectiveCamera(42, 1, 0.1, 120);
    camera.position.set(20, 22, 21);
    camera.lookAt(0, 0, 0);

    const renderer = new WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    // Keep the full Tripo city readable on mobile and software WebGL. The
    // authoring render retains shadows; runtime uses a conservative pixel
    // budget so the interactive board stays responsive.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1));
    renderer.outputColorSpace = 'srgb';
    renderer.shadowMap.enabled = false;
    stage.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 12;
    controls.maxDistance = 36;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.target.set(0, 0.3, 0);

    scene.add(new AmbientLight('#fff2d0', 1.85));
    const keyLight = new DirectionalLight('#ffe5b0', 3.4);
    keyLight.position.set(-12, 22, 10);
    scene.add(keyLight);
    const coolFill = new DirectionalLight('#99c9dc', 0.9);
    coolFill.position.set(12, 9, -14);
    scene.add(coolFill);

    const loader = new GLTFLoader();
    let disposed = false;
    let world: Group | null = null;
    const interactive: Object3D[] = [];
    const token = new Group();
    const tokenBody = new Mesh(new SphereGeometry(0.34, 16, 10), new MeshStandardMaterial({ color: '#d9aa47', roughness: 0.36, metalness: 0.35 }));
    tokenBody.position.y = 0.75;
    tokenBody.castShadow = true;
    token.add(tokenBody);
    scene.add(token);

    const routeMarker = new Mesh(new RingGeometry(0.28, 0.36, 16), new MeshStandardMaterial({ color: '#e0b85f', emissive: '#9e6b2b', emissiveIntensity: 0.6, roughness: 0.45 }));
    routeMarker.rotation.x = -Math.PI / 2;
    routeMarker.position.y = 0.49;
    scene.add(routeMarker);
    const birdFlock = createBirdFlock();
    scene.add(birdFlock.group);

    const pointer = new Vector2();
    const raycaster = new Raycaster();

    function resize() {
      const width = stage.clientWidth || window.innerWidth;
      const height = stage.clientHeight || window.innerHeight;
      const aspect = width / Math.max(1, height);
      const portraitScale = aspect < 0.82 ? 1.55 : 1;
      camera.position.set(20 * portraitScale, 22 * portraitScale, 21 * portraitScale);
      camera.lookAt(0, 0.3, 0);
      controls.maxDistance = portraitScale > 1 ? 58 : 36;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }

    function pointerLocation(event: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(interactive, true);
      for (const hit of hits) {
        let object = hit.object;
        while (object && !object.userData.locationId) object = object.parent;
        if (object?.userData.locationId) return object.userData.locationId as LocationId;
      }
      return null;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const locationId = pointerLocation(event);
      renderer.domElement.style.cursor = locationId ? 'pointer' : 'grab';
    };
    const handleClick = (event: PointerEvent) => {
      const locationId = pointerLocation(event);
      if (!locationId || busyRef.current) return;
      setSelectedLocation(locationId);
      const nextPath = getPath(currentLocationRef.current, locationId);
      const cost = Math.max(0, nextPath.length - 1);
      setToast(locationId === currentLocationRef.current
        ? `${BOARD_3D_BY_ID[locationId].name} er her. Velg en aktivitet.`
        : `${BOARD_3D_BY_ID[locationId].name} valgt · ${cost} time${cost === 1 ? '' : 'r'} langs ringen.`);
    };
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('click', handleClick);
    window.addEventListener('resize', resize);
    resize();

    loader.load(modelUrl, (gltf) => {
      if (disposed) return;
      world = gltf.scene;
      // The authoring file keeps the project's familiar x/z board layout
      // while Blender's GLTF exporter normalizes its z-up scene to glTF y-up.
      // Rotate the imported world back to the runtime's y-up contract.
      world.rotation.x = Math.PI / 2;
      world.traverse((object) => {
        if (object instanceof Mesh) {
          object.castShadow = false;
          object.receiveShadow = false;
        }
        const id = object.userData?.locationId || object.name.match(/^location_(.+)$/)?.[1];
        if (id && BOARD_3D_BY_ID[id as LocationId]) {
          object.userData.locationId = id;
          if (!interactive.includes(object)) interactive.push(object);
        }
      });
      scene.add(world);
      for (const location of BOARD_3D_LOCATIONS) {
        const label = makeLabelSprite(location.shortName, location.accent);
        if (!label) continue;
        label.position.set(location.x, 3.05, location.z);
        label.userData.locationId = location.id;
        scene.add(label);
      }
      setModelReady(true);
    }, undefined, () => {
      if (!disposed) setToast('3D-modellen kunne ikke lastes. Kontroller public/board3d/guildholm_3d_board.glb.');
    });

    let animationFrame = 0;
    function animate() {
      if (disposed) return;
      animationFrame = requestAnimationFrame(animate);
      controls.update();
      const now = performance.now();
      birdFlock.update(now);
      const active = BOARD_3D_BY_ID[currentLocationRef.current];
      const travelAnimation = travelAnimationRef.current;
      if (travelAnimation) {
        const progress = Math.min(1, (now - travelAnimation.startedAt) / travelAnimation.duration);
        const points = locationPathPoints(travelAnimation.path);
        const segmentPosition = progress * Math.max(1, points.length - 1);
        const segment = Math.min(points.length - 2, Math.floor(segmentPosition));
        const segmentProgress = Math.min(1, segmentPosition - segment);
        const from = points[Math.max(0, segment)];
        const to = points[Math.min(points.length - 1, segment + 1)];
        token.position.lerpVectors(from, to, segmentProgress);
        if (progress >= 1) {
          const destination = travelAnimation.path[travelAnimation.path.length - 1];
          travelAnimationRef.current = null;
          setCurrentLocation(destination);
          setHours((value) => value - (travelAnimation.path.length - 1));
          setBusy(false);
          setToast(`Ankommet til ${BOARD_3D_BY_ID[destination].name}. ${BOARD_3D_BY_ID[destination].action}.`);
        }
      } else {
        const bob = Math.sin(now * 0.004) * 0.055;
        token.position.set(active.x, bob, active.z);
      }
      const selectedId = selectedLocationRef.current;
      const selectedPoint = selectedId ? BOARD_3D_BY_ID[selectedId] : active;
      routeMarker.position.set(selectedPoint.x, 0.49, selectedPoint.z);
      routeMarker.visible = !!selectedId && selectedId !== currentLocationRef.current;
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('click', handleClick);
      controls.dispose();
      renderer.dispose();
      birdFlock.dispose();
      if (world) world.traverse((object) => {
        if (object instanceof Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      stage.removeChild(renderer.domElement);
    };
  }, [modelUrl]);

  const travel = () => {
    if (!selectedLocation || selectedLocation === currentLocation || busy) return;
    const path = getPath(currentLocation, selectedLocation);
    const cost = path.length - 1;
    if (cost > hours) {
      setToast(`Du trenger ${cost} timer, men har bare ${hours} igjen.`);
      return;
    }
    setBusy(true);
    setToast(`Reiser mot ${BOARD_3D_BY_ID[selectedLocation].name} …`);
    const duration = Math.max(700, path.length * 250);
    travelAnimationRef.current = { path, startedAt: performance.now(), duration };
  };

  const performAction = () => {
    if (!actionLocation || busy) return;
    if (actionLocation.actionCost > hours) {
      setToast(`Aktiviteten krever ${actionLocation.actionCost} timer.`);
      return;
    }
    if (actionLocation.id !== currentLocation) {
      setToast('Reis til lokasjonen først for å gjøre handlingen.');
      return;
    }
    setHours((value) => value - actionLocation.actionCost);
    if (actionLocation.id === 'forge' || actionLocation.id === 'guild-hall') setGold((value) => value + (actionLocation.id === 'forge' ? 35 : 45));
    if (actionLocation.id === 'academy') setEducation((value) => value + 1);
    if (actionLocation.id === 'cave') { setGold((value) => value + 30); setHealth((value) => Math.max(0, value - 8)); }
    if (actionLocation.id === 'slums') setHealth((value) => Math.min(100, value + 3));
    if (actionLocation.id === 'rusty-tankard') setHappiness((value) => Math.min(100, value + 2));
    setToast(`${actionLocation.action}: ${actionLocation.actionResult}.`);
  };

  const endTurn = () => {
    if (busy) return;
    setWeek((value) => value + 1);
    setHours(START_HOURS);
    setSelectedLocation(null);
    setToast(`Uke ${week + 1} starter. Du har ${START_HOURS} timer.`);
  };

  return (
    <main className="board3d-page">
      <div ref={stageRef} className="board3d-stage" aria-label="Guildholm 3D spillbrett" />
      {!modelReady && <div className="board3d-loading">LASTER GUILDHOLM 3D …</div>}
      <div className="board3d-ui">
        <header className="board3d-topbar">
          <div>
            <p className="board3d-kicker">Guild Life · 3D conversion lab</p>
            <h1 className="board3d-title">Guildholm — prøvespillbar 3D</h1>
          </div>
          <div className="board3d-status" aria-label="Spillerstatus">
            <span className="board3d-chip"><strong>Uke</strong> {week}</span>
            <span className="board3d-chip"><strong>Timer</strong> {hours}</span>
            <span className="board3d-chip"><strong>Gull</strong> {gold}</span>
            <span className="board3d-chip"><strong>HP</strong> {health}</span>
          </div>
        </header>

        <Link className="board3d-return" to="/">← Tilbake til 2D-brettet</Link>

        {toast && <div className="board3d-toast" role="status">{toast}</div>}

        <section className="board3d-panel" aria-label="Spillkontroller">
          <h2>Din tur i byen</h2>
          <p>Drag for å rotere, scroll for å zoome. Klikk et bygg og bekreft reisen med timekostnaden.</p>
          <div className="board3d-controls">
            <button className="board3d-button" type="button" onClick={travel} disabled={!selected || selected.id === currentLocation || busy}>
              Reis {selected ? `til ${selected.shortName}` : 'til valgt sted'}
            </button>
            <button className="board3d-button board3d-button--secondary" type="button" onClick={performAction} disabled={busy}>
              {actionLocation.action} · {actionLocation.actionCost} t
            </button>
            <button className="board3d-button board3d-button--secondary board3d-button--wide" type="button" onClick={endTurn} disabled={busy}>
              Avslutt tur · start neste uke
            </button>
          </div>
        </section>

        <aside className={`board3d-inspector${selected ? '' : ' board3d-inspector--empty'}`} aria-live="polite">
          {selected ? (
            <>
              <div className="board3d-location-name">
                <span className="board3d-location-dot" style={{ color: selected.accent, background: selected.accent }} />
                {selected.name}
              </div>
              <div className="board3d-reference">
                <img src={selected.backgroundUrl} alt={`${selected.name} bakgrunn`} />
                <span><strong>2D bakgrunnsplate</strong><small>{selected.id}.jpg</small></span>
              </div>
              <p>{selected.id === currentLocation ? 'Du står her nå.' : `Rute fra ${current.name}: ${travelCost} timer.`}</p>
              <p className="board3d-action-copy"><strong>{selected.action}</strong><br />{selected.actionResult}</p>
              <div className="board3d-status" style={{ justifyContent: 'flex-start', marginTop: 10 }}>
                <span className="board3d-chip"><strong>Utdanning</strong> {education}</span>
                <span className="board3d-chip"><strong>Lykke</strong> {happiness}</span>
              </div>
            </>
          ) : (
            <>
              <h2>Velg et landemerke</h2>
              <p>Byene er bygget som en 3D-diorama fra samme kanoniske 15-steders ring som originalbrettet. Første posisjon: Slums.</p>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}

export default Board3D;
