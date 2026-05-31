import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fixture, SECRET_VALUE_CANARIES } from './util.js';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const cli = path.join(repoRoot, 'dist', 'cli.js');
const built = existsSync(cli);

function run(args: string[], env: NodeJS.ProcessEnv = {}) {
  return spawnSync('node', [cli, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

// These exercise the actual built binary. They run only after `npm run build`
// (always true in CI, which builds before testing).
describe.skipIf(!built)('built CLI (dist/cli.js)', () => {
  it('prints the version', () => {
    const result = run(['--version']);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('exits non-zero when code references an undocumented variable', () => {
    const result = run(['check', '--cwd', fixture('project-buckets')]);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('PORT');
  });

  it('emits names-only JSON and never a secret value', () => {
    const result = run(['check', '--cwd', fixture('project-secret'), '--format', 'json']);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.usedButUndocumented).toContain('PRIVATE_KEY');
    for (const canary of SECRET_VALUE_CANARIES) {
      expect(result.stdout).not.toContain(canary);
    }
  });

  it('writes a names-only GitHub step summary', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'env-doctor-summary-'));
    const summaryFile = path.join(dir, 'summary.md');
    try {
      const result = run(['check', '--cwd', fixture('project-secret')], {
        GITHUB_STEP_SUMMARY: summaryFile,
      });
      expect(result.status).toBe(1);
      const summary = readFileSync(summaryFile, 'utf8');
      expect(summary).toContain('env-doctor');
      expect(summary).toContain('PRIVATE_KEY');
      for (const canary of SECRET_VALUE_CANARIES) {
        expect(summary).not.toContain(canary);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('shows help and a no-values guarantee', () => {
    const result = run(['--help']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('never prints values');
  });
});
