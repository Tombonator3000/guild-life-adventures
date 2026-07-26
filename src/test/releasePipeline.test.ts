import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const packageJson = JSON.parse(read('package.json')) as {
  name: string;
  version: string;
  packageManager: string;
  scripts: Record<string, string>;
  devDependencies: Record<string, string>;
};
const bunLock = read('bun.lock');
const bunWorkspaceName = bunLock.match(/"workspaces"\s*:\s*\{\s*""\s*:\s*\{\s*"name"\s*:\s*"([^"]+)"/s)?.[1];
const validationWorkflow = read('.github/workflows/agent-validate.yml');
const deployWorkflow = read('.github/workflows/deploy-github-pages.yml');
const readme = read('README.md');

describe('Phase 16Y release safety policy', () => {
  it('uses one authoritative Bun lockfile and aligned pinned project metadata', () => {
    expect(existsSync(resolve(root, 'bun.lock'))).toBe(true);
    expect(existsSync(resolve(root, 'bun.lockb'))).toBe(false);
    expect(packageJson.name).toBe('guild-life-adventures');
    expect(bunWorkspaceName).toBe(packageJson.name);
    expect(packageJson.version).toBe('0.10.2');
    expect(packageJson.packageManager).toBe('bun@1.3.14');
    expect(packageJson.devDependencies['@playwright/test']).toBe('1.61.1');
    expect(readme).toContain('`bun.lock` er den eneste autoritative lockfilen');
  });

  it('keeps validation reproducible and reusable', () => {
    expect(validationWorkflow).toContain('workflow_call:');
    expect(validationWorkflow).toContain('bun-version: 1.3.14');
    expect(validationWorkflow).toContain('bun install --frozen-lockfile');
    expect(validationWorkflow).toContain('bun run check:types');
    expect(validationWorkflow).toContain('bun run test:e2e');
    expect(validationWorkflow).not.toContain('bun add');
    expect(validationWorkflow).not.toContain('bun-version: latest');
  });

  it('gates production deployment and verifies the published site', () => {
    expect(deployWorkflow).toContain('uses: ./.github/workflows/agent-validate.yml');
    expect(deployWorkflow).toContain('needs: [validate, deploy-partykit]');
    expect(deployWorkflow).toContain('bun install --frozen-lockfile');
    expect(deployWorkflow).toContain('bunx partykit deploy');
    expect(deployWorkflow).toContain('smoke-test:');
    expect(deployWorkflow).toContain('version.json');
    expect(deployWorkflow).not.toContain('partykit@latest');
    expect(deployWorkflow).not.toContain('continue-on-error');
  });

  it('provides stable local commands for the workflow gates', () => {
    expect(packageJson.scripts['check:types']).toBe('tsc --noEmit');
    expect(packageJson.scripts.test).toBe('vitest run');
    expect(packageJson.scripts['test:e2e']).toBe('playwright test');
    expect(packageJson.scripts.validate).toContain('bun run check:types');
    expect(packageJson.scripts.validate).toContain('bun run test');
    expect(packageJson.scripts.validate).toContain('bun run build');
    expect(packageJson.scripts.validate).toContain('bun run lint');
  });
});
