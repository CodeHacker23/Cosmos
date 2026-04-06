import { useEffect, useMemo, useRef, useState } from 'react';
import { storyConfig } from '../../../content/storyConfig';
import type { GalaxyPostVideoStage } from '../../experience/model/types';

interface PostVideoActPanelProps {
  stage: GalaxyPostVideoStage;
  phraseIndex: number;
  jumpProgress: number;
  onClose: () => void;
  onStartJump: () => void;
}

const HOLD_DURATION_MS = 1850;

export function PostVideoActPanel({
  stage,
  phraseIndex,
  jumpProgress,
  onClose,
  onStartJump,
}: PostVideoActPanelProps) {
  const copy = storyConfig.galaxy.postVideo;
  const [holdProgress, setHoldProgress] = useState(0);
  const holdStartedAtRef = useRef<number | null>(null);
  const holdFrameRef = useRef<number | null>(null);
  const jumpTriggeredRef = useRef(false);

  useEffect(
    () => () => {
      if (holdFrameRef.current !== null) {
        window.cancelAnimationFrame(holdFrameRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    setHoldProgress(0);
    jumpTriggeredRef.current = false;
  }, [stage]);

  const activeJumpLine = useMemo(() => {
    if (stage !== 'jump') {
      return null;
    }

    const lines = copy.jumpLines;
    if (jumpProgress < 0.18) {
      return null;
    }
    if (jumpProgress < 0.42) {
      return lines[0];
    }
    if (jumpProgress < 0.68) {
      return lines[1];
    }
    if (jumpProgress < 0.94) {
      return lines[2];
    }
    return null;
  }, [copy.jumpLines, jumpProgress, stage]);

  const startHold = () => {
    if (stage !== 'preface') {
      return;
    }

    holdStartedAtRef.current = window.performance.now();

    const tick = (timestamp: number) => {
      if (holdStartedAtRef.current === null) {
        return;
      }

      const next = Math.min(1, (timestamp - holdStartedAtRef.current) / HOLD_DURATION_MS);
      setHoldProgress(next);

      if (next >= 1) {
        holdStartedAtRef.current = null;
        if (!jumpTriggeredRef.current) {
          jumpTriggeredRef.current = true;
          onStartJump();
        }
        return;
      }

      holdFrameRef.current = window.requestAnimationFrame(tick);
    };

    holdFrameRef.current = window.requestAnimationFrame(tick);
  };

  const endHold = () => {
    holdStartedAtRef.current = null;
    if (holdFrameRef.current !== null) {
      window.cancelAnimationFrame(holdFrameRef.current);
      holdFrameRef.current = null;
    }
    if (!jumpTriggeredRef.current) {
      setHoldProgress(0);
    }
  };

  if (stage === 'jump') {
    return (
      <section className="post-video-act post-video-act--jump" aria-live="polite">
        <div className="post-video-act__veil" />
        <div className="post-video-act__warp">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>

        {activeJumpLine && (
          <div className="post-video-act__quote post-video-act__quote--jump gate-panel">
            <p>{activeJumpLine}</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="post-video-act post-video-act--preface" aria-live="polite">
      <div className="post-video-act__veil" />
      <div className="post-video-act__preface gate-panel">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2>{copy.title}</h2>

        <div className="post-video-act__lines">
          {copy.prefaceLines.map((line, index) => (
            <p
              className={index === phraseIndex ? 'is-active' : index < phraseIndex ? 'is-seen' : ''}
              key={line}
            >
              {index <= phraseIndex ? line : '...'}
            </p>
          ))}
        </div>

        <div className="post-video-act__hold">
          <button
            className="post-video-act__hold-button"
            onMouseDown={startHold}
            onMouseUp={endHold}
            onMouseLeave={endHold}
            onTouchEnd={endHold}
            onTouchStart={startHold}
            type="button"
          >
            <span>{copy.jumpButtonLabel}</span>
            <strong>{Math.round(holdProgress * 100)}%</strong>
          </button>
          <div className="post-video-act__hold-track" aria-hidden="true">
            <span style={{ width: `${holdProgress * 100}%` }} />
          </div>
          <p>{copy.jumpHoldLabel}</p>
        </div>

        <button className="ghost-button" onClick={onClose} type="button">
          Вернуться к видео
        </button>
      </div>
    </section>
  );
}
