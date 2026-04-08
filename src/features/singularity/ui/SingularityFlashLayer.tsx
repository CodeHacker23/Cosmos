interface SingularityFlashLayerProps {
  opacity: number;
}

export function SingularityFlashLayer({ opacity }: SingularityFlashLayerProps) {
  return (
    <div
      aria-hidden
      className="singularity-flash-layer"
      style={{
        opacity,
        pointerEvents: 'none',
        visibility: opacity <= 0.001 ? 'hidden' : 'visible',
      }}
    />
  );
}
