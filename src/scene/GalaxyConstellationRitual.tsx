import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type {
  GalaxySignalDefinition,
  GalaxyStage,
  GalaxyWeaveFailureState,
} from '../features/experience/model/types';

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
  weaveFailureState: GalaxyWeaveFailureState;
  starbirthProgress: number;
  specialStarOpened: boolean;
  onConnectSignal: (fromSignalId: string, signalId: string) => boolean;
  onOpenSpecialStar: () => void;
}

type SignalLayout = Record<string, [number, number, number]>;

interface ShuffleMotionState {
  active: boolean;
  startedAt: number;
  duration: number;
  startLayout: SignalLayout;
  targetLayout: SignalLayout;
}

export function GalaxyConstellationRitual({
  stage,
  signals,
  linkedSignalIds,
  weaveFailureState,
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
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);
  const [dragPoint, setDragPoint] = useState<[number, number, number] | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [failureBridge, setFailureBridge] = useState<{
    start: [number, number, number];
    end: [number, number, number];
  } | null>(null);
  const failureStartedAtRef = useRef(-1000);
  const shuffleMotionRef = useRef<ShuffleMotionState | null>(null);

  const signalLookup = useMemo(
    () => Object.fromEntries(signals.map((signal) => [signal.id, signal])),
    [signals],
  );
  const weaveOrder = useMemo(() => signals.map((signal) => signal.id), [signals]);
  const initialSignalLayout = useMemo(
    () =>
      Object.fromEntries(
        signals.map((signal) => [signal.id, [...signal.position] as [number, number, number]]),
      ) as Record<string, [number, number, number]>,
    [signals],
  );
  const [signalLayout, setSignalLayout] = useState<SignalLayout>(initialSignalLayout);
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

  useEffect(() => {
    setSignalLayout(initialSignalLayout);
    shuffleMotionRef.current = null;
  }, [initialSignalLayout]);

  const expectedAnchorId =
    linkedSignalIds.length === 0
      ? weaveOrder[0] ?? null
      : linkedSignalIds[linkedSignalIds.length - 1] ?? null;
  const nextExpectedId =
    linkedSignalIds.length === 0
      ? weaveOrder[1] ?? null
      : linkedSignalIds.length < weaveOrder.length
        ? weaveOrder[linkedSignalIds.length]
        : null;

  useEffect(() => {
    if (stage !== 'weave') {
      setDragActive(false);
      setDragAnchorId(null);
      setDragTargetId(null);
      setDragPoint(null);
      setSignalLayout(initialSignalLayout);
      shuffleMotionRef.current = null;
      return;
    }

    if (expectedAnchorId === null || nextExpectedId === null) {
      setDragActive(false);
      setDragAnchorId(null);
      setDragTargetId(null);
      setDragPoint(null);
    }
  }, [expectedAnchorId, initialSignalLayout, nextExpectedId, stage]);

  useEffect(() => {
    if (!weaveFailureState.active) {
      setFailureBridge(null);
      return;
    }

    failureStartedAtRef.current = window.performance.now();
    const shuffleStartedAt = window.performance.now();
    if (weaveFailureState.attemptedFromId && weaveFailureState.failedSignalId) {
      const startPosition = getSignalPosition(weaveFailureState.attemptedFromId);
      const endPosition = getSignalPosition(weaveFailureState.failedSignalId);
      if (startPosition && endPosition) {
        setFailureBridge({ start: startPosition, end: endPosition });
      }
    }
    setSignalLayout((current) => {
      const next = rotateSignalLayout(
        current,
        weaveFailureState.decoySignalIds,
        weaveFailureState.failureKey,
      );
      shuffleMotionRef.current = {
        active: true,
        duration: 940,
        startedAt: shuffleStartedAt,
        startLayout: current,
        targetLayout: next,
      };
      return next;
    });
    setDragActive(false);
    setDragAnchorId(null);
    setDragTargetId(null);
    setDragPoint(null);
  }, [weaveFailureState.active, weaveFailureState.failureKey]);

  const getSignalPosition = (signalId: string): [number, number, number] | null => {
    const shuffleMotion = shuffleMotionRef.current;
    if (shuffleMotion?.active) {
      const start = shuffleMotion.startLayout[signalId];
      const target = shuffleMotion.targetLayout[signalId];
      if (start && target) {
        const progress = getShuffleProgress(shuffleMotion);
        const motionProgress = THREE.MathUtils.smootherstep(progress, 0, 1);
        if (progress >= 1) {
          shuffleMotionRef.current = null;
          return target;
        }

        return animateSignalShuffle(start, target, signalId, motionProgress);
      }
    }

    return signalLayout[signalId] ?? signalLookup[signalId]?.position ?? null;
  };

  const updateDragPointFromEvent = (event: ThreeEvent<PointerEvent>) => {
    setDragPoint([event.point.x, event.point.y, event.point.z]);
    setDragTargetId(null);
  };

  const beginSignalDrag = (signalId: string, event: ThreeEvent<PointerEvent>) => {
    if (stage !== 'weave') {
      return;
    }

    const canStartFromSignal =
      linkedSignalIds.length === 0
        ? true
        : signalId === expectedAnchorId;

    if (
      !canStartFromSignal ||
      (linkedSignalIds.includes(signalId) && signalId !== expectedAnchorId)
    ) {
      return;
    }

    event.stopPropagation();
    updateDragPointFromEvent(event);
    setDragActive(true);
    setDragAnchorId(signalId);
    setDragTargetId(null);
  };

  const continueSignalDrag = (signalId: string, event: ThreeEvent<PointerEvent>) => {
    if (stage !== 'weave' || !dragActive) {
      return;
    }

    event.stopPropagation();
    updateDragPointFromEvent(event);
    setDragTargetId(signalId);

    if (!dragAnchorId || signalId === dragAnchorId || linkedSignalIds.includes(signalId)) {
      return;
    }

    const accepted = onConnectSignal(dragAnchorId, signalId);
    if (!accepted) {
      return;
    }

    const isLastSignal = signalId === weaveOrder[weaveOrder.length - 1];
    if (isLastSignal) {
      setDragActive(false);
      setDragAnchorId(null);
      setDragTargetId(null);
      setDragPoint(null);
      return;
    }

    setDragAnchorId(signalId);
    setDragTargetId(null);
  };

  const endSignalDrag = () => {
    if (stage !== 'weave') {
      return;
    }

    setDragActive(false);
    setDragAnchorId(null);
    setDragTargetId(null);
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
    const failureProgress = weaveFailureState.active
      ? THREE.MathUtils.clamp((window.performance.now() - failureStartedAtRef.current) / 880, 0, 1)
      : 1;
    const failureWave =
      stage === 'weave' && weaveFailureState.active ? Math.sin(failureProgress * Math.PI) : 0;
    const waltzContrast = stage === 'starbirth'
      ? 1 + THREE.MathUtils.smootherstep(starbirthProgress, 0.12, 0.72) * 0.48
      : 1;

    signals.forEach((signal, index) => {
      const group = groupRefs.current[signal.id];
      const core = coreRefs.current[signal.id];
      const halo = haloRefs.current[signal.id];

      if (!group || !core || !halo) {
        return;
      }

      const base = new THREE.Vector3(...(getSignalPosition(signal.id) ?? signal.position));
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
      const isExpectedAnchor = stage === 'weave' && expectedAnchorId === signal.id;
      const isFailureAttemptedFrom = weaveFailureState.attemptedFromId === signal.id;
      const isFailureExpectedAnchor = weaveFailureState.expectedFromId === signal.id;
      const isFailureExpected = weaveFailureState.expectedSignalId === signal.id;
      const isFailureWrong = weaveFailureState.failedSignalId === signal.id;
      const isFailureDecoy = weaveFailureState.decoySignalIds.includes(signal.id);
      const targetPosition =
        stage === 'weave'
          ? getWeaveSignalPosition({
              base,
              failureWave,
              index,
              isFailureAttemptedFrom,
              isFailureExpectedAnchor,
              isFailureDecoy,
              isFailureExpected,
              isFailureWrong,
              time,
            })
          : stage === 'starbirth'
            ? orbitPosition
            : orbitCenter;

      group.position.lerp(targetPosition, delta * (stage === 'weave' ? 3.2 : 2.8));
      group.visible = stage !== 'artifact';

      const pulse = 1 + Math.sin(time * 2.2 + index) * 0.12;
      const linkedBoost = isLinked ? 1.26 * waltzContrast : 1;
      const anchorBoost = isExpectedAnchor ? 1.16 + Math.sin(time * 4.4) * 0.06 : 1;
      const nextTargetBoost = isNextTarget ? 1.34 + Math.sin(time * 5.2) * 0.08 : 1;
      const failureBoost =
        isFailureAttemptedFrom || isFailureExpected || isFailureWrong
          ? 1 + failureWave * 0.58
          : isFailureDecoy
            ? 1 + failureWave * 0.28
            : 1;

      core.scale.setScalar(
        linkedBoost *
          anchorBoost *
          nextTargetBoost *
          failureBoost *
          pulse *
          (1 + starbirthRamp * 0.3),
      );
      halo.scale.setScalar(
        (
          isLinked
            ? 2.34 * waltzContrast
            : isExpectedAnchor
              ? 2.02
              : isNextTarget
                ? 2.55
                : 1.7 + failureWave * 0.12
        ) *
          pulse *
          failureBoost *
          (1 + starbirthRamp * 0.46),
      );

      const coreMaterial = core.material;
      const haloMaterial = halo.material;
      if (coreMaterial instanceof THREE.MeshBasicMaterial) {
        coreMaterial.opacity = isFailureAttemptedFrom || isFailureExpected || isFailureWrong
          ? 0.98
          : isFailureDecoy
            ? 0.92
            : isLinked && stage === 'starbirth'
              ? 1
              : isLinked
                ? 1
                : isNextTarget
                  ? 0.96
                  : isExpectedAnchor
                    ? 0.9
                  : 0.82;
      }
      if (haloMaterial instanceof THREE.MeshBasicMaterial) {
        haloMaterial.opacity = isFailureAttemptedFrom || isFailureExpected || isFailureWrong
          ? 0.28 + failureWave * 0.22
          : isFailureDecoy
            ? 0.16 + failureWave * 0.08
            : isLinked
              ? 0.34 + starbirthRamp * 0.22
              : isExpectedAnchor
                ? 0.18
              : isNextTarget
                ? 0.24
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
  const previewStart = previewStartId ? getSignalPosition(previewStartId) : null;
  const previewEnd = dragTargetId ? getSignalPosition(dragTargetId) : dragPoint;

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
            ref={(node) => {
              groupRefs.current[signal.id] = node;
              if (node && node.position.lengthSq() === 0) {
                const initialPosition = getSignalPosition(signal.id) ?? signal.position;
                node.position.set(...initialPosition);
              }
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
        signals.map((signal) => (
          <SignalShuffleTrail
            color={signal.color}
            key={`trail-${signal.id}`}
            shuffleMotionRef={shuffleMotionRef}
            signalId={signal.id}
          />
        ))}

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
              end={getSignalPosition(toId) ?? toSignal.position}
              start={getSignalPosition(fromId) ?? fromSignal.position}
            />
          );
        })}

      {stage === 'weave' && dragActive && previewStart && previewEnd && (
        <ConstellationBridge
          end={previewEnd}
          preview
          start={previewStart}
        />
      )}

      {stage === 'weave' &&
        weaveFailureState.active &&
        failureBridge &&
        (
          <ConstellationBridge
            end={failureBridge.end}
            hazard
            start={failureBridge.start}
          />
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

function SignalShuffleTrail({
  signalId,
  color,
  shuffleMotionRef,
}: {
  signalId: string;
  color: string;
  shuffleMotionRef: MutableRefObject<ShuffleMotionState | null>;
}) {
  const glowGeometry = useMemo(() => new THREE.BufferGeometry(), []);
  const coreGeometry = useMemo(() => new THREE.BufferGeometry(), []);
  const glowMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        blending: THREE.AdditiveBlending,
        color,
        depthWrite: false,
        opacity: 0,
        transparent: true,
      }),
    [color],
  );
  const coreMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: '#fff6df',
        depthWrite: false,
        opacity: 0,
        transparent: true,
      }),
    [],
  );
  const glowLine = useMemo(
    () => new THREE.Line(glowGeometry, glowMaterial),
    [glowGeometry, glowMaterial],
  );
  const coreLine = useMemo(
    () => new THREE.Line(coreGeometry, coreMaterial),
    [coreGeometry, coreMaterial],
  );

  useEffect(
    () => () => {
      glowGeometry.dispose();
      coreGeometry.dispose();
      glowMaterial.dispose();
      coreMaterial.dispose();
    },
    [coreGeometry, coreMaterial, glowGeometry, glowMaterial],
  );

  useFrame(() => {
    const shuffleMotion = shuffleMotionRef.current;
    if (!shuffleMotion?.active) {
      glowMaterial.opacity = THREE.MathUtils.lerp(glowMaterial.opacity, 0, 0.24);
      coreMaterial.opacity = THREE.MathUtils.lerp(coreMaterial.opacity, 0, 0.26);
      return;
    }

    const start = shuffleMotion.startLayout[signalId];
    const target = shuffleMotion.targetLayout[signalId];
    if (!start || !target) {
      return;
    }

    const progress = getShuffleProgress(shuffleMotion);
    const tailStart = Math.max(0, progress - 0.26);
    const points: THREE.Vector3[] = [];

    for (let step = 0; step < 8; step += 1) {
      const t = THREE.MathUtils.lerp(tailStart, progress, step / 7);
      const point = animateSignalShuffle(start, target, signalId, t);
      points.push(new THREE.Vector3(...point));
    }

    glowGeometry.setFromPoints(points);
    coreGeometry.setFromPoints(points.slice(Math.max(0, points.length - 5)));

    const shimmer = Math.sin(progress * Math.PI) * 0.92;
    glowMaterial.opacity = 0.08 + shimmer * 0.18;
    coreMaterial.opacity = 0.16 + shimmer * 0.28;
  });

  return (
    <>
      <primitive object={glowLine} />
      <primitive object={coreLine} />
    </>
  );
}

