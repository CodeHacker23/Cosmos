import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Noise,
  Vignette,
} from '@react-three/postprocessing';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';
import type {
  CalibrationAssessment,
  ExperiencePhase,
  GalaxyPostVideoStage,
  GalaxySearchIntroState,
  GalaxySignalDefinition,
  GalaxyStage,
  GalaxyWeaveFailureState,
  IntroBeats,
  ScreenSpacePoint,
  SliderState,
} from '../features/experience/model/types';
import { CityAnchors } from './CityAnchors';
import { DeepSpaceBackdrop } from './DeepSpaceBackdrop';
import { GalaxyBirthField } from './GalaxyBirthField';
import { GalaxyConstellationRitual } from './GalaxyConstellationRitual';
import { GalaxySearchSignals } from './GalaxySearchSignals';
import { IntroFocalPoint } from './IntroFocalPoint';
import { NewSpaceAct } from './NewSpaceAct';
import { PostVideoDestinyUniverse } from './PostVideoDestinyUniverse';
import { SingularityTransitField } from './SingularityTransitField';
import { Starfield } from './Starfield';
import { getPostVideoTransitState } from './postVideoTransit';
import { getSingularityTransitState } from './singularityTransit';

interface CosmicSceneProps {
  phase: ExperiencePhase;
  sliders: SliderState;
  assessment: CalibrationAssessment;
  orientationEnabled: boolean;
  beats: IntroBeats;
  singularityProgress: number;
  galaxyStage: GalaxyStage;
  postVideoStage: GalaxyPostVideoStage;
  galaxyIntroState: GalaxySearchIntroState;
  galaxySignals: GalaxySignalDefinition[];
  activeSignalIds: string[];
  foundSignalIds: string[];
  linkedSignalIds: string[];
  weaveFailureState: GalaxyWeaveFailureState;
  featuredSignalId: string | null;
  starbirthProgress: number;
  jumpProgress: number;
  specialStarOpened: boolean;
  onRevealGalaxySignal: (signalId: string, screenPosition: ScreenSpacePoint) => void;
  onConnectGalaxySignal: (fromSignalId: string, signalId: string) => boolean;
  onOpenSpecialStar: () => void;
}

interface CameraRigProps {
  phase: ExperiencePhase;
  assessment: CalibrationAssessment;
  orientationEnabled: boolean;
  singularityProgress: number;
  galaxyStage: GalaxyStage;
  postVideoStage: GalaxyPostVideoStage;
  jumpProgress: number;
}

const flashBand = (value: number, start: number, peak: number, end: number) => {
  if (value <= start || value >= end) {
    return 0;
  }

  if (value <= peak) {
    return (value - start) / (peak - start);
  }

  return 1 - (value - peak) / (end - peak);
};

