import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { GalaxySignalDefinition, GalaxyStage } from '../features/experience/model/types';

const specialStarVertexShader = `
uniform float uSize;
uniform float uOpacity;

varying float vOpacity;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uSize * (180.0 / max(1.0, -mvPosition.z));
  vOpacity = uOpacity;
}
`;

const specialStarFragmentShader = `
varying float vOpacity;

void main() {
  vec2 centered = gl_PointCoord - 0.5;
  float dist = length(centered);

  if (dist > 0.5) {
    discard;
  }

  float core = smoothstep(0.11, 0.0, dist);
  float halo = smoothstep(0.5, 0.03, dist);
  float verticalSpike = 1.0 - smoothstep(0.008, 0.15, abs(centered.x));
  float horizontalSpike = 1.0 - smoothstep(0.008, 0.15, abs(centered.y));
  float diagA = 1.0 - smoothstep(0.01, 0.12, abs(centered.x - centered.y));
  float diagB = 1.0 - smoothstep(0.01, 0.12, abs(centered.x + centered.y));
  float spikes = (verticalSpike + horizontalSpike) * 0.3 + (diagA + diagB) * 0.14;

  float alpha = clamp((core * 1.4 + halo * 0.32 + spikes * 0.34) * vOpacity, 0.0, 1.0);
  vec3 warm = vec3(1.0, 0.95, 0.82);
  vec3 gold = vec3(1.0, 0.76, 0.42);
  vec3 color = mix(gold, warm, core + halo * 0.2);

  gl_FragColor = vec4(color * (1.0 + core * 1.25 + spikes * 0.55), alpha);
}
`;

interface GalaxyConstellationRitualProps {
  stage: GalaxyStage;
  signals: GalaxySignalDefinition[];
  linkedSignalIds: string[];
  starbirthProgress: number;
  specialStarOpened: boolean;
  onConnectSignal: (signalId: string) => boolean;
  onOpenSpecialStar: () => void;
}

