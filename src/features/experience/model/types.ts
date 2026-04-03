export type ExperiencePhase =
  | 'terminal'
  | 'calibration'
  | 'singularity'
  | 'galaxy';

export type GalaxyStage = 'search' | 'manifest';
export type GalaxySearchIntroState = 'preface' | 'dissolving' | 'active';

export type SliderKey = 'gravity' | 'resonance' | 'sync';

export type SliderState = Record<SliderKey, number>;

export type ArtifactUnlockState = 'locked' | 'revealed';
export type GalaxySignalBehavior = 'pulse' | 'drift' | 'veil';

export interface ScreenSpacePoint {
  x: number;
  y: number;
}

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
  unlockTitle: string;
  unlockText: string;
}

export interface GalaxySignalDefinition {
  id: string;
  artifactId: ArtifactDefinition['id'];
  title: string;
  hint: string;
  behavior: GalaxySignalBehavior;
  color: string;
  position: [number, number, number];
}

export interface GalaxySearchProgress {
  stage: GalaxyStage;
  foundSignalIds: string[];
  revealedArtifactId: string | null;
  introState: GalaxySearchIntroState;
  activeSignalIds: string[];
  progress: number;
  allFound: boolean;
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
