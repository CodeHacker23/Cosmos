import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { storyConfig } from '../../../content/storyConfig';
import { assessCalibration } from './calibration';
import type {
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

export function useExperienceController() {
  const [phase, setPhase] = useState<ExperiencePhase>('terminal');
  const [sliders, setSliders] = useState<SliderState>(storyConfig.calibration.initial);
  const [unlockFailures, setUnlockFailures] = useState(0);
  const [orientationEnabled, setOrientationEnabled] = useState(false);
  const [introProgress, setIntroProgress] = useState(0);
  const [singularityProgress, setSingularityProgress] = useState(0);
  const transitionStartedRef = useRef(false);
  const transitionTimeoutRef = useRef<number | null>(null);

  const calibration = useMemo(
    () => assessCalibration(sliders, storyConfig.calibration.target),
    [sliders],
  );
  const introBeats = useMemo(() => getIntroBeats(introProgress), [introProgress]);

  useEffect(
    () => () => {
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
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
    unlock,
    updateSlider,
    enableOrientation,
  };
}
