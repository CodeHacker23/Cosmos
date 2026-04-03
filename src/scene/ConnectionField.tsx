import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ExperiencePhase } from '../features/experience/model/types';

interface ConnectionFieldProps {
  introProgress: number;
  phase: ExperiencePhase;
}

export function ConnectionField({
  introProgress,
  phase,
}: ConnectionFieldProps) {
  const warmRef = useRef<THREE.Mesh | null>(null);
  const coolRef = useRef<THREE.Mesh | null>(null);
  const shellRef = useRef<THREE.Mesh | null>(null);

  const geometry = useMemo(() => {
    const points = [
      new THREE.Vector3(0, 8.4, -2),
      new THREE.Vector3(0.85, 4.2, -2.8),
      new THREE.Vector3(-0.45, 0.6, -3.1),
      new THREE.Vector3(0.5, -3.9, -2.7),
      new THREE.Vector3(0, -8.4, -2),
    ];

    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(curve, 96, 0.055, 10, false);
  }, []);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const reveal = THREE.MathUtils.smoothstep(introProgress, 0.3, 0.86);
    const warpBoost = phase === 'singularity' ? 1.9 : phase === 'galaxy' ? 0.75 : 0.45;
    const baseOpacity = reveal * (0.07 + warpBoost * 0.03);
    const wave = 0.82 + Math.sin(time * 1.15) * 0.18;

    if (warmRef.current?.material instanceof THREE.MeshBasicMaterial) {
      warmRef.current.material.opacity = baseOpacity * wave;
      warmRef.current.scale.x = 1 + Math.sin(time * 0.7) * 0.025;
    }

    if (coolRef.current?.material instanceof THREE.MeshBasicMaterial) {
      coolRef.current.material.opacity = baseOpacity * (1.04 - (wave - 1));
      coolRef.current.scale.x = 1 - Math.sin(time * 0.76) * 0.025;
    }

    if (shellRef.current?.material instanceof THREE.MeshBasicMaterial) {
      shellRef.current.material.opacity = reveal * 0.035;
      shellRef.current.rotation.z = Math.sin(time * 0.24) * 0.07;
    }
  });

  return (
    <group>
      <mesh geometry={geometry} ref={shellRef}>
        <meshBasicMaterial color="#dce9ff" transparent blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh geometry={geometry} position={[0.04, 0, 0]} ref={warmRef}>
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color="#ff8f52"
          transparent
        />
      </mesh>
      <mesh geometry={geometry} position={[-0.04, 0, -0.12]} ref={coolRef}>
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color="#7bb8ff"
          transparent
        />
      </mesh>
    </group>
  );
}
