import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ExperiencePhase } from '../features/experience/model/types';

interface GalaxyBirthFieldProps {
  phase: ExperiencePhase;
  singularityProgress: number;
}

const GALAXY_PARTICLE_COUNT = 8000;

const galaxyVertexShader = `
uniform float uTime;
uniform float uBirth;
uniform float uFlash;

attribute vec3 aOrigin;
attribute float aScale;
attribute vec3 aTint;

varying vec3 vTint;
varying float vAlpha;

mat2 rotate2d(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

void main() {
  vec3 target = position;
  vec3 origin = aOrigin;
  float birth = smoothstep(0.0, 1.0, uBirth);

  vec3 displaced = mix(origin, target, birth);
  float swirl = (1.0 - birth) * (1.8 + length(target.xy) * 0.06);
  displaced.xy = rotate2d(swirl) * displaced.xy;
  displaced.z += sin(uTime * 0.28 + aScale * 5.0) * 0.1 * (0.25 + birth * 0.45);

  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float size = (0.9 + aScale * 1.35 + uFlash * 0.45) * (160.0 / max(1.0, -mvPosition.z));
  gl_PointSize = size * mix(0.2, 1.0, birth);

  vTint = aTint;
  vAlpha = clamp((0.14 + aScale * 0.48 + birth * 0.34 + uFlash * 0.06), 0.0, 1.0);
}
`;

const galaxyFragmentShader = `
varying vec3 vTint;
varying float vAlpha;

void main() {
  vec2 centered = gl_PointCoord - 0.5;
  float dist = length(centered);

  if (dist > 0.5) {
    discard;
  }

  float core = smoothstep(0.08, 0.0, dist);
  float halo = smoothstep(0.44, 0.03, dist);
  float alpha = clamp(core * 1.45 + halo * 0.18, 0.0, 1.0) * vAlpha;
  vec3 color = vTint * (1.02 + core * 1.8 + halo * 0.08);

  gl_FragColor = vec4(color, alpha);
}
`;

const flashBand = (value: number, start: number, peak: number, end: number) => {
  if (value <= start || value >= end) {
    return 0;
  }

  if (value <= peak) {
    return (value - start) / (peak - start);
  }

  return 1 - (value - peak) / (end - peak);
};

export function GalaxyBirthField({
  phase,
  singularityProgress,
}: GalaxyBirthFieldProps) {
  const groupRef = useRef<THREE.Group | null>(null);
  const pointsRef =
    useRef<THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | null>(null);

  const attributes = useMemo(() => {
    const positions = new Float32Array(GALAXY_PARTICLE_COUNT * 3);
    const origins = new Float32Array(GALAXY_PARTICLE_COUNT * 3);
    const scales = new Float32Array(GALAXY_PARTICLE_COUNT);
    const tints = new Float32Array(GALAXY_PARTICLE_COUNT * 3);
    const centerColor = new THREE.Color('#fff1cf');
    const warmArmColor = new THREE.Color('#ffad78');
    const coolArmColor = new THREE.Color('#7cc8ff');

    for (let index = 0; index < GALAXY_PARTICLE_COUNT; index += 1) {
      const i3 = index * 3;
      const arm = index % 3;
      const armOffset = (arm / 3) * Math.PI * 2;
      const radius = Math.pow(Math.random(), 0.68) * 11.8;
      const radialJitter = (Math.random() - 0.5) * (0.35 + radius * 0.16);
      const spiralAngle = armOffset + radius * 0.82 + (Math.random() - 0.5) * 0.82;
      const thickness = (Math.random() - 0.5) * (0.2 + radius * 0.08);

      positions[i3] = Math.cos(spiralAngle) * (radius + radialJitter);
      positions[i3 + 1] = Math.sin(spiralAngle) * (radius + radialJitter);
      positions[i3 + 2] = thickness;

      const cloudRadius = Math.pow(Math.random(), 0.48) * 3.6;
      const cloudTheta = Math.random() * Math.PI * 2;
      const cloudPhi = Math.acos(2 * Math.random() - 1);
      origins[i3] = Math.sin(cloudPhi) * Math.cos(cloudTheta) * cloudRadius;
      origins[i3 + 1] = Math.cos(cloudPhi) * cloudRadius;
      origins[i3 + 2] = Math.sin(cloudPhi) * Math.sin(cloudTheta) * cloudRadius * 1.4;

      scales[index] = 0.4 + Math.pow(Math.random(), 0.75) * 1.8;

      const tint = warmArmColor.clone().lerp(coolArmColor, arm === 1 ? 0.65 : arm === 2 ? 0.9 : 0.25);
      tint.lerp(centerColor, Math.max(0, 1 - radius / 12) * 0.45);
      tints[i3] = tint.r;
      tints[i3 + 1] = tint.g;
      tints[i3 + 2] = tint.b;
    }

    return { positions, origins, scales, tints };
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBirth: { value: 0 },
      uFlash: { value: 0 },
    }),
    [],
  );

  useFrame((_, delta) => {
    const birth =
      phase === 'galaxy'
        ? 1
        : THREE.MathUtils.smootherstep(singularityProgress, 0.76, 1);
    const flash = phase === 'singularity' ? flashBand(singularityProgress, 0.56, 0.64, 0.78) : 0;

    if (pointsRef.current) {
      pointsRef.current.material.uniforms.uTime.value += delta;
      pointsRef.current.material.uniforms.uBirth.value = THREE.MathUtils.lerp(
        pointsRef.current.material.uniforms.uBirth.value,
        birth,
        phase === 'galaxy' ? 0.035 : 0.024,
      );
      pointsRef.current.material.uniforms.uFlash.value = THREE.MathUtils.lerp(
        pointsRef.current.material.uniforms.uFlash.value,
        flash,
        0.08,
      );
    }

    if (groupRef.current) {
      groupRef.current.visible = phase === 'galaxy' || birth > 0.06;
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, 0, delta * 2.5);
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0, delta * 2.5);
      groupRef.current.position.z = THREE.MathUtils.lerp(-6.1, -8.2, birth);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(
        groupRef.current.rotation.z,
        0.045,
        delta * 1.2,
      );
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        0.015,
        delta * 1.1,
      );
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        0.72,
        delta * 1.2,
      );
      groupRef.current.scale.setScalar(0.34 + birth * 0.72 + flash * 0.04);
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[attributes.positions, 3]} />
          <bufferAttribute attach="attributes-aOrigin" args={[attributes.origins, 3]} />
          <bufferAttribute attach="attributes-aScale" args={[attributes.scales, 1]} />
          <bufferAttribute attach="attributes-aTint" args={[attributes.tints, 3]} />
        </bufferGeometry>
        <shaderMaterial
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fragmentShader={galaxyFragmentShader}
          transparent
          uniforms={uniforms}
          vertexShader={galaxyVertexShader}
        />
      </points>
    </group>
  );
}
