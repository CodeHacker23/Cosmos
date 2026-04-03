import type {
  CalibrationAssessment,
  CalibrationTarget,
  SliderState,
} from './types';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function assessCalibration(
  sliders: SliderState,
  target: CalibrationTarget,
): CalibrationAssessment {
  const gravityDelta = Math.abs(sliders.gravity - target.gravity);
  const resonanceDelta = Math.abs(sliders.resonance - target.resonance);
  const syncDelta = Math.abs(sliders.sync - target.sync);
  const deltas = [gravityDelta, resonanceDelta, syncDelta];
  const averageDelta = deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length;
  const match = clamp01(1 - averageDelta / 60);
  const entropy = gravityDelta * 0.9 + resonanceDelta * 1.2 + syncDelta;
  const isAligned = deltas.every((delta) => delta <= target.tolerance);

  let narrative = 'Сигнал нащупан. Еще немного, и шум рассыплется.';

  if (isAligned) {
    narrative =
      'Контур стабилен. Челябинск и Луганск больше не спорят с расстоянием.';
  } else if (sliders.resonance > target.resonance + 18) {
    narrative = 'Слишком много логики, Даш. Добавь чувств.';
  } else if (sliders.gravity < target.gravity - 18) {
    narrative = 'Притяжение слабое. Позволь реальности потянуться к тебе.';
  } else if (sliders.gravity > target.gravity + 18) {
    narrative = 'Ты перегибаешь пространство. Ослабь притяжение совсем чуть-чуть.';
  } else if (sliders.sync < target.sync - 18) {
    narrative = 'Ритм теряется. Слушай не числа, а биение.';
  } else if (sliders.sync > target.sync + 18) {
    narrative = 'Сердце почти рядом, но импульс идет слишком резко.';
  } else if (sliders.resonance < target.resonance - 18) {
    narrative = 'Помехи еще шипят. Поймай тише и точнее.';
  }

  return {
    isAligned,
    match,
    entropy,
    narrative,
  };
}
