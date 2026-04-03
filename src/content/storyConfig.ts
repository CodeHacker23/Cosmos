import type {
  ArtifactDefinition,
  CalibrationTarget,
  SliderState,
} from '../features/experience/model/types';

export const storyConfig = {
  title: 'Singularity 626',
  subtitle: 'Chelyabinsk <> Luhansk',
  intro: {
    narrativeLines: [
      'В начале была пустота...',
      'И 1100 километров тишины между нами.',
    ],
    locateLines: ['CHELYABINSK...', 'LUHANSK...'],
    searchLines: [
      '* Searching for signal: LUHANSK... FOUND.',
      '* Searching for signal: CHELYABINSK... FOUND.',
      'Status: Distance is critical. Quantum lock required.',
    ],
  },
  unlock: {
    acceptedKeys: ['21', '626', '21.06', '21/06', '2106'],
    hint: 'Попробуй число, которое уже стало вашим шифром.',
    lines: [
      '[Connection Status]: Тысячи километров помех.',
      '[Status Check]: Честно? Я безумно соскучился.',
      '[Anomaly 626]: Твои глаза... баг в моей логике.',
      'To patch reality, enter the number that unites us...',
    ],
  },
  audio: {
    introCueIds: {
      voidPulse: 'intro.voidPulse',
      distanceWhisper: 'intro.distanceWhisper',
      starfieldRise: 'intro.starfieldRise',
      signalSearch: 'intro.signalSearch',
      quantumLock: 'intro.quantumLock',
    },
  },
  calibration: {
    initial: {
      gravity: 38,
      resonance: 54,
      sync: 31,
    } satisfies SliderState,
    target: {
      gravity: 62,
      resonance: 26,
      sync: 81,
      tolerance: 6,
    } satisfies CalibrationTarget,
    sliderCopy: {
      gravity: {
        label: 'Gravity',
        description: 'Сближает две точки пространства.',
      },
      resonance: {
        label: 'Resonance',
        description: 'Снимает шум и рваные помехи.',
      },
      sync: {
        label: 'Sync',
        description: 'Сводит сердечные импульсы в один ритм.',
      },
    },
  },
  galaxy: {
    message:
      'Расстояние обнулилось. Финальная галактика еще растет, но ее ядро уже дышит.',
    artifacts: [
      {
        id: 'truth',
        title: 'Star of Truth',
        kind: 'video',
        status: 'locked',
        teaser: 'Финальное видео из Челябинска.',
      },
      {
        id: 'whisper',
        title: 'Star of Whisper',
        kind: 'message',
        status: 'locked',
        teaser: 'Слово, которое превратится в созвездие.',
      },
      {
        id: 'nebula',
        title: 'Growing Nebula',
        kind: 'coming-soon',
        status: 'locked',
        teaser: 'Этот мир будет расширяться новыми звездами.',
      },
    ] satisfies ArtifactDefinition[],
  },
} as const;
