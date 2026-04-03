import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type {
  CalibrationAssessment,
  ExperiencePhase,
  IntroBeats,
  SliderState,
} from '../features/experience/model/types';
import {
  starfieldFragmentShader,
  starfieldVertexShader,
} from './shaders/starfieldShaders';

interface StarfieldProps {
  beats: IntroBeats;
  phase: ExperiencePhase;
  singularityProgress: number;
  sliders: SliderState;
  assessment: CalibrationAssessment;
}

const PARTICLE_COUNT = 42000;

export function Starfield({
  beats,
  phase,
  singularityProgress,
  sliders,
  assessment,
}: StarfieldProps) {
  const pointsRef =
    useRef<THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | null>(null);

  const attributes = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const scales = new Float32Array(PARTICLE_COUNT);
    const randomness = new Float32Array(PARTICLE_COUNT * 3);

    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const i3 = index * 3;
      const radius = 14 + Math.pow(Math.random(), 0.58) * 56;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.cos(phi) * 0.85;
      positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      scales[index] = 0.3 + Math.pow(Math.random(), 0.75);
      randomness[i3] = Math.random() * 2 - 1;
      randomness[i3 + 1] = Math.random() * 2 - 1;
      randomness[i3 + 2] = Math.random() * 2 - 1;
    }

    return { positions, scales, randomness };
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWarp: { value: 0 },
      uMatch: { value: 0 },
      uEntropy: { value: 0 },
      uGravity: { value: 0 },
      uResonance: { value: 0 },
      uSync: { value: 0 },
      uReveal: { value: 0 },
    }),
    [],
  );

  useFrame((_, delta) => {
    const material = pointsRef.current?.material;
    if (!material) {
      return;
    }

    material.uniforms.uTime.value += delta;
    material.uniforms.uMatch.value = THREE.MathUtils.lerp(
      material.uniforms.uMatch.value,
      assessment.match,
      0.05,
    );
    material.uniforms.uEntropy.value = THREE.MathUtils.lerp(
      material.uniforms.uEntropy.value,
      assessment.entropy,
      0.035,
    );
    material.uniforms.uGravity.value = THREE.MathUtils.lerp(
      material.uniforms.uGravity.value,
      sliders.gravity / 100,
      0.05,
    );
    material.uniforms.uResonance.value = THREE.MathUtils.lerp(
      material.uniforms.uResonance.value,
      sliders.resonance / 100,
      0.05,
    );
    material.uniforms.uSync.value = THREE.MathUtils.lerp(
      material.uniforms.uSync.value,
      sliders.sync / 100,
      0.05,
    );
    material.uniforms.uReveal.value = THREE.MathUtils.lerp(
      material.uniforms.uReveal.value,
      beats.starRevealBeat.progress,
      0.01,
    );

    const collapse = THREE.MathUtils.smootherstep(singularityProgress, 0.08, 0.45);
    const detonation = THREE.MathUtils.smootherstep(singularityProgress, 0.45, 0.72);
    const aftermath = THREE.MathUtils.smootherstep(singularityProgress, 0.72, 1);
    const gravityInfluence = material.uniforms.uGravity.value;
    const syncInfluence = material.uniforms.uSync.value;
    const targetWarp =
      phase === 'singularity'
        ? 0.22 + collapse * 0.45 + detonation * 0.95 - aftermath * 0.42
        : phase === 'galaxy'
          ? 0.04
          : assessment.match * 0.04;

    material.uniforms.uWarp.value = THREE.MathUtils.lerp(
      material.uniforms.uWarp.value,
      targetWarp,
      phase === 'singularity' ? 0.055 : 0.02,
    );

    if (pointsRef.current) {
      const targetRotationY =
        phase === 'singularity'
          ? 0.001 + collapse * 0.0025 + detonation * 0.006
          : phase === 'galaxy'
            ? 0.0012
            : 0.00035 + gravityInfluence * 0.00135;
      pointsRef.current.rotation.y += targetRotationY;
      pointsRef.current.rotation.x = THREE.MathUtils.lerp(
        pointsRef.current.rotation.x,
        phase === 'singularity'
          ? 0.05 + collapse * 0.08
          : phase === 'galaxy'
            ? 0.18
            : 0.04,
        phase === 'singularity' ? 0.045 : 0.03,
      );
      pointsRef.current.rotation.z = THREE.MathUtils.lerp(
        pointsRef.current.rotation.z,
        phase === 'galaxy' ? 0.05 : 0,
        phase === 'singularity' ? 0.025 : 0.03,
      );
      pointsRef.current.scale.setScalar(
        THREE.MathUtils.lerp(
          pointsRef.current.scale.x,
          phase === 'calibration'
            ? 1 + Math.sin(material.uniforms.uTime.value * (0.55 + syncInfluence * 0.7)) * syncInfluence * 0.045
            : 1,
          phase === 'singularity' ? 0.04 : 0.035,
        ),
      );
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[attributes.positions, 3]}
          count={PARTICLE_COUNT}
        />
        <bufferAttribute
          attach="attributes-aScale"
          args={[attributes.scales, 1]}
          count={PARTICLE_COUNT}
        />
        <bufferAttribute
          attach="attributes-aRandomness"
          args={[attributes.randomness, 3]}
          count={PARTICLE_COUNT}
        />
      </bufferGeometry>
      <shaderMaterial
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        fragmentShader={starfieldFragmentShader}
        transparent
        uniforms={uniforms}
        vertexShader={starfieldVertexShader}
      />
    </points>
  );
}
