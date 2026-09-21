import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

interface Orchestra3DProps {
  readonly className?: string;
}

interface InstrumentRef {
  readonly group: THREE.Group;
  readonly baseY: number;
  readonly baseX: number;
  readonly baseZ: number;
  readonly spinAxis: THREE.Vector3;
  readonly spinSpeed: number;
  readonly floatAmplitude: number;
  readonly floatSpeed: number;
}

interface InstrumentSpec {
  readonly url: string;
  readonly position: readonly [number, number, number];
  readonly rotation: readonly [number, number, number];
  readonly scale: number;
  readonly spinSpeed: number;
  readonly floatAmplitude: number;
  readonly floatSpeed: number;
  readonly spinAxis: readonly [number, number, number];
}

interface Firefly {
  readonly base: THREE.Vector3;
  readonly phase: number;
  readonly speed: number;
  readonly radius: number;
}

const lerp = (current: number, target: number, factor: number): number =>
  current + (target - current) * factor;

function applyCameraFraming(camera: THREE.PerspectiveCamera, width: number, height: number): void {
  const aspect = width / height;
  camera.aspect = aspect;
  if (aspect < 0.75) {
    // Mobile vertical (portrait): frame instruments dynamically so they are visible behind/under hero text
    camera.position.set(5.5, -0.3, 14.5);
    camera.lookAt(5.5, -0.5, 0);
  } else if (aspect < 1.1) {
    // Tablet / square
    camera.position.set(3.5, 0, 13.0);
    camera.lookAt(4.0, 0, 0);
  } else {
    // Desktop widescreen
    camera.position.set(0.5, 0.2, 11.5);
    camera.lookAt(2.5, 0, 0);
  }
  camera.updateProjectionMatrix();
}

const INSTRUMENTS: readonly InstrumentSpec[] = [
  {
    url: "/models/violin.glb",
    position: [8.5, -0.4, 0.6],
    rotation: [-1.3, -0.35, 0.15],
    scale: 3.0,
    spinSpeed: 0.0005,
    floatAmplitude: 0.1,
    floatSpeed: 0.7,
    spinAxis: [0.04, 1, 0.08],
  },
  {
    url: "/models/guitar.glb",
    position: [6.0, 0.5, 0.2],
    rotation: [-0.15, 0.4, 0.3],
    scale: 0.4,
    spinSpeed: -0.0005,
    floatAmplitude: 0.12,
    floatSpeed: 0.9,
    spinAxis: [-0.05, 1, 0.1],
  },
  {
    url: "/models/harp.glb",
    position: [4.6, -2.7, -0.6],
    rotation: [0, 0, 0.18],
    scale: 0.95,
    spinSpeed: 0.0005,
    floatAmplitude: 0.08,
    floatSpeed: 0.5,
    spinAxis: [0, 1, 0.04],
  },
];

const FIREFLY_COUNT = 160;

