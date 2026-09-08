import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { BankPanel, type BankView } from './BankPanel';
function Bank({ section = 'banking' }: { section?: BankView }) {
  const state = useGameStore();
  return <BankPanel player={state.players[0]} stockPrices={state.stockPrices} section={section} />;
}
beforeEach(() => {
  useGameStore.setState({ networkMode: 'local' });
  useGameStore.getState().startNewGame(['Banker'], false, { wealth: 5000, happiness: 100, education: 45, career: 75, adventure: 0 });
  useGameStore.setState(s => ({ players: s.players.map(p => ({ ...p, currentLocation: 'bank', gold: 500 })) }));
});
afterEach(cleanup);
it('transfers on the opening service without spending time or creating wealth', () => {
  render(<Bank />);
  const before = useGameStore.getState().players[0];
  fireEvent.click(screen.getByRole('button', { name: 'Deposit 50 Gold' }));
  const deposited = useGameStore.getState().players[0];
  expect([deposited.gold, deposited.savings, deposited.timeRemaining]).toEqual([450, 50, before.timeRemaining]);
  fireEvent.click(screen.getByRole('button', { name: 'Withdraw 50 Gold' }));
  expect(useGameStore.getState().players[0].gold).toBe(500);
});
it('rejects invalid inputs and updates the preview after a balance change', () => {
  render(<Bank />);
  fireEvent.change(screen.getByLabelText('Transfer amount'), { target: { value: '-1' } });
  expect(screen.getByRole('button', { name: /Deposit/ })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Transfer amount'), { target: { value: '600' } });
  expect(screen.getByRole('button', { name: /Deposit/ })).toBeDisabled();
  act(() => useGameStore.setState(s => ({ players: s.players.map(p => ({ ...p, gold: 700 })) })));
  expect(screen.getByRole('button', { name: /Deposit/ })).toBeEnabled();
  expect(screen.getByRole('status')).toHaveTextContent('100g cash');
});
it('trades the selected Broker company through canonical actions with real fees', () => {
  render(<Bank section="broker" />);
  fireEvent.change(screen.getByLabelText('Broker company'), { target: { value: 'crown-bonds' } });
  fireEvent.click(screen.getByRole('button', { name: /^Buy 1/ }));
  expect(useGameStore.getState().players[0].stocks['crown-bonds']).toBe(1);
  fireEvent.click(screen.getByRole('button', { name: /^Sell 1/ }));
  expect(useGameStore.getState().players[0].gold).toBe(497);
});
