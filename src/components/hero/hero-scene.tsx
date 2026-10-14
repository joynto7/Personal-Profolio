"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SceneFallback } from "@/components/hero/scene-fallback";

/**
 * The hero's 3D environment: an astronaut on a floating rock, holographic code windows,
 * a ringed planet, stars and drifting dust. The camera eases toward the mouse and pulls
 * back as the page scrolls. Rendering pauses while the hero is off-screen, everything holds
 * still for reduced motion, and browsers without WebGL get the drawn fallback.
 */

type Quality = { stars: number; dust: number; dpr: [number, number] };

// ---------------------------------------------------------------- helpers

/** Deterministic noise from a position, so vertices shared between faces move together. */
function hash3(x: number, y: number, z: number) {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function glowTexture(inner: string, outer: string) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.35, outer);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

type PanelKind = "code" | "icon" | "chart" | "terminal";

function panelTexture(kind: PanelKind, seed: number) {
  const random = seeded(seed);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 340;
  const ctx = canvas.getContext("2d")!;
  const palette = ["#67e8f9", "#a78bfa", "#60a5fa", "#34d399", "#f0abfc", "#fbbf24"];

  ctx.fillStyle = "rgba(14, 116, 144, 0.16)";
  ctx.fillRect(0, 0, 512, 340);
  ctx.fillStyle = "rgba(34, 211, 238, 0.22)";
  ctx.fillRect(0, 0, 512, 34);
  ["#f87171", "#fbbf24", "#34d399"].forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(22 + i * 22, 17, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  const bar = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, h / 2);
    ctx.fill();
  };

  if (kind === "icon") {
    ctx.strokeStyle = "#a5f3fc";
    ctx.lineWidth = 16;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(196, 120);
    ctx.lineTo(136, 186);
    ctx.lineTo(196, 252);
    ctx.moveTo(316, 120);
    ctx.lineTo(376, 186);
    ctx.lineTo(316, 252);
    ctx.moveTo(282, 104);
    ctx.lineTo(230, 268);
    ctx.stroke();
  } else if (kind === "chart") {
    const heights = [90, 150, 110, 190, 140, 220, 170];
    heights.forEach((h, i) => bar(46 + i * 62, 300 - h, 34, h, i % 2 ? "#a78bfa" : "#22d3ee"));
    ctx.strokeStyle = "#f0abfc";
    ctx.lineWidth = 5;
    ctx.beginPath();
    heights.forEach((h, i) => (i ? ctx.lineTo(63 + i * 62, 280 - h) : ctx.moveTo(63, 280 - h)));
    ctx.stroke();
  } else {
    for (let row = 0; row < 11; row++) {
      let x = kind === "terminal" ? 26 : 26 + (row % 3) * 18;
      if (kind === "terminal") bar(x, 56 + row * 25, 14, 10, "#34d399");
      if (kind === "terminal") x += 26;
      const segments = 1 + Math.floor(random() * 3);
      for (let s = 0; s < segments; s++) {
        const w = 40 + random() * 120;
        if (x + w > 490) break;
        bar(x, 56 + row * 25, w, 10, palette[Math.floor(random() * palette.length)]);
        x += w + 14;
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** A capsule stretched between two points, for the astronaut's limbs. */
function Limb({ from, to, radius, material }: { from: THREE.Vector3; to: THREE.Vector3; radius: number; material: THREE.Material }) {
  const { position, quaternion, length } = useMemo(() => {
    const direction = new THREE.Vector3().subVectors(to, from);
    return {
      position: new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()),
      length: direction.length(),
    };
  }, [from, to]);
  return (
    <mesh position={position} quaternion={quaternion} material={material}>
      <capsuleGeometry args={[radius, Math.max(length - radius * 2, 0.01), 6, 12]} />
    </mesh>
  );
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------- scene pieces

function Island({ animate }: { animate: boolean }) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const debris = useRef<THREE.Group>(null);

  const rock = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(2.3, 0.4, 1.7, 16, 6, false);
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      const noise = hash3(Math.round(vertex.x * 100), Math.round(vertex.y * 100), Math.round(vertex.z * 100));
      if (vertex.y > 0.84) {
        vertex.y = 0.85 + (noise - 0.5) * 0.05;
      } else {
        const depth = (0.85 - vertex.y) / 1.7;
        const scale = 1 + (noise - 0.5) * (0.3 + depth * 0.5);
        vertex.x *= scale;
        vertex.z *= scale;
        vertex.y += (noise - 0.5) * 0.22;
        if (depth > 0.85) vertex.y -= noise * 0.5;
      }
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    geometry.computeVertexNormals();
    return geometry;
  }, []);

  const rocks = useMemo(() => {
    const random = seeded(29);
    return Array.from({ length: 11 }, () => {
      const angle = random() * Math.PI * 2;
      const radius = 2.7 + random() * 0.9;
      return {
        position: [Math.cos(angle) * radius, -0.9 + random() * 1.6, Math.sin(angle) * radius] as [number, number, number],
        size: 0.07 + random() * 0.16,
        phase: random() * Math.PI * 2,
      };
    });
  }, []);

  const underGlow = useMemo(() => glowTexture("rgba(165,243,252,1)", "rgba(99,102,241,0.45)"), []);
  const beam = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 128);
    gradient.addColorStop(0, "rgba(34,211,238,0.85)");
    gradient.addColorStop(1, "rgba(124,58,237,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 4, 128);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);

  useFrame(({ clock }) => {
    if (!animate) return;
    const t = clock.elapsedTime;
    if (group.current) {
      group.current.position.y = Math.sin(t * 0.6) * 0.08;
      group.current.rotation.y = Math.sin(t * 0.15) * 0.08;
    }
    if (ring.current) ring.current.rotation.z = t * 0.12;
    debris.current?.children.forEach((child, i) => {
      child.position.y = rocks[i].position[1] + Math.sin(t * 0.8 + rocks[i].phase) * 0.12;
      child.rotation.x = t * 0.3 + i;
      child.rotation.y = t * 0.2 + i;
    });
  });

  return (
    <group ref={group}>
      <mesh geometry={rock} castShadow>
        <meshStandardMaterial color="#2a3152" roughness={0.9} metalness={0.12} flatShading />
      </mesh>
      <mesh position={[0, 0.865, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.18, 48]} />
        <meshStandardMaterial color="#1c2240" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.87, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.22, 0.022, 8, 120]} />
        <meshBasicMaterial color="#22d3ee" toneMapped={false} />
      </mesh>
      <mesh ref={ring} position={[0, 0.2, 0]} rotation={[Math.PI / 2.15, 0, 0]}>
        <torusGeometry args={[3.05, 0.012, 6, 160]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.75} toneMapped={false} />
      </mesh>
      <sprite position={[0, -1.15, 0]} scale={[6.5, 3, 1]}>
        <spriteMaterial map={underGlow} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <mesh position={[0, -2.6, 0]}>
        <coneGeometry args={[1.05, 3.2, 32, 1, true]} />
        <meshBasicMaterial map={beam} transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <group ref={debris}>
        {rocks.map((piece, i) => (
          <mesh key={i} position={piece.position}>
            <dodecahedronGeometry args={[piece.size, 0]} />
            <meshStandardMaterial color="#323a60" roughness={0.85} flatShading />
          </mesh>
        ))}
      </group>
      <Astronaut />
    </group>
  );
}

