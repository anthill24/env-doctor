import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { VERSION } from '../src/version.js';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

describe('VERSION', () => {
  it('matches the version in package.json', async () => {
    const pkg = JSON.parse(await readFile(path.join(repoRoot, 'package.json'), 'utf8'));
    expect(VERSION).toBe(pkg.version);
  });
});
