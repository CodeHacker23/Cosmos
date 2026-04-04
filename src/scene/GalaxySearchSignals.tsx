import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type {
  ExperiencePhase,
  GalaxySignalDefinition,
  GalaxySearchIntroState,
  GalaxyStage,
  ScreenSpacePoint,
} from '../features/experience/model/types';

interface GalaxySearchSignalsProps {
  phase: ExperiencePhase;
  stage: GalaxyStage;
  introState: GalaxySearchIntroState;
  signals: GalaxySignalDefinition[];
  activeSignalIds: string[];
  foundSignalIds: string[];
  featuredSignalId: string | null;
  onRevealSignal: (signalId: string, screenPosition: ScreenSpacePoint) => void;
}

export function GalaxySearchSignals({
  phase,
  stage,
  introState,
  signals,
  activeSignalIds,
  foundSignalIds,
  featuredSignalId,
  onRevealSignal,
}: GalaxySearchSignalsProps) {
  const [hoveredSignalId, setHoveredSignalId] = useState<string | null>(null);
  const groupsRef = useRef<Record<string, THREE.Group | null>>({});
  const coreRefs = useRef<Record<string, THREE.Mesh | null>>({});
  const haloRefs = useRef<Record<string, THREE.Mesh | null>>({});
  const ringRefs = useRef<Record<string, THREE.Mesh | null>>({});
  const signalActivationRef = useRef<Record<string, number>>({});
  const isVisible = phase === 'galaxy' && stage === 'search' && introState === 'active';
  const isInteractive = introState === 'active';
  const signalLookup = useMemo(
    () => Object.fromEntries(signals.map((signal) => [signal.id, signal])),
    [signals],
  );

  useFrame(({ clock }, delta) => {
    if (!isVisible) {
      return;
    }

    const time = clock.elapsedTime;

    signals.forEach((signal, index) => {
      const isActive = activeSignalIds.includes(signal.id);
      const group = groupsRef.current[signal.id];
      const core = coreRefs.current[signal.id];
      const halo = haloRefs.current[signal.id];
      const ring = ringRefs.current[signal.id];

      if (!group || !core || !halo || !ring) {
        return;
      }

      if (!isActive) {
        group.visible = false;
        return;
      }

      group.visible = true;

      if (signalActivationRef.current[signal.id] === undefined) {
        signalActivationRef.current[signal.id] = time;
      }

      const activationTime = signalActivationRef.current[signal.id] ?? time;
      const awakeProgress = THREE.MathUtils.clamp((time - activationTime) / 2.6, 0, 1);

      const [baseX, baseY, baseZ] = signal.position;
      const isFound = foundSignalIds.includes(signal.id);
      const isHovered = hoveredSignalId === signal.id;
      const isFeatured = featuredSignalId === signal.id;
      let targetX = baseX;
      let targetY = baseY;
      let targetZ = baseZ;
      let pulse = 1;

      if (signal.behavior === 'pulse') {
        pulse = 1 + Math.sin(time * 1.45 + index) * 0.16;
        targetY += Math.sin(time * 0.9 + index) * 0.24;
      }

      if (signal.behavior === 'drift') {
        pulse = 1 + Math.sin(time * 1.1 + index) * 0.08;
        targetX += Math.sin(time * 0.55 + index * 1.3) * 0.46;
        targetY += Math.cos(time * 0.82 + index * 0.8) * 0.2;
      }

      if (signal.behavior === 'veil') {
        pulse = 1 + Math.sin(time * 1.25 + index) * 0.05;
        targetX += Math.sin(time * 0.34 + index * 1.1) * 0.34;
        targetY += Math.sin(time * 0.65 + index * 0.7) * 0.14;
        targetZ += Math.cos(time * 0.5 + index) * 0.18;
      }

      group.position.x = THREE.MathUtils.lerp(group.position.x, targetX, delta * 3.2);
      group.position.y = THREE.MathUtils.lerp(group.position.y, targetY, delta * 3.2);
      group.position.z = THREE.MathUtils.lerp(group.position.z, targetZ, delta * 3.2);

      const featuredPulse = isFeatured ? 1 + Math.sin(time * 3.1 + index) * 0.14 : 1;
      const coreScaleBase = signal.behavior === 'veil' ? 1.24 : 0.92;
      const coreScale =
        (isFound ? 1.18 : coreScaleBase) * pulse * featuredPulse * (isHovered ? 1.12 : 1);
      core.scale.setScalar(coreScale);
      halo.scale.setScalar(
        (isFound ? 2.2 : signal.behavior === 'veil' ? 1.12 : 1.46) *
          pulse *
          (isFeatured ? 1.42 : 1) *
          (isHovered ? 1.2 : 1),
      );
      ring.scale.setScalar(
        (isFound ? 2.7 : signal.behavior === 'veil' ? 1.52 : 1.88) *
          (isFeatured ? 1.26 : 1) *
          (1 + Math.sin(time * 0.9 + index) * 0.05),
      );
      ring.rotation.z += delta * (0.26 + index * 0.04);

      const coreMaterial = core.material;
      const haloMaterial = halo.material;
      const ringMaterial = ring.material;
      const signalColor = new THREE.Color(signalLookup[signal.id]?.color ?? '#ffffff');
      const displayedColor =
        signal.behavior === 'veil'
          ? new THREE.Color('#f4f7ff').lerp(signalColor, awakeProgress)
          : signalColor;

      if (coreMaterial instanceof THREE.MeshBasicMaterial) {
        coreMaterial.color.copy(displayedColor);
        coreMaterial.opacity =
          signal.behavior === 'veil' && !isHovered && !isFound
            ? THREE.MathUtils.lerp(0.9, 0.48, awakeProgress)
            : isFound
              ? isFeatured
                ? 1
                : 0.96
              : signal.behavior === 'pulse'
                ? 0.68
                : signal.behavior === 'drift'
                  ? 0.62
                  : 0.74;
      }

      if (haloMaterial instanceof THREE.MeshBasicMaterial) {
        haloMaterial.color.copy(displayedColor);
        haloMaterial.opacity =
          signal.behavior === 'veil' && !isHovered && !isFound
            ? THREE.MathUtils.lerp(0.02, 0.08, awakeProgress)
            : isFeatured
              ? 0.28
              : isHovered
              ? 0.2
              : isFound
                ? 0.16
                : signal.behavior === 'drift'
                  ? 0.055
                  : 0.075;
      }

      if (ringMaterial instanceof THREE.MeshBasicMaterial) {
        ringMaterial.color.copy(displayedColor);
        ringMaterial.opacity =
          signal.behavior === 'veil' && !isHovered && !isFound
            ? THREE.MathUtils.lerp(0.01, 0.06, awakeProgress)
            : isFeatured
              ? 0.34
              : (isHovered && isInteractive) || isFound
              ? 0.22
              : signal.behavior === 'drift'
                ? 0.012
                : 0.018;
      }
    });
  });

  if (!isVisible) {
    return null;
  }

  return (
    <group>
      {signals.map((signal) => {
        const isFound = foundSignalIds.includes(signal.id);
        const color = signalLookup[signal.id]?.color ?? '#ffffff';

        return (
          <group
            key={signal.id}
            position={signal.position}
            ref={(node) => {
              groupsRef.current[signal.id] = node;
            }}
          >
            <mesh
              ref={(node) => {
                coreRefs.current[signal.id] = node;
              }}
              onClick={(event) => {
                event.stopPropagation();
                if (isInteractive) {
                  onRevealSignal(signal.id, {
                    x: event.clientX,
                    y: event.clientY,
                  });
                }
              }}
              onPointerOut={(event) => {
                event.stopPropagation();
                setHoveredSignalId((current) => (current === signal.id ? null : current));
              }}
              onPointerOver={(event) => {
                event.stopPropagation();
                if (isInteractive) {
                  setHoveredSignalId(signal.id);
                }
              }}
            >
              <sphereGeometry args={[signal.behavior === 'veil' ? 0.22 : 0.165, 18, 18]} />
              <meshBasicMaterial
                blending={THREE.AdditiveBlending}
                color={color}
                depthWrite={false}
                opacity={isFound ? 0.96 : signal.behavior === 'drift' ? 0.62 : 0.68}
                transparent
              />
            </mesh>
            <mesh
              ref={(node) => {
                haloRefs.current[signal.id] = node;
              }}
            >
              <sphereGeometry args={[signal.behavior === 'veil' ? 0.24 : 0.3, 18, 18]} />
              <meshBasicMaterial
                blending={THREE.AdditiveBlending}
                color={color}
                depthWrite={false}
                opacity={signal.behavior === 'veil' ? 0.018 : signal.behavior === 'drift' ? 0.05 : 0.07}
                transparent
              />
            </mesh>
            <mesh
              ref={(node) => {
                ringRefs.current[signal.id] = node;
              }}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <torusGeometry args={[signal.behavior === 'veil' ? 0.34 : 0.41, 0.018, 10, 42]} />
              <meshBasicMaterial
                blending={THREE.AdditiveBlending}
                color={color}
                depthWrite={false}
                opacity={signal.behavior === 'veil' ? 0.008 : 0.015}
                transparent
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
