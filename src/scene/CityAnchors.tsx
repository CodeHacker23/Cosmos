import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { ExperiencePhase, IntroBeats } from '../features/experience/model/types';

interface CityAnchorsProps {
  beats: IntroBeats;
  phase: ExperiencePhase;
  singularityProgress: number;
}

export function CityAnchors({ beats, phase, singularityProgress }: CityAnchorsProps) {
  const topGroupRef = useRef<THREE.Group | null>(null);
  const bottomGroupRef = useRef<THREE.Group | null>(null);
  const topRef = useRef<THREE.Mesh | null>(null);
  const bottomRef = useRef<THREE.Mesh | null>(null);

  useFrame(({ clock }, delta) => {
    const pulse = 1 + Math.sin(clock.elapsedTime * 1.8) * 0.12;
    const collapse = THREE.MathUtils.smootherstep(singularityProgress, 0.06, 0.48);
    const detonation = THREE.MathUtils.smootherstep(singularityProgress, 0.48, 0.72);
    const aftermath = THREE.MathUtils.smootherstep(singularityProgress, 0.72, 1);
    const surge =
      phase === 'singularity'
        ? 1 + collapse * 0.8 + detonation * 1.35 - aftermath * 0.55
        : phase === 'galaxy'
          ? 1.2
          : 1;
    const reveal = beats.anchorsRevealBeat.progress;
    const orbitEase = THREE.MathUtils.smoothstep(reveal, 0, 1);
    const orbitTurns = 4.2 * Math.PI;
    const orbitAngle = Math.PI / 2 + (1 - orbitEase) * orbitTurns;
    const orbitRadius = THREE.MathUtils.lerp(12.4, 8.4, orbitEase);
    const settledX = Math.cos(orbitAngle) * orbitRadius;
    const settledY = Math.sin(orbitAngle) * orbitRadius;
    const inwardX = THREE.MathUtils.lerp(settledX, 0, collapse);
    const inwardY = THREE.MathUtils.lerp(settledY, 2.15, collapse);
    const recoilOffset = detonation * 1.1 - aftermath * 0.55;
    const topX = phase === 'singularity' ? inwardX : settledX;
    const topY = phase === 'singularity' ? inwardY - recoilOffset : settledY;
    const bottomX = phase === 'singularity' ? -inwardX : -settledX;
    const bottomY = phase === 'singularity' ? -inwardY + recoilOffset : -settledY;

    if (topRef.current) {
      const topScale = pulse * surge;
      topRef.current.scale.x = THREE.MathUtils.lerp(topRef.current.scale.x, topScale, delta * 6);
      topRef.current.scale.y = THREE.MathUtils.lerp(topRef.current.scale.y, topScale, delta * 6);
      topRef.current.scale.z = THREE.MathUtils.lerp(topRef.current.scale.z, topScale, delta * 6);
    }

    if (bottomRef.current) {
      const bottomScale = (1.04 - (pulse - 1)) * surge;
      bottomRef.current.scale.x = THREE.MathUtils.lerp(
        bottomRef.current.scale.x,
        bottomScale,
        delta * 6,
      );
      bottomRef.current.scale.y = THREE.MathUtils.lerp(
        bottomRef.current.scale.y,
        bottomScale,
        delta * 6,
      );
      bottomRef.current.scale.z = THREE.MathUtils.lerp(
        bottomRef.current.scale.z,
        bottomScale,
        delta * 6,
      );
    }

    if (topGroupRef.current) {
      const targetReveal = Math.max(0.001, reveal);
      topGroupRef.current.scale.x = THREE.MathUtils.lerp(
        topGroupRef.current.scale.x,
        targetReveal,
        delta * 6,
      );
      topGroupRef.current.scale.y = THREE.MathUtils.lerp(
        topGroupRef.current.scale.y,
        targetReveal,
        delta * 6,
      );
      topGroupRef.current.scale.z = THREE.MathUtils.lerp(
        topGroupRef.current.scale.z,
        targetReveal,
        delta * 6,
      );
      topGroupRef.current.position.x = THREE.MathUtils.lerp(topGroupRef.current.position.x, topX, delta * 5.5);
      topGroupRef.current.position.y = THREE.MathUtils.lerp(topGroupRef.current.position.y, topY, delta * 5.5);
      topGroupRef.current.position.z = THREE.MathUtils.lerp(
        topGroupRef.current.position.z,
        THREE.MathUtils.lerp(-2, -0.6, collapse),
        delta * 5.5,
      );
    }

    if (bottomGroupRef.current) {
      const targetReveal = Math.max(0.001, reveal);
      bottomGroupRef.current.scale.x = THREE.MathUtils.lerp(
        bottomGroupRef.current.scale.x,
        targetReveal,
        delta * 6,
      );
      bottomGroupRef.current.scale.y = THREE.MathUtils.lerp(
        bottomGroupRef.current.scale.y,
        targetReveal,
        delta * 6,
      );
      bottomGroupRef.current.scale.z = THREE.MathUtils.lerp(
        bottomGroupRef.current.scale.z,
        targetReveal,
        delta * 6,
      );
      bottomGroupRef.current.position.x = THREE.MathUtils.lerp(
        bottomGroupRef.current.position.x,
        bottomX,
        delta * 5.5,
      );
      bottomGroupRef.current.position.y = THREE.MathUtils.lerp(
        bottomGroupRef.current.position.y,
        bottomY,
        delta * 5.5,
      );
      bottomGroupRef.current.position.z = THREE.MathUtils.lerp(
        bottomGroupRef.current.position.z,
        THREE.MathUtils.lerp(-2, -0.6, collapse),
        delta * 5.5,
      );
    }
  });

  return (
    <group>
      <group position={[0, 8.4, -2]} ref={topGroupRef}>
        <mesh ref={topRef}>
          <sphereGeometry args={[0.82, 36, 36]} />
          <meshStandardMaterial
            color="#ff8f52"
            emissive="#ff7d36"
            emissiveIntensity={2.2}
            metalness={0.08}
            roughness={0.18}
          />
        </mesh>
        {phase !== 'singularity' && (
          <Text
            anchorX="center"
            anchorY="middle"
            color="#ffbe8f"
            fontSize={0.7}
            position={[0, 1.9, 0]}
          >
            Chelyabinsk
          </Text>
        )}
      </group>
      <group position={[0, -8.4, -2]} ref={bottomGroupRef}>
        <mesh ref={bottomRef}>
          <sphereGeometry args={[0.82, 36, 36]} />
          <meshStandardMaterial
            color="#6db9ff"
            emissive="#3aa8ff"
            emissiveIntensity={2.3}
            metalness={0.08}
            roughness={0.18}
          />
        </mesh>
        {phase !== 'singularity' && (
          <Text
            anchorX="center"
            anchorY="middle"
            color="#9ec7ff"
            fontSize={0.7}
            position={[0, -1.9, 0]}
          >
            Luhansk
          </Text>
        )}
      </group>
    </group>
  );
}
