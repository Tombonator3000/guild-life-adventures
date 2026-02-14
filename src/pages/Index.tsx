import { lazy, Suspense, Component, type ReactNode } from 'react';
import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { TitleScreen } from '@/components/screens/TitleScreen';

// Lazy-load screens that aren't needed at startup.
// Only TitleScreen is eagerly loaded (initial phase = 'title').
// This prevents a module failure in GameBoard's 25+ sub-component tree
// from blocking the entire app from mounting.
const GameSetup = lazy(() => import('@/components/screens/GameSetup').then(m => ({ default: m.GameSetup })));
const GameBoard = lazy(() => import('@/components/game/GameBoard').then(m => ({ default: m.GameBoard })));
const VictoryScreen = lazy(() => import('@/components/screens/VictoryScreen').then(m => ({ default: m.VictoryScreen })));
const OnlineLobby = lazy(() => import('@/components/screens/OnlineLobby').then(m => ({ default: m.OnlineLobby })));

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

/** Minimal loading fallback shown while a lazy screen chunk loads. */
function ScreenLoader() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#1f170a',
      color: '#e8dcc8',
      fontFamily: 'serif',
    }}>
      <p style={{ opacity: 0.7 }}>Loading...</p>
    </div>
  );
}

const Index = () => {
  const { phase, eventMessage, selectedLocation, weekendEvent } = useGameStore();
  const currentPlayer = useCurrentPlayer();

  // TitleScreen is eagerly loaded — always renders immediately.
  // All other screens are lazy-loaded inside Suspense.
  if (phase === 'title') {
    return (
      <>
        <TitleScreen />
        {/* Audio controller lazy-loaded separately — if audio modules fail,
            the game still starts. SilentErrorBoundary swallows load errors. */}
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
      </>
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
    <>
      <Suspense fallback={<ScreenLoader />}>{screen}</Suspense>
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
    </>
  );
};

export default Index;
