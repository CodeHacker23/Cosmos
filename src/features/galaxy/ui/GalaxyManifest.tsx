import { storyConfig } from '../../../content/storyConfig';
import type { ArtifactDefinition } from '../../experience/model/types';

interface GalaxyManifestProps {
  artifacts?: ArtifactDefinition[];
}

export function GalaxyManifest({ artifacts = storyConfig.galaxy.artifacts }: GalaxyManifestProps) {
  const memoryCopy = storyConfig.galaxy.postVideo;

  return (
    <section className="galaxy-manifest gate-panel">
      <div className="galaxy-manifest__frame">
        <p className="eyebrow">{memoryCopy.memoryEyebrow}</p>
        <h3>{memoryCopy.memoryTitle}</h3>
        <p>{memoryCopy.memoryDescription}</p>
        <p>Вращай этот мир мышкой или пальцем и нажимай на пульсирующие звезды.</p>
        <p>{memoryCopy.resetDescription}</p>

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
