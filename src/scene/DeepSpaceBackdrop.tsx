import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type {
  ExperiencePhase,
  GalaxyPostVideoStage,
  GalaxyStage,
  IntroBeats,
} from '../features/experience/model/types';
import { getPostVideoTransitState } from './postVideoTransit';

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

const mistVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const mistFragmentShader = `
uniform float uTime;
uniform float uOpacity;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 4; i++) {
    value += noise(p) * amplitude;
    p *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  vec2 uv = vUv;
  vec2 driftA = uv * vec2(2.2, 1.2) + vec2(uTime * 0.012, -uTime * 0.006);
  vec2 driftB = uv * vec2(3.6, 1.8) + vec2(-uTime * 0.009, uTime * 0.005);
  float cloud = fbm(driftA) * 0.72 + fbm(driftB) * 0.38;
  cloud = smoothstep(0.46, 0.82, cloud);

  float vignette = smoothstep(1.12, 0.18, length(uv - 0.5));
  float alpha = cloud * vignette * uOpacity;
  vec3 color = mix(vec3(0.22, 0.34, 0.62), vec3(0.58, 0.44, 0.78), uv.y * 0.42 + cloud * 0.2);

  gl_FragColor = vec4(color, alpha);
}
`;

const STAR_COUNT = 12000;
const DUST_COUNT = 18000;

const warmWhite = new THREE.Color('#ffe9d3');
const coldWhite = new THREE.Color('#dbe8ff');
const blueWhite = new THREE.Color('#b9d5ff');
const lilacDust = new THREE.Color('#8797d8');
const blueDust = new THREE.Color('#86a9ff');
const paleDust = new THREE.Color('#d7e1ff');
const magentaDust = new THREE.Color('#d59cff');

function randomSpherePoint(radius: number) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);

  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

const flashBand = (value: number, start: number, peak: number, end: number) => {
  if (value <= start || value >= end) {
    return 0;
  }

  if (value <= peak) {
    return (value - start) / (peak - start);
  }

  return 1 - (value - peak) / (end - peak);
};

const memoryWorldConfigs = [
  { position: new THREE.Vector3(-10, 4.5, -30), scale: 6.4, color: '#ffbc80', start: 0.34 },
  { position: new THREE.Vector3(8.4, -3.2, -42), scale: 7.6, color: '#79d2ff', start: 0.48 },
  { position: new THREE.Vector3(-7.2, -1.5, -56), scale: 7.1, color: '#c39dff', start: 0.62 },
  { position: new THREE.Vector3(10.2, 5.8, -72), scale: 8.8, color: '#ff97d8', start: 0.76 },
] as const;

interface DeepSpaceBackdropProps {
  beats: IntroBeats;
  phase: ExperiencePhase;
  singularityProgress: number;
  galaxyStage: GalaxyStage;
  postVideoStage: GalaxyPostVideoStage;
  jumpProgress: number;
}

