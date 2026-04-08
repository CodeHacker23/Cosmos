import * as THREE from 'three';
import { storyConfig } from '../content/storyConfig';

const jumpLineCount: number = storyConfig.galaxy.postVideo.jumpLines.length;

/**
 * Длительность гиперпрыжка после видео (post-video jump): один источник правды.
 * Фаза «туннеля» (нормализованный ramp полос) отделена от расписания фраз —
 * фразы идут по пути туннеля + полёта, последняя строка массива — финал перед чистым залпом частиц.
 */
export const POST_VIDEO_TRANSIT = {
  coreApproach: 3.8,
  /** Нормализация tunnel 0→1 (полосы набираются); не равна длине «слотов» фраз. */
  tunnelPhaseDuration: 24,
  galaxyFlight: 19,
  destinationSettle: 2.6,
  /** Конец полёта без текста — только полосы/частицы на зрителя. */
  phraseParticleSilenceSeconds: 3.5,
  /** Отдельное окно под последнюю (закрывающую) фразу в jumpLines. */
  closingPhraseSeconds: 10.5,
} as const;

export const POST_VIDEO_TUNNEL_DURATION = POST_VIDEO_TRANSIT.tunnelPhaseDuration;

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

const phraseFadeInRatio = 0.18;
const phraseFadeOutRatio = 0.22;

function phraseVisibilityInSlot(phraseLocal: number, slotDuration: number): number {
  const fadeInWindow = Math.max(0.35, slotDuration * phraseFadeInRatio);
  const fadeOutWindow = Math.max(0.45, slotDuration * phraseFadeOutRatio);
  const fadeInRaw = normalizeRange(phraseLocal, 0, fadeInWindow);
  const fadeOutRaw = normalizeRange(slotDuration - phraseLocal, 0, fadeOutWindow);
  const fadeIn = THREE.MathUtils.smootherstep(fadeInRaw, 0.05, 0.97);
  const fadeOut = THREE.MathUtils.smootherstep(fadeOutRaw, 0.05, 0.97);
  return Math.min(1, fadeIn * fadeOut);
}

export const getPostVideoTransitState = (progress: number): PostVideoTransitState => {
  const time = clamp01(progress) * POST_VIDEO_TOTAL_DURATION;
  const coreEnd = POST_VIDEO_TRANSIT.coreApproach;
  const tunnelEnd = coreEnd + POST_VIDEO_TUNNEL_DURATION;
  const flightEnd = tunnelEnd + POST_VIDEO_TRANSIT.galaxyFlight;
  const destinationEnd = flightEnd + POST_VIDEO_TRANSIT.destinationSettle;

  const phraseEnd = flightEnd - POST_VIDEO_TRANSIT.phraseParticleSilenceSeconds;
  const closingStart = Math.max(
    coreEnd + 1.2,
    phraseEnd - POST_VIDEO_TRANSIT.closingPhraseSeconds,
  );

  let phraseIndex = 0;
  let phraseVisibility = 0;

  if (time >= coreEnd && time < phraseEnd && jumpLineCount > 0) {
    if (jumpLineCount === 1) {
      phraseIndex = 0;
      const slotDuration = phraseEnd - coreEnd;
      phraseVisibility = phraseVisibilityInSlot(time - coreEnd, slotDuration);
    } else if (time >= closingStart) {
      phraseIndex = jumpLineCount - 1;
      const slotDuration = phraseEnd - closingStart;
      phraseVisibility = phraseVisibilityInSlot(time - closingStart, slotDuration);
    } else {
      const bodyCount = jumpLineCount - 1;
      const bodySpan = closingStart - coreEnd;
      const bodySlot = Math.max(0.9, bodySpan / bodyCount);
      const rawIndex = Math.floor((time - coreEnd) / bodySlot);
      const discreteIndex = Math.min(bodyCount - 1, Math.max(0, rawIndex));
      phraseIndex = discreteIndex;
      const phraseLocal = time - coreEnd - discreteIndex * bodySlot;
      phraseVisibility = phraseVisibilityInSlot(phraseLocal, bodySlot);
    }
  }

  return {
    time,
    coreApproach: normalizeRange(time, 0, coreEnd),
    tunnel: normalizeRange(time, coreEnd, tunnelEnd),
    galaxyFlight: normalizeRange(time, tunnelEnd, flightEnd),
    destination: normalizeRange(time, flightEnd, destinationEnd),
    phraseIndex,
    phraseVisibility,
  };
};
