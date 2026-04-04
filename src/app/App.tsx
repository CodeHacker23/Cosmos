import { useState } from 'react';
import { storyConfig } from '../content/storyConfig';
import { CalibrationPanel } from '../features/calibration/ui/CalibrationPanel';
import { useExperienceController } from '../features/experience/model/useExperienceController';
import { SpecialStarArtifactPanel } from '../features/galaxy-artifact/ui/SpecialStarArtifactPanel';
import { GalaxySearchPanel } from '../features/galaxy-search/ui/GalaxySearchPanel';
import { GalaxyWeavePanel } from '../features/galaxy-weave/ui/GalaxyWeavePanel';
import { GalaxyManifest } from '../features/galaxy/ui/GalaxyManifest';
import { TerminalGate } from '../features/terminal/ui/TerminalGate';
import { SingularityOverlay } from '../features/transition/ui/SingularityOverlay';
import { CosmicScene } from '../scene/CosmicScene';
import { useScheduledAudioCues } from '../shared/hooks/useScheduledAudioCues';
import { DevStatus } from '../shared/ui/DevStatus';
import type { ScreenSpacePoint } from '../features/experience/model/types';

const flashBand = (value: number, start: number, peak: number, end: number) => {
  if (value <= start || value >= end) {
    return 0;
  }

  if (value <= peak) {
    return (value - start) / (peak - start);
  }

  return 1 - (value - peak) / (end - peak);
};

export default function App() {
  const [revealedSignalScreenPosition, setRevealedSignalScreenPosition] =
    useState<ScreenSpacePoint | null>(null);
  const {
    phase,
    sliders,
    calibration,
    unlockFailures,
    orientationEnabled,
    introBeats,
    singularityProgress,
    galaxySearchProgress,
    featuredSignalId,
    unlock,
    updateSlider,
    enableOrientation,
    beginGalaxySearch,
    revealGalaxySignal,
    closeGalaxyReveal,
    connectGalaxySignal,
    openSpecialStarArtifact,
    closeSpecialStarArtifact,
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
  const compactHeader =
    phase === 'calibration' ||
    phase === 'singularity' ||
    phase === 'galaxy';
  const explosionFlash =
    phase === 'singularity'
      ? flashBand(singularityProgress, 0.512, 0.528, 0.548)
      : 0;
  const manifestArtifacts = storyConfig.galaxy.artifacts.map((artifact) => ({
    ...artifact,
    status: 'active' as const,
  }));
  const ritualPanelStage =
    galaxySearchProgress.stage === 'weave' ||
    galaxySearchProgress.stage === 'starbirth' ||
    galaxySearchProgress.stage === 'artifact'
      ? galaxySearchProgress.stage
      : null;

  const handleRevealGalaxySignal = (signalId: string, screenPosition: ScreenSpacePoint) => {
    setRevealedSignalScreenPosition(screenPosition);
    revealGalaxySignal(signalId);
  };

  const handleCloseGalaxyReveal = () => {
    setRevealedSignalScreenPosition(null);
    closeGalaxyReveal();
  };

  return (
    <main className={`app-shell app-shell--${phase}`}>
      <div
        className="app-shell__intro-veil"
        style={{ opacity: introVeilOpacity }}
      />
      <div
        className="app-shell__flashbang"
        style={{ opacity: explosionFlash }}
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
          activeSignalIds={galaxySearchProgress.activeSignalIds}
          assessment={calibration}
          beats={introBeats}
          foundSignalIds={galaxySearchProgress.foundSignalIds}
          featuredSignalId={featuredSignalId}
          galaxyIntroState={galaxySearchProgress.introState}
          galaxySignals={storyConfig.galaxy.signals}
          galaxyStage={galaxySearchProgress.stage}
          linkedSignalIds={galaxySearchProgress.linkedSignalIds}
          onConnectGalaxySignal={connectGalaxySignal}
          onOpenSpecialStar={openSpecialStarArtifact}
          onRevealGalaxySignal={handleRevealGalaxySignal}
          orientationEnabled={orientationEnabled}
          phase={phase}
          specialStarOpened={galaxySearchProgress.specialStarOpened}
          starbirthProgress={galaxySearchProgress.starbirthProgress}
          singularityProgress={singularityProgress}
          sliders={sliders}
        />
      </div>

      {phase !== 'galaxy' && (
        <SingularityOverlay phase={phase} revealed={overlayVisible} />
      )}

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

      {phase === 'galaxy' && galaxySearchProgress.stage === 'search' && (
        <GalaxySearchPanel
          artifacts={storyConfig.galaxy.artifacts}
          onCloseReveal={handleCloseGalaxyReveal}
          onStartSearch={beginGalaxySearch}
          progress={galaxySearchProgress}
          revealTargetScreenPosition={revealedSignalScreenPosition}
        />
      )}

      {phase === 'galaxy' &&
        ritualPanelStage &&
        !galaxySearchProgress.specialStarOpened && (
          <GalaxyWeavePanel
            linkedCount={galaxySearchProgress.linkedSignalIds.length}
            stage={ritualPanelStage}
            totalCount={galaxySearchProgress.weaveOrder.length}
          />
        )}

      {phase === 'galaxy' && galaxySearchProgress.specialStarOpened && (
        <SpecialStarArtifactPanel onClose={closeSpecialStarArtifact} />
      )}

      {phase === 'galaxy' && galaxySearchProgress.stage === 'manifest' && (
        <GalaxyManifest artifacts={manifestArtifacts} />
      )}
    </main>
  );
}