function CameraRig({
  phase,
  assessment,
  orientationEnabled,
  singularityProgress,
  galaxyStage,
  postVideoStage,
  jumpProgress,
}: CameraRigProps) {
  const camera = useThree((state) => state.camera);
  const perspectiveCamera = camera as THREE.PerspectiveCamera;
  const motionTarget = useRef({ x: 0, y: 0 });
  const lookAtTarget = useRef(new THREE.Vector3(0, 0, 0));
  const noise = useRef(new ImprovedNoise());

  useEffect(() => {
    if (phase === 'galaxy' && (galaxyStage === 'manifest' || galaxyStage === 'newspace')) {
      camera.position.set(0, 1.2, 11.5);
      camera.lookAt(0, 0, 0);
      perspectiveCamera.fov = 48;
      perspectiveCamera.updateProjectionMatrix();
    }
  }, [camera, galaxyStage, perspectiveCamera, phase]);

  useEffect(() => {
    if (!orientationEnabled) {
      motionTarget.current = { x: 0, y: 0 };
      return;
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta === null || event.gamma === null) {
        return;
      }

      motionTarget.current.x = THREE.MathUtils.clamp(event.beta / 180, -0.25, 0.25);
      motionTarget.current.y = THREE.MathUtils.clamp(event.gamma / 120, -0.25, 0.25);
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [orientationEnabled]);

  useFrame((state, delta) => {
    if (phase === 'galaxy' && (galaxyStage === 'manifest' || galaxyStage === 'newspace')) {
      return;
    }

    const transit = getSingularityTransitState(singularityProgress);
    const postVideoTransit = getPostVideoTransitState(jumpProgress);
    const pointerX = state.pointer.y * 0.12;
    const pointerY = state.pointer.x * 0.18;
    const isPostVideoPreface = phase === 'galaxy' && postVideoStage === 'preface';
    const isPostVideoJump = phase === 'galaxy' && postVideoStage === 'jump';
    const isSingularity = phase === 'singularity';
    const coreDive = isPostVideoJump ? postVideoTransit.coreApproach : 0;
    const warpPull = isPostVideoJump ? postVideoTransit.tunnel : 0;
    const flightPull = isPostVideoJump ? postVideoTransit.galaxyFlight : 0;
    const warpAfterglow = isPostVideoJump ? postVideoTransit.destination : 0;
    const coreEase = isPostVideoJump ? THREE.MathUtils.smootherstep(coreDive, 0.03, 0.995) : 0;
    const tunnelEase = isPostVideoJump ? THREE.MathUtils.smootherstep(warpPull, 0.04, 0.98) : 0;
    const flightEase = isPostVideoJump ? THREE.MathUtils.smootherstep(flightPull, 0.04, 0.98) : 0;
    const destEase = isPostVideoJump ? THREE.MathUtils.smootherstep(warpAfterglow, 0.05, 0.95) : 0;
    const shake =
      isSingularity
        ? transit.acceleration * 0.08 + transit.jump * 0.38 + transit.flash * 0.22 + transit.flight * 0.06
        : isPostVideoJump
          ? coreEase * 0.018 + tunnelEase * 0.05 + flightEase * 0.032
          : 0;
    const time = state.clock.elapsedTime;
    const motionX = orientationEnabled ? motionTarget.current.x : pointerX;
    const motionY = orientationEnabled ? motionTarget.current.y : pointerY;
    const orbitalX = isPostVideoJump ? Math.sin(time * 0.58) * 0.012 : 0;
    const orbitalY = isPostVideoJump ? Math.cos(time * 0.62) * 0.01 : 0;
    const targetX =
      isSingularity
        ? motionX * 0.08
        : isPostVideoJump
          ? motionX * 0.07 + orbitalX
          : isPostVideoPreface
            ? motionX * 0.42
            : motionX;
    const targetY =
      isSingularity
        ? motionY * 0.08
        : isPostVideoJump
          ? motionY * 0.07 + orbitalY
          : isPostVideoPreface
            ? motionY * 0.42
            : motionY;

    const singularityDolly =
      transit.acceleration * 2.8 + transit.jump * 8.2 + transit.flash * 1.4 - transit.flight * 1.35;

    const targetZ =
      phase === 'terminal'
        ? 24
        : phase === 'calibration'
          ? 18.5
          : isSingularity
            ? 18.4 - singularityDolly
            : isPostVideoPreface
              ? 13.75 + Math.sin(time * 0.22) * 0.08
              : isPostVideoJump
                ? 14.2 - coreEase * 4.6 - tunnelEase * 2.1 - flightEase * 4.4
                : 14.5;

    const noiseTime = time * (2.4 + transit.jump * 9.5 + transit.flash * 18.0);
    const perlinX = noise.current.noise(noiseTime, 0.13, 0.07);
    const perlinY = noise.current.noise(0.11, noiseTime, 0.23);

    const shakeX =
      isSingularity
        ? perlinX * shake * 0.72
        : isPostVideoJump
          ? Math.sin(time * 16) * shake * 0.18 +
            Math.sin(time * 23 + 0.8) * shake * 0.06
        : 0;
    const shakeY =
      isSingularity
        ? perlinY * shake * 0.68
        : isPostVideoJump
          ? Math.cos(time * 9.2) * shake * 0.12 + Math.sin(time * 14.1 + 1.7) * shake * 0.04
        : 0;

    const camDamp = (current: number, target: number, lambda: number) =>
      THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * delta));
    camera.position.z = camDamp(camera.position.z, targetZ, isPostVideoJump ? 2.05 : 1.4);
    camera.position.x = camDamp(
      camera.position.x,
      targetY * (isSingularity ? 0.42 : isPostVideoJump ? 0.78 : isPostVideoPreface ? 1.6 : 3.2) +
        shakeX,
      isSingularity ? 3.2 : isPostVideoJump ? 1.85 : 1.8,
    );
    camera.position.y = camDamp(
      camera.position.y,
      targetX * (isSingularity ? 0.36 : isPostVideoJump ? 0.62 : isPostVideoPreface ? 1.3 : 2.4) +
        (phase === 'galaxy' && !isPostVideoJump ? 0.55 : 0) -
        coreEase * 0.16 -
        flightEase * 0.1 +
        shakeY,
      isSingularity ? 3.2 : isPostVideoJump ? 1.85 : 1.8,
    );

    lookAtTarget.current.set(
      targetY * (isSingularity ? 0.08 : isPostVideoJump ? 0.18 : 0.4) + shakeX * 0.12,
      targetX * (isSingularity ? 0.06 : isPostVideoJump ? 0.18 : 0.32) + shakeY * 0.12,
      THREE.MathUtils.lerp(0, -8, assessment.match) -
        (isSingularity
          ? transit.acceleration * 1.6 + transit.jump * 5.4 + transit.flash * 1.8 - transit.flight * 2.6
          : 0) -
        (isPostVideoPreface ? 1.8 : 0) -
        (isPostVideoJump
          ? coreEase * 3.8 + tunnelEase * 5.2 + flightEase * 9 + destEase * 3
          : 0),
    );
    camera.lookAt(lookAtTarget.current);
    perspectiveCamera.fov = camDamp(
      perspectiveCamera.fov,
      isPostVideoJump
        ? 40 + coreEase * 3 + tunnelEase * 14 + flightEase * 18
        : isPostVideoPreface
          ? 44
          : 42,
      isPostVideoJump ? 1.65 : 2.4,
    );
    perspectiveCamera.updateProjectionMatrix();
  });

  return null;
}

