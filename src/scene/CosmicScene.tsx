import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type {
  CalibrationAssessment,
  ExperiencePhase,
  IntroBeats,
  SliderState,
} from '../features/experience/model/types';
import { CityAnchors } from './CityAnchors';
import { DeepSpaceBackdrop } from './DeepSpaceBackdrop';
import { IntroFocalPoint } from './IntroFocalPoint';
import { Starfield } from './Starfield';

interface CosmicSceneProps {
  phase: ExperiencePhase;
  sliders: SliderState;
  assessment: CalibrationAssessment;
  orientationEnabled: boolean;
  beats: IntroBeats;
}

interface CameraRigProps {
  phase: ExperiencePhase;
  assessment: CalibrationAssessment;
  orientationEnabled: boolean;
}

function CameraRig({
  phase,
  assessment,
  orientationEnabled,
}: CameraRigProps) {
  const camera = useThree((state) => state.camera);
  const motionTarget = useRef({ x: 0, y: 0 });
  const lookAtTarget = useRef(new THREE.Vector3(0, 0, 0));

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
    const pointerX = state.pointer.y * 0.12;
    const pointerY = state.pointer.x * 0.18;
    const targetX = orientationEnabled ? motionTarget.current.x : pointerX;
    const targetY = orientationEnabled ? motionTarget.current.y : pointerY;

    const targetZ =
      phase === 'terminal' ? 24 : phase === 'calibration' ? 18.5 : phase === 'singularity' ? 9.5 : 14.5;

    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, delta * 1.15);
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetY * 3.2, delta * 1.4);
    camera.position.y = THREE.MathUtils.lerp(
      camera.position.y,
      targetX * 2.4 + (phase === 'galaxy' ? 0.55 : 0),
      delta * 1.4,
    );

    lookAtTarget.current.set(0, 0, THREE.MathUtils.lerp(0, -8, assessment.match));
    camera.lookAt(lookAtTarget.current);
  });

  return null;
}

function EnergyCore({
  beats,
  phase,
  match,
}: {
  beats: IntroBeats;
  phase: ExperiencePhase;
  match: number;
}) {
  const shellRef = useRef<THREE.Mesh | null>(null);
  const auraRef = useRef<THREE.Mesh | null>(null);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const warp = phase === 'singularity' ? 1 : phase === 'galaxy' ? 0.5 : 0;
    const pulse = 1 + Math.sin(time * 2.2) * 0.08 + match * 0.14;
    const reveal = phase === 'terminal' ? beats.anchorsRevealBeat.progress : 1;

    if (shellRef.current) {
      shellRef.current.scale.setScalar((pulse + warp * 0.8) * reveal);
      shellRef.current.rotation.y += 0.005 + warp * 0.02;
    }

    if (auraRef.current) {
      auraRef.current.scale.setScalar((1.6 + pulse * 0.45 + warp * 1.1) * reveal);
      auraRef.current.rotation.x += 0.002;
      const material = auraRef.current.material;
      if (material instanceof THREE.MeshBasicMaterial) {
        material.opacity = (0.1 + match * 0.05) * reveal;
      }
    }
  });

  return (
    <group>
      <mesh ref={auraRef}>
        <sphereGeometry args={[1.65, 32, 32]} />
        <meshBasicMaterial color="#77bfff" opacity={0.1} transparent />
      </mesh>
      <mesh ref={shellRef}>
        <icosahedronGeometry args={[0.78, 6]} />
        <meshStandardMaterial
          color="#d3ecff"
          emissive="#67d8ff"
          emissiveIntensity={phase === 'singularity' ? 6 : 2.4 + match * 2}
          metalness={0.18}
          roughness={0.2}
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
}: CosmicSceneProps) {
  return (
    <Canvas
      camera={{ fov: 42, position: [0, 0, 24] }}
      dpr={[1, 1.75]}
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
      <fog attach="fog" args={['#01020a', 16, 90]} />

      <DeepSpaceBackdrop beats={beats} />
      <CameraRig
        assessment={assessment}
        orientationEnabled={orientationEnabled}
        phase={phase}
      />

      {phase === 'terminal' && <IntroFocalPoint beats={beats} />}
      <ambientLight intensity={0.26} />
      <directionalLight color="#ff884d" intensity={2.1} position={[0, 8, 8]} />
      <directionalLight color="#4aa3ff" intensity={2.25} position={[0, -8, 8]} />
      <pointLight color="#fff4db" distance={14} intensity={0.5} position={[0, 0, 4]} />

      <CityAnchors beats={beats} phase={phase} />
      <EnergyCore beats={beats} match={assessment.match} phase={phase} />
      <Starfield
        assessment={assessment}
        beats={beats}
        phase={phase}
        sliders={sliders}
      />

      <EffectComposer>
        <Bloom
          intensity={phase === 'singularity' ? 1.65 : 0.52}
          luminanceSmoothing={0.08}
          luminanceThreshold={0.56}
          mipmapBlur
        />
        <Noise opacity={phase === 'terminal' ? 0.018 : 0.008} />
        <Vignette darkness={0.82} eskil={false} offset={0.2} />
      </EffectComposer>
    </Canvas>
  );
}
