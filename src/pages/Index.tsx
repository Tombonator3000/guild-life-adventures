import { lazy, Suspense } from 'react';
import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { TitleScreen } from '@/components/screens/TitleScreen';
import { useMusicController } from '@/hooks/useMusic';
import { useAmbientController } from '@/hooks/useAmbient';
import { useNarrationController } from '@/hooks/useNarration';

// Lazy-load screens that aren't needed at startup.
// Only TitleScreen is eagerly loaded (initial phase = 'title').
// This prevents a module failure in GameBoard's 25+ sub-component tree
// from blocking the entire app from mounting.
const GameSetup = lazy(() => import('@/components/screens/GameSetup').then(m => ({ default: m.GameSetup })));
const GameBoard = lazy(() => import('@/components/game/GameBoard').then(m => ({ default: m.GameBoard })));
const VictoryScreen = lazy(() => import('@/components/screens/VictoryScreen').then(m => ({ default: m.VictoryScreen })));
const OnlineLobby = lazy(() => import('@/components/screens/OnlineLobby').then(m => ({ default: m.OnlineLobby })));

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

  // Drive background music based on game phase and player location
  useMusicController(phase, currentPlayer?.currentLocation ?? null, eventMessage);

  // Drive ambient environmental sounds based on player location
  useAmbientController(phase, currentPlayer?.currentLocation ?? null);

  // Drive voice narration (Web Speech API) for NPC greetings, events, weekends
  useNarrationController(phase, selectedLocation, eventMessage, weekendEvent);

  // TitleScreen is eagerly loaded — always renders immediately.
  // All other screens are lazy-loaded inside Suspense.
  if (phase === 'title') {
    return <TitleScreen />;
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

  return <Suspense fallback={<ScreenLoader />}>{screen}</Suspense>;
};

export default Index;
