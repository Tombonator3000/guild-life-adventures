import { useGameStore } from '@/store/gameStore';
import { TitleScreen } from '@/components/screens/TitleScreen';
import { GameSetup } from '@/components/screens/GameSetup';
import { GameBoard } from '@/components/game/GameBoard';
import { VictoryScreen } from '@/components/screens/VictoryScreen';

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
      return <VictoryScreen />;
    default:
      return <TitleScreen />;
  }
};

export default Index;