function ConstellationBridge({
  start,
  end,
  preview = false,
  hazard = false,
}: {
  start: [number, number, number];
  end: [number, number, number];
  preview?: boolean;
  hazard?: boolean;
}) {
  const points = useMemo(() => {
    const startVector = new THREE.Vector3(...start);
    const endVector = new THREE.Vector3(...end);
    const control = startVector.clone().lerp(endVector, 0.5);
    control.y += hazard ? 0.22 : preview ? 0.48 : 0.8;
    control.z += hazard ? -0.1 : preview ? 0.06 : 0.18;
    return new THREE.QuadraticBezierCurve3(startVector, control, endVector).getPoints(36);
  }, [end, hazard, preview, start]);

  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  const line = useMemo(
    () =>
      new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({
          color: hazard ? '#ffb37d' : preview ? '#ffd88f' : '#efe6ff',
          opacity: hazard ? 0.86 : preview ? 0.98 : 0.88,
          transparent: true,
        }),
      ),
    [geometry, hazard, preview],
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

function getWeaveSignalPosition({
  base,
  failureWave,
  index,
  isFailureAttemptedFrom,
  isFailureExpectedAnchor,
  isFailureDecoy,
  isFailureExpected,
  isFailureWrong,
  time,
}: {
  base: THREE.Vector3;
  failureWave: number;
  index: number;
  isFailureAttemptedFrom: boolean;
  isFailureExpectedAnchor: boolean;
  isFailureDecoy: boolean;
  isFailureExpected: boolean;
  isFailureWrong: boolean;
  time: number;
}) {
  if (failureWave <= 0) {
    return base;
  }

  const offset = new THREE.Vector3(
    Math.sin(time * 9 + index * 2.2) * 0.22 * failureWave,
    Math.cos(time * 7.4 + index * 1.6) * 0.18 * failureWave,
    Math.sin(time * 5.2 + index) * 0.08 * failureWave,
  );

  if (
    isFailureAttemptedFrom ||
    isFailureExpectedAnchor ||
    isFailureExpected ||
    isFailureWrong
  ) {
    return base.clone().add(offset.multiplyScalar(1.28));
  }

  if (isFailureDecoy) {
    return base.clone().add(offset.multiplyScalar(0.72));
  }

  return base;
}

function rotateSignalLayout(
  layout: Record<string, [number, number, number]>,
  candidateIds: string[],
  failureKey: number,
) {
  const ids = candidateIds.filter(
    (id, index) => id in layout && candidateIds.indexOf(id) === index,
  );
  if (ids.length < 2) {
    return layout;
  }

  const next = { ...layout };
  const positions = ids.map((id) => layout[id]);
  const shift = ids.length > 2 ? ((failureKey % (ids.length - 1)) + 1) : 1;

  ids.forEach((id, index) => {
    const sourceIndex = (index - shift + ids.length) % ids.length;
    next[id] = [...positions[sourceIndex]] as [number, number, number];
  });

  return next;
}

function animateSignalShuffle(
  start: [number, number, number],
  target: [number, number, number],
  signalId: string,
  progress: number,
): [number, number, number] {
  const startVector = new THREE.Vector3(...start);
  const targetVector = new THREE.Vector3(...target);
  const seed = getSignalSeed(signalId);
  const distance = startVector.distanceTo(targetVector);
  const direction = targetVector.clone().sub(startVector);
  const lateral = new THREE.Vector3(-direction.y, direction.x, 0);

  if (lateral.lengthSq() < 0.001) {
    lateral.set(0, 1, 0);
  }

  lateral.normalize();
  const side = (seed > 0.5 ? 1 : -1) * (0.58 + distance * 0.1);
  const loft = 0.6 + distance * 0.12;
  const depth = (seed - 0.5) * 0.86;
  const eased = THREE.MathUtils.smootherstep(progress, 0, 1);

  const controlA = startVector
    .clone()
    .add(lateral.clone().multiplyScalar(side))
    .add(new THREE.Vector3(0, loft, depth));
  const controlB = targetVector
    .clone()
    .add(lateral.clone().multiplyScalar(-side * 0.92))
    .add(new THREE.Vector3(0, loft * 0.84, -depth * 0.72));
  const curve = new THREE.CubicBezierCurve3(startVector, controlA, controlB, targetVector);
  const travel = curve.getPoint(eased);
  const crossTwist = Math.sin(eased * Math.PI * 2 + seed * Math.PI) * 0.12;

  travel.z += crossTwist;
  travel.x += lateral.x * crossTwist * 0.38;
  travel.y += Math.sin(eased * Math.PI) * 0.16;

  return [travel.x, travel.y, travel.z];
}

function getShuffleProgress(shuffleMotion: ShuffleMotionState) {
  return THREE.MathUtils.clamp(
    (window.performance.now() - shuffleMotion.startedAt) / shuffleMotion.duration,
    0,
    1,
  );
}

function getSignalSeed(signalId: string) {
  const raw = signalId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (Math.sin(raw * 12.9898) + 1) * 0.5;
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
