import { describe, expect, it } from 'vitest';
import { analyze, bucketHasFailure } from '../src/analyze.js';

describe('analyze', () => {
  it('buckets the three categories of mismatch', () => {
    const result = analyze({
      codeRefs: ['API_KEY', 'DATABASE_URL', 'PORT', 'BRACKET_VAR'],
      documented: ['API_KEY', 'DATABASE_URL', 'LEGACY_TOKEN', 'REDIS_URL'],
      local: ['API_KEY', 'DATABASE_URL', 'LEGACY_TOKEN'],
      hasLocal: true,
    });

    expect(result.usedButUndocumented).toEqual(['BRACKET_VAR', 'PORT']);
    expect(result.documentedButUnused).toEqual(['LEGACY_TOKEN', 'REDIS_URL']);
    expect(result.documentedButMissingLocally).toEqual(['REDIS_URL']);
  });

  it('skips the local bucket when there is no local file', () => {
    const result = analyze({
      codeRefs: ['A'],
      documented: ['A', 'B'],
      local: [],
      hasLocal: false,
    });
    expect(result.documentedButMissingLocally).toEqual([]);
    expect(result.documentedButUnused).toEqual(['B']);
  });

  it('removes ignored names from every bucket', () => {
    const result = analyze({
      codeRefs: ['NODE_ENV', 'API_KEY'],
      documented: ['NODE_ENV'],
      local: [],
      hasLocal: false,
      ignore: ['NODE_ENV'],
    });
    expect(result.used).toEqual(['API_KEY']);
    expect(result.documented).toEqual([]);
    expect(result.usedButUndocumented).toEqual(['API_KEY']);
  });

  it('sorts output deterministically', () => {
    const result = analyze({
      codeRefs: ['Z_VAR', 'A_VAR'],
      documented: [],
      local: [],
      hasLocal: false,
    });
    expect(result.usedButUndocumented).toEqual(['A_VAR', 'Z_VAR']);
  });
});

describe('bucketHasFailure', () => {
  const base = analyze({
    codeRefs: ['UNDOC'],
    documented: ['UNUSED'],
    local: [],
    hasLocal: false,
  });

  it('fails on undocumented by default selection', () => {
    expect(bucketHasFailure(base, ['undocumented'])).toBe(true);
  });

  it('does not fail when the selected bucket is empty', () => {
    expect(bucketHasFailure(base, ['missing-local'])).toBe(false);
  });

  it('never fails with an empty selection', () => {
    expect(bucketHasFailure(base, [])).toBe(false);
  });
});