function ExposureRig({
  phase,
  singularityProgress,
  postVideoStage,
  jumpProgress,
}: {
  phase: ExperiencePhase;
  singularityProgress: number;
  postVideoStage: GalaxyPostVideoStage;
  jumpProgress: number;
}) {
  const gl = useThree((state) => state.gl);

  useFrame((_, delta) => {
    const transit = getSingularityTransitState(singularityProgress);
    const postTransit = getPostVideoTransitState(jumpProgress);
    const isJumping = phase === 'galaxy' && postVideoStage === 'jump';
    const targetExposure =
      phase === 'singularity'
        ? 1 +
          transit.acceleration * 0.18 +
          transit.jump * 0.42 +
          transit.flash * 1.05 +
          transit.flight * 0.18
        : isJumping
          ? 0.8 +
            postTransit.coreApproach * 0.07 +
            postTransit.tunnel * 0.17 -
            postTransit.galaxyFlight * 0.04
        : phase === 'galaxy'
          ? 1.08
          : 0.95;

    gl.toneMappingExposure = THREE.MathUtils.lerp(
      gl.toneMappingExposure,
      targetExposure,
      delta * (isJumping ? 2.15 : 3.4),
    );
  });

  return null;
}

function PhaseLightRig({
  phase,
  match,
  singularityProgress,
}: {
  phase: ExperiencePhase;
  match: number;
  singularityProgress: number;
}) {
  const warmRef = useRef<THREE.PointLight | null>(null);
  const coolRef = useRef<THREE.PointLight | null>(null);
  const coreRef = useRef<THREE.PointLight | null>(null);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const collapse = THREE.MathUtils.smootherstep(singularityProgress, 0.06, 0.42);
    const ignition = flashBand(singularityProgress, 0.22, 0.38, 0.56);
    const detonation = flashBand(singularityProgress, 0.46, 0.58, 0.8);
    const aftermath = THREE.MathUtils.smootherstep(singularityProgress, 0.72, 1);
    const shimmer = 1 + Math.sin(time * 1.8) * 0.08;

    if (warmRef.current) {
      warmRef.current.position.set(
        THREE.MathUtils.lerp(0, 1.75, 1 - collapse),
        THREE.MathUtils.lerp(8, 2.4, collapse),
        7,
      );
      warmRef.current.intensity =
        (phase === 'singularity' ? 1.8 + collapse * 2.4 + detonation * 4.8 + aftermath * 1.2 : 2.1) * shimmer;
    }

    if (coolRef.current) {
      coolRef.current.position.set(
        THREE.MathUtils.lerp(0, -1.75, 1 - collapse),
        THREE.MathUtils.lerp(-8, -2.4, collapse),
        7,
      );
      coolRef.current.intensity =
        (phase === 'singularity' ? 1.9 + collapse * 2.3 + detonation * 4.6 + aftermath * 1.2 : 2.2) * shimmer;
    }

    if (coreRef.current) {
      coreRef.current.intensity =
        phase === 'singularity'
          ? 0.7 + ignition * 2.8 + detonation * 8.5 + aftermath * 2.2
          : 0.55 + match * 0.65;
      coreRef.current.distance = phase === 'singularity' ? 24 + detonation * 12 + aftermath * 8 : 14;
    }
  });

  return (
    <>
      <ambientLight intensity={phase === 'singularity' ? 0.16 : 0.26} />
      <directionalLight color="#ff884d" intensity={0.7} position={[0, 10, 10]} />
      <directionalLight color="#4aa3ff" intensity={0.72} position={[0, -10, 10]} />
      <pointLight ref={warmRef} color="#ff884d" distance={34} intensity={2.1} />
      <pointLight ref={coolRef} color="#4aa3ff" distance={34} intensity={2.25} />
      <pointLight ref={coreRef} color="#fff8ea" distance={16} intensity={0.55} position={[0, 0, 3.8]} />
    </>
  );
}