export default function Orchestra3D({
  className,
}: Orchestra3DProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rafRef = useRef<number | null>(null);
  const isVisibleRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const startTimeRef = useRef(0);
  const instrumentsRef = useRef<InstrumentRef[]>([]);
  const disposablesRef = useRef<{
    geometries: THREE.BufferGeometry[];
    materials: THREE.Material[];
    textures: THREE.Texture[];
  }>({ geometries: [], materials: [], textures: [] });
  const targetMouseRef = useRef({ x: 0, y: 0 });
  const smoothedMouseRef = useRef({ x: 0, y: 0 });

  const firefliesRef = useRef<{
    points: THREE.Points | null;
    data: Firefly[];
    positions: Float32Array | null;
    phases: Float32Array | null;
    material: THREE.ShaderMaterial | null;
  }>({
    points: null,
    data: [],
    positions: null,
    phases: null,
    material: null,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = motionQuery.matches;

    if (reducedMotionRef.current) {
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;

    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 100);
    applyCameraFraming(camera, width, height);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const keyLight = new THREE.DirectionalLight(0xfff5e0, 1.7);
    keyLight.position.set(4, 6, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x9ec8ff, 0.7);
    fillLight.position.set(-5, 2, 3);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x4fc3f5, 1.4, 16, 1.5);
    rimLight.position.set(-3, -2, -3);
    scene.add(rimLight);

    const warmRim = new THREE.PointLight(0xffb866, 0.9, 14, 1.5);
    warmRim.position.set(3, -1.5, -2);
    scene.add(warmRim);

    const fireflies = createFireflies();
    firefliesRef.current = fireflies;
    if (fireflies.points) {
      scene.add(fireflies.points);
    }

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(
      "https://www.gstatic.com/draco/versioned/decoders/1.5.7/",
    );

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    const loadInstrument = (spec: InstrumentSpec): Promise<InstrumentRef | null> =>
      new Promise((resolve) => {
        gltfLoader.load(
          spec.url,
          (gltf) => {
            const root = gltf.scene;
            root.position.set(...spec.position);
            root.rotation.set(...spec.rotation);
            root.scale.setScalar(spec.scale);
            scene.add(root);

            root.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                if (child.geometry instanceof THREE.BufferGeometry) {
                  disposablesRef.current.geometries.push(child.geometry);
                }
                const mat = child.material;
                const mats = Array.isArray(mat) ? mat : mat ? [mat] : [];
                for (const m of mats) {
                  disposablesRef.current.materials.push(m);
                  const stdMat = m as THREE.MeshStandardMaterial;
                  if (stdMat.map) disposablesRef.current.textures.push(stdMat.map);
                  if (stdMat.normalMap)
                    disposablesRef.current.textures.push(stdMat.normalMap);
                  if (stdMat.roughnessMap)
                    disposablesRef.current.textures.push(stdMat.roughnessMap);
                  if (stdMat.metalnessMap)
                    disposablesRef.current.textures.push(stdMat.metalnessMap);
                  if (stdMat.emissiveMap)
                    disposablesRef.current.textures.push(stdMat.emissiveMap);
                  stdMat.envMapIntensity = 0.4;
                }
              }
            });

            resolve({
              group: root,
              baseY: spec.position[1],
              baseX: spec.position[0],
              baseZ: spec.position[2],
              spinAxis: new THREE.Vector3(...spec.spinAxis).normalize(),
              spinSpeed: spec.spinSpeed,
              floatAmplitude: spec.floatAmplitude,
              floatSpeed: spec.floatSpeed,
            });
          },
          undefined,
          () => {
            resolve(null);
          },
        );
      });

    let cancelled = false;

    void Promise.all(INSTRUMENTS.map(loadInstrument)).then((loaded) => {
      if (cancelled) return;
      const valid = loaded.filter((x): x is InstrumentRef => x !== null);
      instrumentsRef.current = valid;
    });

    const onPointerMove = (event: PointerEvent): void => {
      const rect = renderer.domElement.getBoundingClientRect();
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      targetMouseRef.current.x = nx;
      targetMouseRef.current.y = ny;
    };

    const onTouchMove = (event: TouchEvent): void => {
      if (event.touches.length > 0) {
        const touch = event.touches[0];
        const rect = renderer.domElement.getBoundingClientRect();
        const nx = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -(((touch.clientY - rect.top) / rect.height) * 2 - 1);
        targetMouseRef.current.x = nx;
        targetMouseRef.current.y = ny;
      }
    };

    const onPointerLeave = (): void => {
      targetMouseRef.current.x = 0;
      targetMouseRef.current.y = 0;
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    const handleResize = (): void => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      if (newWidth === 0 || newHeight === 0) return;
      applyCameraFraming(cameraRef.current, newWidth, newHeight);
      rendererRef.current.setSize(newWidth, newHeight);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isVisibleRef.current = entry.isIntersecting;
          if (entry.isIntersecting && rafRef.current === null) {
            startTimeRef.current = performance.now();
            rafRef.current = window.requestAnimationFrame(animate);
          }
        }
      },
      { threshold: 0.05 },
    );
    intersectionObserver.observe(container);

    const animate = (timestamp: number): void => {
      rafRef.current = null;
      if (!isVisibleRef.current || reducedMotionRef.current) return;
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
        return;
      }

      const elapsed = (timestamp - startTimeRef.current) / 1000;

      smoothedMouseRef.current.x = lerp(
        smoothedMouseRef.current.x,
        targetMouseRef.current.x,
        0.05,
      );
      smoothedMouseRef.current.y = lerp(
        smoothedMouseRef.current.y,
        targetMouseRef.current.y,
        0.05,
      );

      const mx = smoothedMouseRef.current.x;
      const my = smoothedMouseRef.current.y;

      for (const inst of instrumentsRef.current) {
        const phase = elapsed * inst.floatSpeed;
        inst.group.position.y =
          inst.baseY + Math.sin(phase) * inst.floatAmplitude;
        inst.group.position.x =
          inst.baseX + Math.cos(phase * 0.7) * inst.floatAmplitude * 0.4;
        inst.group.rotateOnAxis(inst.spinAxis, inst.spinSpeed);

        const pushX = mx * 0.4;
        const pushY = my * 0.3;
        const localInfluence =
          1 - Math.min(1, Math.hypot(inst.baseX, inst.baseZ) / 5);
        inst.group.position.x += pushX * localInfluence * 0.3;
        inst.group.position.y += pushY * localInfluence * 0.3;
      }

      updateFireflies(firefliesRef.current, elapsed);

      const cam = cameraRef.current;
      cam.position.x = lerp(cam.position.x, 0.5 + mx * 1.0, 0.04);
      cam.position.y = lerp(cam.position.y, 0.2 + my * 0.6, 0.04);
      cam.lookAt(2.5, 0, 0);

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      rafRef.current = window.requestAnimationFrame(animate);
    };

    rafRef.current = window.requestAnimationFrame(animate);

    const motionChange = (event: MediaQueryListEvent): void => {
      reducedMotionRef.current = event.matches;
      if (event.matches && rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      } else if (
        !event.matches &&
        rafRef.current === null &&
        isVisibleRef.current
      ) {
        startTimeRef.current = performance.now();
        rafRef.current = window.requestAnimationFrame(animate);
      }
    };

    motionQuery.addEventListener("change", motionChange);

    return () => {
      cancelled = true;
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      motionQuery.removeEventListener("change", motionChange);
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("touchmove", onTouchMove);
      dracoLoader.dispose();

      for (const inst of instrumentsRef.current) {
        scene.remove(inst.group);
      }
      instrumentsRef.current = [];

      const fireflies = firefliesRef.current;
      if (fireflies.points) {
        scene.remove(fireflies.points);
        fireflies.points.geometry.dispose();
        fireflies.points = null;
      }
      if (fireflies.material) {
        fireflies.material.dispose();
        fireflies.material = null;
      }
      fireflies.data = [];
      fireflies.positions = null;
      fireflies.phases = null;

      for (const geo of disposablesRef.current.geometries) {
        geo.dispose();
      }
      for (const tex of disposablesRef.current.textures) {
        tex.dispose();
      }
      for (const mat of disposablesRef.current.materials) {
        mat.dispose();
      }
      disposablesRef.current = { geometries: [], materials: [], textures: [] };

      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss();
        if (rendererRef.current.domElement.parentNode === container) {
          container.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current = null;
      }
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`inst-canvas inst-canvas--interactive ${className ?? ""}`}
      aria-hidden="true"
      role="presentation"
      style={{ contain: "layout paint size" }}
    />
  );
}

