import type {
  ArtifactDefinition,
  CalibrationTarget,
  GalaxySignalDefinition,
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
    search: {
      eyebrow: 'SEARCH CONSTELLATION',
      title: 'Найди звезды, которые я оставил для тебя',
      description:
        'Галактика стабилизировалась не до конца. Внутри нее спрятаны три сигнала, которые откроют твои первые артефакты.',
      progressLabel: 'Найдено сигналов',
      continueLabel: 'Продолжить поиск',
      completionTitle: 'Созвездие собрано',
      completionText:
        'Ты нашла все мои сигналы. Теперь мир можно открыть полностью.',
    },
    weave: {
      eyebrow: 'CONSTELLATION RITUAL',
      title: 'Сигналы найдены. Теперь свяжи их в одну форму.',
      description:
        'Проведи три найденные звезды по правильному ритуалу, и галактика соберет из них одну особенную точку.',
      progressLabel: 'Связано импульсов',
    },
    specialStar: {
      eyebrow: 'DESTINY STAR',
      title: 'Я собрал это в одну звезду для тебя',
      description:
        'Это уже не просто сигнал, а главная точка этой галактики. Нажми на нее, чтобы открыть мое видео.',
      actionLabel: 'Открыть звезду',
      videoTitle: 'Твоя видеозапись будет здесь',
      videoDescription:
        'Этот слот уже готов под главное видео-послание. Когда ты его добавишь, оно станет сердцем всей карты.',
    },
    signals: [
      {
        id: 'truth-signal',
        artifactId: 'truth',
        title: 'Signal of Truth',
        hint: 'Теплая звезда пульсирует почти в центре спирали.',
        behavior: 'pulse',
        color: '#ffaf7b',
        position: [-3.8, 1.7, -8.2],
      },
      {
        id: 'whisper-signal',
        artifactId: 'whisper',
        title: 'Signal of Whisper',
        hint: 'Холодный огонек дрейфует чуть ниже и уходит вбок.',
        behavior: 'drift',
        color: '#8ac8ff',
        position: [2.9, -1.4, -8.8],
      },
      {
        id: 'nebula-signal',
        artifactId: 'nebula',
        title: 'Signal of Growing Nebula',
        hint: 'Этот сигнал маскируется и раскрывается только если задержаться рядом.',
        behavior: 'veil',
        color: '#d9b8ff',
        position: [1.2, 3.1, -8.5],
      },
    ] satisfies GalaxySignalDefinition[],
    artifacts: [
      {
        id: 'truth',
        title: 'Star of Truth',
        kind: 'video',
        status: 'locked',
        teaser: 'Финальное видео из Челябинска.',
        unlockTitle: 'Сигнал правды найден',
        unlockText:
          'Здесь ждет первая честная точка этого мира. Ты открыла ее раньше всех остальных.',
      },
      {
        id: 'whisper',
        title: 'Star of Whisper',
        kind: 'message',
        status: 'locked',
        teaser: 'Слово, которое превратится в созвездие.',
        unlockTitle: 'Шепот проявился',
        unlockText:
          'Этот сигнал звучит тише остальных. Он нужен не для шума, а для того самого близкого смысла.',
      },
      {
        id: 'nebula',
        title: 'Growing Nebula',
        kind: 'coming-soon',
        status: 'locked',
        teaser: 'Этот мир будет расширяться новыми звездами.',
        unlockTitle: 'Туманность приняла форму',
        unlockText:
          'Это обещание будущего слоя мира. Ты нашла точку, из которой он будет расти дальше.',
      },
    ] satisfies ArtifactDefinition[],
  },
} as const;
