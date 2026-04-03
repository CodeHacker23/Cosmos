import { storyConfig } from '../content/storyConfig';
import { CalibrationPanel } from '../features/calibration/ui/CalibrationPanel';
import { useExperienceController } from '../features/experience/model/useExperienceController';
import { GalaxyManifest } from '../features/galaxy/ui/GalaxyManifest';
import { TerminalGate } from '../features/terminal/ui/TerminalGate';
import { SingularityOverlay } from '../features/transition/ui/SingularityOverlay';
import { CosmicScene } from '../scene/CosmicScene';
import { useScheduledAudioCues } from '../shared/hooks/useScheduledAudioCues';
import { DevStatus } from '../shared/ui/DevStatus';

export default function App() {
  const {
    phase,
    sliders,
    calibration,
    unlockFailures,
    orientationEnabled,
    introBeats,
    unlock,
    updateSlider,
    enableOrientation,
  } = useExperienceController();

  useScheduledAudioCues([
    {
      id: storyConfig.audio.introCueIds.voidPulse,
      armed: introBeats.pulseBeat.progress >= 0.08,
    },
    {
      id: storyConfig.audio.introCueIds.distanceWhisper,
      armed: introBeats.distanceBeat.progress >= 0.2,
    },
    {
      id: storyConfig.audio.introCueIds.starfieldRise,
      armed: introBeats.starRevealBeat.progress >= 0.2,
    },
    {
      id: storyConfig.audio.introCueIds.signalSearch,
      armed: introBeats.signalSearchBeat.progress >= 0.14,
    },
    {
      id: storyConfig.audio.introCueIds.quantumLock,
      armed: introBeats.lockReadyBeat.progress >= 0.15,
    },
  ]);

  const introVeilOpacity =
    introBeats.voidBeat.progress < 1
      ? 1
      : Math.max(0, 1 - introBeats.starRevealBeat.progress * 1.15);
  const headerVisible = phase !== 'terminal' || introBeats.terminalRevealBeat.progress >= 0.72;
  const overlayVisible =
    phase !== 'terminal' || introBeats.terminalRevealBeat.progress >= 0.42;
  const compactHeader = phase === 'calibration' || phase === 'singularity';

  return (
    <main className={`app-shell app-shell--${phase}`}>
      <div
        className="app-shell__intro-veil"
        style={{ opacity: introVeilOpacity }}
      />
      <div className="app-shell__noise" />
      <div className="app-shell__gradient" />
      <div className="app-shell__grid" />

      <header
        className={`app-header ${headerVisible ? 'is-visible' : 'is-hidden'} ${
          compactHeader ? 'app-header--compact' : ''
        }`}
      >
        <div className="app-header__brand">
          <p className="eyebrow">{storyConfig.subtitle}</p>
          <h1>{storyConfig.title}</h1>
        </div>
        <DevStatus phase={phase} />
      </header>

      <div className="scene-layer">
        <CosmicScene
          assessment={calibration}
          beats={introBeats}
          orientationEnabled={orientationEnabled}
          phase={phase}
          sliders={sliders}
        />
      </div>

      <SingularityOverlay phase={phase} revealed={overlayVisible} />

      {phase === 'terminal' && (
        <TerminalGate
          attempts={unlockFailures}
          beats={introBeats}
          hint={storyConfig.unlock.hint}
          introLines={storyConfig.intro.narrativeLines}
          lines={storyConfig.unlock.lines}
          locateLines={storyConfig.intro.locateLines}
          onUnlock={unlock}
        />
      )}

      {phase === 'calibration' && (
        <CalibrationPanel
          assessment={calibration}
          onChange={updateSlider}
          onEnableMotion={enableOrientation}
          orientationEnabled={orientationEnabled}
          sliders={sliders}
        />
      )}

      {phase === 'galaxy' && <GalaxyManifest />}
    </main>
  );
}
