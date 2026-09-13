import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { NON_LINEAR_QUEST_CHAINS } from '@/data/questChains';
import { QuestPanel } from './QuestPanel';

afterEach(cleanup);

it('presents the pending branch as the current quest task and dispatches the selected choice', () => {
  useGameStore.getState().startNewGame(['Explorer'], false, {wealth:5000,happiness:100,education:45,career:75,adventure:0});
  const chain = NON_LINEAR_QUEST_CHAINS[0];
  const stepIndex = chain.steps.findIndex(step => step.choices?.length);
  const step = chain.steps[stepIndex];
  const choose = vi.fn();
  const player = {...useGameStore.getState().players[0], pendingNLChainChoice:{chainId:chain.id,stepIndex}};
  render(<QuestPanel player={player} week={1} quests={[]} onTakeQuest={vi.fn()} onCompleteQuest={vi.fn()}
    onAbandonQuest={vi.fn()} onTakeChainQuest={vi.fn()} onTakeBounty={vi.fn()}
    onTakeNonLinearChain={vi.fn()} onMakeNLChainChoice={choose} />);
  const choice = screen.getByRole('region',{name:'Choose Your Path'});
  expect(choice).toHaveTextContent(step.name);
  expect(screen.queryByText('AVAILABLE QUESTS')).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:/close|cancel/i})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:new RegExp(step.choices![0].label)}));
  expect(choose).toHaveBeenCalledWith(step.choices![0].id);
});
