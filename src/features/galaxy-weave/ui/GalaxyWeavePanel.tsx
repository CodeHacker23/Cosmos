import { storyConfig } from '../../../content/storyConfig';

interface GalaxyWeavePanelProps {
  linkedCount: number;
  totalCount: number;
  stage: 'weave' | 'starbirth' | 'artifact';
}

export function GalaxyWeavePanel({
  linkedCount,
  totalCount,
  stage,
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
    return (
      <section className="galaxy-weave-panel gate-panel">
        <div className="galaxy-weave-panel__frame">
          <p className="eyebrow">{storyConfig.galaxy.specialStar.eyebrow}</p>
          <h3>{storyConfig.galaxy.specialStar.title}</h3>
          <p>Это уже не просто сигнал, а главная точка этой галактики. Нажми на нее</p>
          <div className="galaxy-weave-panel__progress">
            <span>Главная звезда</span>
            <strong>ONLINE</strong>
          </div>
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
