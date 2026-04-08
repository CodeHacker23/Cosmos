import * as THREE from 'three';

/**
 * Длительность гиперпрыжка после видео (post-video jump): один источник правды.
 * `jumpProgress` 0→1 за столько же секунд движет GSAP в useExperienceController;
 * таймаут перехода в newspace использует то же значение (POST_VIDEO_TOTAL_DURATION).
 */
export const POST_VIDEO_TRANSIT = {
  coreApproach: 3.8,
  /** Туннель с полосами: было 2.2×3 ≈ 6.6 с → ×5 ≈ 33 с (11 с на фразу). */
  phraseHold: 11,
  phraseCount: 3,
  /** Полёт полос (−20% к 16 с). */
  galaxyFlight: 12.8,
  destinationSettle: 1.5,
} as const;

export const POST_VIDEO_TUNNEL_DURATION =
  POST_VIDEO_TRANSIT.phraseHold * POST_VIDEO_TRANSIT.phraseCount;

export const POST_VIDEO_TOTAL_DURATION =
  POST_VIDEO_TRANSIT.coreApproach +
  POST_VIDEO_TUNNEL_DURATION +
  POST_VIDEO_TRANSIT.galaxyFlight +
  POST_VIDEO_TRANSIT.destinationSettle;

/** Длительность прыжка в секундах (= сумма фаз выше). */
export const POST_VIDEO_JUMP_SECONDS = POST_VIDEO_TOTAL_DURATION;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const normalizeRange = (value: number, start: number, end: number) => {
  if (end <= start) {
    return 0;
  }

  return clamp01((value - start) / (end - start));
};

export interface PostVideoTransitState {
  time: number;
  coreApproach: number;
  tunnel: number;
  galaxyFlight: number;
  destination: number;
  phraseIndex: number;
  phraseVisibility: number;
}

export const getPostVideoTransitState = (progress: number): PostVideoTransitState => {
  const time = clamp01(progress) * POST_VIDEO_TOTAL_DURATION;
  const coreEnd = POST_VIDEO_TRANSIT.coreApproach;
  const tunnelEnd = coreEnd + POST_VIDEO_TUNNEL_DURATION;
  const flightEnd = tunnelEnd + POST_VIDEO_TRANSIT.galaxyFlight;
  const destinationEnd = flightEnd + POST_VIDEO_TRANSIT.destinationSettle;
  const tunnelTime = Math.max(0, time - coreEnd);
  const discretePhraseIndex = Math.min(
    POST_VIDEO_TRANSIT.phraseCount - 1,
    Math.max(0, Math.floor(tunnelTime / POST_VIDEO_TRANSIT.phraseHold)),
  );
  const phraseLocal = tunnelTime - discretePhraseIndex * POST_VIDEO_TRANSIT.phraseHold;
  const fadeInWindow = POST_VIDEO_TRANSIT.phraseHold * 0.48;
  const fadeOutWindow = POST_VIDEO_TRANSIT.phraseHold * 0.52;
  const fadeInRaw = normalizeRange(phraseLocal, 0, fadeInWindow);
  const fadeOutRaw = normalizeRange(POST_VIDEO_TRANSIT.phraseHold - phraseLocal, 0, fadeOutWindow);
  const fadeIn = THREE.MathUtils.smootherstep(fadeInRaw, 0.08, 0.94);
  const fadeOut = THREE.MathUtils.smootherstep(fadeOutRaw, 0.08, 0.94);
  const phraseVisibility =
    time < coreEnd || time > tunnelEnd ? 0 : Math.min(1, fadeIn * fadeOut);

  return {
    time,
    coreApproach: normalizeRange(time, 0, coreEnd),
    tunnel: normalizeRange(time, coreEnd, tunnelEnd),
    galaxyFlight: normalizeRange(time, tunnelEnd, flightEnd),
    destination: normalizeRange(time, flightEnd, destinationEnd),
    phraseIndex: discretePhraseIndex,
    phraseVisibility,
  };
};
