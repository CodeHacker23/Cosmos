import { storyConfig } from '../../../content/storyConfig';
import type {
  CalibrationAssessment,
  SliderKey,
  SliderState,
} from '../../experience/model/types';

interface CalibrationPanelProps {
  sliders: SliderState;
  assessment: CalibrationAssessment;
  onChange: (key: SliderKey, value: number) => void;
  onEnableMotion: () => Promise<boolean>;
  orientationEnabled: boolean;
}

const orderedKeys: SliderKey[] = ['gravity', 'resonance', 'sync'];

const getLockPercent = (value: number, target: number) =>
  Math.max(0, Math.min(100, Math.round(100 - (Math.abs(value - target) / 50) * 100)));

const getThermalHint = (value: number, target: number, tolerance: number) => {
  const delta = value - target;
  const distance = Math.abs(delta);

  if (distance <= tolerance) {
    return 'В резонансе';
  }

  if (distance <= tolerance + 4) {
    return delta < 0 ? 'Почти. Еще теплее' : 'Почти. Чуть назад';
  }

  if (distance <= tolerance + 12) {
    return delta < 0 ? 'Теплее' : 'Горячо';
  }

  return delta < 0 ? 'Холодно' : 'Перегрев';
};

export function CalibrationPanel({
  sliders,
  assessment,
  onChange,
  onEnableMotion,
  orientationEnabled,
}: CalibrationPanelProps) {
  return (
    <section className="calibration gate-panel">
      <div className="calibration__frame">
        <div className="calibration__header">
          <div>
            <p className="eyebrow">STAGE II</p>
            <h2>Калибровка связи</h2>
            <div className="calibration__intro-copy">
              <p className="eyebrow">CHELYABINSK TO LUHANSK</p>
              <p className="calibration__intro-title">Найди точную частоту</p>
              <p className="calibration__intro-text">
                Оранжевое ядро тянет, синее держит ритм. Шум исчезнет только на
                вашей общей настройке.
              </p>
            </div>
          </div>
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              void onEnableMotion();
            }}
          >
            {orientationEnabled ? 'Motion synced' : 'Enable tilt'}
          </button>
        </div>

        <div className="calibration__meters">
          <div>
            <span>Signal match</span>
            <strong>{Math.round(assessment.match * 100)}%</strong>
          </div>
          <div>
            <span>Entropy</span>
            <strong>{Math.round(assessment.entropy)}</strong>
          </div>
        </div>

        <div className="calibration__controls">
          {orderedKeys.map((key) => {
            const copy = storyConfig.calibration.sliderCopy[key];
            const target = storyConfig.calibration.target[key];
            const lockPercent = getLockPercent(sliders[key], target);
            const thermalHint = getThermalHint(
              sliders[key],
              target,
              storyConfig.calibration.target.tolerance,
            );
            return (
              <label className="slider-card" key={key}>
                <div className="slider-card__head">
                  <div>
                    <span>{copy.label}</span>
                    <small>{copy.description}</small>
                  </div>
                  <strong>{sliders[key]}%</strong>
                </div>
                <div className="slider-card__meta">
                  <span className="slider-card__hint">{thermalHint}</span>
                  <span className="slider-card__lock">{lockPercent}% lock</span>
                </div>
                <input
                  aria-label={copy.label}
                  className={`cosmic-slider cosmic-slider--${key}`}
                  max="100"
                  min="0"
                  step="1"
                  type="range"
                  value={sliders[key]}
                  onChange={(event) => onChange(key, Number(event.target.value))}
                />
              </label>
            );
          })}
        </div>

        <div className="calibration__footer">
          <p>{assessment.narrative}</p>
          <p>
            Найди не максимум, а точное равновесие. Здесь побеждают не цифры, а
            настройка.
          </p>
        </div>
      </div>
    </section>
  );
}
