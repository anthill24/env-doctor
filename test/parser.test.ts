import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parseEnvKeys } from '../src/parser.js';
import { fixture, SECRET_VALUE_CANARIES } from './util.js';

describe('parseEnvKeys', () => {
  it('extracts simple keys', () => {
    expect(parseEnvKeys('FOO=bar\nBAZ=qux')).toEqual(['FOO', 'BAZ']);
  });

  it('ignores comments and blank lines', () => {
    const content = '# a comment\n\nFOO=bar\n   \n# another\nBAZ=qux\n';
    expect(parseEnvKeys(content)).toEqual(['FOO', 'BAZ']);
  });

  it('handles the export prefix', () => {
    expect(parseEnvKeys('export FOO=bar')).toEqual(['FOO']);
  });

  it('handles quoted values and inline comments', () => {
    const content = `FOO="bar baz"\nBAZ='qux' # trailing comment\nWITH_HASH="a#b"`;
    expect(parseEnvKeys(content)).toEqual(['FOO', 'BAZ', 'WITH_HASH']);
  });

  it('treats a multiline quoted value as a single entry, not new keys', () => {
    const content = [
      'PRIVATE_KEY="-----BEGIN-----',
      'MIDDLE_LINE_NOT_A_KEY',
      'ANOTHER_MIDDLE_LINE',
      '-----END-----"',
      'NEXT=value',
    ].join('\n');
    expect(parseEnvKeys(content)).toEqual(['PRIVATE_KEY', 'NEXT']);
  });

  it('dedupes repeated keys preserving first-seen order', () => {
    expect(parseEnvKeys('FOO=1\nBAR=2\nFOO=3')).toEqual(['FOO', 'BAR']);
  });

  it('normalises CRLF line endings', () => {
    expect(parseEnvKeys('FOO=bar\r\nBAZ=qux\r\n')).toEqual(['FOO', 'BAZ']);
  });

  it('returns names only — no value text ever leaks', async () => {
    const content = await readFile(fixture('project-secret', '.env'), 'utf8');
    const keys = parseEnvKeys(content);

    expect(keys).toEqual([
      'SECRET_API_KEY',
      'DB_PASSWORD',
      'SESSION_SECRET',
      'PRIVATE_KEY',
      'DOCUMENTED_ONLY',
    ]);

    const joined = keys.join('\n');
    for (const canary of SECRET_VALUE_CANARIES) {
      expect(joined).not.toContain(canary);
    }
  });
});
