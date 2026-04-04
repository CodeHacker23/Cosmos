import { storyConfig } from '../../../content/storyConfig';

interface SpecialStarArtifactPanelProps {
  onClose: () => void;
}

export function SpecialStarArtifactPanel({ onClose }: SpecialStarArtifactPanelProps) {
  const copy = storyConfig.galaxy.specialStar;

  return (
    <section className="special-star-panel gate-panel">
      <div className="special-star-panel__frame">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h3>{copy.videoTitle}</h3>
        <p>{copy.videoDescription}</p>

        <div className="special-star-panel__video-slot" aria-hidden="true">
          <span>VIDEO ORBIT SLOT</span>
        </div>

        <button className="ghost-button" onClick={onClose} type="button">
          Свернуть слой
        </button>
      </div>
    </section>
  );
}
