import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { IntroBeats } from '../features/experience/model/types';

const backgroundVertexShader = `
uniform float uTime;
uniform float uReveal;

attribute float aSize;
attribute float aIntensity;
attribute vec3 aTint;

varying vec3 vTint;
varying float vIntensity;
varying float vSize;

void main() {
  vec3 pos = position;
  float twinkle = sin(uTime * 0.08 + aIntensity * 9.0 + position.x * 0.02) * 0.08;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  gl_PointSize = aSize * (150.0 / max(1.0, -mvPosition.z)) * (1.0 + twinkle) * mix(0.15, 1.0, uReveal);

  vTint = aTint;
  vIntensity = aIntensity;
  vSize = aSize;
}
`;

const backgroundFragmentShader = `
uniform float uReveal;

varying vec3 vTint;
varying float vIntensity;
varying float vSize;

void main() {
  vec2 centered = gl_PointCoord - 0.5;
  float dist = length(centered);

  if (dist > 0.5) {
    discard;
  }

  float core = smoothstep(0.12, 0.0, dist);
  float halo = smoothstep(0.5, 0.04, dist);
  float verticalSpike = 1.0 - smoothstep(0.01, 0.14, abs(centered.x));
  float horizontalSpike = 1.0 - smoothstep(0.01, 0.14, abs(centered.y));
  float spikes = (verticalSpike + horizontalSpike) * smoothstep(1.2, 2.6, vSize) * (0.12 + vIntensity * 0.3);

  float alpha = clamp((core * 1.2 + halo * 0.26 + spikes * 0.16) * uReveal, 0.0, 1.0);
  vec3 color = vTint * (0.92 + core * 1.1 + spikes * 0.9);

  gl_FragColor = vec4(color, alpha);
}
`;

const dustVertexShader = `
uniform float uTime;
uniform float uReveal;

attribute float aSize;
attribute float aIntensity;
attribute vec3 aTint;

varying vec3 vTint;
varying float vIntensity;

void main() {
  vec3 pos = position;
  pos.x += sin(uTime * 0.03 + position.y * 0.02) * 0.18;
  pos.y += cos(uTime * 0.025 + position.x * 0.015) * 0.1;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = aSize * (170.0 / max(1.0, -mvPosition.z)) * mix(0.2, 1.0, uReveal);

  vTint = aTint;
  vIntensity = aIntensity;
}
`;

const dustFragmentShader = `
uniform float uReveal;

varying vec3 vTint;
varying float vIntensity;

void main() {
  vec2 centered = gl_PointCoord - 0.5;
  float dist = length(centered);

  if (dist > 0.5) {
    discard;
  }

  float haze = smoothstep(0.5, 0.0, dist);
  haze = pow(haze, 1.4);

  gl_FragColor = vec4(vTint, haze * vIntensity * 0.22 * uReveal);
}
`;

const STAR_COUNT = 14000;
const DUST_COUNT = 26000;

const warmWhite = new THREE.Color('#ffe9d3');
const coldWhite = new THREE.Color('#dbe8ff');
const blueWhite = new THREE.Color('#b9d5ff');
const lilacDust = new THREE.Color('#8797d8');
const blueDust = new THREE.Color('#86a9ff');
const paleDust = new THREE.Color('#d7e1ff');

function randomSpherePoint(radius: number) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);

  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

interface DeepSpaceBackdropProps {
  beats: IntroBeats;
}

