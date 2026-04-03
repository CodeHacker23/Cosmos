export type ExperiencePhase =
  | 'terminal'
  | 'calibration'
  | 'singularity'
  | 'galaxy';

export type SliderKey = 'gravity' | 'resonance' | 'sync';

export type SliderState = Record<SliderKey, number>;

export interface CalibrationTarget {
  gravity: number;
  resonance: number;
  sync: number;
  tolerance: number;
}

export interface CalibrationAssessment {
  isAligned: boolean;
  match: number;
  entropy: number;
  narrative: string;
}

export interface ArtifactDefinition {
  id: string;
  title: string;
  kind: 'video' | 'message' | 'coming-soon';
  status: 'active' | 'locked';
  teaser: string;
}

export interface IntroBeat {
  progress: number;
  active: boolean;
  complete: boolean;
}

export interface IntroBeats {
  progress: number;
  voidBeat: IntroBeat;
  pulseBeat: IntroBeat;
  distanceBeat: IntroBeat;
  starRevealBeat: IntroBeat;
  nebulaRevealBeat: IntroBeat;
  anchorsRevealBeat: IntroBeat;
  signalSearchBeat: IntroBeat;
  terminalRevealBeat: IntroBeat;
  lockReadyBeat: IntroBeat;
}
