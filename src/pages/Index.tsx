import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { TitleScreen } from '@/components/screens/TitleScreen';
import { GameSetup } from '@/components/screens/GameSetup';
import { GameBoard } from '@/components/game/GameBoard';
import { VictoryScreen } from '@/components/screens/VictoryScreen';
import { OnlineLobby } from '@/components/screens/OnlineLobby';
import { useMusicController } from '@/hooks/useMusic';
import { useAmbientController } from '@/hooks/useAmbient';
import { useNarrationController } from '@/hooks/useNarration';

const Index = () => {
  const { phase, eventMessage, selectedLocation, weekendEvent } = useGameStore();
  const currentPlayer = useCurrentPlayer();

  // Drive background music based on game phase and player location
  useMusicController(phase, currentPlayer?.currentLocation ?? null, eventMessage);

  // Drive ambient environmental sounds based on player location
  useAmbientController(phase, currentPlayer?.currentLocation ?? null);

  // Drive voice narration (Web Speech API) for NPC greetings, events, weekends
  useNarrationController(phase, selectedLocation, eventMessage, weekendEvent);

  switch (phase) {
    case 'title':
      return <TitleScreen />;
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
};

export default Index;