function EnergyCore({
  beats,
  phase,
  match,
  singularityProgress,
}: {
  beats: IntroBeats;
  phase: ExperiencePhase;
  match: number;
  singularityProgress: number;
}) {
  const shellRef = useRef<THREE.Mesh | null>(null);
  const auraRef = useRef<THREE.Mesh | null>(null);
  const flareRef = useRef<THREE.Mesh | null>(null);
  const ringRef = useRef<THREE.Mesh | null>(null);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const collapse = THREE.MathUtils.smootherstep(singularityProgress, 0.06, 0.42);
    const ignition = flashBand(singularityProgress, 0.2, 0.36, 0.54);
    const detonation = flashBand(singularityProgress, 0.48, 0.58, 0.82);
    const aftermath = THREE.MathUtils.smootherstep(singularityProgress, 0.72, 1);
    const warp = phase === 'singularity' ? 1 : phase === 'galaxy' ? 0.5 : 0;
    const pulse = 1 + Math.sin(time * 2.2) * 0.08 + match * 0.14;
    const reveal = phase === 'terminal' ? beats.anchorsRevealBeat.progress : 1;
    const galaxySettle = phase === 'galaxy' ? 1 : 0;

    if (shellRef.current) {
      shellRef.current.scale.setScalar(
        Math.max(
          0.14,
          (0.92 +
            match * 0.22 -
            collapse * 0.28 +
            ignition * 0.15 +
            detonation * 1.15 -
            galaxySettle * 0.38) * reveal,
        ),
      );
      shellRef.current.rotation.y += 0.006 + warp * 0.018 + collapse * 0.015 + detonation * 0.02;
      shellRef.current.rotation.x += 0.003 + ignition * 0.012;
      const material = shellRef.current.material;
      if (material instanceof THREE.MeshStandardMaterial) {
        material.emissiveIntensity =
          phase === 'singularity'
            ? 3.2 + ignition * 2.1 + detonation * 5.4 + aftermath * 2.4
            : phase === 'galaxy'
              ? 1.15
              : 2.4 + match * 2;
      }
    }

    if (auraRef.current) {
      auraRef.current.scale.setScalar(
        (1.05 +
          pulse * 0.18 +
          collapse * 0.36 +
          ignition * 0.24 +
          detonation * 0.8 +
          aftermath * 0.46 -
          galaxySettle * 0.55) * reveal,
      );
      auraRef.current.rotation.x += 0.002 + detonation * 0.012;
      const material = auraRef.current.material;
      if (material instanceof THREE.MeshBasicMaterial) {
        material.opacity =
          ((phase === 'galaxy'
            ? 0.015
            : 0.07 + match * 0.04 + collapse * 0.05 + detonation * 0.12 - aftermath * 0.02) *
            reveal);
      }
    }

    if (flareRef.current) {
      flareRef.current.scale.setScalar(
        (0.18 + ignition * 0.55 + detonation * 3.2 + aftermath * 1.2 - galaxySettle * 0.52) *
          reveal,
      );
      const material = flareRef.current.material;
      if (material instanceof THREE.MeshBasicMaterial) {
        material.opacity =
          phase === 'galaxy' ? 0.01 : ignition * 0.05 + detonation * 0.15 + aftermath * 0.06;
      }
    }

    if (ringRef.current) {
      ringRef.current.rotation.x += 0.007;
      ringRef.current.rotation.y += 0.005 + detonation * 0.012;
      ringRef.current.scale.setScalar(
        0.6 + collapse * 0.55 + detonation * 2.4 + aftermath * 1.1 - galaxySettle * 0.42,
      );
      const material = ringRef.current.material;
      if (material instanceof THREE.MeshBasicMaterial) {
        material.opacity = phase === 'galaxy' ? 0.008 : detonation * 0.1 + aftermath * 0.04;
      }
    }
  });

  return (
    <group>
      <mesh ref={flareRef}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color="#fff8ef"
          depthWrite={false}
          opacity={0}
          transparent
        />
      </mesh>
      <mesh ref={auraRef}>
        <sphereGeometry args={[1.65, 32, 32]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color="#77bfff"
          depthWrite={false}
          opacity={0.1}
          transparent
        />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2.35, 0, 0]}>
        <torusGeometry args={[1.9, 0.16, 22, 120]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color="#fff5db"
          depthWrite={false}
          opacity={0}
          transparent
        />
      </mesh>
      <mesh ref={shellRef}>
        <icosahedronGeometry args={[0.78, 6]} />
        <meshStandardMaterial
          color="#d3ecff"
          emissive="#67d8ff"
          emissiveIntensity={phase === 'singularity' ? 6 : 2.4 + match * 2}
          metalness={0.18}
          roughness={0.18}
        />
      </mesh>
    </group>
  );
}

