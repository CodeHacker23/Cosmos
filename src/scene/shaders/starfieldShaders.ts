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

  float drift = sin(uTime * 0.18 + aRandomness.x * 6.2831) * 0.28;
  float ripple = cos(uTime * (0.12 + uResonance * 0.1) + aRandomness.y * 10.0) * 0.18;
  float pulse = sin(uTime * (0.35 + uSync * 0.45) + length(position) * 0.12) * 0.09;

  displaced.x += drift * (1.0 + uEntropy * 0.03);
  displaced.y += ripple * (1.0 + uEntropy * 0.02);
  displaced += normalize(aRandomness) * pulse * (0.6 + uMatch);

  float spiral = uTime * (0.01 + uGravity * 0.08) + length(position.xy) * 0.006;
  displaced = rotateY(displaced, spiral);

  float warpFactor = 1.0 + uWarp * 16.0;
  displaced.z *= warpFactor;
  displaced.xy *= mix(1.0, 0.24, uWarp);

  vec3 warmColor = vec3(1.0, 0.38, 0.15);
  vec3 coolColor = vec3(0.12, 0.54, 1.0);
  float hemisphereMix = smoothstep(-20.0, 20.0, displaced.y);
  float resonanceShift = clamp(uResonance * 0.75 + uMatch * 0.35, 0.0, 1.0);
  vColor = mix(warmColor, coolColor, mix(hemisphereMix, resonanceShift, 0.45));

  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float size = (0.62 + aScale * 1.3 + uMatch * 0.65) * (230.0 / max(1.0, -mvPosition.z));
  gl_PointSize = size * mix(0.3, 1.0, uReveal);
  vAlpha = clamp((0.35 + aScale * 0.65 + uMatch * 0.35) * uReveal, 0.0, 1.0);
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

  float core = smoothstep(0.1, 0.0, dist);
  float halo = smoothstep(0.46, 0.03, dist);
  float verticalSpike = 1.0 - smoothstep(0.008, 0.12, abs(centered.x));
  float horizontalSpike = 1.0 - smoothstep(0.008, 0.12, abs(centered.y));
  float spikes = (verticalSpike + horizontalSpike) * smoothstep(0.6, 1.2, vAlpha) * 0.16;
  float glow = mix(core * 1.6 + halo * 0.24 + spikes, halo + spikes * 0.5, vWarp * 0.85);
  glow = pow(glow, mix(1.1, 2.2, 1.0 - vWarp));

  vec3 finalColor = vColor * (1.0 + core * 1.25 + halo * 0.12 + spikes * 0.9);
  gl_FragColor = vec4(finalColor, clamp(glow * vAlpha, 0.0, 1.0));
}
`;