export function DeepSpaceBackdrop({ beats }: DeepSpaceBackdropProps) {
  const starPointsRef =
    useRef<THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | null>(null);
  const dustPointsRef =
    useRef<THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | null>(null);
  const warmNebulaRef = useRef<THREE.Mesh | null>(null);
  const coolNebulaRef = useRef<THREE.Mesh | null>(null);

  const stars = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);
    const intensities = new Float32Array(STAR_COUNT);
    const tints = new Float32Array(STAR_COUNT * 3);

    for (let i = 0; i < STAR_COUNT; i += 1) {
      const i3 = i * 3;
      const radius = 130 + Math.random() * 110;
      const point = randomSpherePoint(radius);
      const colorRoll = Math.random();
      const tint =
        colorRoll > 0.84 ? warmWhite : colorRoll > 0.4 ? coldWhite : blueWhite;

      positions[i3] = point.x;
      positions[i3 + 1] = point.y * 0.9;
      positions[i3 + 2] = point.z;

      sizes[i] = 0.55 + Math.pow(Math.random(), 3) * 3.4;
      intensities[i] = 0.32 + Math.random() * 0.68;

      tints[i3] = tint.r;
      tints[i3 + 1] = tint.g;
      tints[i3 + 2] = tint.b;
    }

    return { positions, sizes, intensities, tints };
  }, []);

  const dust = useMemo(() => {
    const positions = new Float32Array(DUST_COUNT * 3);
    const sizes = new Float32Array(DUST_COUNT);
    const intensities = new Float32Array(DUST_COUNT);
    const tints = new Float32Array(DUST_COUNT * 3);

    for (let i = 0; i < DUST_COUNT; i += 1) {
      const i3 = i * 3;
      const spread = (Math.random() - 0.5) * 150;
      const thickness = (Math.random() - 0.5) * 20 * (0.35 + Math.random());
      const depth = (Math.random() - 0.5) * 55;
      const bandCurve = Math.sin(spread * 0.035) * 9;
      const tintRoll = Math.random();
      const tint = tintRoll > 0.66 ? paleDust : tintRoll > 0.33 ? blueDust : lilacDust;

      positions[i3] = spread;
      positions[i3 + 1] = thickness + bandCurve;
      positions[i3 + 2] = depth - 70 - Math.random() * 28;

      sizes[i] = 0.7 + Math.random() * 2.2;
      intensities[i] = 0.22 + Math.random() * 0.5;

      tints[i3] = tint.r;
      tints[i3 + 1] = tint.g;
      tints[i3 + 2] = tint.b;
    }

    return { positions, sizes, intensities, tints };
  }, []);

  const starUniforms = useMemo(() => ({ uTime: { value: 0 }, uReveal: { value: 0 } }), []);
  const dustUniforms = useMemo(() => ({ uTime: { value: 0 }, uReveal: { value: 0 } }), []);

  useFrame((_, delta) => {
    if (starPointsRef.current) {
      starPointsRef.current.material.uniforms.uTime.value += delta;
      starPointsRef.current.material.uniforms.uReveal.value = THREE.MathUtils.lerp(
        starPointsRef.current.material.uniforms.uReveal.value,
        beats.starRevealBeat.progress,
        0.008,
      );
      starPointsRef.current.rotation.y += 0.00004;
      starPointsRef.current.rotation.x = Math.sin(
        starPointsRef.current.material.uniforms.uTime.value * 0.02,
      ) * 0.04;
    }

    if (dustPointsRef.current) {
      dustPointsRef.current.material.uniforms.uTime.value += delta;
      dustPointsRef.current.material.uniforms.uReveal.value = THREE.MathUtils.lerp(
        dustPointsRef.current.material.uniforms.uReveal.value,
        beats.nebulaRevealBeat.progress,
        0.007,
      );
      dustPointsRef.current.rotation.z = -0.42;
      dustPointsRef.current.rotation.y += 0.00009;
      dustPointsRef.current.position.z = -14;
    }

    if (warmNebulaRef.current?.material instanceof THREE.MeshBasicMaterial) {
      const pulse = 0.85 + Math.sin(performance.now() * 0.00035) * 0.15;
      warmNebulaRef.current.material.opacity =
        beats.nebulaRevealBeat.progress * 0.1 * pulse;
    }

    if (coolNebulaRef.current?.material instanceof THREE.MeshBasicMaterial) {
      const pulse = 0.86 + Math.sin(performance.now() * 0.00032 + 0.8) * 0.14;
      coolNebulaRef.current.material.opacity =
        beats.nebulaRevealBeat.progress * 0.095 * pulse;
    }
  });

  return (
    <group>
      <mesh position={[-36, 22, -52]} ref={warmNebulaRef} scale={[2.6, 1.6, 1]}>
        <sphereGeometry args={[12, 32, 32]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color="#ff7e45"
          depthWrite={false}
          transparent
        />
      </mesh>
      <mesh position={[34, -20, -48]} ref={coolNebulaRef} scale={[2.8, 1.7, 1]}>
        <sphereGeometry args={[12, 32, 32]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color="#5ea6ff"
          depthWrite={false}
          transparent
        />
      </mesh>

      <points ref={starPointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[stars.positions, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[stars.sizes, 1]} />
          <bufferAttribute
            attach="attributes-aIntensity"
            args={[stars.intensities, 1]}
          />
          <bufferAttribute attach="attributes-aTint" args={[stars.tints, 3]} />
        </bufferGeometry>
        <shaderMaterial
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fragmentShader={backgroundFragmentShader}
          transparent
          uniforms={starUniforms}
          vertexShader={backgroundVertexShader}
        />
      </points>

      <points ref={dustPointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dust.positions, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[dust.sizes, 1]} />
          <bufferAttribute attach="attributes-aIntensity" args={[dust.intensities, 1]} />
          <bufferAttribute attach="attributes-aTint" args={[dust.tints, 3]} />
        </bufferGeometry>
        <shaderMaterial
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fragmentShader={dustFragmentShader}
          transparent
          uniforms={dustUniforms}
          vertexShader={dustVertexShader}
        />
      </points>
    </group>
  );
}