export function CosmicScene({
  phase,
  sliders,
  assessment,
  orientationEnabled,
  beats,
  singularityProgress,
  galaxyStage,
  postVideoStage,
  galaxyIntroState,
  galaxySignals,
  activeSignalIds,
  foundSignalIds,
  linkedSignalIds,
  weaveFailureState,
  featuredSignalId,
  starbirthProgress,
  jumpProgress,
  specialStarOpened,
  onRevealGalaxySignal,
  onConnectGalaxySignal,
  onOpenSpecialStar,
}: CosmicSceneProps) {
  const postVideoTransit = getPostVideoTransitState(jumpProgress);
  const isNewSpaceAct = phase === 'galaxy' && galaxyStage === 'newspace';
  const isPostVideoJump = phase === 'galaxy' && postVideoStage === 'jump';
  /** coreApproach: spiral + backdrop + stars + camera into core; tunnel ramps → hide world, tracers only */
  const jumpWorldLayerRetired = isPostVideoJump && postVideoTransit.tunnel >= 0.44;
  const showGalaxyWorldLayer = !isNewSpaceAct && !jumpWorldLayerRetired;
  const showGalaxyHudLayer = !isNewSpaceAct && !isPostVideoJump;
  const bloomIntensity =
    phase === 'singularity'
      ? 1.12 +
        getSingularityTransitState(singularityProgress).acceleration * 0.55 +
        getSingularityTransitState(singularityProgress).jump * 1.6 +
        getSingularityTransitState(singularityProgress).flash * 2.6 +
        getSingularityTransitState(singularityProgress).flight * 0.5
      : phase === 'galaxy'
        ? (postVideoStage === 'jump'
            ? 0.28 +
              postVideoTransit.tunnel * 0.48 +
              postVideoTransit.galaxyFlight * 0.34 +
              postVideoTransit.destination * 0.16
            : galaxyStage === 'newspace'
              ? 0.42
            : galaxyStage === 'manifest'
              ? 1.18
            : postVideoStage === 'preface'
              ? 0.48
              : 0.36) +
          (galaxyStage === 'starbirth'
            ? flashBand(starbirthProgress, 0.46, 0.56, 0.7) * 0.34
            : galaxyStage === 'artifact'
              ? 0.08
              : 0)
        : 0.62;

  return (
    <Canvas
      camera={{ fov: 42, position: [0, 0, 24] }}
      dpr={[1, 1.6]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.9;
      }}
    >
      <color attach="background" args={['#01020a']} />
      {/* Fog kills additive tunnel; disable for entire hyperjump */}
      {!(phase === 'galaxy' && postVideoStage === 'jump') && (
        <fog
          attach="fog"
          args={[
            '#01020a',
            phase === 'galaxy' && galaxyStage === 'newspace'
              ? 14
              : phase === 'galaxy' && galaxyStage === 'manifest'
                ? 8
                : 16,
            phase === 'singularity'
              ? 74
              : phase === 'galaxy' && galaxyStage === 'newspace'
                ? 120
                : phase === 'galaxy' && galaxyStage === 'manifest'
                  ? 68
                  : 90,
          ]}
        />
      )}

      {showGalaxyWorldLayer && (
        <DeepSpaceBackdrop
          beats={beats}
          galaxyStage={galaxyStage}
          jumpProgress={jumpProgress}
          phase={phase}
          postVideoStage={postVideoStage}
          singularityProgress={singularityProgress}
        />
      )}
      <ExposureRig phase={phase} singularityProgress={singularityProgress} postVideoStage={postVideoStage} jumpProgress={jumpProgress} />
      <CameraRig
        assessment={assessment}
        galaxyStage={galaxyStage}
        jumpProgress={jumpProgress}
        orientationEnabled={orientationEnabled}
        phase={phase}
        postVideoStage={postVideoStage}
        singularityProgress={singularityProgress}
      />
      {phase === 'singularity' && <SingularityTransitField singularityProgress={singularityProgress} />}

      {phase === 'terminal' && <IntroFocalPoint beats={beats} />}
      {isPostVideoJump && postVideoTransit.tunnel >= 0.38 ? (
        <ambientLight intensity={0.035} />
      ) : (
        <PhaseLightRig
          match={assessment.match}
          phase={phase}
          singularityProgress={singularityProgress}
        />
      )}

      {phase === 'galaxy' && postVideoStage === 'jump' && (
        <PostVideoDestinyUniverse
          galaxyStage={galaxyStage}
          jumpProgress={jumpProgress}
          postVideoStage={postVideoStage}
        />
      )}
      {showGalaxyWorldLayer && (
        <GalaxyBirthField
          galaxyStage={galaxyStage}
          jumpProgress={jumpProgress}
          phase={phase}
          postVideoStage={postVideoStage}
          singularityProgress={singularityProgress}
          starbirthProgress={starbirthProgress}
        />
      )}
      {showGalaxyHudLayer && (
        <GalaxySearchSignals
          activeSignalIds={activeSignalIds}
          featuredSignalId={featuredSignalId}
          foundSignalIds={foundSignalIds}
          introState={galaxyIntroState}
          onRevealSignal={onRevealGalaxySignal}
          phase={phase}
          signals={galaxySignals}
          stage={galaxyStage}
        />
      )}
      {showGalaxyHudLayer && (
        <GalaxyConstellationRitual
          linkedSignalIds={linkedSignalIds}
          onConnectSignal={onConnectGalaxySignal}
          onOpenSpecialStar={onOpenSpecialStar}
          signals={galaxySignals}
          specialStarOpened={specialStarOpened}
          stage={galaxyStage}
          starbirthProgress={starbirthProgress}
          weaveFailureState={weaveFailureState}
        />
      )}
      {showGalaxyHudLayer && <CityAnchors beats={beats} phase={phase} singularityProgress={singularityProgress} />}
      <NewSpaceAct active={isNewSpaceAct} />
      {phase !== 'galaxy' && (
        <EnergyCore
          beats={beats}
          match={assessment.match}
          phase={phase}
          singularityProgress={singularityProgress}
        />
      )}
      {showGalaxyWorldLayer && (
        <Starfield
          assessment={assessment}
          beats={beats}
          jumpProgress={jumpProgress}
          phase={phase}
          postVideoStage={postVideoStage}
          singularityProgress={singularityProgress}
          sliders={sliders}
        />
      )}

      <EffectComposer>
        <Bloom
          intensity={bloomIntensity}
          luminanceSmoothing={0.08}
          luminanceThreshold={
            phase === 'singularity'
              ? 0.12
              : postVideoStage === 'jump'
                ? 0.22 + postVideoTransit.tunnel * 0.28 + postVideoTransit.galaxyFlight * 0.15
                : galaxyStage === 'manifest'
                  ? 0.5
                  : 0.52
          }
          mipmapBlur={phase !== 'singularity' && galaxyStage !== 'manifest'}
        />
        <ChromaticAberration
          offset={
            new THREE.Vector2(
              phase === 'singularity'
                ? 0.0006 + getSingularityTransitState(singularityProgress).jump * 0.0032
                : postVideoStage === 'jump'
                  ? postVideoTransit.tunnel * 0.00015 + postVideoTransit.galaxyFlight * 0.00025
                  : 0,
              phase === 'singularity'
                ? 0.0004 + getSingularityTransitState(singularityProgress).flash * 0.0042
                : postVideoStage === 'jump'
                  ? postVideoTransit.tunnel * 0.00012 + postVideoTransit.galaxyFlight * 0.0002
                  : 0,
            )
          }
          radialModulation
        />
        <Noise
          opacity={
            phase === 'singularity'
              ? 0.006 + flashBand(singularityProgress, 0.48, 0.58, 0.82) * 0.018
              : postVideoStage === 'jump'
                ? 0.003
              : phase === 'terminal'
                ? 0.018
                : 0.008
          }
        />
        <Vignette
          darkness={
            phase === 'singularity'
              ? 0.68
              : phase === 'galaxy' && postVideoStage === 'jump'
                ? 0.72
                : 0.82
          }
          eskil={false}
          offset={0.2}
        />
      </EffectComposer>
    </Canvas>
  );
}
