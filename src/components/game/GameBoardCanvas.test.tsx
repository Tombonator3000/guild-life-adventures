import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GameBoardCanvas } from './GameBoardCanvas';
import { useGameStore } from '@/store/gameStore';
import { CLEAR_WEATHER } from '@/data/weather';
import { getLocation } from '@/data/locations';
import { resetGameOptions } from '@/data/gameOptions';
import { EnvironmentControl } from './environment/EnvironmentControl';

vi.mock('./PlayerToken', () => ({ PlayerToken: () => null }));
vi.mock('./AnimatedPlayerToken', () => ({ AnimatedPlayerToken: () => null }));
vi.mock('./ShadowfingersToken', () => ({ ShadowfingersToken: () => null }));
vi.mock('./DebugOverlay', () => ({ DebugOverlay: () => null }));

function renderBoard() {
  const state = useGameStore.getState();
  const player = state.players[0];
  return render(<>
    <EnvironmentControl />
    <GameBoardCanvas players={state.players} currentPlayer={player} selectedLocation={null}
      locationHexes={[]} weather={state.weather} isMobile={false}
      centerPanel={{top:23,left:22,width:55,height:53}} customZones={[]}
      debugCenterPanel={{top:23,left:22,width:55,height:53}} showDebugOverlay={false}
      focusedLocationId={null} animatingPlayer={null} animationPath={null} pathVersion={0}
      shadowfingersTargetLocation={null} getLocationWithCustomPosition={getLocation}
      onLocationClick={vi.fn()} onViewPlayer={vi.fn()} onAnimationComplete={vi.fn()} onLocationReached={vi.fn()}>
      <button>Action panel</button>
    </GameBoardCanvas>
  </>);
}

beforeEach(() => {
  resetGameOptions();
  useGameStore.setState({networkMode:'local'});
  useGameStore.getState().startNewGame(['Traveler'],false,{wealth:5000,happiness:100,education:45,career:75,adventure:0});
  useGameStore.setState(state => ({
    weather:{...CLEAR_WEATHER,type:'snowstorm',particle:'snow',movementCostExtra:1},
    players:state.players.map(p => ({...p,currentLocation:'general-store',hadRandomEventThisTurn:true})),
  }));
});
afterEach(() => { cleanup(); resetGameOptions(); vi.restoreAllMocks(); });

describe('board environment and travel', () => {
  it('shows the same bad-weather cost that travel actually deducts', () => {
    const {container} = renderBoard();
    fireEvent.mouseMove(container.querySelector('[data-zone-id="bank"]')!,{clientX:10,clientY:10});
    expect(screen.getByText('(2h)')).toBeInTheDocument();
    const player = useGameStore.getState().players[0];
    act(() => { useGameStore.getState().travelPlayer(player.id,['general-store','bank']); });
    expect(useGameStore.getState().players[0].timeRemaining).toBe(player.timeRemaining-2);
  });

  it('lets the player turn ambient motion off without changing weather or gameplay', () => {
    const {container} = renderBoard();
    const weather = useGameStore.getState().weather;
    expect(container.querySelector('.weather-snow')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Living environment'),{target:{value:'reduced'}});
    expect(container.querySelector('.weather-tint-snow')).toBeInTheDocument();
    expect(container.querySelector('.weather-snow')).not.toBeInTheDocument();
    expect(container.querySelector('.environment-smoke')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Living environment'),{target:{value:'off'}});
    expect(container.querySelector('.board-environment')).not.toBeInTheDocument();
    expect(useGameStore.getState().weather).toBe(weather);
    expect(screen.getByRole('button',{name:'Action panel'})).toBeEnabled();
    expect(JSON.parse(localStorage.getItem('guild-life-options')!).environmentDetail).toBe('off');
  });

  it('follows system reduced motion even when Full is selected', () => {
    const original = window.matchMedia;
    vi.spyOn(window,'matchMedia').mockImplementation(query => ({...original(query),matches:true}));
    const {container} = renderBoard();
    expect(container.querySelector('.board-environment')).toHaveAttribute('data-detail','reduced');
    expect(container.querySelector('.weather-particles')).not.toBeInTheDocument();
    expect(container.querySelector('.weather-tint-snow')).toBeInTheDocument();
  });

  it('pauses when the document is hidden and resumes when it is visible', () => {
    const {container} = renderBoard();
    vi.spyOn(document,'hidden','get').mockReturnValue(true);
    fireEvent(document,new Event('visibilitychange'));
    expect(container.querySelector('.board-environment')).toHaveAttribute('data-paused','true');
    vi.spyOn(document,'hidden','get').mockReturnValue(false);
    fireEvent(document,new Event('visibilitychange'));
    expect(container.querySelector('.board-environment')).toHaveAttribute('data-paused','false');
  });
});
