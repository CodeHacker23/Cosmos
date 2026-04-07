import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type {
  CalibrationAssessment,
  ExperiencePhase,
  GalaxyPostVideoStage,
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
  postVideoStage: GalaxyPostVideoStage;
  jumpProgress: number;
  singularityProgress: number;
  sliders: SliderState;
  assessment: CalibrationAssessment;
}

const PARTICLE_COUNT = 42000;

const clampDelta = (delta: number) => Math.min(delta, 1 / 30);

const smoothDamp = (
  current: number,
  target: number,
  velocity: { value: number },
  smoothTime: number,
  delta: number,
) => {
  const safeSmoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / safeSmoothTime;
  const x = omega * delta;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target;
  const temp = (velocity.value + omega * change) * delta;
  velocity.value = (velocity.value - omega * temp) * exp;
  return target + (change + temp) * exp;
};

const flashBand = (value: number, start: number, peak: number, end: number) => {
  if (value <= start || value >= end) {
    return 0;
  }

  if (value <= peak) {
    return (value - start) / (peak - start);
  }

  return 1 - (value - peak) / (end - peak);
};

export function Starfield({
  beats,
  phase,
  postVideoStage,
  jumpProgress,
  singularityProgress: _singularityProgress,
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

      scales[index] = 0.22 + Math.pow(Math.random(), 0.82) * 0.82;
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
  const sliderMotionRef = useRef({
    gravityVelocity: { value: 0 },
    resonanceVelocity: { value: 0 },
    syncVelocity: { value: 0 },
    rotationVelocity: { value: 0 },
    driftVelocity: { value: 0 },
    scaleVelocity: { value: 0 },
  });

  useFrame((_, delta) => {
    const material = pointsRef.current?.material;
    if (!material || phase === 'singularity') {
      if (pointsRef.current) {
        pointsRef.current.visible = phase !== 'singularity';
      }
      return;
    }

    const frameDelta = clampDelta(delta);
    material.uniforms.uTime.value += frameDelta;
    material.uniforms.uMatch.value = THREE.MathUtils.lerp(
      material.uniforms.uMatch.value,
      assessment.match,
      0.04,
    );
    material.uniforms.uEntropy.value = THREE.MathUtils.lerp(
      material.uniforms.uEntropy.value,
      assessment.entropy,
      0.028,
    );
    material.uniforms.uGravity.value = THREE.MathUtils.lerp(
      material.uniforms.uGravity.value,
      smoothDamp(
        material.uniforms.uGravity.value,
        sliders.gravity / 100,
        sliderMotionRef.current.gravityVelocity,
        phase === 'calibration' ? 0.34 : 0.22,
        frameDelta,
      ),
      0.68,
    );
    material.uniforms.uResonance.value = THREE.MathUtils.lerp(
      material.uniforms.uResonance.value,
      smoothDamp(
        material.uniforms.uResonance.value,
        sliders.resonance / 100,
        sliderMotionRef.current.resonanceVelocity,
        phase === 'calibration' ? 0.4 : 0.24,
        frameDelta,
      ),
      0.68,
    );
    material.uniforms.uSync.value = THREE.MathUtils.lerp(
      material.uniforms.uSync.value,
      smoothDamp(
        material.uniforms.uSync.value,
        sliders.sync / 100,
        sliderMotionRef.current.syncVelocity,
        phase === 'calibration' ? 0.42 : 0.26,
        frameDelta,
      ),
      0.68,
    );
    material.uniforms.uReveal.value = THREE.MathUtils.lerp(
      material.uniforms.uReveal.value,
      beats.starRevealBeat.progress,
      0.01,
    );

    const isPostVideoPreface = phase === 'galaxy' && postVideoStage === 'preface';
    const isPostVideoJump = phase === 'galaxy' && postVideoStage === 'jump';
    const jumpDive = isPostVideoJump ? THREE.MathUtils.smootherstep(jumpProgress, 0.02, 0.38) : 0;
    const jumpIgnition = isPostVideoJump
      ? THREE.MathUtils.smootherstep(flashBand(jumpProgress, 0.28, 0.44, 0.62), 0, 1)
      : 0;
    const jumpTraverse = isPostVideoJump ? THREE.MathUtils.smootherstep(jumpProgress, 0.5, 0.86) : 0;
    const jumpAfterglow = isPostVideoJump ? THREE.MathUtils.smootherstep(jumpProgress, 0.86, 1) : 0;
    const gravityInfluence = material.uniforms.uGravity.value;
    const syncInfluence = material.uniforms.uSync.value;
    const targetWarp =
      isPostVideoJump
        ? 0.08 + jumpDive * 0.3 + jumpIgnition * 0.92 + jumpTraverse * 1.78 - jumpAfterglow * 0.48
        : isPostVideoPreface
          ? 0.12
        : phase === 'galaxy'
          ? 0.04
          : assessment.match * 0.04;

    material.uniforms.uWarp.value = THREE.MathUtils.lerp(
      material.uniforms.uWarp.value,
      targetWarp,
      0.02,
    );

    if (pointsRef.current) {
      pointsRef.current.visible = true;
      const targetRotationY =
        isPostVideoJump
          ? 0.0004 + jumpDive * 0.0016 + jumpTraverse * 0.0048
          : isPostVideoPreface
            ? 0.00032
          : phase === 'galaxy'
            ? 0.00018
            : 0.00028 + gravityInfluence * 0.00082;
      const inertialRotationY = smoothDamp(
        0,
        targetRotationY,
        sliderMotionRef.current.rotationVelocity,
        phase === 'calibration' ? 0.28 : 0.18,
        frameDelta,
      );
      pointsRef.current.rotation.y += inertialRotationY;
      pointsRef.current.rotation.x = THREE.MathUtils.lerp(
        pointsRef.current.rotation.x,
        isPostVideoJump
          ? 0.12 + jumpDive * 0.14 - jumpTraverse * 0.05
          : isPostVideoPreface
            ? 0.09
          : phase === 'galaxy'
            ? 0.07
            : 0.04,
        0.022,
      );
      pointsRef.current.rotation.z = THREE.MathUtils.lerp(
        pointsRef.current.rotation.z,
        isPostVideoJump ? 0.05 + jumpIgnition * 0.04 : phase === 'galaxy' ? 0.012 : 0,
        0.02,
      );
      pointsRef.current.position.z = smoothDamp(
        pointsRef.current.position.z,
        isPostVideoJump
          ? -18 - jumpDive * 10 - jumpTraverse * 32
          : isPostVideoPreface
            ? -17
            : phase === 'galaxy'
              ? -14
              : 0,
        sliderMotionRef.current.driftVelocity,
        isPostVideoJump ? 0.42 : phase === 'galaxy' ? 0.85 : 0.42,
        frameDelta,
      );
      pointsRef.current.scale.setScalar(
        smoothDamp(
          pointsRef.current.scale.x,
          phase === 'calibration'
            ? 1 + Math.sin(material.uniforms.uTime.value * (0.48 + syncInfluence * 0.42)) * syncInfluence * 0.026
            : isPostVideoJump
              ? 0.96 + jumpIgnition * 0.1 + jumpTraverse * 0.06
              : isPostVideoPreface
                ? 0.94
            : phase === 'galaxy'
              ? 0.9
            : 1,
          sliderMotionRef.current.scaleVelocity,
          0.38,
          frameDelta,
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
