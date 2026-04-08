import { Html, OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { gsap } from 'gsap';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { storyConfig } from '../content/storyConfig';
import type { ArtifactDefinition, GalaxyPostVideoStage, GalaxyStage } from '../features/experience/model/types';
import {
  POST_VIDEO_TOTAL_DURATION,
  POST_VIDEO_TRANSIT,
  getPostVideoTransitState,
} from './postVideoTransit';

interface PostVideoDestinyUniverseProps {
  galaxyStage: GalaxyStage;
  postVideoStage: GalaxyPostVideoStage;
  jumpProgress: number;
}

const TUNNEL_INSTANCE_COUNT = 24000;
const DESTINATION_STAR_COUNT = 110000;

const tunnelVertexShader = `
uniform float uTime;
uniform float uVelocity;
uniform float uApproach;
uniform float uTunnel;
uniform vec3 uStreakDir;
uniform vec3 uTunnelAnchor;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform float uVisibleSeedMax;
uniform float uLineGate;

attribute float aSeed;
attribute float aAngle;
attribute float aRadius;
attribute float aDepth;
attribute float aVelocity;
attribute float aThickness;

varying float vAlpha;
varying float vAlong;
varying float vRadial;
varying float vAxisDist;
varying float vSeed;
varying vec2 vUv;

void main() {
  vUv = uv;
  vSeed = aSeed;
  float approach = smoothstep(0.0, 1.0, uApproach);
  float tunnelMix = smoothstep(0.0, 1.0, uTunnel);
  float vel = max(1.0, uVelocity) * aVelocity;

  vec3 D = normalize(uStreakDir);
  vec3 Rax = normalize(uCamRight);
  vec3 Uax = normalize(uCamUp);

  float expansion = mix(0.28, 1.0, approach) * mix(0.72, 1.0, tunnelMix);
  float r = aRadius * expansion;
  vRadial = clamp(aRadius / 36.0, 0.0, 1.0);
  vAxisDist = r;

  vec2 d = vec2(cos(aAngle), sin(aAngle));
  vec3 radialOffset = (Rax * d.x + Uax * d.y) * r;

  float streakLen = max(0.85, (0.35 + uVelocity * 0.038) * (0.5 + aVelocity * 0.5));
  streakLen *= mix(0.75, 1.2, tunnelMix);
  streakLen *= mix(0.45, 1.0, approach);

  float thin = 0.0045 + aThickness * 0.011;

  float zSpan = 168.0;
  // D смотрит на зрителя; zFlow должен быть <= 0, иначе центр уходит ЗА камеру и половина
  // инстансов клипится → «полосы только сверху». Держим поток только впереди по лучу взгляда.
  float zFlow = -mod(aDepth + uTime * vel * 4.8, zSpan);
  vec3 base = uTunnelAnchor + radialOffset + D * zFlow;

  vec3 worldPos = base + Rax * position.x * thin + D * position.y * streakLen;

  vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  vAlong = uv.y;

  float depthFade = 1.0 - smoothstep(-18.0, -1.2, zFlow);

  float densityOk = step(aSeed, uVisibleSeedMax + 0.001);

  vAlpha =
    (0.34 + approach * 0.62) *
    (0.42 + tunnelMix * 0.72) *
    depthFade *
    densityOk *
    uLineGate *
    1.35;
}
`;

const tunnelFragmentShader = `
uniform float uVisibleSeedMax;

varying float vAlpha;
varying float vAlong;
varying float vRadial;
varying float vAxisDist;
varying float vSeed;
varying vec2 vUv;

void main() {
  if (vSeed > uVisibleSeedMax + 0.0005) {
    discard;
  }

  float beam = smoothstep(0.5, 0.03, abs(vUv.x - 0.5));
  float tip = smoothstep(1.0, 0.03, vUv.y);
  float tail = smoothstep(0.0, 0.1, vUv.y);
  float lineCore = beam * tip * tail;

  float hole = smoothstep(1.85, 6.4, vAxisDist);
  hole = pow(hole, 1.02);

  vec3 col = vec3(0.98, 0.99, 1.0);

  float a = clamp(lineCore * vAlpha * 1.92 * hole, 0.0, 1.0);
  gl_FragColor = vec4(col * 1.72, a);
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
    radii[index] = 0.12 + Math.pow(Math.random(), 0.88) * 34.0;
    depths[index] = Math.random() * 260;
    velocities[index] = 0.45 + Math.random() * 1.55;
    thickness[index] = 0.25 + Math.random() * 0.75;
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
  const { camera } = useThree();
  const meshRef = useRef<THREE.InstancedMesh | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const velocityTweenRef = useRef<gsap.core.Tween | null>(null);
  const viewDirScratch = useRef(new THREE.Vector3(0, 0, -1));
  const geometry = useMemo(() => buildTunnelGeometry(), []);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uVelocity: { value: 1 },
      uApproach: { value: 0 },
      uTunnel: { value: 0 },
      uStreakDir: { value: new THREE.Vector3(0, 0, 1) },
      uTunnelAnchor: { value: new THREE.Vector3(0, 0, 0) },
      uCamRight: { value: new THREE.Vector3(1, 0, 0) },
      uCamUp: { value: new THREE.Vector3(0, 1, 0) },
      uVisibleSeedMax: { value: 0.09 },
      uLineGate: { value: 0 },
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
    const coreHold = POST_VIDEO_TRANSIT.coreApproach;
    const rampDuration = Math.max(2.4, POST_VIDEO_TOTAL_DURATION - coreHold - 1.0);
    velocityTweenRef.current = gsap.to(materialRef.current.uniforms.uVelocity, {
      value: 72,
      duration: rampDuration,
      delay: coreHold,
      ease: 'power2.in',
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

    materialRef.current.uniforms.uTunnelAnchor.value.copy(camera.position);
    camera.getWorldDirection(viewDirScratch.current);
    materialRef.current.uniforms.uStreakDir.value.copy(viewDirScratch.current).negate().normalize();

    const e = camera.matrixWorld.elements;
    materialRef.current.uniforms.uCamRight.value.set(e[0], e[1], e[2]).normalize();
    materialRef.current.uniforms.uCamUp.value.set(e[4], e[5], e[6]).normalize();

    const { coreApproach, tunnel, galaxyFlight, destination } = transit;
    const lineGate = THREE.MathUtils.clamp(
      THREE.MathUtils.smootherstep(coreApproach, 0.22, 0.72) * 0.75 +
        tunnel +
        galaxyFlight * 0.98 +
        destination * 0.72,
      0,
      1,
    );
    materialRef.current.uniforms.uLineGate.value = lineGate;

    const seedMax = THREE.MathUtils.clamp(
      0.12 +
        THREE.MathUtils.smootherstep(coreApproach, 0.2, 0.75) * 0.35 +
        tunnel * 0.52 +
        galaxyFlight * 0.38 +
        destination * 0.28,
      0.1,
      1.02,
    );
    materialRef.current.uniforms.uVisibleSeedMax.value = seedMax;

    meshRef.current.visible = postVideoStage === 'jump';
  });

  return (
    <instancedMesh
      args={[geometry, undefined, TUNNEL_INSTANCE_COUNT]}
      frustumCulled={false}
      ref={meshRef}
      renderOrder={20}
    >
      <shaderMaterial
        blending={THREE.AdditiveBlending}
        depthTest={false}
        depthWrite={false}
        fog={false}
        fragmentShader={tunnelFragmentShader}
        ref={materialRef}
        side={THREE.DoubleSide}
        transparent
        uniforms={uniforms}
        vertexShader={tunnelVertexShader}
      />
    </instancedMesh>
  );
}

function FinalMemoryGalaxy({ galaxyStage }: Pick<PostVideoDestinyUniverseProps, 'galaxyStage'>) {
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactDefinition | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const instancedRef = useRef<THREE.InstancedMesh | null>(null);
  const controlsRef = useRef<any>(null);
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
  const visible = galaxyStage === 'manifest';

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

    const reveal = galaxyStage === 'manifest' ? 1 : 0;
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
      <FinalMemoryGalaxy galaxyStage={galaxyStage} />
    </group>
  );
}
