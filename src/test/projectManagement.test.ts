import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const todo = read('todo.md');
const readme = read('README.md');
const projectManagement = read('docs/PROJECT_MANAGEMENT.md');
const bugTemplate = read('.github/ISSUE_TEMPLATE/bug.yml');
const improvementTemplate = read('.github/ISSUE_TEMPLATE/improvement.yml');
const pullRequestTemplate = read('.github/pull_request_template.md');

describe('Phase 16Y project-management policy', () => {
  it('keeps todo.md as a compact active index', () => {
    expect(todo.split('\n').length).toBeLessThan(100);
    expect(todo).toContain('GitHub Issues are the source of truth');
    expect(todo).toContain('Tracker: #390');
    expect(todo).toContain('#391');
    expect(todo).toContain('#392');
    expect(todo).not.toContain('## Completed (2026-02-06)');
  });

  it('documents the delivery hierarchy and definition of done', () => {
    expect(projectManagement).toContain('GitHub Issue tracker');
    expect(projectManagement).toContain('Definition of done');
    expect(projectManagement).toContain('Production bugs should include reproduction steps');
    expect(projectManagement).toContain('Do not grow `todo.md`');
    expect(readme).toContain('issue #390');
    expect(readme).toContain('docs/PROJECT_MANAGEMENT.md');
  });

  it('provides structured issue and pull-request intake', () => {
    expect(bugTemplate).toContain('Reproduction steps');
    expect(bugTemplate).toContain('regression test');
    expect(improvementTemplate).toContain('Existing system checked');
    expect(improvementTemplate).toContain('Non-goals');
    expect(pullRequestTemplate).toContain('No canonical price/effect is accepted');
    expect(pullRequestTemplate).toContain('Player-facing rules remain aligned');
  });
});