function Astronaut() {
  const suit = useMemo(() => new THREE.MeshStandardMaterial({ color: "#dfe5f1", roughness: 0.55, metalness: 0.15 }), []);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: "#0b1022", roughness: 0.2, metalness: 0.75, emissive: "#0e7490", emissiveIntensity: 0.3 }), []);
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ color: "#67e8f9", toneMapped: false }), []);
  const screenGlow = useMemo(() => glowTexture("rgba(165,243,252,1)", "rgba(34,211,238,0.35)"), []);

  return (
    <group position={[-0.15, 0.88, 0.35]} rotation={[0, 0.35, 0]} scale={0.95}>
      {/* torso, leaning toward the laptop */}
      <mesh position={[0, 0.42, 0]} rotation={[-0.22, 0, 0]} material={suit}>
        <capsuleGeometry args={[0.2, 0.28, 6, 16]} />
      </mesh>
      <mesh position={[0, 0.47, 0.19]} rotation={[-0.22, 0, 0]} material={suit}>
        <boxGeometry args={[0.34, 0.42, 0.16]} />
      </mesh>
      <mesh position={[0, 0.5, 0.275]} rotation={[-0.22, 0, 0]} material={glow}>
        <boxGeometry args={[0.2, 0.025, 0.01]} />
      </mesh>
      <mesh position={[0, 0.42, 0.29]} rotation={[-0.22, 0, 0]} material={dark}>
        <boxGeometry args={[0.22, 0.12, 0.01]} />
      </mesh>
      {/* helmet */}
      <mesh position={[0, 0.86, -0.06]} material={suit}>
        <sphereGeometry args={[0.2, 24, 18]} />
      </mesh>
      <mesh position={[0, 0.85, -0.17]} rotation={[-Math.PI / 2 + 0.1, 0, 0]} material={dark}>
        <sphereGeometry args={[0.15, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
      </mesh>
      <mesh position={[0.12, 1.06, 0]} material={glow}>
        <sphereGeometry args={[0.018, 8, 8]} />
      </mesh>
      {/* arms reaching for the keyboard */}
      <Limb from={v(-0.24, 0.6, -0.02)} to={v(-0.18, 0.4, -0.38)} radius={0.07} material={suit} />
      <Limb from={v(0.24, 0.6, -0.02)} to={v(0.18, 0.4, -0.38)} radius={0.07} material={suit} />
      {/* legs: knees up, feet on the rock */}
      <Limb from={v(-0.12, 0.2, 0)} to={v(-0.17, 0.32, -0.44)} radius={0.085} material={suit} />
      <Limb from={v(0.12, 0.2, 0)} to={v(0.17, 0.32, -0.44)} radius={0.085} material={suit} />
      <Limb from={v(-0.17, 0.32, -0.44)} to={v(-0.18, 0.05, -0.52)} radius={0.075} material={suit} />
      <Limb from={v(0.17, 0.32, -0.44)} to={v(0.18, 0.05, -0.52)} radius={0.075} material={suit} />
      {/* laptop on the knees, screen facing the astronaut */}
      <mesh position={[0, 0.38, -0.5]} rotation={[0.25, 0, 0]} material={dark}>
        <boxGeometry args={[0.44, 0.02, 0.28]} />
      </mesh>
      <mesh position={[0, 0.52, -0.66]} rotation={[0.35, 0, 0]}>
        <planeGeometry args={[0.42, 0.27]} />
        <meshBasicMaterial color="#22d3ee" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <sprite position={[0, 0.55, -0.5]} scale={[1.6, 1.2, 1]}>
        <spriteMaterial map={screenGlow} transparent opacity={0.65} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <pointLight position={[0, 0.6, -0.4]} color="#67e8f9" intensity={2.5} distance={2.6} />
    </group>
  );
}

const PANELS: { position: [number, number, number]; rotation: number; size: [number, number]; kind: PanelKind; seed: number }[] = [
  { position: [-2.75, 2.05, -1.2], rotation: 0.5, size: [1.55, 1.03], kind: "code", seed: 3 },
  { position: [-1.15, 3.05, -2.3], rotation: 0.22, size: [1.75, 1.16], kind: "code", seed: 7 },
  { position: [0.75, 3.15, -2.6], rotation: -0.05, size: [1.15, 0.78], kind: "icon", seed: 1 },
  { position: [2.15, 2.4, -1.9], rotation: -0.38, size: [1.15, 1.45], kind: "terminal", seed: 11 },
  { position: [-3.35, 0.85, -0.4], rotation: 0.65, size: [0.95, 0.7], kind: "chart", seed: 5 },
  { position: [3.1, 1.15, -0.7], rotation: -0.6, size: [0.85, 1.05], kind: "code", seed: 13 },
];

function HoloPanels({ animate }: { animate: boolean }) {
  const groups = useRef<(THREE.Group | null)[]>([]);
  const textures = useMemo(() => PANELS.map((panel) => panelTexture(panel.kind, panel.seed)), []);
  const edges = useMemo(() => PANELS.map((panel) => new THREE.EdgesGeometry(new THREE.PlaneGeometry(...panel.size))), []);

  useFrame(({ clock }) => {
    if (!animate) return;
    const t = clock.elapsedTime;
    groups.current.forEach((group, i) => {
      if (!group) return;
      group.position.y = PANELS[i].position[1] + Math.sin(t * 0.55 + i * 1.3) * 0.09;
      group.rotation.y = PANELS[i].rotation + Math.sin(t * 0.3 + i) * 0.04;
    });
  });

  return (
    <>
      {PANELS.map((panel, i) => (
        <group key={i} ref={(node) => { groups.current[i] = node; }} position={panel.position} rotation={[0, panel.rotation, 0]}>
          <mesh>
            <planeGeometry args={panel.size} />
            <meshBasicMaterial map={textures[i]} transparent opacity={0.95} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>
          <lineSegments geometry={edges[i]}>
            <lineBasicMaterial color="#67e8f9" transparent opacity={0.85} toneMapped={false} />
          </lineSegments>
        </group>
      ))}
    </>
  );
}

const planetVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vLocal;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - world.xyz);
    vLocal = position;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const planetFragment = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vLocal;
  uniform vec3 uLight;
  void main() {
    float bands = sin(vLocal.y * 5.0 + sin(vLocal.x * 2.0) * 1.5) * 0.5 + 0.5;
    vec3 base = mix(vec3(0.04, 0.06, 0.2), vec3(0.2, 0.09, 0.42), bands * 0.6);
    float light = clamp(dot(vNormal, normalize(uLight)), 0.0, 1.0);
    float rim = pow(1.0 - clamp(dot(vNormal, vView), 0.0, 1.0), 2.6);
    vec3 color = base * (0.35 + light * 0.9);
    color += mix(vec3(0.3, 0.75, 1.0), vec3(0.75, 0.5, 1.0), vLocal.y * 0.15 + 0.5) * rim * (0.6 + light * 1.6);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const atmosphereFragment = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vLocal;
  void main() {
    float rim = pow(1.0 - abs(dot(vNormal, vView)), 3.0);
    gl_FragColor = vec4(mix(vec3(0.35, 0.7, 1.0), vec3(0.7, 0.45, 1.0), vLocal.y * 0.12 + 0.5), rim * 0.65);
  }
`;

function Planet() {
  const ring = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 4;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 256, 0);
    gradient.addColorStop(0, "rgba(167,139,250,0)");
    gradient.addColorStop(0.5, "rgba(167,139,250,0.65)");
    gradient.addColorStop(1, "rgba(103,232,249,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 4);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
  const uniforms = useMemo(() => ({ uLight: { value: new THREE.Vector3(-0.6, 0.6, 0.7) } }), []);

  return (
    <group position={[7.4, 4.7, -15]}>
      <mesh>
        <sphereGeometry args={[3.4, 64, 48]} />
        <shaderMaterial vertexShader={planetVertex} fragmentShader={planetFragment} uniforms={uniforms} />
      </mesh>
      <mesh scale={1.08}>
        <sphereGeometry args={[3.4, 48, 32]} />
        <shaderMaterial vertexShader={planetVertex} fragmentShader={atmosphereFragment} transparent side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh rotation={[1.25, 0.3, 0.2]}>
        <ringGeometry args={[4.3, 5.4, 128]} />
        <meshBasicMaterial map={ring} transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Stars({ count }: { count: number }) {
  const points = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const random = seeded(17);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const tints = [new THREE.Color("#ffffff"), new THREE.Color("#bae6fd"), new THREE.Color("#ddd6fe")];
    for (let i = 0; i < count; i++) {
      const radius = 30 + random() * 40;
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      positions.set([radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta) - 10], i * 3);
      const tint = tints[i % tints.length];
      colors.set([tint.r, tint.g, tint.b], i * 3);
    }
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    buffer.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return buffer;
  }, [count]);

  useFrame((_, delta) => {
    if (points.current) points.current.rotation.y += delta * 0.006;
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial size={0.16} sizeAttenuation vertexColors transparent opacity={0.9} depthWrite={false} />
    </points>
  );
}

function Dust({ count, animate }: { count: number; animate: boolean }) {
  const points = useRef<THREE.Points>(null);
  const sprite = useMemo(() => glowTexture("rgba(255,255,255,1)", "rgba(165,243,252,0.4)"), []);
  const geometry = useMemo(() => {
    const random = seeded(41);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const cyan = new THREE.Color("#67e8f9");
    const violet = new THREE.Color("#c4b5fd");
    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2;
      const radius = 0.6 + random() * 4.2;
      positions.set([Math.cos(angle) * radius, -1.6 + random() * 5.4, Math.sin(angle) * radius - 0.6], i * 3);
      const color = i % 2 ? cyan : violet;
      colors.set([color.r, color.g, color.b], i * 3);
    }
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    buffer.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return buffer;
  }, [count]);

  useFrame((_, delta) => {
    if (!animate || !points.current) return;
    const position = points.current.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < position.count; i++) {
      let y = position.getY(i) + delta * (0.12 + (i % 5) * 0.03);
      if (y > 3.8) y = -1.6;
      position.setY(i, y);
    }
    position.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial map={sprite} size={0.09} sizeAttenuation vertexColors transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/**
 * Eases the camera toward the mouse and pulls it back as the hero scrolls away. Narrow
 * canvases (phones, the two-column layout at 1024px) also stand further off, so the whole
 * island stays in frame.
 */
function CameraRig({ animate }: { animate: boolean }) {
  const pointer = useRef({ x: 0, y: 0 });
  const placed = useRef(false);
  const target = useMemo(() => new THREE.Vector3(0, 1.25, -0.6), []);
  const goal = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (!animate) return;
    const onMove = (event: PointerEvent) => {
      pointer.current.x = event.clientX / window.innerWidth - 0.5;
      pointer.current.y = event.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [animate]);

  useFrame(({ camera, size }) => {
    const fit = Math.max(1, 1.1 / (size.width / size.height));
    const scroll = animate ? Math.min(window.scrollY / 700, 1) : 0;
    const { x, y } = animate ? pointer.current : { x: 0, y: 0 };
    // The offset from the target at rest is (0.4, 0.7, 8.5).
    goal.set(0.4 + x * 1.1, 0.7 - y * 0.6 + scroll * 0.4, 8.5 + scroll * 1.8).multiplyScalar(fit).add(target);
    // Snap into place on the first frame, then glide.
    if (animate && placed.current) camera.position.lerp(goal, 0.045);
    else camera.position.copy(goal);
    placed.current = true;
    camera.lookAt(target);
  });

  return null;
}

// ---------------------------------------------------------------- canvas

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function HeroScene({ reduceMotion }: { reduceMotion: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [support] = useState(() => (typeof window === "undefined" ? true : hasWebGL()));
  const [quality] = useState<Quality>(() => {
    if (typeof window === "undefined") return { stars: 1400, dust: 160, dpr: [1, 1.75] };
    const small = window.matchMedia("(max-width: 767px)").matches;
    const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4;
    return small || lowPower ? { stars: 650, dust: 70, dpr: [1, 1.25] } : { stars: 1400, dust: 160, dpr: [1, 1.75] };
  });

  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "120px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (!support) return <SceneFallback />;
  const animate = !reduceMotion;

  return (
    <div ref={container} className="hero-scene-mask absolute inset-0">
      <Canvas
        dpr={quality.dpr}
        camera={{ fov: 42, position: [0.4, 1.95, 7.9], near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        frameloop={visible && animate ? "always" : "demand"}
        aria-hidden
      >
        <ambientLight intensity={0.45} color="#8ea0ff" />
        <hemisphereLight args={["#7dd3fc", "#1e1b4b", 0.35]} />
        <directionalLight position={[6, 7, -4]} intensity={1.8} color="#c7d2fe" />
        <directionalLight position={[-4, 3, 6]} intensity={0.5} color="#67e8f9" />
        <pointLight position={[-1.6, 2.6, -1.2]} color="#22d3ee" intensity={22} distance={9} />
        <pointLight position={[1.8, 2.2, -1.6]} color="#a855f7" intensity={16} distance={8} />
        <pointLight position={[0, -1.4, 1.6]} color="#6366f1" intensity={10} distance={6} />
        <Stars count={quality.stars} />
        <Planet />
        <Island animate={animate} />
        <HoloPanels animate={animate} />
        <Dust count={quality.dust} animate={animate} />
        <CameraRig animate={animate} />
      </Canvas>
    </div>
  );
}
