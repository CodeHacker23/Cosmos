export const singularityTimeline = {
  acceleration: 2,
  jump: 1,
  flash: 0.5,
  flight: 4,
} as const;

export const SINGULARITY_TOTAL_DURATION =
  singularityTimeline.acceleration +
  singularityTimeline.jump +
  singularityTimeline.flash +
  singularityTimeline.flight;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const normalizeRange = (value: number, start: number, end: number) => {
  if (end <= start) {
    return 0;
  }

  return clamp01((value - start) / (end - start));
};

export interface SingularityTransitState {
  acceleration: number;
  jump: number;
  flash: number;
  flight: number;
  afterglow: number;
}

export const getSingularityTransitState = (progress: number): SingularityTransitState => {
  const time = clamp01(progress) * SINGULARITY_TOTAL_DURATION;
  const accelerationEnd = singularityTimeline.acceleration;
  const jumpEnd = accelerationEnd + singularityTimeline.jump;
  const flashEnd = jumpEnd + singularityTimeline.flash;
  const flightEnd = flashEnd + singularityTimeline.flight;

  return {
    acceleration: normalizeRange(time, 0, accelerationEnd),
    jump: normalizeRange(time, accelerationEnd, jumpEnd),
    flash: normalizeRange(time, jumpEnd, flashEnd),
    flight: normalizeRange(time, flashEnd, flightEnd),
    afterglow: normalizeRange(time, flashEnd + singularityTimeline.flight * 0.72, flightEnd),
  };
};
