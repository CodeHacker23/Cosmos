import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { IntroBeats } from '../../experience/model/types';

interface UnlockResult {
  ok: boolean;
  message: string;
}

interface TerminalGateProps {
  introLines: readonly string[];
  locateLines: readonly string[];
  lines: readonly string[];
  hint: string;
  attempts: number;
  beats: IntroBeats;
  onUnlock: (value: string) => UnlockResult;
}

export function TerminalGate({
  introLines,
  locateLines,
  lines,
  hint,
  attempts,
  beats,
  onUnlock,
}: TerminalGateProps) {
  const lockText = useMemo(() => lines.join('\n'), [lines]);
  const [value, setValue] = useState('');
  const [feedback, setFeedback] = useState('Awaiting shared key...');
  const [failed, setFailed] = useState(false);
  const [visibleLockLength, setVisibleLockLength] = useState(0);

  const getTypingDelay = (nextChar: string) => {
    if (nextChar === '\n') {
      return 420;
    }

    if (['.', '!', '?', ':'].includes(nextChar)) {
      return 240;
    }

    if ([',', ';'].includes(nextChar)) {
      return 165;
    }

    if (nextChar === ' ') {
      return 62;
    }

    if (/[A-ZА-Я\[]/.test(nextChar)) {
      return 88 + Math.floor(Math.random() * 74);
    }

    return 68 + Math.floor(Math.random() * 58);
  };

  useEffect(() => {
    if (beats.lockReadyBeat.progress <= 0.04) {
      return;
    }

    if (visibleLockLength >= lockText.length) {
      return;
    }

    const nextChar = lockText[visibleLockLength];
    const timeout = window.setTimeout(() => {
      setVisibleLockLength((current) => current + 1);
    }, getTypingDelay(nextChar));

    return () => window.clearTimeout(timeout);
  }, [beats.lockReadyBeat.progress, lockText, visibleLockLength]);

  useEffect(() => {
    if (!failed) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setFailed(false);
    }, 420);

    return () => window.clearTimeout(timeout);
  }, [failed]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = onUnlock(value);
    setFeedback(result.message);

    if (!result.ok) {
      setFailed(true);
      return;
    }

    setValue('');
  };

  const narrativeVisible = beats.signalSearchBeat.progress < 0.05;
  const locateVisible = beats.signalSearchBeat.progress > 0.08;
  const shellVisible = beats.terminalRevealBeat.progress > 0.18;
  const readyForInput =
    beats.lockReadyBeat.progress >= 0.98 && visibleLockLength >= lockText.length;
  const narrativePrimary = introLines[0] ?? '';
  const narrativeSecondary = introLines[1] ?? '';
  const lockTextVisible = lockText.slice(0, visibleLockLength);
  const typingCursorVisible = !readyForInput && beats.lockReadyBeat.progress > 0.04;

  return (
    <section className="terminal-stage">
      <div
        className={`terminal__prelude ${narrativeVisible ? 'is-visible' : 'is-hidden'}`}
      >
        <p
          className={`terminal__prelude-line ${
            beats.pulseBeat.progress > 0.16 ? 'is-visible' : 'is-hidden'
          }`}
        >
          {narrativePrimary}
        </p>
        <p
          className={`terminal__prelude-line terminal__prelude-line--secondary ${
            beats.distanceBeat.progress > 0.12 ? 'is-visible' : 'is-hidden'
          }`}
        >
          {narrativeSecondary}
        </p>
      </div>

      <div className={`terminal__signal ${locateVisible ? 'is-visible' : 'is-hidden'}`}>
        {locateLines.map((line, index) => (
          <p
            className={`terminal__signal-line ${
              beats.signalSearchBeat.progress > 0.2 + index * 0.18
                ? 'is-visible'
                : 'is-hidden'
            }`}
            key={line}
          >
            {line}
          </p>
        ))}
      </div>

      <div
        className={`terminal gate-panel terminal--shell ${
          shellVisible ? 'is-visible' : 'is-hidden'
        }`}
      >
        <div className="terminal__frame">
          <p className="eyebrow">ENTRY PROTOCOL</p>
          <h1 className="terminal__title">Quantum Lock</h1>
          <pre className="terminal__log terminal__log--lock">
            {lockTextVisible}
            {typingCursorVisible ? (
              <span aria-hidden="true" className="terminal__log-caret">
                _
              </span>
            ) : null}
          </pre>
          <form
            className={`terminal__form ${failed ? 'is-failed' : ''}`}
            onSubmit={handleSubmit}
          >
            <label className="terminal__label" htmlFor="shared-key">
              Shared key
            </label>
            <div className="terminal__input-row">
              <span className="terminal__prompt">[{`heart://`}]</span>
              <input
                id="shared-key"
                autoFocus
                autoComplete="off"
                className="terminal__input"
                disabled={!readyForInput}
                inputMode="numeric"
                maxLength={12}
                placeholder={readyForInput ? '21' : 'Awaiting my next keystroke...'}
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
              <span aria-hidden="true" className="terminal__cursor-heart">
                ❤
              </span>
            </div>
          </form>
          <div className="terminal__footer">
            <p>{feedback}</p>
            <p>
              {readyForInput
                ? attempts > 0
                  ? hint
                  : 'Расстояние любит тех, кто угадывает сердцем.'
                : 'Я еще допечатываю тебе самое важное...'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
