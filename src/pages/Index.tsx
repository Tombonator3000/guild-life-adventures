import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { TitleScreen } from '@/components/screens/TitleScreen';
import { GameSetup } from '@/components/screens/GameSetup';
import { GameBoard } from '@/components/game/GameBoard';
import { VictoryScreen } from '@/components/screens/VictoryScreen';
import { useMusicController } from '@/hooks/useMusic';

const Index = () => {
  const { phase } = useGameStore();
  const currentPlayer = useCurrentPlayer();

  // Drive background music based on game phase and player location
  useMusicController(phase, currentPlayer?.currentLocation ?? null);

  switch (phase) {
    case 'title':
      return <TitleScreen />;
    case 'setup':
      return <GameSetup />;
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
