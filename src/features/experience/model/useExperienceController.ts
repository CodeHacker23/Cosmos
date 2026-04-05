import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { storyConfig } from '../../../content/storyConfig';
import { assessCalibration } from './calibration';
import type {
  GalaxySearchProgress,
  GalaxySearchIntroState,
  GalaxyStage,
  GalaxyWeaveFailureState,
  ExperiencePhase,
  IntroBeat,
  IntroBeats,
  SliderKey,
  SliderState,
} from './types';

interface UnlockResult {
  ok: boolean;
  message: string;
}

const vibrateIfPossible = (pattern: number | number[]) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const createBeat = (progress: number, start: number, end: number): IntroBeat => {
  const normalized = clamp01((progress - start) / (end - start));
  return {
    progress: normalized,
    active: progress >= start && progress < end,
    complete: progress >= end,
  };
};

const getIntroBeats = (progress: number): IntroBeats => ({
  progress,
  voidBeat: createBeat(progress, 0, 0.18),
  pulseBeat: createBeat(progress, 0.12, 0.34),
  distanceBeat: createBeat(progress, 0.28, 0.46),
  starRevealBeat: createBeat(progress, 0.38, 0.66),
  nebulaRevealBeat: createBeat(progress, 0.52, 0.78),
  anchorsRevealBeat: createBeat(progress, 0.68, 0.9),
  signalSearchBeat: createBeat(progress, 0.78, 0.92),
  terminalRevealBeat: createBeat(progress, 0.88, 0.98),
  lockReadyBeat: createBeat(progress, 0.93, 1),
});

const idleWeaveFailureState: GalaxyWeaveFailureState = {
  active: false,
  failureKey: 0,
  attemptedFromId: null,
  failedSignalId: null,
  expectedFromId: null,
  expectedSignalId: null,
  decoySignalIds: [],
};

