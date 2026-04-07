import { Html, OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { gsap } from 'gsap';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { storyConfig } from '../content/storyConfig';
import type { ArtifactDefinition, GalaxyPostVideoStage, GalaxyStage } from '../features/experience/model/types';
import { POST_VIDEO_TOTAL_DURATION, getPostVideoTransitState } from './postVideoTransit';

interface PostVideoDestinyUniverseProps {
  galaxyStage: GalaxyStage;
  postVideoStage: GalaxyPostVideoStage;
  jumpProgress: number;
}

const TUNNEL_INSTANCE_COUNT = 120000;
const DESTINATION_STAR_COUNT = 110000;

const tunnelVertexShader = `
uniform float uTime;
uniform float uVelocity;
uniform float uApproach;
uniform float uTunnel;
uniform float uFlight;

attribute float aSeed;
attribute float aAngle;
attribute float aRadius;
attribute float aDepth;
attribute float aVelocity;
attribute float aThickness;

varying float vAlpha;
varying vec2 vUv;

mat2 rotate2d(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

void main() {
  vUv = uv;
  float tunnel = smoothstep(0.0, 1.0, uTunnel);
  float flight = smoothstep(0.0, 1.0, uFlight);
  float approach = smoothstep(0.0, 1.0, uApproach);
  float velocity = max(1.0, uVelocity);
  float zLoop = mod(aDepth + uTime * velocity * aVelocity, 260.0) - 130.0;
  float tunnelRadius = mix(aRadius * (1.16 - approach * 0.42), aRadius * 1.75, tunnel);
  vec2 radial = vec2(cos(aAngle), sin(aAngle)) * tunnelRadius;

  vec2 local = position.xy;
  float width = mix(0.018 + aThickness * 0.03, 0.005 + aThickness * 0.012, tunnel);
  float length = mix(0.2 + aThickness * 0.48, 1.8 + velocity * 0.18 * aVelocity, tunnel);
  length = mix(length, 0.8 + velocity * 0.04, flight);
  local.x *= width;
  local.y *= length;

  vec2 rotated = rotate2d(aAngle) * local;
  vec3 displaced = vec3(radial + rotated, -zLoop);
  displaced.xy += normalize(radial) * sin(uTime * 0.7 + aSeed * 12.0) * flight * 0.7;

  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  vAlpha = (0.12 + tunnel * 0.9 + flight * 0.18) * (0.5 + aVelocity * 0.75);
}
`;

const tunnelFragmentShader = `
varying float vAlpha;
varying vec2 vUv;

void main() {
  float beam = smoothstep(0.5, 0.08, abs(vUv.x - 0.5));
  float tip = smoothstep(1.0, 0.08, vUv.y);
  float tail = smoothstep(0.0, 0.18, vUv.y);
  float glow = beam * tip * tail;
  glow += pow(beam, 6.0) * 0.85;
  gl_FragColor = vec4(vec3(1.0), clamp(glow * vAlpha, 0.0, 1.0));
}
`;

function createNebulaTexture(primary: string, secondary: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2048;
  const context = canvas.getContext('2d');
  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  const gradient = context.createRadialGradient(1024, 1024, 120, 1024, 1024, 1024);
  gradient.addColorStop(0, primary);
  gradient.addColorStop(0.38, secondary);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < 3400; index += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = 18 + Math.random() * 140;
    const alpha = 0.018 + Math.random() * 0.045;
    const cloud = context.createRadialGradient(x, y, 0, x, y, radius);
    cloud.addColorStop(0, `rgba(255,255,255,${alpha})`);
    cloud.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = cloud;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildDestinationMatrices(count: number) {
  const matrices: Array<{ matrix: THREE.Matrix4; color: THREE.Color }> = [];

  for (let index = 0; index < count; index += 1) {
    const arm = index % 4;
    const armOffset = (arm / 4) * Math.PI * 2;
    const radius = Math.pow(Math.random(), 0.72) * 16;
    const twist = radius * 0.82 + (Math.random() - 0.5) * 0.6;
    const angle = armOffset + twist;
    const x = Math.cos(angle) * (radius + (Math.random() - 0.5) * (0.3 + radius * 0.16));
    const y = (Math.random() - 0.5) * (0.2 + radius * 0.08);
    const z = Math.sin(angle) * (radius + (Math.random() - 0.5) * (0.3 + radius * 0.16));
    const scale = 0.016 + Math.pow(Math.random(), 2.4) * 0.14;
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.random() * Math.PI * 2, 0)),
      new THREE.Vector3(scale, scale, scale),
    );
    const color = new THREE.Color('#f4f7ff').lerp(
      new THREE.Color(index % 3 === 0 ? '#ffd8a8' : index % 3 === 1 ? '#93d3ff' : '#d6a8ff'),
      0.38,
    );
    matrices.push({ matrix, color });
  }

  return matrices;
}

