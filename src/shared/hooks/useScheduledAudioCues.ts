import { useEffect, useMemo, useRef } from 'react';

interface ScheduledAudioCue {
  id: string;
  armed: boolean;
}

interface UseScheduledAudioCuesResult {
  firedCueIds: string[];
}

export function useScheduledAudioCues(
  cues: ScheduledAudioCue[],
): UseScheduledAudioCuesResult {
  const firedCueIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    cues.forEach((cue) => {
      if (!cue.armed || firedCueIdsRef.current.has(cue.id)) {
        return;
      }

      // Placeholder only: later this hook will dispatch real audio events.
      firedCueIdsRef.current.add(cue.id);
    });
  }, [cues]);

  return useMemo(
    () => ({
      firedCueIds: Array.from(firedCueIdsRef.current),
    }),
    [cues],
  );
}
