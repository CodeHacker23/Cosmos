import { ScreenQuad } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getSingularityTransitState } from './singularityTransit';

interface SingularityTransitFieldProps {
  singularityProgress: number;
}

const WARP_INSTANCE_COUNT = 110000;

const warpVertexShader = `
uniform float uTime;
uniform float uAcceleration;
uniform float uJump;
uniform float uFlash;
uniform float uFlight;

attribute float aSeed;
attribute float aAngle;
attribute float aRadius;
attribute float aDepth;
attribute float aVelocity;
attribute float aThickness;

varying float vAlpha;
varying float vCore;
varying vec2 vUv;

mat2 rotate2d(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

void main() {
  vUv = uv;

  float accel = smoothstep(0.0, 1.0, uAcceleration);
  float jump = smoothstep(0.0, 1.0, uJump);
  float flash = smoothstep(0.0, 1.0, uFlash);
  float flight = smoothstep(0.0, 1.0, uFlight);

  float speed = 6.0 + accel * accel * 24.0 + jump * 110.0 + flash * 20.0 + flight * 54.0;
  float zLoop = mod(aDepth + uTime * speed * aVelocity + aSeed * 170.0, 170.0) - 85.0;
  vec2 radialDir = vec2(cos(aAngle), sin(aAngle));
  float radialCollapse = min(1.0, accel * 0.46 + jump * 0.98 + flash * 1.1 + flight * 0.32);
  float radius = aRadius * mix(1.0, 0.025, radialCollapse);
  vec2 center = radialDir * radius;
  center += rotate2d(aSeed * 6.2831) * vec2(0.0, 1.0) * (1.0 - jump) * 0.06;

  vec2 local = position.xy;
  float streakWidth = mix(0.02 + aThickness * 0.035, 0.008 + aThickness * 0.01, jump + flash);
  float streakLength = mix(0.18 + aThickness * 0.4, 8.0 + aVelocity * 10.0, jump);
  streakLength = mix(streakLength, 3.6 + aVelocity * 5.5, flight);
  local.x *= streakWidth;
  local.y *= streakLength;

  vec2 rotated = rotate2d(aAngle) * local;
  vec3 displaced = vec3(center + rotated, -zLoop);
  displaced.xy += radialDir * flight * 0.6 * sin(uTime * 0.5 + aSeed * 4.0);

  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  vAlpha =
    (0.12 + accel * 0.35 + jump * 0.95 + flash * 1.35 + flight * 0.52) *
    (0.55 + aVelocity * 0.7);
  vCore = jump * 0.74 + flash * 1.0 + flight * 0.38;
}
`;

const warpFragmentShader = `
varying float vAlpha;
varying float vCore;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  float beam = smoothstep(0.5, 0.1, abs(uv.x - 0.5));
  float tip = smoothstep(1.0, 0.08, uv.y);
  float tail = smoothstep(0.0, 0.22, uv.y);
  float glow = beam * tip * tail;
  glow += pow(beam, 4.0) * 0.85 * vCore;

  vec3 color = mix(vec3(0.9, 0.94, 1.0), vec3(1.0, 1.0, 1.0), vCore);
  gl_FragColor = vec4(color, clamp(glow * vAlpha, 0.0, 1.0));
}
`;

const radialBlurVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const radialBlurFragmentShader = `
uniform float uJump;
uniform float uFlash;
uniform float uFlight;
uniform float uTime;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 centered = vUv - 0.5;
  float dist = length(centered);
  vec2 dir = centered / max(dist, 0.0001);
  float angle = atan(dir.y, dir.x);
  float rays = sin(angle * 42.0 + uTime * 3.4) * 0.5 + 0.5;
  float noise = hash(floor(dir * 28.0 + uTime));
  float jumpBlur = smoothstep(0.0, 1.0, uJump) * smoothstep(0.75, 0.08, dist);
  float flashGlow = smoothstep(0.0, 1.0, uFlash) * smoothstep(0.95, 0.0, dist);
  float flightHalo = smoothstep(0.0, 1.0, uFlight) * smoothstep(0.86, 0.14, dist);
  float alpha = jumpBlur * (0.08 + rays * 0.12 + noise * 0.06) + flashGlow * 0.34 + flightHalo * 0.08;
  vec3 color = mix(vec3(0.52, 0.62, 1.0), vec3(1.0, 0.98, 0.95), flashGlow + jumpBlur);

  gl_FragColor = vec4(color, alpha);
}
`;

