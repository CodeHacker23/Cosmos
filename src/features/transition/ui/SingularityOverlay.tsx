interface SingularityOverlayProps {
  phase: 'terminal' | 'calibration' | 'singularity' | 'galaxy';
  revealed?: boolean;
}

export function SingularityOverlay({
  phase,
  revealed = true,
}: SingularityOverlayProps) {
  if (phase === 'terminal') {
    return (
      <div className={`phase-copy phase-copy--top ${revealed ? 'is-visible' : 'is-hidden'}`}>
        <p className="eyebrow">ANOMALY 626</p>
        <h2>Вход в кроличью нору</h2>
        <p>
          Письмо уже запустило портал. Теперь расстояние придется взломать внутри
          экрана.
        </p>
      </div>
    );
  }

  if (phase === 'calibration') {
    return null;
  }

  if (phase === 'singularity') {
    return (
      <div className="singularity-overlay">
        <div className="singularity-overlay__scanline" />
        <p className="eyebrow">DISTANCE RESET</p>
        <h2>Сингулярность рождается</h2>
        <p>
          Пространство уже не спорит. Осталось пережить вспышку и не потерять
          сердце в белом шуме.
        </p>
      </div>
    );
  }

  return (
    <div className="phase-copy phase-copy--bottom">
      <p className="eyebrow">GALAXY CORE ONLINE</p>
      <h2>Ядро мира уже открыто</h2>
      <p>
        Это не финал, а живая точка сборки. Здесь позже загорятся ваши артефакты
        и новые звезды.
      </p>
    </div>
  );
}
