import { useEffect, useState } from 'react';

export type GpuSceneTier = 'high' | 'medium' | 'low';

export type GpuSceneProfile = {
  tier: GpuSceneTier;
  /** Passed to R3F Canvas `dpr` as [min, max]. */
  dpr: [number, number];
  tunnelInstances: number;
  destinationStars: number;
};

const TIER_DEFAULTS: Record<GpuSceneTier, Omit<GpuSceneProfile, 'tier'>> = {
  high: { dpr: [1, 1.5], tunnelInstances: 23_000, destinationStars: 110_000 },
  medium: { dpr: [1, 1.22], tunnelInstances: 17_000, destinationStars: 72_000 },
  low: { dpr: [1, 1.1], tunnelInstances: 12_000, destinationStars: 48_000 },
};

const SSR_PROFILE: GpuSceneProfile = { tier: 'high', ...TIER_DEFAULTS.high };

/**
 * Heuristic GPU / density profile for WebGL scenes on phones vs desktop.
 * - `prefers-reduced-motion` → low (fewer particles, lower DPR cap).
 * - Coarse pointer on a very narrow viewport → low (small phones).
 * - Otherwise coarse pointer (typical touch phones / tablets) → medium.
 * - Fine pointer + mouse/trackpad → high.
 */
export function getGpuSceneProfile(): GpuSceneProfile {
  if (typeof window === 'undefined') {
    return SSR_PROFILE;
  }

  let tier: GpuSceneTier = 'high';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    tier = 'low';
  } else if (
    window.matchMedia('(pointer: coarse)').matches &&
    window.matchMedia('(max-width: 480px)').matches
  ) {
    tier = 'low';
  } else if (window.matchMedia('(pointer: coarse)').matches) {
    tier = 'medium';
  }

  return { tier, ...TIER_DEFAULTS[tier] };
}

/**
 * Recomputes when relevant viewport / preference media queries change.
 */
export function useMobileGpuProfile(): GpuSceneProfile {
  const [profile, setProfile] = useState<GpuSceneProfile>(() => getGpuSceneProfile());

  useEffect(() => {
    const queries = [
      '(prefers-reduced-motion: reduce)',
      '(pointer: coarse)',
      '(max-width: 480px)',
    ];

    const sync = () => {
      setProfile(getGpuSceneProfile());
    };

    const mqls = queries.map((q) => window.matchMedia(q));
    mqls.forEach((mql) => mql.addEventListener('change', sync));
    sync();

    return () => {
      mqls.forEach((mql) => mql.removeEventListener('change', sync));
    };
  }, []);

  return profile;
}