function buildTunnelGeometry() {
  const base = new THREE.PlaneGeometry(1, 1, 1, 1);
  base.translate(0, 0.5, 0);
  const seeds = new Float32Array(TUNNEL_INSTANCE_COUNT);
  const angles = new Float32Array(TUNNEL_INSTANCE_COUNT);
  const radii = new Float32Array(TUNNEL_INSTANCE_COUNT);
  const depths = new Float32Array(TUNNEL_INSTANCE_COUNT);
  const velocities = new Float32Array(TUNNEL_INSTANCE_COUNT);
  const thickness = new Float32Array(TUNNEL_INSTANCE_COUNT);

  for (let index = 0; index < TUNNEL_INSTANCE_COUNT; index += 1) {
    seeds[index] = Math.random();
    angles[index] = Math.random() * Math.PI * 2;
    radii[index] = 5.8 + Math.pow(Math.random(), 0.35) * 14.5;
    depths[index] = Math.random() * 260;
    velocities[index] = 0.6 + Math.random() * 1.8;
    thickness[index] = 0.35 + Math.random() * 0.9;
  }

  base.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  base.setAttribute('aAngle', new THREE.InstancedBufferAttribute(angles, 1));
  base.setAttribute('aRadius', new THREE.InstancedBufferAttribute(radii, 1));
  base.setAttribute('aDepth', new THREE.InstancedBufferAttribute(depths, 1));
  base.setAttribute('aVelocity', new THREE.InstancedBufferAttribute(velocities, 1));
  base.setAttribute('aThickness', new THREE.InstancedBufferAttribute(thickness, 1));

  return base;
}

