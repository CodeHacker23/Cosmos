import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { ExperiencePhase, IntroBeats } from '../features/experience/model/types';

interface CityAnchorsProps {
  beats: IntroBeats;
  phase: ExperiencePhase;
}

export function CityAnchors({ beats, phase }: CityAnchorsProps) {
  const topGroupRef = useRef<THREE.Group | null>(null);
  const bottomGroupRef = useRef<THREE.Group | null>(null);
  const topRef = useRef<THREE.Mesh | null>(null);
  const bottomRef = useRef<THREE.Mesh | null>(null);

  useFrame(({ clock }) => {
    const pulse = 1 + Math.sin(clock.elapsedTime * 1.8) * 0.12;
    const surge = phase === 'singularity' ? 2.2 : phase === 'galaxy' ? 1.2 : 1;
    const reveal = beats.anchorsRevealBeat.progress;
    const orbitEase = THREE.MathUtils.smoothstep(reveal, 0, 1);
    const orbitTurns = 4.2 * Math.PI;
    const orbitAngle = Math.PI / 2 + (1 - orbitEase) * orbitTurns;
    const orbitRadius = THREE.MathUtils.lerp(12.4, 8.4, orbitEase);
    const orbitX = Math.cos(orbitAngle) * orbitRadius;
    const orbitY = Math.sin(orbitAngle) * orbitRadius;

    if (topRef.current) {
      topRef.current.scale.setScalar(pulse * surge);
    }

    if (bottomRef.current) {
      bottomRef.current.scale.setScalar((1.04 - (pulse - 1)) * surge);
    }

    if (topGroupRef.current) {
      topGroupRef.current.scale.setScalar(Math.max(0.001, reveal));
      topGroupRef.current.position.x = orbitX;
      topGroupRef.current.position.y = orbitY;
    }

    if (bottomGroupRef.current) {
      bottomGroupRef.current.scale.setScalar(Math.max(0.001, reveal));
      bottomGroupRef.current.position.x = -orbitX;
      bottomGroupRef.current.position.y = -orbitY;
    }
  });

  return (
    <group>
      <group position={[0, 8.4, -2]} ref={topGroupRef}>
        <mesh ref={topRef}>
          <sphereGeometry args={[0.82, 56, 56]} />
          <meshPhysicalMaterial
            clearcoat={1}
            clearcoatRoughness={0.08}
            color="#ff8f52"
            emissive="#ff7d36"
            emissiveIntensity={2.2}
            roughness={0.15}
            transmission={0.08}
          />
        </mesh>
        <Text
          anchorX="center"
          anchorY="middle"
          color="#ffbe8f"
          fontSize={0.7}
          position={[0, 1.9, 0]}
        >
          Chelyabinsk
        </Text>
      </group>
      <group position={[0, -8.4, -2]} ref={bottomGroupRef}>
        <mesh ref={bottomRef}>
          <sphereGeometry args={[0.82, 56, 56]} />
          <meshPhysicalMaterial
            clearcoat={1}
            clearcoatRoughness={0.08}
            color="#6db9ff"
            emissive="#3aa8ff"
            emissiveIntensity={2.3}
            roughness={0.14}
            transmission={0.08}
          />
        </mesh>
        <Text
          anchorX="center"
          anchorY="middle"
          color="#9ec7ff"
          fontSize={0.7}
          position={[0, -1.9, 0]}
        >
          Luhansk
        </Text>
      </group>
    </group>
  );
}
