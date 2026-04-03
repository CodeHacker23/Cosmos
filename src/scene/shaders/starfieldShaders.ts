export const starfieldVertexShader = `
uniform float uTime;
uniform float uWarp;
uniform float uMatch;
uniform float uEntropy;
uniform float uGravity;
uniform float uResonance;
uniform float uSync;
uniform float uReveal;

attribute float aScale;
attribute vec3 aRandomness;

varying vec3 vColor;
varying float vAlpha;
varying float vWarp;

vec3 rotateY(vec3 point, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return vec3(
    c * point.x + s * point.z,
    point.y,
    -s * point.x + c * point.z
  );
}

void main() {
  vec3 displaced = position;

  float drift = sin(uTime * (0.16 + uGravity * 0.12) + aRandomness.x * 6.2831) * (0.22 + uGravity * 0.08);
  float ripple = cos(uTime * (0.16 + uResonance * 0.34) + aRandomness.y * 10.0) * (0.1 + uResonance * 0.3);
  float resonanceWave = sin(length(position.xz) * 0.085 - uTime * (0.26 + uResonance * 0.5) + aRandomness.z * 5.0);
  float syncPulse = sin(uTime * (0.42 + uSync * 0.9) + length(position) * 0.1 + aRandomness.x * 4.0);
  float syncDepth = cos(uTime * (0.34 + uSync * 0.7) + length(position.xy) * 0.06 + aRandomness.y * 3.5);

  displaced.x += drift * (1.0 + uEntropy * 0.03);
  displaced.y += ripple * (1.0 + uEntropy * 0.02);
  displaced.y += resonanceWave * uResonance * (1.25 + uEntropy * 0.01);
  displaced += normalize(position + aRandomness * 0.2) * syncPulse * uSync * 0.8;
  displaced.z += syncDepth * uSync * 1.1;

  float spiral = uTime * (0.01 + uGravity * 0.1) + length(position.xy) * 0.006;
  displaced = rotateY(displaced, spiral);

  float centerPull = smoothstep(0.18, 0.95, uWarp);
  float radialDistance = length(displaced.xy);
  vec2 radialDir = radialDistance > 0.0001 ? normalize(displaced.xy) : vec2(0.0);
  displaced.xy -= radialDir * radialDistance * centerPull * 0.82;
  displaced.xy *= mix(1.0, 0.08, centerPull);

  float warpFactor = 1.0 + uWarp * 18.0;
  displaced.z *= warpFactor;

  vec3 warmColor = vec3(1.0, 0.5, 0.22);
  vec3 coolColor = vec3(0.18, 0.62, 1.0);
  vec3 stellarWhite = vec3(0.98, 0.98, 1.0);
  float hemisphereMix = smoothstep(-20.0, 20.0, displaced.y);
  float resonanceShift = clamp(uResonance * 0.82 + uMatch * 0.35, 0.0, 1.0);
  vec3 spectralMix = mix(warmColor, coolColor, mix(hemisphereMix, resonanceShift, 0.48));
  vColor = mix(spectralMix, stellarWhite, clamp(0.12 + uSync * 0.18 + aScale * 0.14, 0.0, 0.32));

  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float size = (0.72 + aScale * 1.5 + uMatch * 0.72 + uResonance * 0.26 + uSync * 0.22) * (238.0 / max(1.0, -mvPosition.z));
  gl_PointSize = size * mix(0.3, 1.0, uReveal);
  vAlpha = clamp((0.4 + aScale * 0.72 + uMatch * 0.36 + uResonance * 0.08 + uSync * 0.08) * uReveal, 0.0, 1.0);
  vWarp = uWarp;
}
`;

export const starfieldFragmentShader = `
varying vec3 vColor;
varying float vAlpha;
varying float vWarp;

void main() {
  vec2 centered = gl_PointCoord - 0.5;
  float dist = length(centered);

  if (dist > 0.5) {
    discard;
  }

  float core = smoothstep(0.095, 0.0, dist);
  float halo = smoothstep(0.48, 0.02, dist);
  float outerHalo = smoothstep(0.5, 0.16, dist);
  float verticalSpike = 1.0 - smoothstep(0.006, 0.115, abs(centered.x));
  float horizontalSpike = 1.0 - smoothstep(0.006, 0.115, abs(centered.y));
  float spikes = (verticalSpike + horizontalSpike) * smoothstep(0.58, 1.22, vAlpha) * 0.22;
  float glow = mix(core * 1.75 + halo * 0.32 + outerHalo * 0.12 + spikes, halo + outerHalo * 0.4 + spikes * 0.55, vWarp * 0.85);
  glow = pow(glow, mix(1.1, 2.2, 1.0 - vWarp));

  vec3 finalColor = vColor * (1.02 + core * 1.5 + halo * 0.2 + spikes * 1.1 + outerHalo * 0.18);
  gl_FragColor = vec4(finalColor, clamp(glow * vAlpha, 0.0, 1.0));
}
`;
