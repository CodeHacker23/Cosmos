import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { storyConfig } from '../../../content/storyConfig';

interface SingularityHyperjumpVideoProps {
  src: string;
  onEnded: () => void;
  onError?: () => void;
  onCanPlayThrough?: () => void;
}

export function SingularityHyperjumpVideo({
  src,
  onEnded,
  onError,
  onCanPlayThrough,
}: SingularityHyperjumpVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [activePhraseIndex, setActivePhraseIndex] = useState<number | null>(null);
  const phrases = storyConfig.singularityEvent.narrativePhrases;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const syncPhrase = () => {
      const t = video.currentTime;
      let next: number | null = null;
      for (let index = 0; index < phrases.length; index += 1) {
        const phrase = phrases[index];
        if (t >= phrase.startSec && t < phrase.startSec + phrase.durationSec) {
          next = index;
          break;
        }
      }
      setActivePhraseIndex(next);
    };

    syncPhrase();
    video.addEventListener('timeupdate', syncPhrase);
    return () => video.removeEventListener('timeupdate', syncPhrase);
  }, [phrases]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.currentTime = 0;
    const play = () => {
      void video.play().catch(() => {});
    };

    if (video.readyState >= 3) {
      play();
    } else {
      video.addEventListener('canplaythrough', play, { once: true });
    }

    return () => video.removeEventListener('canplaythrough', play);
  }, [src]);

  return (
    <div className="singularity-hyperjump">
      <video
        autoPlay
        className="singularity-hyperjump__video"
        muted
        onCanPlayThrough={onCanPlayThrough}
        onEnded={onEnded}
        onError={onError}
        playsInline
        preload="auto"
        ref={videoRef}
        src={src}
      />
      <div className="singularity-hyperjump__phrases" aria-live="polite">
        <AnimatePresence mode="wait">
          {activePhraseIndex !== null && (
            <motion.p
              animate={{ opacity: 1 }}
              className="singularity-hyperjump__phrase"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key={activePhraseIndex}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              {phrases[activePhraseIndex]?.text}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
