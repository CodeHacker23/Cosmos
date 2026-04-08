/**
 * Длительность гиперпрыжка после видео (post-video jump): один источник правды.
 * `jumpProgress` 0→1 за столько же секунд движет GSAP в useExperienceController;
 * таймаут перехода в newspace использует то же значение (POST_VIDEO_TOTAL_DURATION).
 */
export const POST_VIDEO_TRANSIT = {
  coreApproach: 3.15,
  phraseHold: 1.05,
  phraseCount: 3,
  galaxyFlight: 1.95,
  destinationSettle: 0.75,
} as const;

export const POST_VIDEO_TUNNEL_DURATION =
  POST_VIDEO_TRANSIT.phraseHold * POST_VIDEO_TRANSIT.phraseCount;

export const POST_VIDEO_TOTAL_DURATION =
  POST_VIDEO_TRANSIT.coreApproach +
  POST_VIDEO_TUNNEL_DURATION +
  POST_VIDEO_TRANSIT.galaxyFlight +
  POST_VIDEO_TRANSIT.destinationSettle;

/** Длительность прыжка в секундах (= сумма фаз выше, сейчас 9). */
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
  const fadeInWindow = POST_VIDEO_TRANSIT.phraseHold * 0.42;
  const fadeOutWindow = POST_VIDEO_TRANSIT.phraseHold * 0.58;
  const phraseVisibility =
    time < coreEnd || time > tunnelEnd
      ? 0
      : Math.min(
          1,
          normalizeRange(phraseLocal, 0, fadeInWindow) *
            normalizeRange(POST_VIDEO_TRANSIT.phraseHold - phraseLocal, 0, fadeOutWindow),
        );

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
