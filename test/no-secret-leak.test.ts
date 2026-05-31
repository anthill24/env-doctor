import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCheck } from '../src/commands/check.js';
import { runInit } from '../src/commands/init.js';
import { runSync } from '../src/commands/sync.js';
import { fixture, SECRET_VALUE_CANARIES } from './util.js';

/**
 * Core safety property: env-doctor reports variable NAMES only and must never
 * emit a value from any env file, in any command or format. Every fixture value
 * contains a CANARY marker; this test fails if any marker reaches output.
 */

function assertNoCanary(label: string, ...texts: string[]): void {
  const haystack = texts.join('\n');
  for (const canary of SECRET_VALUE_CANARIES) {
    expect(haystack, `${label} leaked a secret value`).not.toContain(canary);
  }
}

async function withTempCopy<T>(src: string, fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'env-doctor-leak-'));
  try {
    await cp(src, dir, { recursive: true });
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('no secret value ever leaks', () => {
  for (const project of ['project-secret', 'project-buckets']) {
    it(`check (text/json/markdown) — ${project}`, async () => {
      for (const format of ['text', 'json', 'markdown'] as const) {
        const result = await runCheck({ cwd: fixture(project), format });
        assertNoCanary(`check --format ${format} (${project})`, result.output, result.summaryMarkdown);
      }
    });

    it(`sync dry-run — ${project}`, async () => {
      const result = await runSync({ cwd: fixture(project) });
      assertNoCanary(`sync dry (${project})`, result.output, ...result.proposedLines);
    });

    it(`init dry-run — ${project}`, async () => {
      const result = await runInit({ cwd: fixture(project) });
      assertNoCanary(`init dry (${project})`, result.output, result.content);
    });

    it(`sync --write never copies a value into the example file — ${project}`, async () => {
      await withTempCopy(fixture(project), async (dir) => {
        const result = await runSync({ cwd: dir, write: true });
        const example = await readFile(path.join(dir, '.env.example'), 'utf8');
        assertNoCanary(`sync --write (${project})`, result.output, example);
      });
    });

    it(`init --write --force never copies a value into the example file — ${project}`, async () => {
      await withTempCopy(fixture(project), async (dir) => {
        const result = await runInit({ cwd: dir, write: true, force: true });
        const example = await readFile(path.join(dir, '.env.example'), 'utf8');
        assertNoCanary(`init --write (${project})`, result.output, result.content, example);
      });
    });
  }

  it('GitHub step-summary markdown contains names but no values', async () => {
    const result = await runCheck({ cwd: fixture('project-secret'), format: 'text' });
    // PRIVATE_KEY is the undocumented variable — its NAME is allowed to appear.
    expect(result.summaryMarkdown).toContain('PRIVATE_KEY');
    assertNoCanary('summary', result.summaryMarkdown);
  });
});
