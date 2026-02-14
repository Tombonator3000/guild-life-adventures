import { lazy, Suspense, Component, type ReactNode } from 'react';
import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { TitleScreen } from '@/components/screens/TitleScreen';

/**
 * Retry wrapper for React.lazy() dynamic imports.
 * When a chunk fails to load (hash mismatch after deploy, network error, stale SW cache),
 * this retries the import once before giving up. On retry failure, it clears all caches
 * and reloads the page, which is the most reliable recovery for stale-cache scenarios.
 */
function lazyWithRetry<T extends { default: React.ComponentType<unknown> }>(
  factory: () => Promise<T>,
): React.LazyExoticComponent<T['default']> {
  return lazy(() =>
    factory().catch(() => {
      // First retry — chunk may have failed due to transient network error
      return factory().catch(async () => {
        // Second failure — likely stale cache. Clear everything and reload.
        console.error('[Guild Life] Chunk loading failed twice — clearing cache and reloading');
        try {
          // Await cache operations instead of fire-and-forget .then() chains
          if ('caches' in window) {
            const names = await caches.keys();
            await Promise.all(names.map(name => caches.delete(name)));
          }
          if (navigator.serviceWorker) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map(r => r.unregister()));
          }
        } catch {
          // Ignore — reload regardless
        }
        // Wait for cleanup to propagate before reloading
        await new Promise(r => setTimeout(r, 500));
        // Cache-busting reload: location.reload() may serve stale cached HTML
        // (GitHub Pages max-age=600). Adding ?_gv= forces fresh network fetch.
        try {
          const url = new URL(window.location.href);
          url.searchParams.set('_gv', String(Date.now()));
          window.location.replace(url.toString());
        } catch {
          window.location.reload();
        }
        // Return a never-resolving promise to prevent React error while reloading
        return new Promise<T>(() => {});
      });
    })
  );
}

// Lazy-load screens that aren't needed at startup.
// Only TitleScreen is eagerly loaded (initial phase = 'title').
// This prevents a module failure in GameBoard's 25+ sub-component tree
// from blocking the entire app from mounting.
// Uses lazyWithRetry to recover from chunk loading failures (stale cache after deploy).
const GameSetup = lazyWithRetry(() => import('@/components/screens/GameSetup').then(m => ({ default: m.GameSetup })));
const GameBoard = lazyWithRetry(() => import('@/components/game/GameBoard').then(m => ({ default: m.GameBoard })));
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
