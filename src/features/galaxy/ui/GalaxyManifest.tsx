import { storyConfig } from '../../../content/storyConfig';
import type { ArtifactDefinition } from '../../experience/model/types';

interface GalaxyManifestProps {
  artifacts?: ArtifactDefinition[];
}

export function GalaxyManifest({ artifacts = storyConfig.galaxy.artifacts }: GalaxyManifestProps) {
  return (
    <section className="galaxy-manifest gate-panel">
      <div className="galaxy-manifest__frame">
        <p className="eyebrow">LIVE CONSTELLATIONS</p>
        <h3>{storyConfig.galaxy.search.completionTitle}</h3>
        <p>{storyConfig.galaxy.search.completionText}</p>
        <p>{storyConfig.galaxy.message}</p>

        <div className="artifact-list">
          {artifacts.map((artifact) => (
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
