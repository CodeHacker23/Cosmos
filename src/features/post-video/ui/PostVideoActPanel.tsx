import { type MutableRefObject, useEffect, useRef, useState } from 'react';
import { storyConfig } from '../../../content/storyConfig';
import type { GalaxyPostVideoStage } from '../../experience/model/types';
import { getPostVideoTransitState } from '../../../scene/postVideoTransit';

interface PostVideoActPanelProps {
  stage: GalaxyPostVideoStage;
  phraseIndex: number;
  jumpProgressRef: MutableRefObject<number>;
  onClose: () => void;
  onStartJump: () => void;
}

const HOLD_DURATION_MS = 2650;

export function PostVideoActPanel({
  stage,
  phraseIndex,
  jumpProgressRef,
  onClose,
  onStartJump,
}: PostVideoActPanelProps) {
  const copy = storyConfig.galaxy.postVideo;
  const [holdProgress, setHoldProgress] = useState(0);
  const holdStartedAtRef = useRef<number | null>(null);
  const holdFrameRef = useRef<number | null>(null);
  const jumpTriggeredRef = useRef(false);
  const veilJumpRef = useRef<HTMLDivElement | null>(null);
  const quoteJumpRef = useRef<HTMLParagraphElement | null>(null);

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

  /** Прыжок: без setState на каждый кадр — только ref + rAF (меньше лагов вместе с Canvas). */
  useEffect(() => {
    if (stage !== 'jump') {
      return;
    }

    let frameId = 0;
    const lines = copy.jumpLines;

    const tick = () => {
      const p = jumpProgressRef.current;
      const transit = getPostVideoTransitState(p);

      if (veilJumpRef.current) {
        veilJumpRef.current.style.opacity = String(Math.max(0.12, 0.38 - p * 0.16));
      }

      const el = quoteJumpRef.current;
      if (!el) {
        frameId = window.requestAnimationFrame(tick);
        return;
      }

      if (transit.phraseVisibility < 0.04) {
        el.textContent = '';
        el.style.opacity = '0';
      } else {
        el.textContent = lines[transit.phraseIndex] ?? '';
        el.style.opacity = String(transit.phraseVisibility);
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [copy.jumpLines, jumpProgressRef, stage]);

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
        <div
          className="post-video-act__veil post-video-act__veil--jump"
          ref={veilJumpRef}
          style={{ opacity: 0.38 }}
        />
        <div className="post-video-act__jump-shell">
          <div className="post-video-act__quote post-video-act__quote--jump">
            <p ref={quoteJumpRef} />
          </div>
        </div>
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
