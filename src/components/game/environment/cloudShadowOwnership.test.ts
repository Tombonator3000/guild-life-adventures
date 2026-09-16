import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('cloud shadow ownership', () => {
  it('keeps one isolated, pointer-transparent ground owner below board effects', () => {
    const css=readFileSync('src/components/game/environment/effects.css','utf8');
    expect(css).toMatch(/\.board-ground-layer[^}]*z-index:0[^}]*isolation:isolate[^}]*pointer-events:none/);
    expect(css).toMatch(/\.ground-cloud-shadows[^}]*z-index:2[^}]*mix-blend-mode:multiply/);
    expect(css).toMatch(/\.board-environment[^}]*z-index:1/);
  });

  it('does not retain the retired sprite or Three weather cloud passes', () => {
    const world=readFileSync('src/components/game/environment/drawEnvironment.ts','utf8');
    const weather=readFileSync('src/components/game/environment/threeWeatherRenderer.ts','utf8');
    expect(world).not.toContain('Broad shadow passes');
    expect(weather).not.toMatch(/shadowMesh|cloudMesh|cloudVertex|cloudFragment/);
  });
});