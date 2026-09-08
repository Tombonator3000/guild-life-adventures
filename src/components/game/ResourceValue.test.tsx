import { act, cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ResourceValue } from './ResourceValue';
const env = vi.hoisted(()=>({reducedMotion:true,visible:true}));
const options = vi.hoisted(()=>({environmentDetail:'reduced'}));
vi.mock('@/hooks/useEnvironmentActivity',()=>({useEnvironmentActivity:()=>env}));
vi.mock('@/hooks/useGameOptions',()=>({useGameOptions:()=>({options})}));
afterEach(()=>{ cleanup(); vi.useRealTimers(); options.environmentDetail='reduced'; });
it('shows a static real delta, expires it and never celebrates a player switch',()=>{
  vi.useFakeTimers();
  const r=render(<ResourceValue value={100} identity="one" />);
  expect(r.container.querySelector('.resource-delta')).toBeNull();
  r.rerender(<ResourceValue value={80} identity="one" />);
  expect(r.container.querySelector('.resource-delta')).toHaveTextContent('-20');
  expect(r.container.querySelector('.resource-delta')).toHaveAttribute('data-animated','false');
  act(()=>vi.advanceTimersByTime(2200));
  expect(r.container.querySelector('.resource-delta')).toBeNull();
  r.rerender(<ResourceValue value={200} identity="two" />);
  expect(r.container.querySelector('.resource-delta')).toBeNull();
});
it('honours Off while keeping the current value visible',()=>{
  options.environmentDetail='off';
  const r=render(<ResourceValue value={100} identity="one" />);
  r.rerender(<ResourceValue value={80} identity="one" />);
  expect(r.container).toHaveTextContent('80');
  expect(r.container.querySelector('.resource-delta')).toBeNull();
});