export function GalaxyConstellationRitual({
  stage,
  signals,
  linkedSignalIds,
  starbirthProgress,
  specialStarOpened,
  onConnectSignal,
  onOpenSpecialStar,
}: GalaxyConstellationRitualProps) {
  const groupRefs = useRef<Record<string, THREE.Group | null>>({});
  const coreRefs = useRef<Record<string, THREE.Mesh | null>>({});
  const haloRefs = useRef<Record<string, THREE.Mesh | null>>({});
  const flashCoreRef = useRef<THREE.Mesh | null>(null);
  const starRef = useRef<THREE.Group | null>(null);
  const starCoreRef = useRef<THREE.Mesh | null>(null);
  const starGlowRef = useRef<THREE.Mesh | null>(null);
  const starSpriteRef =
    useRef<THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | null>(null);
  const [dragAnchorId, setDragAnchorId] = useState<string | null>(null);
  const [dragPoint, setDragPoint] = useState<[number, number, number] | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const signalLookup = useMemo(
    () => Object.fromEntries(signals.map((signal) => [signal.id, signal])),
    [signals],
  );
  const weaveOrder = useMemo(() => signals.map((signal) => signal.id), [signals]);
  const orbitCenter = useMemo(() => new THREE.Vector3(0.08, 0.1, -8.5), []);
  const specialStarTarget = useMemo(() => new THREE.Vector3(6.4, 0.42, -4.95), []);
  const specialStarSpiralMetrics = useMemo(() => {
    const dx = specialStarTarget.x - orbitCenter.x;
    const dy = (specialStarTarget.y - orbitCenter.y) / 0.62;
    const targetRadius = Math.sqrt(dx * dx + dy * dy);
    const rawTargetAngle = Math.atan2(dy, dx);
    const startAngle = 0.42;
    let targetAngle = rawTargetAngle;

    while (targetAngle <= startAngle + Math.PI * 2.35) {
      targetAngle += Math.PI * 2;
    }

    return { startAngle, targetAngle, targetRadius };
  }, [orbitCenter, specialStarTarget]);
  const specialStarGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
    return geometry;
  }, []);
  const specialStarUniforms = useMemo(
    () => ({
      uSize: { value: 16 },
      uOpacity: { value: 0 },
    }),
    [],
  );

  useEffect(
    () => () => {
      specialStarGeometry.dispose();
    },
    [specialStarGeometry],
  );
  const nextExpectedId =
    linkedSignalIds.length < weaveOrder.length ? weaveOrder[linkedSignalIds.length] : null;

  useEffect(() => {
    if (stage !== 'weave') {
      setDragActive(false);
      setDragAnchorId(null);
      setDragPoint(null);
      return;
    }

    if (nextExpectedId === null) {
      setDragActive(false);
      setDragAnchorId(null);
      setDragPoint(null);
    }
  }, [nextExpectedId, stage]);

  const updateDragPointFromEvent = (event: ThreeEvent<PointerEvent>) => {
    setDragPoint([event.point.x, event.point.y, event.point.z]);
  };

  const beginSignalDrag = (signalId: string, event: ThreeEvent<PointerEvent>) => {
    if (stage !== 'weave') {
      return;
    }

    const currentAnchorId =
      linkedSignalIds.length === 0
        ? nextExpectedId
        : linkedSignalIds[linkedSignalIds.length - 1] ?? null;

    if (signalId !== currentAnchorId) {
      return;
    }

    event.stopPropagation();
    updateDragPointFromEvent(event);
    setDragActive(true);
    setDragAnchorId(signalId);

    if (linkedSignalIds.length === 0 && nextExpectedId === signalId) {
      onConnectSignal(signalId);
    }
  };

  const continueSignalDrag = (signalId: string, event: ThreeEvent<PointerEvent>) => {
    if (stage !== 'weave' || !dragActive) {
      return;
    }

    event.stopPropagation();
    updateDragPointFromEvent(event);

    if (!nextExpectedId || signalId !== nextExpectedId || signalId === dragAnchorId) {
      return;
    }

    const accepted = onConnectSignal(signalId);
    if (!accepted) {
      return;
    }

    const isLastSignal = signalId === weaveOrder[weaveOrder.length - 1];
    if (isLastSignal) {
      setDragActive(false);
      setDragAnchorId(null);
      setDragPoint(null);
      return;
    }

    setDragAnchorId(signalId);
  };

  const endSignalDrag = () => {
    if (stage !== 'weave') {
      return;
    }

    setDragActive(false);
    setDragAnchorId(null);
    setDragPoint(null);
  };

  useFrame(({ clock }, delta) => {
    if (!['weave', 'starbirth', 'artifact'].includes(stage)) {
      return;
    }

    const time = clock.elapsedTime;
    const starbirthRamp = THREE.MathUtils.smootherstep(starbirthProgress, 0.08, 1);
    const starReveal = THREE.MathUtils.smootherstep(starbirthProgress, 0.78, 0.94);
    const spiralTravel = THREE.MathUtils.smootherstep(starbirthProgress, 0.56, 0.96);
    const waltzContrast = stage === 'starbirth'
      ? 1 + THREE.MathUtils.smootherstep(starbirthProgress, 0.12, 0.72) * 0.34
      : 1;

    signals.forEach((signal, index) => {
      const group = groupRefs.current[signal.id];
      const core = coreRefs.current[signal.id];
      const halo = haloRefs.current[signal.id];

      if (!group || !core || !halo) {
        return;
      }

      const base = new THREE.Vector3(...signal.position);
      const angle = time * 0.8 + (index / signals.length) * Math.PI * 2;
      const orbitRadius = THREE.MathUtils.lerp(
        2.8,
        0.14,
        THREE.MathUtils.smootherstep(starbirthProgress, 0.58, 1),
      );
      const orbitPosition = new THREE.Vector3(
        orbitCenter.x + Math.cos(angle) * orbitRadius,
        orbitCenter.y + Math.sin(angle) * orbitRadius * 0.56,
        orbitCenter.z + Math.sin(angle * 1.4) * 0.24,
      );

      const isLinked = linkedSignalIds.includes(signal.id);
      const isNextTarget = stage === 'weave' && nextExpectedId === signal.id;
      const targetPosition =
        stage === 'weave'
          ? base
          : stage === 'starbirth'
            ? orbitPosition
            : orbitCenter;

      group.position.lerp(targetPosition, delta * (stage === 'weave' ? 3.2 : 2.8));
      group.visible = stage !== 'artifact';

      const pulse = 1 + Math.sin(time * 2.2 + index) * 0.12;
      const linkedBoost = isLinked ? 1.22 * waltzContrast : 1;
      const nextTargetBoost = isNextTarget ? 1.34 + Math.sin(time * 5.2) * 0.08 : 1;

      core.scale.setScalar(linkedBoost * nextTargetBoost * pulse * (1 + starbirthRamp * 0.3));
      halo.scale.setScalar(
        (isLinked ? 2.2 * waltzContrast : isNextTarget ? 2.45 : 1.7) *
          pulse *
          (1 + starbirthRamp * 0.46),
      );

      const coreMaterial = core.material;
      const haloMaterial = halo.material;
      if (coreMaterial instanceof THREE.MeshBasicMaterial) {
        coreMaterial.opacity = isLinked && stage === 'starbirth'
          ? 1
          : isLinked
            ? 1
            : isNextTarget
              ? 0.96
              : 0.82;
      }
      if (haloMaterial instanceof THREE.MeshBasicMaterial) {
        haloMaterial.opacity = isLinked
          ? 0.3 + starbirthRamp * 0.18
          : isNextTarget
            ? 0.2
            : 0.1;
      }
    });

    if (flashCoreRef.current) {
      const material = flashCoreRef.current.material;
      if (material instanceof THREE.MeshBasicMaterial) {
        const flashStrength = stage === 'starbirth'
          ? flashBand(starbirthProgress, 0.78, 0.88, 0.96)
          : 0;
        flashCoreRef.current.scale.setScalar(0.44 + flashStrength * 6.8);
        material.opacity = flashStrength * 0.26;
      }
    }

    if (starRef.current) {
      const visible = stage === 'artifact' || (stage === 'starbirth' && starbirthProgress > 0.82);
      starRef.current.visible = visible;

      let targetPosition = specialStarTarget.clone();
      if (stage === 'starbirth') {
        const spiralRadius = THREE.MathUtils.lerp(
          0.12,
          specialStarSpiralMetrics.targetRadius,
          spiralTravel,
        );
        const spiralAngle = THREE.MathUtils.lerp(
          specialStarSpiralMetrics.startAngle,
          specialStarSpiralMetrics.targetAngle,
          spiralTravel,
        );
        targetPosition = new THREE.Vector3(
          orbitCenter.x + Math.cos(spiralAngle) * spiralRadius,
          orbitCenter.y + Math.sin(spiralAngle) * spiralRadius * 0.62,
          THREE.MathUtils.lerp(orbitCenter.z, specialStarTarget.z, spiralTravel) +
            Math.sin(spiralAngle * 1.18) * 0.08 * (1 - spiralTravel),
        );
      }

      if (stage === 'starbirth') {
        starRef.current.position.copy(targetPosition);
      } else {
        starRef.current.position.lerp(targetPosition, delta * 2.2);
      }

      const prestigePulse = 1 + Math.sin(time * 2.1) * 0.08;
      const openedBoost = specialStarOpened ? 1.16 : 1;
      starRef.current.scale.setScalar((0.28 + starReveal * 1.44) * prestigePulse * openedBoost);
    }

    const specialIntensity =
      stage === 'artifact'
        ? 1
        : stage === 'starbirth'
          ? THREE.MathUtils.smootherstep(starbirthProgress, 0.46, 1)
          : 0;

    updateSpecialStarMesh(starCoreRef.current, 1, '#fff5d6');
    updateSpecialStarMesh(starGlowRef.current, 0, '#ffbb66');

    if (starSpriteRef.current) {
      starSpriteRef.current.material.uniforms.uOpacity.value = THREE.MathUtils.lerp(
        starSpriteRef.current.material.uniforms.uOpacity.value,
        0.74 + specialIntensity * 0.24,
        0.14,
      );
      starSpriteRef.current.material.uniforms.uSize.value = THREE.MathUtils.lerp(
        starSpriteRef.current.material.uniforms.uSize.value,
        13.4 + specialIntensity * 7 + Math.sin(time * 2.1) * 0.95,
        0.14,
      );
    }
  });

  if (!['weave', 'starbirth', 'artifact'].includes(stage)) {
    return null;
  }

  const previewStartId =
    dragAnchorId ??
    (linkedSignalIds.length > 0 ? linkedSignalIds[linkedSignalIds.length - 1] ?? null : null);
  const previewStart = previewStartId ? signalLookup[previewStartId]?.position ?? null : null;

  return (
    <group>
      <mesh
        position={[0, 0, -7.6]}
        onPointerLeave={endSignalDrag}
        onPointerMove={(event) => {
          if (dragActive) {
            updateDragPointFromEvent(event);
          }
        }}
        onPointerUp={endSignalDrag}
      >
        <planeGeometry args={[36, 28]} />
        <meshBasicMaterial depthWrite={false} opacity={0} transparent />
      </mesh>

      {signals.map((signal) => {
        const color = signalLookup[signal.id]?.color ?? '#ffffff';

        return (
          <group
            key={signal.id}
            position={signal.position}
            ref={(node) => {
              groupRefs.current[signal.id] = node;
            }}
          >
            <mesh
              ref={(node) => {
                coreRefs.current[signal.id] = node;
              }}
              onPointerDown={(event) => {
                beginSignalDrag(signal.id, event);
              }}
              onPointerMove={(event) => {
                if (dragActive) {
                  updateDragPointFromEvent(event);
                }
              }}
              onPointerOver={(event) => {
                continueSignalDrag(signal.id, event);
              }}
            >
              <sphereGeometry args={[0.21, 20, 20]} />
              <meshBasicMaterial
                blending={THREE.AdditiveBlending}
                color={color}
                depthWrite={false}
                opacity={0.92}
                transparent
              />
            </mesh>
            <mesh
              ref={(node) => {
                haloRefs.current[signal.id] = node;
              }}
            >
              <sphereGeometry args={[0.34, 20, 20]} />
              <meshBasicMaterial
                blending={THREE.AdditiveBlending}
                color={color}
                depthWrite={false}
                opacity={0.1}
                transparent
              />
            </mesh>
          </group>
        );
      })}

      {stage === 'weave' &&
        linkedSignalIds.slice(1).map((signalId, index) => {
          const fromId = linkedSignalIds[index];
          const toId = signalId;
          const fromSignal = signalLookup[fromId];
          const toSignal = signalLookup[toId];
          if (!fromSignal || !toSignal) {
            return null;
          }

          return (
            <ConstellationBridge
              key={`${fromId}-${toId}`}
              end={toSignal.position}
              start={fromSignal.position}
            />
          );
        })}

      {stage === 'weave' && dragActive && previewStart && dragPoint && (
        <ConstellationBridge end={dragPoint} preview start={previewStart} />
      )}

      <mesh ref={flashCoreRef} position={orbitCenter}>
        <sphereGeometry args={[0.8, 28, 28]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color="#ffe8bd"
          depthWrite={false}
          opacity={0}
          transparent
        />
      </mesh>

      <group
        ref={starRef}
        visible={false}
      >
        <mesh ref={starGlowRef}>
          <sphereGeometry args={[0.46, 24, 24]} />
          <meshBasicMaterial
            blending={THREE.AdditiveBlending}
            color="#ffbb66"
            depthWrite={false}
            opacity={0}
            transparent
          />
        </mesh>
        <points ref={starSpriteRef} renderOrder={10}>
          <primitive attach="geometry" object={specialStarGeometry} />
          <shaderMaterial
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            fragmentShader={specialStarFragmentShader}
            transparent
            uniforms={specialStarUniforms}
            vertexShader={specialStarVertexShader}
          />
        </points>
        <mesh ref={starCoreRef}>
          <sphereGeometry args={[0.15, 24, 24]} />
          <meshBasicMaterial
            blending={THREE.AdditiveBlending}
            color="#fff5d6"
            depthWrite={false}
            opacity={0}
            transparent
          />
        </mesh>
        <mesh
          onClick={(event) => {
            event.stopPropagation();
            if (stage === 'artifact') {
              onOpenSpecialStar();
            }
          }}
        >
          <sphereGeometry args={[0.64, 18, 18]} />
          <meshBasicMaterial depthWrite={false} opacity={0} transparent />
        </mesh>
      </group>
    </group>
  );
}

