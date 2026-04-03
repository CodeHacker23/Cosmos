import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { IntroBeats } from '../features/experience/model/types';

interface IntroFocalPointProps {
  beats: IntroBeats;
}

export function IntroFocalPoint({ beats }: IntroFocalPointProps) {
  const coreRef = useRef<THREE.Mesh | null>(null);
  const glowRef = useRef<THREE.Mesh | null>(null);
  const ringARef = useRef<THREE.Mesh | null>(null);
  const ringBRef = useRef<THREE.Mesh | null>(null);
  const ringCRef = useRef<THREE.Mesh | null>(null);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const reveal = beats.pulseBeat.progress;
    const fade = 1 - beats.nebulaRevealBeat.progress * 0.95;
    const pulse = 1 + Math.sin(time * 1.15) * 0.06;

    if (coreRef.current) {
      coreRef.current.scale.setScalar((0.15 + reveal * 0.42) * pulse);
    }

    if (glowRef.current) {
      glowRef.current.scale.setScalar((0.45 + reveal * 1.6) * (0.94 + Math.sin(time * 0.85) * 0.04));
      const material = glowRef.current.material;
      if (material instanceof THREE.MeshBasicMaterial) {
        material.opacity = (0.05 + reveal * 0.12) * fade;
      }
    }

    const rings = [
      { ref: ringARef, delay: 0 },
      { ref: ringBRef, delay: 0.33 },
      { ref: ringCRef, delay: 0.66 },
    ];

    rings.forEach(({ ref, delay }) => {
      const ring = ref.current;
      if (!ring) {
        return;
      }

      const cycle = (time * 0.18 + delay) % 1;
      const ringScale = 0.4 + cycle * 8.4;
      ring.scale.setScalar(ringScale);

      const material = ring.material;
      if (material instanceof THREE.MeshBasicMaterial) {
        material.opacity = Math.max(0, (1 - cycle) * 0.12 * reveal) * fade;
      }
    });
  });

  return (
    <group position={[0, 0, -1.8]}>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.85, 24, 24]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color="#b9d7ff"
          depthWrite={false}
          transparent
        />
      </mesh>

      <mesh ref={ringARef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.98, 1.02, 96]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color="#d6e6ff"
          depthWrite={false}
          transparent
        />
      </mesh>
      <mesh ref={ringBRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.98, 1.02, 96]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color="#bdd6ff"
          depthWrite={false}
          transparent
        />
      </mesh>
      <mesh ref={ringCRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.98, 1.02, 96]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color="#ffffff"
          depthWrite={false}
          transparent
        />
      </mesh>

      <mesh ref={coreRef}>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshBasicMaterial color="#eef6ff" />
      </mesh>
    </group>
  );
}