const galaxyConfigs = [
  { x: -8.5, y: 4.8, z: -90, scale: 5.8, color: '#ffd39a', opacity: 0.62 },
  { x: 9.5, y: -5.6, z: -112, scale: 6.6, color: '#88d0ff', opacity: 0.56 },
  { x: -10.2, y: -3.2, z: -138, scale: 7.4, color: '#c59cff', opacity: 0.52 },
  { x: 11.6, y: 6.8, z: -162, scale: 8.4, color: '#ff8ecf', opacity: 0.48 },
] as const;

function createSpiralGalaxy(count: number) {
  const positions = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const arm = index % 3;
    const armOffset = (arm / 3) * Math.PI * 2;
    const radius = Math.pow(Math.random(), 0.72) * 5.8;
    const jitter = (Math.random() - 0.5) * (0.18 + radius * 0.22);
    const angle = armOffset + radius * 1.55 + jitter;
    const i3 = index * 3;
    positions[i3] = Math.cos(angle) * radius;
    positions[i3 + 1] = Math.sin(angle) * radius;
    positions[i3 + 2] = (Math.random() - 0.5) * (0.18 + radius * 0.2);
  }

  return positions;
}

function WarpStreakField({ singularityProgress }: SingularityTransitFieldProps) {
  const transit = getSingularityTransitState(singularityProgress);
  const meshRef = useRef<THREE.InstancedMesh | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  const geometry = useMemo(() => {
    const base = new THREE.PlaneGeometry(1, 1, 1, 1);
    base.translate(0, 0.5, 0);

    const seeds = new Float32Array(WARP_INSTANCE_COUNT);
    const angles = new Float32Array(WARP_INSTANCE_COUNT);
    const radii = new Float32Array(WARP_INSTANCE_COUNT);
    const depths = new Float32Array(WARP_INSTANCE_COUNT);
    const velocities = new Float32Array(WARP_INSTANCE_COUNT);
    const thickness = new Float32Array(WARP_INSTANCE_COUNT);

    for (let index = 0; index < WARP_INSTANCE_COUNT; index += 1) {
      seeds[index] = Math.random();
      angles[index] = Math.random() * Math.PI * 2;
      radii[index] = 0.8 + Math.pow(Math.random(), 0.42) * 16;
      depths[index] = Math.random() * 170;
      velocities[index] = 0.6 + Math.random() * 1.8;
      thickness[index] = 0.35 + Math.random() * 0.95;
    }

    base.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
    base.setAttribute('aAngle', new THREE.InstancedBufferAttribute(angles, 1));
    base.setAttribute('aRadius', new THREE.InstancedBufferAttribute(radii, 1));
    base.setAttribute('aDepth', new THREE.InstancedBufferAttribute(depths, 1));
    base.setAttribute('aVelocity', new THREE.InstancedBufferAttribute(velocities, 1));
    base.setAttribute('aThickness', new THREE.InstancedBufferAttribute(thickness, 1));

    return base;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAcceleration: { value: 0 },
      uJump: { value: 0 },
      uFlash: { value: 0 },
      uFlight: { value: 0 },
    }),
    [],
  );

  useEffect(() => {
    if (!meshRef.current) {
      return;
    }

    const identity = new THREE.Matrix4();
    for (let index = 0; index < WARP_INSTANCE_COUNT; index += 1) {
      meshRef.current.setMatrixAt(index, identity);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame((_, delta) => {
    if (!materialRef.current || !meshRef.current) {
      return;
    }

    materialRef.current.uniforms.uTime.value += delta;
    materialRef.current.uniforms.uAcceleration.value = transit.acceleration;
    materialRef.current.uniforms.uJump.value = transit.jump;
    materialRef.current.uniforms.uFlash.value = transit.flash;
    materialRef.current.uniforms.uFlight.value = transit.flight;
    meshRef.current.visible = singularityProgress > 0.005;
  });

  return (
    <instancedMesh args={[geometry, undefined, WARP_INSTANCE_COUNT]} frustumCulled={false} ref={meshRef}>
      <shaderMaterial
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        fragmentShader={warpFragmentShader}
        ref={materialRef}
        transparent
        uniforms={uniforms}
        vertexShader={warpVertexShader}
      />
    </instancedMesh>
  );
}

function GalaxyFlightLayer({ singularityProgress }: SingularityTransitFieldProps) {
  const transit = getSingularityTransitState(singularityProgress);
  const groupRefs = useRef<Array<THREE.Group | null>>([]);
  const nebulaRefs = useRef<Array<THREE.Mesh | null>>([]);
  const galaxies = useMemo(() => galaxyConfigs.map(() => createSpiralGalaxy(1800)), []);

  useFrame((_, delta) => {
    galaxyConfigs.forEach((config, index) => {
      const group = groupRefs.current[index];
      if (!group) {
        return;
      }

      const offset = index * 0.16;
      const localFlight = THREE.MathUtils.clamp((transit.flight - offset) / 0.48, 0, 1);
      const flashLift = Math.max(0, transit.flash - index * 0.12) * 0.8;
      const target = new THREE.Vector3(
        THREE.MathUtils.lerp(config.x, config.x * 0.22, localFlight),
        THREE.MathUtils.lerp(config.y, config.y * 0.12, localFlight),
        config.z + localFlight * 210 + flashLift * 32,
      );

      group.position.lerp(target, 1 - Math.exp(-delta * 2.4));
      group.rotation.z += delta * (0.06 + localFlight * 0.48);
      group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, localFlight * 0.28, delta * 2.2);
      group.scale.lerp(
        new THREE.Vector3(
          config.scale + localFlight * 4.2,
          config.scale + localFlight * 4.2,
          config.scale + localFlight * 4.2,
        ),
        1 - Math.exp(-delta * 2.2),
      );
      group.visible = transit.flash > 0.02 || transit.flight > offset * 0.55;

      const nebula = nebulaRefs.current[index];
      if (nebula && nebula.material instanceof THREE.MeshBasicMaterial) {
        nebula.material.opacity =
          (transit.flash * 0.08 + localFlight * config.opacity * 0.32) *
          (1 - Math.max(0, localFlight - 0.82) / 0.18);
      }
    });
  });

  return (
    <group visible={transit.flash > 0.01 || transit.flight > 0.01}>
      {galaxyConfigs.map((config, index) => (
        <group
          key={config.color}
          position={[config.x, config.y, config.z]}
          ref={(node) => {
            groupRefs.current[index] = node;
          }}
          scale={[config.scale, config.scale, config.scale]}
        >
          <mesh
            position={[0, 0, -0.8]}
            ref={(node) => {
              nebulaRefs.current[index] = node;
            }}
            scale={[2.9, 1.55, 1]}
          >
            <sphereGeometry args={[1, 24, 24]} />
            <meshBasicMaterial
              blending={THREE.AdditiveBlending}
              color={config.color}
              depthWrite={false}
              opacity={0}
              transparent
            />
          </mesh>
          <points>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[galaxies[index], 3]} />
            </bufferGeometry>
            <pointsMaterial
              blending={THREE.AdditiveBlending}
              color={config.color}
              depthWrite={false}
              opacity={0.9}
              size={0.065}
              sizeAttenuation
              transparent
            />
          </points>
        </group>
      ))}
    </group>
  );
}