function ConstellationBridge({
  start,
  end,
  preview = false,
}: {
  start: [number, number, number];
  end: [number, number, number];
  preview?: boolean;
}) {
  const points = useMemo(() => {
    const startVector = new THREE.Vector3(...start);
    const endVector = new THREE.Vector3(...end);
    const control = startVector.clone().lerp(endVector, 0.5);
    control.y += preview ? 0.48 : 0.8;
    control.z += preview ? 0.06 : 0.18;
    return new THREE.QuadraticBezierCurve3(startVector, control, endVector).getPoints(36);
  }, [end, preview, start]);

  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  const line = useMemo(
    () =>
      new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({
          color: preview ? '#ffd88f' : '#efe6ff',
          opacity: preview ? 0.98 : 0.88,
          transparent: true,
        }),
      ),
    [geometry, preview],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      const material = line.material;
      if (material instanceof THREE.Material) {
        material.dispose();
      }
    },
    [geometry, line],
  );

  return <primitive object={line} />;
}

function flashBand(value: number, start: number, peak: number, end: number) {
  if (value <= start || value >= end) {
    return 0;
  }

  if (value <= peak) {
    return (value - start) / (peak - start);
  }

  return 1 - (value - peak) / (end - peak);
}

function updateSpecialStarMesh(
  mesh: THREE.Mesh | null,
  opacity: number,
  color: string,
) {
  if (!mesh) {
    return;
  }

  const material = mesh.material;
  if (material instanceof THREE.MeshBasicMaterial) {
    material.opacity = THREE.MathUtils.clamp(opacity, 0, 1);
    material.color.set(color);
  }
}
