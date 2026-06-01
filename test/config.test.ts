import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG,
  loadConfig,
  mergeConfig,
  parseFailOn,
  resolvePatterns,
} from '../src/config.js';
import { DEFAULT_PATTERNS } from '../src/patterns.js';
import { fixture } from './util.js';

describe('mergeConfig', () => {
  it('returns defaults for an empty object', () => {
    expect(mergeConfig({})).toEqual(DEFAULT_CONFIG);
  });

  it('overrides only the provided keys', () => {
    const cfg = mergeConfig({ exampleFile: '.env.sample', ignore: ['NODE_ENV'] });
    expect(cfg.exampleFile).toBe('.env.sample');
    expect(cfg.ignore).toEqual(['NODE_ENV']);
    expect(cfg.localFile).toBe(DEFAULT_CONFIG.localFile);
  });

  it('rejects a non-object config', () => {
    expect(() => mergeConfig([])).toThrow(/must be a JSON object/);
  });

  it('rejects wrong types', () => {
    expect(() => mergeConfig({ source: 'not-an-array' })).toThrow(/must be an array of strings/);
    expect(() => mergeConfig({ useDefaultPatterns: 'yes' })).toThrow(/must be a boolean/);
    expect(() => mergeConfig({ detectDestructuring: 'yes' })).toThrow(/must be a boolean/);
  });

  it('defaults detectDestructuring to true and allows disabling it', () => {
    expect(DEFAULT_CONFIG.detectDestructuring).toBe(true);
    expect(mergeConfig({ detectDestructuring: false }).detectDestructuring).toBe(false);
  });

  it('rejects invalid failOn buckets', () => {
    expect(() => mergeConfig({ failOn: ['nope'] })).toThrow(/invalid bucket/);
  });
});

describe('resolvePatterns', () => {
  it('adds custom patterns to the defaults', () => {
    const cfg = mergeConfig({ patterns: ['custom\\.([A-Z]+)'] });
    expect(resolvePatterns(cfg)).toEqual([...DEFAULT_PATTERNS, 'custom\\.([A-Z]+)']);
  });

  it('replaces defaults when useDefaultPatterns is false', () => {
    const cfg = mergeConfig({ patterns: ['only\\.([A-Z]+)'], useDefaultPatterns: false });
    expect(resolvePatterns(cfg)).toEqual(['only\\.([A-Z]+)']);
  });
});

describe('parseFailOn', () => {
  it('parses a comma list', () => {
    expect(parseFailOn('undocumented,unused')).toEqual(['undocumented', 'unused']);
  });

  it('treats "none" as an empty selection', () => {
    expect(parseFailOn('none')).toEqual([]);
    expect(parseFailOn('')).toEqual([]);
  });

  it('rejects unknown buckets', () => {
    expect(() => parseFailOn('bogus')).toThrow(/Invalid --fail-on/);
  });

  it('rejects "none" combined with failing buckets', () => {
    expect(() => parseFailOn('none,undocumented')).toThrow(/cannot be combined/);
    expect(() => parseFailOn('unused,none')).toThrow(/cannot be combined/);
  });
});

describe('loadConfig', () => {
  it('falls back to defaults when no config file exists', async () => {
    const cfg = await loadConfig({ cwd: fixture('project-buckets') });
    expect(cfg).toEqual(DEFAULT_CONFIG);
  });

  it('throws when an explicit config path is missing', async () => {
    await expect(
      loadConfig({ cwd: fixture('project-buckets'), configPath: 'nope.json' }),
    ).rejects.toThrow(/Config file not found/);
  });
});
