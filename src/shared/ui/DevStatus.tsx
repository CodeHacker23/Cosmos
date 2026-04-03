import { useMemo } from 'react';

interface DevStatusProps {
  phase: 'terminal' | 'calibration' | 'singularity' | 'galaxy';
}

export function DevStatus({ phase }: DevStatusProps) {
  const copy = useMemo(() => {
    switch (phase) {
      case 'terminal':
        return {
          label: 'Dev: Online',
          sublabel: 'Жду твой сигнал...',
        };
      case 'calibration':
        return {
          label: 'Dev: Online',
          sublabel: 'Думаю о тебе...',
        };
      case 'singularity':
        return {
          label: 'Dev: Online',
          sublabel: 'Кодю нашу встречу...',
        };
      case 'galaxy':
        return {
          label: 'Dev: Online',
          sublabel: 'Пишу для нас новые звезды...',
        };
    }
  }, [phase]);

  return (
    <div className="dev-status">
      <span className="dev-status__dot" />
      <div>
        <p>{copy.label}</p>
        <p>{copy.sublabel}</p>
      </div>
    </div>
  );
}
