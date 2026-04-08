import type { ReactNode } from 'react';

/**
 * Semantic wrapper for the post–singularity interactive galaxy experience (CosmicScene in galaxy phase).
 * Keeps a stable mount target for future 4D-only layers without duplicating the canvas.
 */
export function InteractiveGalaxy4D({ children }: { children: ReactNode }) {
  return <div className="interactive-galaxy-4d">{children}</div>;
}