function PostVideoWarpTunnel({
  postVideoStage,
  jumpProgress,
}: Pick<PostVideoDestinyUniverseProps, 'postVideoStage' | 'jumpProgress'>) {
  const meshRef = useRef<THREE.InstancedMesh | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const velocityTweenRef = useRef<gsap.core.Tween | null>(null);
  const geometry = useMemo(() => buildTunnelGeometry(), []);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uVelocity: { value: 1 },
      uApproach: { value: 0 },
      uTunnel: { value: 0 },
      uFlight: { value: 0 },
    }),
    [],
  );

  useEffect(() => {
    if (!meshRef.current) {
      return;
    }

    const identity = new THREE.Matrix4();
    for (let index = 0; index < TUNNEL_INSTANCE_COUNT; index += 1) {
      meshRef.current.setMatrixAt(index, identity);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  useEffect(() => {
    velocityTweenRef.current?.kill();
    if (postVideoStage !== 'jump' || !materialRef.current) {
      if (materialRef.current) {
        materialRef.current.uniforms.uVelocity.value = 1;
      }
      return;
    }

    materialRef.current.uniforms.uVelocity.value = 1;
    velocityTweenRef.current = gsap.to(materialRef.current.uniforms.uVelocity, {
      value: 200,
      duration: POST_VIDEO_TOTAL_DURATION - 5,
      ease: 'expo.in',
    });

    return () => {
      velocityTweenRef.current?.kill();
      velocityTweenRef.current = null;
    };
  }, [postVideoStage]);

  useFrame((_, delta) => {
    if (!materialRef.current || !meshRef.current) {
      return;
    }

    const transit = getPostVideoTransitState(jumpProgress);
    materialRef.current.uniforms.uTime.value += delta;
    materialRef.current.uniforms.uApproach.value = transit.coreApproach;
    materialRef.current.uniforms.uTunnel.value = transit.tunnel;
    materialRef.current.uniforms.uFlight.value = transit.galaxyFlight;
    meshRef.current.visible = postVideoStage === 'jump' && (transit.tunnel > 0.001 || transit.coreApproach > 0.72);
  });

  return (
    <instancedMesh args={[geometry, undefined, TUNNEL_INSTANCE_COUNT]} frustumCulled={false} ref={meshRef}>
      <shaderMaterial
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        fragmentShader={tunnelFragmentShader}
        ref={materialRef}
        transparent
        uniforms={uniforms}
        vertexShader={tunnelVertexShader}
      />
    </instancedMesh>
  );
}

function FlightGalaxies({
  postVideoStage,
  jumpProgress,
}: Pick<PostVideoDestinyUniverseProps, 'postVideoStage' | 'jumpProgress'>) {
  const transit = getPostVideoTransitState(jumpProgress);
  const nebulaA = useMemo(() => createNebulaTexture('rgba(255,182,138,0.7)', 'rgba(116,93,255,0.32)'), []);
  const nebulaB = useMemo(() => createNebulaTexture('rgba(148,215,255,0.68)', 'rgba(222,167,255,0.28)'), []);
  const groupRefs = useRef<Array<THREE.Group | null>>([]);
  const configs = useMemo(
    () => [
      { x: -9, y: 5.4, z: -82, scale: 5.5, tex: nebulaA },
      { x: 8.5, y: -4.6, z: -106, scale: 6.7, tex: nebulaB },
      { x: -11.4, y: -5.1, z: -132, scale: 7.8, tex: nebulaA },
      { x: 10.2, y: 6.1, z: -154, scale: 8.9, tex: nebulaB },
    ],
    [nebulaA, nebulaB],
  );

  useFrame((_, delta) => {
    configs.forEach((config, index) => {
      const group = groupRefs.current[index];
      if (!group) {
        return;
      }

      const offset = index * 0.12;
      const localFlight = THREE.MathUtils.clamp((transit.galaxyFlight - offset) / 0.56, 0, 1);
      group.visible = postVideoStage === 'jump' && (transit.galaxyFlight > offset * 0.4 || transit.destination > 0.01);
      group.position.lerp(
        new THREE.Vector3(
          THREE.MathUtils.lerp(config.x, config.x * 0.15, localFlight),
          THREE.MathUtils.lerp(config.y, config.y * 0.1, localFlight),
          config.z + localFlight * 210,
        ),
        1 - Math.exp(-delta * 2.2),
      );
      group.rotation.z += delta * (0.06 + localFlight * 0.22);
      group.scale.lerp(
        new THREE.Vector3(
          config.scale + localFlight * 4.6,
          config.scale + localFlight * 4.6,
          config.scale + localFlight * 4.6,
        ),
        1 - Math.exp(-delta * 2.2),
      );
    });
  });

  return (
    <group>
      {configs.map((config, index) => (
        <group
          key={`${config.x}-${config.z}`}
          position={[config.x, config.y, config.z]}
          ref={(node) => {
            groupRefs.current[index] = node;
          }}
          scale={[config.scale, config.scale, config.scale]}
        >
          <mesh rotation={[-0.2, 0.08, index % 2 === 0 ? -0.5 : 0.34]} scale={[8.2, 4.8, 1]}>
            <planeGeometry args={[1, 1, 1, 1]} />
            <meshBasicMaterial
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              map={config.tex}
              opacity={0.34}
              transparent
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function FinalMemoryGalaxy({ galaxyStage, jumpProgress }: Pick<PostVideoDestinyUniverseProps, 'galaxyStage' | 'jumpProgress'>) {
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactDefinition | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const instancedRef = useRef<THREE.InstancedMesh | null>(null);
  const controlsRef = useRef<any>(null);
  const transit = getPostVideoTransitState(jumpProgress);
  const nebulaWarm = useMemo(() => createNebulaTexture('rgba(255,205,146,0.72)', 'rgba(204,111,255,0.26)'), []);
  const nebulaCool = useMemo(() => createNebulaTexture('rgba(143,223,255,0.72)', 'rgba(98,127,255,0.24)'), []);
  const matrices = useMemo(() => buildDestinationMatrices(DESTINATION_STAR_COUNT), []);
  const pulseArtifacts = storyConfig.galaxy.postVideo.stars.filter((star) => star.id !== 'reset-point');
  const pulseStars = useMemo(
    () => [
      { artifact: pulseArtifacts[0], position: new THREE.Vector3(4.2, 0.8, 1.8), color: '#ffd9a8' },
      { artifact: pulseArtifacts[1], position: new THREE.Vector3(-3.8, -1.1, 2.6), color: '#8fd3ff' },
      { artifact: pulseArtifacts[2], position: new THREE.Vector3(2.1, 1.9, -3.4), color: '#d8a8ff' },
      { artifact: pulseArtifacts[3], position: new THREE.Vector3(-1.8, -2.2, -4.1), color: '#ff9fdb' },
    ].filter((entry) => entry.artifact),
    [pulseArtifacts],
  );
  const visible = galaxyStage === 'manifest' || transit.destination > 0.01;

  useEffect(() => {
    if (!instancedRef.current) {
      return;
    }

    matrices.forEach((entry, index) => {
      instancedRef.current?.setMatrixAt(index, entry.matrix);
      instancedRef.current?.setColorAt(index, entry.color);
    });
    instancedRef.current.instanceMatrix.needsUpdate = true;
    if (instancedRef.current.instanceColor) {
      instancedRef.current.instanceColor.needsUpdate = true;
    }
  }, [matrices]);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) {
      return;
    }

    const reveal = galaxyStage === 'manifest' ? 1 : transit.destination;
    groupRef.current.visible = visible;
    groupRef.current.rotation.y += delta * (0.018 + (1 - reveal) * 0.08);
    groupRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.14) * 0.08;
    groupRef.current.scale.lerp(
      new THREE.Vector3(0.9 + reveal * 0.34, 0.9 + reveal * 0.34, 0.9 + reveal * 0.34),
      1 - Math.exp(-delta * 2.1),
    );

    if (controlsRef.current) {
      controlsRef.current.enabled = galaxyStage === 'manifest';
    }
  });

  return (
    <group ref={groupRef} visible={visible}>
      {galaxyStage === 'manifest' && (
        <OrbitControls
          enableDamping
          enablePan={false}
          makeDefault
          maxDistance={18}
          maxPolarAngle={Math.PI * 0.76}
          minDistance={8}
          minPolarAngle={Math.PI * 0.24}
          ref={controlsRef}
        />
      )}
      <mesh position={[0, 0, -1]} rotation={[-0.14, 0.08, -0.38]} scale={[26, 14, 1]}>
        <planeGeometry args={[1, 1, 1, 1]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          map={nebulaWarm}
          opacity={0.28}
          transparent
        />
      </mesh>
      <mesh position={[0, 0.6, 1.8]} rotation={[0.12, -0.14, 0.24]} scale={[24, 13, 1]}>
        <planeGeometry args={[1, 1, 1, 1]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          map={nebulaCool}
          opacity={0.24}
          transparent
        />
      </mesh>
      <instancedMesh args={[new THREE.PlaneGeometry(1, 1, 1, 1), undefined, DESTINATION_STAR_COUNT]} ref={instancedRef}>
        <meshBasicMaterial blending={THREE.AdditiveBlending} depthWrite={false} transparent vertexColors />
      </instancedMesh>
      {pulseStars.map(({ artifact, position, color }) => (
        <group key={artifact.id} position={position.toArray()}>
          <mesh onClick={() => setSelectedArtifact(artifact)}>
            <sphereGeometry args={[0.18, 24, 24]} />
            <meshBasicMaterial color={color} />
          </mesh>
          <mesh scale={[0.75, 0.75, 0.75]}>
            <sphereGeometry args={[0.24, 24, 24]} />
            <meshBasicMaterial
              blending={THREE.AdditiveBlending}
              color={color}
              depthWrite={false}
              opacity={0.35}
              transparent
            />
          </mesh>
        </group>
      ))}
      <group position={[0, 0, -12]}>
        <mesh>
          <sphereGeometry args={[0.38, 24, 24]} />
          <meshBasicMaterial color="#fff1d8" />
        </mesh>
        <mesh scale={[2.6, 2.6, 2.6]}>
          <sphereGeometry args={[0.34, 20, 20]} />
          <meshBasicMaterial
            blending={THREE.AdditiveBlending}
            color="#ffd6a0"
            depthWrite={false}
            opacity={0.24}
            transparent
          />
        </mesh>
      </group>
      {selectedArtifact && (
        <Html center position={[0, -4.6, 0]}>
          <div className="memory-star-card gate-panel">
            <p className="eyebrow">{selectedArtifact.title}</p>
            <h3>{selectedArtifact.unlockTitle}</h3>
            <p>{selectedArtifact.unlockText}</p>
            <button className="ghost-button" onClick={() => setSelectedArtifact(null)} type="button">
              Скрыть
            </button>
          </div>
        </Html>
      )}
    </group>
  );
}

export function PostVideoDestinyUniverse({
  galaxyStage,
  postVideoStage,
  jumpProgress,
}: PostVideoDestinyUniverseProps) {
  return (
    <group renderOrder={9}>
      <PostVideoWarpTunnel jumpProgress={jumpProgress} postVideoStage={postVideoStage} />
      <FlightGalaxies jumpProgress={jumpProgress} postVideoStage={postVideoStage} />
      <FinalMemoryGalaxy galaxyStage={galaxyStage} jumpProgress={jumpProgress} />
    </group>
  );
}