export function DeepSpaceBackdrop({
  beats,
  phase,
  singularityProgress,
  galaxyStage,
  postVideoStage,
  jumpProgress,
}: DeepSpaceBackdropProps) {
  const backdropGroupRef = useRef<THREE.Group | null>(null);
  const starPointsRef =
    useRef<THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | null>(null);
  const dustPointsRef =
    useRef<THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | null>(null);
  const warmNebulaRef = useRef<THREE.Mesh | null>(null);
  const coolNebulaRef = useRef<THREE.Mesh | null>(null);
  const milkyWayRef = useRef<THREE.Mesh | null>(null);
  const accentNebulaRef = useRef<THREE.Mesh | null>(null);
  const galaxyMistRef = useRef<THREE.Mesh | null>(null);
  const corePortalRef = useRef<THREE.Mesh | null>(null);
  const gateRingRef = useRef<THREE.Mesh | null>(null);
  const memoryWorldRefs = useRef<Array<THREE.Mesh | null>>([]);

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

      sizes[i] = 0.62 + Math.pow(Math.random(), 3) * 4.2;
      intensities[i] = 0.38 + Math.random() * 0.72;

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
      const tint =
        tintRoll > 0.74 ? paleDust : tintRoll > 0.48 ? blueDust : tintRoll > 0.24 ? lilacDust : magentaDust;

      positions[i3] = spread;
      positions[i3 + 1] = thickness + bandCurve;
      positions[i3 + 2] = depth - 70 - Math.random() * 28;

      sizes[i] = 0.9 + Math.random() * 2.6;
      intensities[i] = 0.26 + Math.random() * 0.56;

      tints[i3] = tint.r;
      tints[i3 + 1] = tint.g;
      tints[i3 + 2] = tint.b;
    }

    return { positions, sizes, intensities, tints };
  }, []);

  const starUniforms = useMemo(() => ({ uTime: { value: 0 }, uReveal: { value: 0 } }), []);
  const dustUniforms = useMemo(() => ({ uTime: { value: 0 }, uReveal: { value: 0 } }), []);
  const mistUniforms = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: 0 } }), []);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const blastWindow =
      phase === 'singularity'
        ? THREE.MathUtils.smootherstep(singularityProgress, 0.4, 0.72)
        : 0;
    const isPostVideoPreface = phase === 'galaxy' && postVideoStage === 'preface';
    const isPostVideoJump = phase === 'galaxy' && postVideoStage === 'jump';
    const hideNebulaBlobs =
      phase === 'galaxy' && (galaxyStage === 'artifact' || postVideoStage === 'jump');
    const jumpTransit = isPostVideoJump ? getPostVideoTransitState(jumpProgress) : null;
    const tunnelKill =
      jumpTransit !== null ? 1 - THREE.MathUtils.smootherstep(jumpTransit.tunnel, 0, 0.2) : 1;
    const jumpDive = isPostVideoJump ? THREE.MathUtils.smootherstep(jumpProgress, 0.02, 0.34) : 0;
    const jumpIgnition = isPostVideoJump ? flashBand(jumpProgress, 0.28, 0.42, 0.58) : 0;
    const jumpTraverse = isPostVideoJump ? THREE.MathUtils.smootherstep(jumpProgress, 0.48, 0.9) : 0;
    const jumpAfterglow = isPostVideoJump ? THREE.MathUtils.smootherstep(jumpProgress, 0.88, 1) : 0;
    const tunnelFade = isPostVideoJump ? THREE.MathUtils.smootherstep(jumpProgress, 0.38, 0.52) : 0;
    const sceneFade = (1 - tunnelFade) * (isPostVideoJump ? tunnelKill : 1);
    const galaxyParallax = phase === 'galaxy' ? 1 : 0;
    const postVideoDrift = isPostVideoJump ? 0.34 : isPostVideoPreface ? 0.52 : galaxyParallax;

    if (backdropGroupRef.current) {
      backdropGroupRef.current.position.x = THREE.MathUtils.lerp(
        backdropGroupRef.current.position.x,
        state.pointer.x * 1.35 * postVideoDrift,
        0.025,
      );
      backdropGroupRef.current.position.y = THREE.MathUtils.lerp(
        backdropGroupRef.current.position.y,
        state.pointer.y * 0.72 * postVideoDrift - jumpDive * 0.16,
        0.025,
      );
    }

    if (starPointsRef.current) {
      starPointsRef.current.material.uniforms.uTime.value += delta;
      starPointsRef.current.material.uniforms.uReveal.value = THREE.MathUtils.lerp(
        starPointsRef.current.material.uniforms.uReveal.value,
        isPostVideoPreface || isPostVideoJump ? 1 : beats.starRevealBeat.progress,
        0.008,
      );
      starPointsRef.current.rotation.y += 0.00004 + jumpDive * 0.00032 + jumpTraverse * 0.00088;
      starPointsRef.current.rotation.x = Math.sin(
        starPointsRef.current.material.uniforms.uTime.value * 0.02,
      ) * (0.04 + jumpDive * 0.06);
      starPointsRef.current.position.z = THREE.MathUtils.lerp(
        starPointsRef.current.position.z,
        isPostVideoJump ? -12 - jumpTraverse * 22 : 0,
        0.035,
      );
      starPointsRef.current.visible =
        tunnelFade < 0.99 && !isPostVideoJump;
      starPointsRef.current.scale.setScalar(1 - tunnelFade * 0.5);
    }

    if (dustPointsRef.current) {
      dustPointsRef.current.material.uniforms.uTime.value += delta;
      dustPointsRef.current.material.uniforms.uReveal.value = THREE.MathUtils.lerp(
        dustPointsRef.current.material.uniforms.uReveal.value,
        isPostVideoPreface || isPostVideoJump ? 1 : beats.nebulaRevealBeat.progress,
        0.007,
      );
      dustPointsRef.current.rotation.z = -0.42 + jumpDive * 0.18;
      dustPointsRef.current.rotation.y += 0.00009 + jumpTraverse * 0.0012;
      dustPointsRef.current.position.z = isPostVideoJump ? -24 - jumpTraverse * 18 : -14;
      dustPointsRef.current.visible =
        tunnelFade < 0.99 && !isPostVideoJump && (blastWindow < 0.55 || isPostVideoPreface);
    }

    if (warmNebulaRef.current?.material instanceof THREE.MeshBasicMaterial) {
      const pulse = 0.85 + Math.sin(time * 0.35) * 0.15;
      warmNebulaRef.current.material.opacity = hideNebulaBlobs
        ? 0
        : (beats.nebulaRevealBeat.progress * 0.12 * pulse * (1 - blastWindow * 0.45) +
            (isPostVideoPreface ? 0.035 : 0) +
            jumpDive * 0.05) *
          sceneFade;
    }

    if (coolNebulaRef.current?.material instanceof THREE.MeshBasicMaterial) {
      const pulse = 0.86 + Math.sin(time * 0.32 + 0.8) * 0.14;
      coolNebulaRef.current.material.opacity = hideNebulaBlobs
        ? 0
        : (beats.nebulaRevealBeat.progress * 0.11 * pulse * (1 - blastWindow * 0.45) +
            (isPostVideoPreface ? 0.032 : 0) +
            jumpDive * 0.045) *
          sceneFade;
    }

    if (milkyWayRef.current?.material instanceof THREE.MeshBasicMaterial) {
      const pulse = 0.92 + Math.sin(time * 0.18 + 0.6) * 0.08;
      milkyWayRef.current.material.opacity = hideNebulaBlobs
        ? 0
        : (beats.nebulaRevealBeat.progress * 0.16 * pulse * (1 - blastWindow * 0.3) + jumpDive * 0.08) *
          (1 - jumpTraverse * 0.78) *
          sceneFade;
      milkyWayRef.current.rotation.z = -0.36 + jumpDive * 0.22;
    }

    if (accentNebulaRef.current?.material instanceof THREE.MeshBasicMaterial) {
      const pulse = 0.88 + Math.sin(time * 0.28 + 1.8) * 0.12;
      accentNebulaRef.current.material.opacity = hideNebulaBlobs
        ? 0
        : (beats.nebulaRevealBeat.progress * 0.075 * pulse * (1 - blastWindow * 0.75) +
            jumpIgnition * 0.07 +
            jumpAfterglow * 0.04) *
          sceneFade;
    }

    if (galaxyMistRef.current) {
      galaxyMistRef.current.position.x = Math.sin(time * 0.08) * 2.6;
      galaxyMistRef.current.position.y = Math.cos(time * 0.06) * 1.2;
      const material = galaxyMistRef.current.material;
      if (material instanceof THREE.ShaderMaterial) {
        material.uniforms.uTime.value += delta;
        material.uniforms.uOpacity.value = THREE.MathUtils.lerp(
          material.uniforms.uOpacity.value,
          hideNebulaBlobs
            ? 0
            : phase === 'galaxy'
              ? isPostVideoJump
                ? 0.16 + jumpIgnition * 0.1 - jumpAfterglow * 0.05
                : isPostVideoPreface
                  ? 0.11
                  : 0.065
              : 0,
          hideNebulaBlobs ? 0.12 : 0.03,
        );
        material.uniforms.uOpacity.value *= sceneFade;
      }
    }

    if (corePortalRef.current) {
      const portalTunnelCap = isPostVideoJump ? tunnelKill : 1;
      corePortalRef.current.position.z = THREE.MathUtils.lerp(
        corePortalRef.current.position.z,
        isPostVideoJump ? -34 + jumpDive * 10 + jumpTraverse * 14 * portalTunnelCap : -44,
        0.08,
      );
      corePortalRef.current.scale.setScalar(
        9.5 +
          (isPostVideoPreface ? 1.8 : 0) +
          jumpDive * 7.2 +
          jumpIgnition * 5.8 +
          jumpTraverse * 9.5 * portalTunnelCap,
      );
      const material = corePortalRef.current.material;
      if (material instanceof THREE.MeshBasicMaterial) {
        material.opacity =
          ((isPostVideoPreface ? 0.06 : 0) + jumpDive * 0.1 + jumpIgnition * 0.15 + jumpAfterglow * 0.05) *
          sceneFade *
          portalTunnelCap;
      }
    }

    if (gateRingRef.current) {
      const ringTunnelCap = isPostVideoJump ? tunnelKill : 1;
      gateRingRef.current.rotation.z += 0.0018 + jumpDive * 0.014 + jumpTraverse * 0.02 * ringTunnelCap;
      gateRingRef.current.rotation.x = Math.sin(time * 0.6) * 0.24;
      gateRingRef.current.position.z = THREE.MathUtils.lerp(
        gateRingRef.current.position.z,
        isPostVideoJump ? -24 + jumpDive * 6 + jumpTraverse * 11 * ringTunnelCap : -30,
        0.08,
      );
      gateRingRef.current.scale.setScalar(
        2.6 + jumpDive * 1.4 + jumpIgnition * 2.2 + jumpTraverse * 2.8 * ringTunnelCap,
      );
      const material = gateRingRef.current.material;
      if (material instanceof THREE.MeshBasicMaterial) {
        material.opacity =
          (jumpIgnition * 0.18 + jumpTraverse * 0.08) * sceneFade * ringTunnelCap;
      }
    }

    memoryWorldRefs.current.forEach((world, index) => {
      if (!world) {
        return;
      }

      const config = memoryWorldConfigs[index];
      const memTunnelCap = isPostVideoJump ? tunnelKill : 1;
      const localTravel = isPostVideoJump
        ? THREE.MathUtils.clamp((jumpProgress - config.start) / 0.24, 0, 1) * memTunnelCap
        : 0;
      const presence =
        isPostVideoJump
          ? flashBand(jumpProgress, config.start, config.start + 0.08, config.start + 0.24) * memTunnelCap
          : 0;
      world.position.set(
        config.position.x * (1 - localTravel * 0.72),
        config.position.y * (1 - localTravel * 0.68),
        config.position.z + localTravel * 46,
      );
      world.rotation.y += 0.002 + presence * 0.035;
      world.rotation.x += 0.001 + presence * 0.02;
      world.scale.setScalar(config.scale + localTravel * 5.5 + presence * 3.5);
      const material = world.material;
      if (material instanceof THREE.MeshBasicMaterial) {
        material.opacity = (presence * 0.16 + localTravel * (1 - localTravel) * 0.04) * sceneFade;
      }
    });
  });

  return (
    <group ref={backdropGroupRef}>
      <mesh position={[0, 0, -86]} ref={galaxyMistRef} rotation={[-0.08, 0.02, -0.12]} scale={[82, 46, 1]}>
        <planeGeometry args={[1, 1, 1, 1]} />
        <shaderMaterial
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fragmentShader={mistFragmentShader}
          transparent
          uniforms={mistUniforms}
          vertexShader={mistVertexShader}
        />
      </mesh>
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
      <mesh position={[0, 2, -82]} ref={milkyWayRef} rotation={[0.22, -0.12, -0.36]} scale={[6.2, 1.05, 1]}>
        <sphereGeometry args={[11, 40, 40]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color="#d6dfff"
          depthWrite={false}
          transparent
        />
      </mesh>
      <mesh position={[-8, -6, -60]} ref={accentNebulaRef} scale={[3.4, 1.25, 1]}>
        <sphereGeometry args={[10, 30, 30]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color="#b78cff"
          depthWrite={false}
          transparent
        />
      </mesh>
      <mesh position={[0, 0, -44]} ref={corePortalRef} scale={[9.5, 9.5, 9.5]}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color="#f1d7ff"
          depthWrite={false}
          opacity={0}
          transparent
        />
      </mesh>
      <mesh position={[0, 0, -30]} ref={gateRingRef} rotation={[0.6, 0.2, 0]}>
        <torusGeometry args={[2.4, 0.18, 24, 128]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color="#bca8ff"
          depthWrite={false}
          opacity={0}
          transparent
        />
      </mesh>
      {memoryWorldConfigs.map((world, index) => (
        <mesh
          key={world.color}
          position={world.position.toArray()}
          ref={(node) => {
            memoryWorldRefs.current[index] = node;
          }}
          scale={[world.scale, world.scale, world.scale]}
        >
          <sphereGeometry args={[1, 30, 30]} />
          <meshBasicMaterial
            blending={THREE.AdditiveBlending}
            color={world.color}
            depthWrite={false}
            opacity={0}
            transparent
          />
        </mesh>
      ))}

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
