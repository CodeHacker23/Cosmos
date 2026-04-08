import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface NewSpaceActProps {
  active: boolean;
}

const STAR_COUNT = 22000;

export function NewSpaceAct({ active }: NewSpaceActProps) {
  const groupRef = useRef<THREE.Group | null>(null);
  const starRef = useRef<THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> | null>(null);

  const starPositions = useMemo(() => {
    const data = new Float32Array(STAR_COUNT * 3);
    for (let index = 0; index < STAR_COUNT; index += 1) {
      const i3 = index * 3;
      const shell = 0.35 + Math.random() * 0.65;
      const radius = (28 + Math.random() * 220) * shell;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      data[i3] = radius * Math.sin(phi) * Math.cos(theta);
      data[i3 + 1] = radius * Math.cos(phi) * 0.92;
      data[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    return data;
  }, []);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) {
      return;
    }

    groupRef.current.visible = active;
    if (!active) {
      return;
    }

    const time = clock.elapsedTime;
    groupRef.current.rotation.y += delta * 0.009;
    groupRef.current.rotation.x = Math.sin(time * 0.05) * 0.024;

    if (starRef.current) {
      const mat = starRef.current.material;
      mat.opacity = 0.72 + Math.sin(time * 0.31) * 0.06;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <points ref={starRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          blending={THREE.AdditiveBlending}
          color="#b8d4ff"
          depthWrite={false}
          opacity={0.78}
          size={0.085}
          sizeAttenuation
          transparent
        />
      </points>
    </group>
  );
}
