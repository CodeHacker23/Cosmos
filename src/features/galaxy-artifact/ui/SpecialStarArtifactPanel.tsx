import { useEffect } from 'react';
import { storyConfig } from '../../../content/storyConfig';

interface SpecialStarArtifactPanelProps {
  onClose: () => void;
}

export function SpecialStarArtifactPanel({ onClose }: SpecialStarArtifactPanelProps) {
  const copy = storyConfig.galaxy.specialStar;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <section
      aria-modal="true"
      className="special-star-overlay"
      role="dialog"
    >
      <div className="special-star-overlay__backdrop" onClick={onClose} />
      <div className="special-star-overlay__shell gate-panel">
        <div className="special-star-overlay__head">
          <div className="special-star-overlay__titleblock">
            <p className="eyebrow">{copy.eyebrow}</p>
            <h2>{copy.videoTitle}</h2>
            <p>{copy.videoDescription}</p>
          </div>
          <button className="ghost-button" onClick={onClose} type="button">
            {copy.closeLabel}
          </button>
        </div>

        <div className="special-star-overlay__video-slot" aria-hidden="true">
          <div className="special-star-overlay__video-core">
            <span>FULLSCREEN VIDEO ORBIT SLOT</span>
          </div>
        </div>

        <div className="special-star-overlay__bridge">
          <span className="eyebrow">{copy.bridgeEyebrow}</span>
          <h3>{copy.bridgeTitle}</h3>
          <p>{copy.bridgeDescription}</p>
        </div>
      </div>
    </section>
  );
}
