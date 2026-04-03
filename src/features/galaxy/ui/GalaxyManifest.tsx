import { storyConfig } from '../../../content/storyConfig';

export function GalaxyManifest() {
  return (
    <section className="galaxy-manifest gate-panel">
      <div className="galaxy-manifest__frame">
        <p className="eyebrow">LIVE CONSTELLATIONS</p>
        <h3>Следующие звезды уже размечены</h3>
        <p>{storyConfig.galaxy.message}</p>

        <div className="artifact-list">
          {storyConfig.galaxy.artifacts.map((artifact) => (
            <article className="artifact-card" key={artifact.id}>
              <span className="artifact-card__status">
                {artifact.status === 'locked' ? 'Locked' : 'Online'}
              </span>
              <h4>{artifact.title}</h4>
              <p>{artifact.teaser}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
