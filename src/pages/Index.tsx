import { useGameStore } from '@/store/gameStore';
import { TitleScreen } from '@/components/screens/TitleScreen';
import { GameSetup } from '@/components/screens/GameSetup';
import { GameBoard } from '@/components/game/GameBoard';

const Index = () => {
  const { phase } = useGameStore();

  switch (phase) {
    case 'title':
      return <TitleScreen />;
    case 'setup':
      return <GameSetup />;
    case 'playing':
      return <GameBoard />;
    case 'victory':
      return <TitleScreen />; // TODO: Victory screen
    default:
      return <TitleScreen />;
  }
};

export default Index;