function RadialBlurOverlay({ singularityProgress }: SingularityTransitFieldProps) {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const transit = getSingularityTransitState(singularityProgress);
  const uniforms = useMemo(
    () => ({
      uJump: { value: 0 },
      uFlash: { value: 0 },
      uFlight: { value: 0 },
      uTime: { value: 0 },
    }),
    [],
  );

  useFrame((_, delta) => {
    if (!materialRef.current) {
      return;
    }

    materialRef.current.uniforms.uTime.value += delta;
    materialRef.current.uniforms.uJump.value = transit.jump;
    materialRef.current.uniforms.uFlash.value = transit.flash;
    materialRef.current.uniforms.uFlight.value = transit.flight;
  });

  return (
    <ScreenQuad>
      <shaderMaterial
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        fragmentShader={radialBlurFragmentShader}
        ref={materialRef}
        transparent
        uniforms={uniforms}
        vertexShader={radialBlurVertexShader}
      />
    </ScreenQuad>
  );
}

export function SingularityTransitField({ singularityProgress }: SingularityTransitFieldProps) {
  return (
    <group renderOrder={8}>
      <WarpStreakField singularityProgress={singularityProgress} />
      <GalaxyFlightLayer singularityProgress={singularityProgress} />
      <RadialBlurOverlay singularityProgress={singularityProgress} />
    </group>
  );
}
