import { storyConfig } from '../../../content/storyConfig';

interface GalaxyWeavePanelProps {
  linkedCount: number;
  totalCount: number;
  stage: 'weave' | 'starbirth' | 'artifact';
  specialStarViewed?: boolean;
  onContinuePostVideo?: () => void;
}

export function GalaxyWeavePanel({
  linkedCount,
  totalCount,
  stage,
  specialStarViewed = false,
  onContinuePostVideo,
}: GalaxyWeavePanelProps) {
  const copy = storyConfig.galaxy.weave;

  if (stage === 'starbirth') {
    return (
      <section className="galaxy-weave-panel gate-panel">
        <div className="galaxy-weave-panel__frame">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h3>Созвездие схлопывается в одну звезду</h3>
          <p>
            Галактика уже приняла форму. Смотри в центр спирали: три сигнала сейчас
            собираются в одну главную точку.
          </p>
        </div>
      </section>
    );
  }

  if (stage === 'artifact') {
    const specialStarCopy = storyConfig.galaxy.specialStar;
    return (
      <section className="galaxy-weave-panel gate-panel">
        <div className="galaxy-weave-panel__frame">
          <p className="eyebrow">{specialStarCopy.eyebrow}</p>
          <h3>{specialStarViewed ? specialStarCopy.afterVideoTitle : specialStarCopy.title}</h3>
          <p>
            {specialStarViewed
              ? specialStarCopy.afterVideoDescription
              : 'Это уже не просто сигнал, а главная точка этой галактики. Нажми на нее...'}
          </p>
          <div className="galaxy-weave-panel__progress">
            <span>Главная звезда</span>
            <strong>ONLINE</strong>
          </div>
          {specialStarViewed && onContinuePostVideo && (
            <button className="ghost-button" onClick={onContinuePostVideo} type="button">
              {specialStarCopy.afterVideoActionLabel}
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="galaxy-weave-panel gate-panel">
      <div className="galaxy-weave-panel__frame">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h3>{copy.title}</h3>
        <p>{copy.description}</p>
        <div className="galaxy-weave-panel__progress">
          <span>{copy.progressLabel}</span>
          <strong>
            {linkedCount}/{totalCount}
          </strong>
        </div>
      </div>
    </section>
  );
}