function createFireflies(): {
  points: THREE.Points;
  data: Firefly[];
  positions: Float32Array;
  phases: Float32Array;
  material: THREE.ShaderMaterial;
} {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(FIREFLY_COUNT * 3);
  const sizes = new Float32Array(FIREFLY_COUNT);
  const phases = new Float32Array(FIREFLY_COUNT);
  const data: Firefly[] = [];

  for (let i = 0; i < FIREFLY_COUNT; i++) {
    const x = (Math.random() - 0.2) * 14;
    const y = (Math.random() - 0.5) * 9;
    const z = -1 - Math.random() * 5;
    positions[i * 3 + 0] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    sizes[i] = 0.12 + Math.random() * 0.18;
    phases[i] = Math.random() * Math.PI * 2;

    data.push({
      base: new THREE.Vector3(x, y, z),
      phase: phases[i],
      speed: 0.2 + Math.random() * 0.35,
      radius: 0.35 + Math.random() * 0.65,
    });
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("phase", new THREE.BufferAttribute(phases, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uColorWarm: { value: new THREE.Color(0xfff0a8) },
      uColorCool: { value: new THREE.Color(0x7ec8ff) },
    },
    vertexShader: `
      attribute float size;
      attribute float phase;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vAlpha;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float pulse = 0.7 + 0.3 * sin(uTime * 1.1 + phase * 3.2);
        vAlpha = pulse;
        gl_PointSize = size * 380.0 * uPixelRatio / -mvPosition.z;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColorWarm;
      uniform vec3 uColorCool;
      varying float vAlpha;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float glow = smoothstep(0.5, 0.0, d);
        float core = smoothstep(0.2, 0.0, d);
        vec3 col = mix(uColorCool, uColorWarm, core * 0.7);
        gl_FragColor = vec4(col, glow * vAlpha * 1.0);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return { points, data, positions, phases, material };
}

function updateFireflies(
  fireflies: {
    points: THREE.Points | null;
    data: Firefly[];
    positions: Float32Array | null;
    material: THREE.ShaderMaterial | null;
  },
  elapsed: number,
): void {
  if (!fireflies.points || !fireflies.positions || !fireflies.material) return;
  const positions = fireflies.positions;
  for (let i = 0; i < fireflies.data.length; i++) {
    const f = fireflies.data[i];
    if (!f) continue;
    const t = elapsed * f.speed + f.phase;
    const x = f.base.x + Math.sin(t) * f.radius;
    const y = f.base.y + Math.cos(t * 0.7) * f.radius * 0.6;
    const z = f.base.z + Math.sin(t * 0.5 + 1.3) * f.radius * 0.4;
    positions[i * 3 + 0] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  const positionAttr = fireflies.points.geometry.attributes.position;
  if (positionAttr instanceof THREE.BufferAttribute) {
    positionAttr.needsUpdate = true;
  }
  fireflies.material.uniforms["uTime"]!.value = elapsed;
}
