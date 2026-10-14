import { lazy, Suspense, Component, useCallback, useState, type ReactNode } from 'react';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { ScreenLoader } from '@/components/screens/ScreenLoader';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { useGameOptions } from '@/hooks/useGameOptions';
import { useIdlePrefetch } from '@/hooks/useIdlePrefetch';
import { hasAutoSave } from '@/data/saveLoad';
import { useSecurePageRejoin } from '@/network/useSecurePageRejoin';
import { TitleScreen } from '@/components/screens/TitleScreen';
import { StudioSplash } from '@/components/screens/StudioSplash';
import { shouldShowStudioSplash } from '@/components/screens/studioSplashPolicy';

// Lazy-load screens that aren't needed at startup.
// Only TitleScreen is eagerly loaded (initial phase = 'title').
// This prevents a module failure in GameBoard's 25+ sub-component tree
// from blocking the entire app from mounting.
// Uses lazyWithRetry to recover from chunk loading failures (stale cache after deploy).
const loadGameSetup = () => import('@/components/screens/GameSetup');
const loadGameBoard = () => import('@/components/game/GameBoard');
const GameSetup = lazyWithRetry(() => loadGameSetup().then(m => ({ default: m.GameSetup })));
const GameBoard = lazyWithRetry(() => loadGameBoard().then(m => ({ default: m.GameBoard })));
// Screens worth warming while the player is on the current one (see useIdlePrefetch).
const PREFETCH_FROM_TITLE = [loadGameSetup] as const;
const PREFETCH_FROM_TITLE_WITH_SAVE = [loadGameSetup, loadGameBoard] as const;
const PREFETCH_FROM_SETUP = [loadGameBoard] as const;
const VictoryScreen = lazyWithRetry(() => import('@/components/screens/VictoryScreen').then(m => ({ default: m.VictoryScreen })));
const OnlineLobby = lazyWithRetry(() => import('@/components/screens/OnlineLobby').then(m => ({ default: m.OnlineLobby })));

// Lazy-load audio controller — keeps audio singletons (audioManager, ambientManager,
// speechNarrator) off the critical path. If ANY audio module fails to load/construct,
// the game still starts silently instead of freezing on "Loading the realm...".
const AudioController = lazy(() => import('@/components/game/AudioController').then(m => ({ default: m.AudioController })));

/** Silently swallows errors from lazy-loaded audio — game works without sound. */
class SilentErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) {
    console.warn('[Guild Life] Audio subsystem failed to load — game will run without sound:', error);
  }
  render() { return this.state.failed ? null : this.props.children; }
}

/** If the studio splash ever fails, skip straight to the title screen. */
class SplashErrorBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  constructor(props: { children: ReactNode; onError: () => void }) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) {
    console.warn('[Guild Life] Studio splash failed, skipping it:', error);
    this.props.onError();
  }
  render() { return this.state.failed ? null : this.props.children; }
}

/** The studio splash plays once per page load, never again when returning to the title. */
let studioSplashSeen = false;


const Index = () => {
  const { phase, eventMessage, selectedLocation, weekendEvent } = useGameStore(useShallow(state => ({
    phase: state.phase,
    eventMessage: state.eventMessage,
    selectedLocation: state.selectedLocation,
    weekendEvent: state.weekendEvent,
  })));
  const currentPlayer = useCurrentPlayer();
  const { options } = useGameOptions();
  useSecurePageRejoin();
  // Only on a fresh start at the title screen, so a page-refresh rejoin is not held up
  const [splashActive, setSplashActive] = useState(() => !studioSplashSeen && phase === 'title' && shouldShowStudioSplash());
  const finishSplash = useCallback(() => {
    studioSplashSeen = true;
    setSplashActive(false);
  }, []);
  // Warm the next screen in idle time, but not during the splash animation.
  const resumable = phase === 'title' && !splashActive && hasAutoSave();
  const prefetchKey = splashActive ? null : phase === 'title' ? (resumable ? 'title-save' : 'title') : phase === 'setup' ? 'setup' : null;
  useIdlePrefetch(prefetchKey, prefetchKey === 'title-save' ? PREFETCH_FROM_TITLE_WITH_SAVE : prefetchKey === 'title' ? PREFETCH_FROM_TITLE : PREFETCH_FROM_SETUP);
  // While the splash plays, the audio controller stays unmounted so title music waits for the fanfare
  const splash = splashActive ? (
    <SplashErrorBoundary onError={finishSplash}>
      <StudioSplash onDone={finishSplash} />
    </SplashErrorBoundary>
  ) : null;

  // TitleScreen is eagerly loaded — always renders immediately.
  // All other screens are lazy-loaded inside Suspense.
  if (phase === 'title') {
    return (
      <div data-text-size={options.textSize}>
        <TitleScreen />
        {splash}
        {/* Audio controller lazy-loaded separately — if audio modules fail,
            the game still starts. SilentErrorBoundary swallows load errors. */}
        {!splashActive && (
          <SilentErrorBoundary>
            <Suspense fallback={null}>
              <AudioController
                phase={phase}
                playerLocation={null}
                selectedLocation={selectedLocation}
                eventMessage={eventMessage}
                weekendEvent={weekendEvent}
              />
            </Suspense>
          </SilentErrorBoundary>
        )}
      </div>
    );
  }

  const screen = (() => {
    switch (phase) {
      case 'setup':
        return <GameSetup />;
      case 'online-lobby':
        return <OnlineLobby />;
      case 'playing':
      case 'event':
        return <GameBoard />;
      case 'victory':
        return <VictoryScreen />;
      default:
        return <TitleScreen />;
    }
  })();

  return (
    <div data-text-size={options.textSize}>
      <Suspense fallback={<ScreenLoader />}>{screen}</Suspense>
      {splash}
      {!splashActive && (
        <SilentErrorBoundary>
          <Suspense fallback={null}>
            <AudioController
              phase={phase}
              playerLocation={currentPlayer?.currentLocation ?? null}
              selectedLocation={selectedLocation}
              eventMessage={eventMessage}
              weekendEvent={weekendEvent}
            />
          </Suspense>
        </SilentErrorBoundary>
      )}
    </div>
  );
};

export default Index;