export function useExperienceController() {
  const [phase, setPhase] = useState<ExperiencePhase>('terminal');
  const [sliders, setSliders] = useState<SliderState>(storyConfig.calibration.initial);
  const [unlockFailures, setUnlockFailures] = useState(0);
  const [orientationEnabled, setOrientationEnabled] = useState(false);
  const [introProgress, setIntroProgress] = useState(0);
  const [singularityProgress, setSingularityProgress] = useState(0);
  const [galaxyStage, setGalaxyStage] = useState<GalaxyStage>('search');
  const [galaxyIntroState, setGalaxyIntroState] =
    useState<GalaxySearchIntroState>('preface');
  const [foundSignalIds, setFoundSignalIds] = useState<string[]>([]);
  const [linkedSignalIds, setLinkedSignalIds] = useState<string[]>([]);
  const [revealedArtifactId, setRevealedArtifactId] = useState<string | null>(null);
  const [featuredSignalId, setFeaturedSignalId] = useState<string | null>(null);
  const [delayedSignalReady, setDelayedSignalReady] = useState(false);
  const [weaveFailureState, setWeaveFailureState] =
    useState<GalaxyWeaveFailureState>(idleWeaveFailureState);
  const [starbirthProgress, setStarbirthProgress] = useState(0);
  const [specialStarOpened, setSpecialStarOpened] = useState(false);
  const transitionStartedRef = useRef(false);
  const transitionTimeoutRef = useRef<number | null>(null);
  const galaxyIntroTimeoutRef = useRef<number | null>(null);
  const delayedSignalTimeoutRef = useRef<number | null>(null);
  const weaveFailureTimeoutRef = useRef<number | null>(null);
  const starbirthTimeoutRef = useRef<number | null>(null);

  const calibration = useMemo(
    () => assessCalibration(sliders, storyConfig.calibration.target),
    [sliders],
  );
  const introBeats = useMemo(() => getIntroBeats(introProgress), [introProgress]);
  const totalGalaxySignals = storyConfig.galaxy.signals.length;
  const weaveOrder = useMemo(
    () => storyConfig.galaxy.signals.map((signal) => signal.id),
    [],
  );
  const delayedSignalId =
    storyConfig.galaxy.signals.find((signal) => signal.behavior === 'veil')?.id ?? null;
  const activeSignalIds = useMemo(
    () =>
      storyConfig.galaxy.signals
        .filter((signal) => signal.id !== delayedSignalId || delayedSignalReady)
        .map((signal) => signal.id),
    [delayedSignalId, delayedSignalReady],
  );
  const galaxySearchProgress = useMemo<GalaxySearchProgress>(
    () => ({
      stage: galaxyStage,
      foundSignalIds,
      revealedArtifactId,
      introState: galaxyIntroState,
      activeSignalIds,
      linkedSignalIds,
      weaveOrder,
      weaveFailureState,
      starbirthProgress,
      specialStarOpened,
      progress: totalGalaxySignals === 0 ? 0 : foundSignalIds.length / totalGalaxySignals,
      allFound: foundSignalIds.length >= totalGalaxySignals,
    }),
    [
      activeSignalIds,
      foundSignalIds,
      galaxyIntroState,
      galaxyStage,
      linkedSignalIds,
      revealedArtifactId,
      specialStarOpened,
      starbirthProgress,
      totalGalaxySignals,
      weaveFailureState,
      weaveOrder,
    ],
  );

  useEffect(
    () => () => {
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
      }

      if (galaxyIntroTimeoutRef.current !== null) {
        window.clearTimeout(galaxyIntroTimeoutRef.current);
      }

      if (delayedSignalTimeoutRef.current !== null) {
        window.clearTimeout(delayedSignalTimeoutRef.current);
      }

      if (weaveFailureTimeoutRef.current !== null) {
        window.clearTimeout(weaveFailureTimeoutRef.current);
      }

      if (starbirthTimeoutRef.current !== null) {
        window.clearTimeout(starbirthTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    let frameId = 0;
    const duration = 22000;
    const start = window.performance.now();

    const tick = (timestamp: number) => {
      const nextProgress = Math.min(1, (timestamp - start) / duration);
      setIntroProgress(nextProgress);

      if (nextProgress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (phase === 'galaxy') {
      setSingularityProgress(1);
      return;
    }

    if (phase !== 'singularity') {
      setSingularityProgress(0);
      return;
    }

    let frameId = 0;
    const duration = 6800;
    const start = window.performance.now();

    const tick = (timestamp: number) => {
      const nextProgress = Math.min(1, (timestamp - start) / duration);
      setSingularityProgress(nextProgress);

      if (nextProgress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'galaxy') {
      setGalaxyStage('search');
      setGalaxyIntroState('preface');
      setFoundSignalIds([]);
      setLinkedSignalIds([]);
      setRevealedArtifactId(null);
      setFeaturedSignalId(null);
      setDelayedSignalReady(false);
      setWeaveFailureState(idleWeaveFailureState);
      setStarbirthProgress(0);
      setSpecialStarOpened(false);

      if (galaxyIntroTimeoutRef.current !== null) {
        window.clearTimeout(galaxyIntroTimeoutRef.current);
        galaxyIntroTimeoutRef.current = null;
      }

      if (delayedSignalTimeoutRef.current !== null) {
        window.clearTimeout(delayedSignalTimeoutRef.current);
        delayedSignalTimeoutRef.current = null;
      }

      if (weaveFailureTimeoutRef.current !== null) {
        window.clearTimeout(weaveFailureTimeoutRef.current);
        weaveFailureTimeoutRef.current = null;
      }

      if (starbirthTimeoutRef.current !== null) {
        window.clearTimeout(starbirthTimeoutRef.current);
        starbirthTimeoutRef.current = null;
      }
      return;
    }

    if (
      galaxyStage === 'search' &&
      revealedArtifactId === null &&
      foundSignalIds.length >= totalGalaxySignals &&
      totalGalaxySignals > 0
    ) {
      setGalaxyStage('weave');
    }
  }, [
    foundSignalIds.length,
    galaxyIntroState,
    galaxyStage,
    phase,
    revealedArtifactId,
    totalGalaxySignals,
  ]);

  useEffect(() => {
    if (phase !== 'galaxy' || galaxyStage !== 'starbirth') {
      setStarbirthProgress(0);
      return;
    }

    let frameId = 0;
    const duration = 9200;
    const start = window.performance.now();

    const tick = (timestamp: number) => {
      const nextProgress = Math.min(1, (timestamp - start) / duration);
      setStarbirthProgress(nextProgress);

      if (nextProgress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [galaxyStage, phase]);

  useEffect(() => {
    if (phase !== 'galaxy' || galaxyStage !== 'starbirth') {
      if (starbirthTimeoutRef.current !== null) {
        window.clearTimeout(starbirthTimeoutRef.current);
        starbirthTimeoutRef.current = null;
      }
      return;
    }

    starbirthTimeoutRef.current = window.setTimeout(() => {
      setGalaxyStage('artifact');
      setSpecialStarOpened(false);
      starbirthTimeoutRef.current = null;
    }, 9200);

    return () => {
      if (starbirthTimeoutRef.current !== null) {
        window.clearTimeout(starbirthTimeoutRef.current);
        starbirthTimeoutRef.current = null;
      }
    };
  }, [galaxyStage, phase]);

  useEffect(() => {
    if (
      phase !== 'galaxy' ||
      galaxyStage !== 'search' ||
      galaxyIntroState !== 'active' ||
      delayedSignalReady ||
      delayedSignalId === null ||
      foundSignalIds.length < 2 ||
      revealedArtifactId !== null
    ) {
      if (delayedSignalTimeoutRef.current !== null) {
        window.clearTimeout(delayedSignalTimeoutRef.current);
        delayedSignalTimeoutRef.current = null;
      }
      return;
    }

    delayedSignalTimeoutRef.current = window.setTimeout(() => {
      setDelayedSignalReady(true);
      vibrateIfPossible([18, 60, 18]);
      delayedSignalTimeoutRef.current = null;
    }, 9800);

    return () => {
      if (delayedSignalTimeoutRef.current !== null) {
        window.clearTimeout(delayedSignalTimeoutRef.current);
        delayedSignalTimeoutRef.current = null;
      }
    };
  }, [
    delayedSignalId,
    delayedSignalReady,
    foundSignalIds.length,
    galaxyIntroState,
    galaxyStage,
    phase,
    revealedArtifactId,
  ]);

  const beginSingularity = useCallback(() => {
    if (transitionStartedRef.current) {
      return;
    }

    transitionStartedRef.current = true;
    vibrateIfPossible([30, 20, 70, 20, 120]);
    setPhase('singularity');

    transitionTimeoutRef.current = window.setTimeout(() => {
      setPhase('galaxy');
    }, 6800);
  }, []);

  const unlock = useCallback((rawValue: string): UnlockResult => {
    const value = rawValue.trim().toLowerCase();
    const matched = storyConfig.unlock.acceptedKeys.some(
      (key) => key.toLowerCase() === value,
    );

    if (matched) {
      vibrateIfPossible([16, 30, 40]);
      setPhase('calibration');
      return {
        ok: true,
        message: 'Ключ принят. Канал перестраивается.',
      };
    }

    setUnlockFailures((current) => current + 1);
    vibrateIfPossible([14, 30, 14]);

    return {
      ok: false,
      message:
        unlockFailures > 1
          ? 'Доступ отклонен. Это не цифра из головы.'
          : 'Ключ не распознан. Ищи то, что уже значит больше обычного числа.',
    };
  }, [unlockFailures]);

  const updateSlider = useCallback(
    (key: SliderKey, value: number) => {
      setSliders((current) => {
        const next = {
          ...current,
          [key]: value,
        };

        const nextCalibration = assessCalibration(
          next,
          storyConfig.calibration.target,
        );

        if (phase === 'calibration') {
          vibrateIfPossible(10);
        }

        if (nextCalibration.isAligned && phase === 'calibration') {
          beginSingularity();
        }

        return next;
      });
    },
    [beginSingularity, phase],
  );

  const enableOrientation = useCallback(async () => {
    const orientationEvent = window.DeviceOrientationEvent as
      | (typeof DeviceOrientationEvent & {
          requestPermission?: () => Promise<'granted' | 'denied'>;
        })
      | undefined;

    if (!orientationEvent) {
      return false;
    }

    if (typeof orientationEvent.requestPermission === 'function') {
      try {
        const result = await orientationEvent.requestPermission();
        const granted = result === 'granted';
        setOrientationEnabled(granted);
        return granted;
      } catch {
        setOrientationEnabled(false);
        return false;
      }
    }

    setOrientationEnabled(true);
    return true;
  }, []);

  const revealGalaxySignal = useCallback((signalId: string) => {
    if (phase !== 'galaxy' || galaxyStage !== 'search' || galaxyIntroState !== 'active') {
      return;
    }

    const signal = storyConfig.galaxy.signals.find((entry) => entry.id === signalId);
    if (!signal || !activeSignalIds.includes(signalId)) {
      return;
    }

    vibrateIfPossible([12, 28, 18]);
    setRevealedArtifactId(signal.artifactId);
    setFeaturedSignalId(signal.id);
    setFoundSignalIds((current) =>
      current.includes(signalId) ? current : [...current, signalId],
    );
  }, [activeSignalIds, galaxyIntroState, galaxyStage, phase]);

  const closeGalaxyReveal = useCallback(() => {
    setRevealedArtifactId(null);
  }, []);

  const connectGalaxySignal = useCallback((fromSignalId: string, signalId: string) => {
    if (phase !== 'galaxy' || galaxyStage !== 'weave' || weaveFailureState.active) {
      return false;
    }

    if (
      fromSignalId === signalId ||
      !weaveOrder.includes(fromSignalId) ||
      !weaveOrder.includes(signalId) ||
      linkedSignalIds.includes(signalId)
    ) {
      return false;
    }

    const expectedFromId =
      linkedSignalIds.length === 0
        ? weaveOrder[0] ?? null
        : linkedSignalIds[linkedSignalIds.length - 1] ?? null;
    const nextExpected =
      linkedSignalIds.length === 0
        ? weaveOrder[1] ?? null
        : weaveOrder[linkedSignalIds.length] ?? null;
    const connectionAccepted =
      fromSignalId === expectedFromId && signalId === nextExpected;

    if (!connectionAccepted) {
      if (weaveFailureTimeoutRef.current !== null) {
        window.clearTimeout(weaveFailureTimeoutRef.current);
        weaveFailureTimeoutRef.current = null;
      }

      const remainingSignals = weaveOrder.filter(
        (candidate) =>
          !linkedSignalIds.includes(candidate) &&
          candidate !== fromSignalId &&
          candidate !== signalId,
      );
      const extraDecoyId = remainingSignals[0] ?? null;
      const decoySignalIds = Array.from(
        new Set(
          [
            fromSignalId,
            signalId,
            expectedFromId,
            nextExpected,
            extraDecoyId,
          ].filter((value): value is string => Boolean(value)),
        ),
      );

      setLinkedSignalIds((current) => (current.length > 1 ? current.slice(0, -1) : current));
      setWeaveFailureState((current) => ({
        active: true,
        failureKey: current.failureKey + 1,
        attemptedFromId: fromSignalId,
        failedSignalId: signalId,
        expectedFromId,
        expectedSignalId: nextExpected,
        decoySignalIds,
      }));
      vibrateIfPossible([12, 22, 12, 22, 18]);

      weaveFailureTimeoutRef.current = window.setTimeout(() => {
        setWeaveFailureState((current) => ({
          ...current,
          active: false,
          attemptedFromId: null,
          failedSignalId: null,
          expectedFromId: null,
          expectedSignalId: null,
          decoySignalIds: [],
        }));
        weaveFailureTimeoutRef.current = null;
      }, 880);
      return false;
    }

    vibrateIfPossible([10, 18, 24]);
    setWeaveFailureState((current) =>
      current.active ? idleWeaveFailureState : current,
    );
    setLinkedSignalIds((current) => {
      if (current.includes(signalId)) {
        return current;
      }

      const next =
        current.length === 0
          ? [fromSignalId, signalId]
          : current[current.length - 1] === fromSignalId
            ? [...current, signalId]
            : current;
      if (next.length >= weaveOrder.length) {
        setGalaxyStage('starbirth');
      }
      return next;
    });

    return true;
  }, [galaxyStage, linkedSignalIds, phase, weaveFailureState.active, weaveOrder]);

  const openSpecialStarArtifact = useCallback(() => {
    if (phase !== 'galaxy' || galaxyStage !== 'artifact') {
      return;
    }

    vibrateIfPossible([20, 30, 30]);
    setSpecialStarOpened(true);
  }, [galaxyStage, phase]);

  const closeSpecialStarArtifact = useCallback(() => {
    setSpecialStarOpened(false);
  }, []);

  const beginGalaxySearch = useCallback(() => {
    if (phase !== 'galaxy' || galaxyStage !== 'search' || galaxyIntroState !== 'preface') {
      return;
    }

    setGalaxyIntroState('dissolving');
    vibrateIfPossible([10, 24, 12]);

    galaxyIntroTimeoutRef.current = window.setTimeout(() => {
      setGalaxyIntroState('active');
      galaxyIntroTimeoutRef.current = null;
    }, 5000);
  }, [galaxyIntroState, galaxyStage, phase]);

  return {
    phase,
    sliders,
    calibration,
    unlockFailures,
    orientationEnabled,
    introProgress,
    introBeats,
    introReady: introBeats.lockReadyBeat.progress >= 0.98,
    singularityProgress,
    galaxySearchProgress,
    unlock,
    updateSlider,
    enableOrientation,
    beginGalaxySearch,
    revealGalaxySignal,
    closeGalaxyReveal,
    featuredSignalId,
    connectGalaxySignal,
    openSpecialStarArtifact,
    closeSpecialStarArtifact,
  };
}
