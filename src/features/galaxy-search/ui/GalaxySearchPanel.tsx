import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { storyConfig } from '../../../content/storyConfig';
import type {
  ArtifactDefinition,
  GalaxySearchProgress,
  ScreenSpacePoint,
} from '../../experience/model/types';
import { DissolveParticleOverlay } from './DissolveParticleOverlay';

const introStarSeeds = Array.from({ length: 84 }, (_, index) => ({
  left: `${6 + (index * 17) % 88}%`,
  top: `${8 + (index * 23) % 80}%`,
  delay: `${(index * 65) % 760}ms`,
  dx: `${(index % 2 === 0 ? 1 : -1) * (44 + (index % 7) * 18)}px`,
  dy: `${-24 - (index % 9) * 12}px`,
  scale: `${Math.max(0.06, 0.72 - (index % 5) * 0.1)}`,
}));

interface GalaxySearchPanelProps {
  artifacts: ArtifactDefinition[];
  progress: GalaxySearchProgress;
  onCloseReveal: () => void;
  onStartSearch: () => void;
  revealTargetScreenPosition: ScreenSpacePoint | null;
}

export function GalaxySearchPanel({
  artifacts,
  progress,
  onCloseReveal,
  onStartSearch,
  revealTargetScreenPosition,
}: GalaxySearchPanelProps) {
  const dissolveTimeoutRef = useRef<number | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const searchCopy = storyConfig.galaxy.search;
  const whisperArtifact =
    artifacts.find((artifact) => artifact.id === 'whisper') ?? artifacts[0] ?? null;
  const revealedArtifact = progress.revealedArtifactId
    ? artifacts.find((artifact) => artifact.id === progress.revealedArtifactId) ?? null
    : null;
  const [revealPhase, setRevealPhase] = useState<'hidden' | 'visible' | 'dissolving'>('hidden');
  const introVisible = progress.introState !== 'active';
  const revealVisible = !introVisible && Boolean(revealedArtifact);

  useEffect(
    () => () => {
      if (dissolveTimeoutRef.current !== null) {
        window.clearTimeout(dissolveTimeoutRef.current);
      }

      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!revealedArtifact) {
      if (dissolveTimeoutRef.current !== null) {
        window.clearTimeout(dissolveTimeoutRef.current);
        dissolveTimeoutRef.current = null;
      }

      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }

      setRevealPhase('hidden');
      return;
    }

    setRevealPhase('visible');

    dissolveTimeoutRef.current = window.setTimeout(() => {
      setRevealPhase('dissolving');
      dissolveTimeoutRef.current = null;
    }, 4900);

    closeTimeoutRef.current = window.setTimeout(() => {
      onCloseReveal();
      closeTimeoutRef.current = null;
    }, 6500);

    return () => {
      if (dissolveTimeoutRef.current !== null) {
        window.clearTimeout(dissolveTimeoutRef.current);
        dissolveTimeoutRef.current = null;
      }

      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, [onCloseReveal, revealedArtifact]);

  const handleRevealClose = () => {
    if (!revealedArtifact || revealPhase === 'dissolving') {
      return;
    }

    if (dissolveTimeoutRef.current !== null) {
      window.clearTimeout(dissolveTimeoutRef.current);
      dissolveTimeoutRef.current = null;
    }

    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
    }

    setRevealPhase('dissolving');
    closeTimeoutRef.current = window.setTimeout(() => {
      onCloseReveal();
      closeTimeoutRef.current = null;
    }, 1600);
  };

  return (
    <section className="galaxy-search-layout">
      {introVisible ? (
        <div
          className={`galaxy-search__intro gate-panel ${
            progress.introState === 'dissolving' ? 'is-dissolving' : ''
          }`}
        >
          <div className="galaxy-search__intro-stars" aria-hidden="true">
            {introStarSeeds.map((seed, index) => (
              <span
                className="galaxy-search__intro-star"
                key={`${seed.left}-${seed.top}`}
                style={
                  {
                    '--star-left': seed.left,
                    '--star-top': seed.top,
                    '--star-delay': seed.delay,
                    '--star-size': `${1.6 + (index % 4) * 0.8}px`,
                    '--star-dx': seed.dx,
                    '--star-dy': seed.dy,
                    '--star-scale': seed.scale,
                  } as CSSProperties
                }
              />
            ))}
          </div>
          <DissolveParticleOverlay
            active={progress.introState === 'dissolving'}
            bleedPx={220}
            durationMs={5000}
            particleCount={760}
            targetBias={{ x: 1.48, y: -0.12 }}
          />
          {whisperArtifact && (
            <div className="galaxy-search__intro-frame">
              <p className="eyebrow">{storyConfig.subtitle}</p>
              <h3>{storyConfig.title}</h3>
              <div className="galaxy-search__core-copy">
                <span className="eyebrow">GALAXY CORE ONLINE</span>
                <h4>Ядро мира уже открыто</h4>
                <p>
                  Это не финал, а живая точка сборки. Здесь позже загорятся наши
                  артефакты и новые звезды.
                </p>
              </div>
              <span className="galaxy-search__reveal-tag">Signal Captured</span>
              <h4>{whisperArtifact.unlockTitle}</h4>
              <p>{whisperArtifact.unlockText}</p>
              <button
                className="ghost-button"
                disabled={progress.introState === 'dissolving'}
                onClick={onStartSearch}
                type="button"
              >
                {searchCopy.continueLabel}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="galaxy-search gate-panel">
          <div className="galaxy-search__frame">
            <div className="galaxy-search__header">
              <p className="eyebrow">{storyConfig.subtitle}</p>
              <h3>{storyConfig.title}</h3>
              <div className="galaxy-search__core-copy">
                <span className="eyebrow">GALAXY CORE ONLINE</span>
                <h4>Ядро мира уже открыто</h4>
                <p>
                  Это не финал, а живая точка сборки. Здесь позже загорятся ваши
                  артефакты и новые звезды.
                </p>
              </div>
              <div className="galaxy-search__search-copy">
                <span className="eyebrow">{searchCopy.eyebrow}</span>
                <h4>{searchCopy.title}</h4>
                <p>{searchCopy.description}</p>
              </div>
            </div>

            <div className="galaxy-search__progress">
              <span>{searchCopy.progressLabel}</span>
              <strong>
                {progress.foundSignalIds.length}/3
              </strong>
            </div>

          </div>
        </div>
      )}

      {revealVisible && (
        <div
          className={`galaxy-search__reveal-panel gate-panel ${
            revealPhase === 'dissolving' ? 'is-dissolving' : 'is-visible'
          }`}
        >
          <div className="galaxy-search__reveal-stars" aria-hidden="true">
            {introStarSeeds.map((seed, index) => (
              <span
                className="galaxy-search__reveal-star"
                key={`reveal-${seed.left}-${seed.top}`}
                style={
                  {
                    '--star-left': seed.left,
                    '--star-top': seed.top,
                    '--star-delay': `${60 + index * 45}ms`,
                    '--star-size': `${1.8 + (index % 4) * 0.95}px`,
                    '--star-dx': seed.dx,
                    '--star-dy': seed.dy,
                    '--star-scale': `${Math.max(0.04, Number(seed.scale) - 0.08)}`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
          <DissolveParticleOverlay
            active={revealPhase === 'dissolving'}
            bleedPx={180}
            durationMs={1600}
            particleCount={560}
            targetBias={{ x: -1.12, y: -0.42 }}
            targetScreenPosition={revealTargetScreenPosition}
          />
          <div className="galaxy-search__reveal">
            <span className="galaxy-search__reveal-tag">Signal Captured</span>
            <h4>{revealedArtifact!.unlockTitle}</h4>
            <p>{revealedArtifact!.unlockText}</p>
            <button className="ghost-button" onClick={handleRevealClose} type="button">
              {searchCopy.continueLabel}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
