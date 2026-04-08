/**
 * RAW GLSL — cinematic hyperspace warp (instanced quads, not point sprites).
 * Streaks are stretched in the vertex shader along the radial vector from origin.
 */

export const WARP_DRIVE_VERTEX_SHADER = /* glsl */ `
uniform float uTime;
uniform float uVelocity;
uniform float uApproach;
uniform float uTunnel;
uniform float uFlight;
uniform float uElapsed;
uniform float uStreakKick;
uniform float uFlashGate;

attribute float aSeed;
attribute float aAngle;
attribute float aRadius;
attribute float aDepth;
attribute float aParticleSpeed;
attribute float aThickness;

varying vec2 vUv;
varying float vAlong;
varying float vAlpha;
varying float vFlash;

void main() {
  vUv = uv;
  float tunnel = smoothstep(0.0, 1.0, uTunnel);
  float flight = smoothstep(0.0, 1.0, uFlight);
  float approach = smoothstep(0.0, 1.0, uApproach);
  float vel = max(1.0, uVelocity);

  vec2 dir = vec2(cos(aAngle), sin(aAngle));
  vec2 perp = vec2(-dir.y, dir.x);

  float radialSpan = mix(0.05, 1.0, max(tunnel, approach * 0.94));
  float r0 = aRadius * radialSpan;
  float rNorm = clamp(r0 / 24.0, 0.0, 1.0);

  float periphery = smoothstep(0.1, 0.52, rNorm) * (0.35 + 1.65 * pow(rNorm, 1.18));
  float centerVoid = smoothstep(0.0, 0.26, rNorm);

  float speedTerm = aParticleSpeed * (0.55 + vel * 0.012);
  float timeWave = 1.0 + uTime * 0.42 * speedTerm;

  float choreo = 1.0;
  if (uElapsed < 2.0) {
    choreo = mix(0.18, 1.0, smoothstep(0.0, 2.0, uElapsed));
  } else if (uElapsed < 3.0) {
    choreo = 1.0 + smoothstep(2.0, 3.0, uElapsed) * 0.95;
  } else {
    choreo = 1.85 + 0.06 * sin(uTime * 1.7 + aSeed * 10.0);
  }
  choreo *= mix(0.65, 1.35, uStreakKick);

  float streakLen =
    periphery *
    centerVoid *
    choreo *
    timeWave *
    mix(0.45, 4.2, tunnel + approach * 0.85) *
    mix(1.0, 0.55, flight);

  vec2 local = position.xy;
  float wThin = mix(0.008 + aThickness * 0.016, 0.002 + aThickness * 0.006, tunnel);
  local.x *= wThin;
  local.y *= streakLen;

  vec2 worldXY = dir * (r0 + local.y) + perp * local.x;
  float wobble = sin(uTime * 0.65 + aSeed * 11.0) * flight * 0.22 * (1.0 - tunnel * 0.95);
  worldXY += perp * wobble;

  float zLoop = mod(aDepth + uTime * vel * aParticleSpeed, 260.0) - 130.0;
  vec3 displaced = vec3(worldXY, -zLoop);

  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  vAlong = uv.y;
  vFlash = uFlashGate * (0.82 + 0.18 * sin(uTime * 38.0));

  float edgeBoost = mix(0.9, 1.15, periphery * smoothstep(0.15, 1.0, rNorm));
  float alphaBase =
    (0.12 + approach * 0.78 + tunnel * 0.95 + flight * 0.12) *
    (0.42 + aParticleSpeed * 0.58) *
    edgeBoost *
    centerVoid;

  vAlpha = alphaBase * (1.0 + uFlashGate * 2.1) * 1.65;
}
`;

export const WARP_DRIVE_FRAGMENT_SHADER = /* glsl */ `
varying vec2 vUv;
varying float vAlong;
varying float vAlpha;
varying float vFlash;

void main() {
  float beam = smoothstep(0.5, 0.03, abs(vUv.x - 0.5));
  float tip = smoothstep(1.0, 0.04, vUv.y);
  float tail = smoothstep(0.0, 0.2, vUv.y);
  float lineCore = beam * tip * tail;
  lineCore += pow(beam, 5.0) * 0.62;

  vec3 innerCore = vec3(1.0, 0.94, 0.76);
  vec3 mid = vec3(0.55, 0.78, 1.0);
  vec3 outer = vec3(0.28, 0.42, 1.0);
  vec3 purple = vec3(0.62, 0.32, 0.98);

  float t = pow(vAlong, 0.82);
  vec3 col = mix(innerCore, mid, smoothstep(0.0, 0.55, t));
  col = mix(col, outer, smoothstep(0.35, 1.0, t));
  col = mix(col, purple, smoothstep(0.75, 1.0, t) * 0.35);

  col = mix(col, vec3(1.0), vFlash * 0.55);

  float a = clamp(lineCore * vAlpha, 0.0, 1.0);
  gl_FragColor = vec4(col * (1.0 + lineCore * 0.35), a);
}
`;
