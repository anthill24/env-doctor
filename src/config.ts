import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_PATTERNS } from './patterns.js';
import type { EnvDoctorConfig, FailBucket } from './types.js';

export const CONFIG_FILENAME = '.envdoctorrc.json';

export const DEFAULT_EXCLUDE: readonly string[] = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.git/**',
];

export const DEFAULT_CONFIG: EnvDoctorConfig = {
  source: ['**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}'],
  exclude: [...DEFAULT_EXCLUDE],
  ignore: [],
  patterns: [],
  useDefaultPatterns: true,
  detectDestructuring: true,
  exampleFile: '.env.example',
  localFile: '.env',
  failOn: ['undocumented'],
  placeholder: '',
};

const VALID_BUCKETS: readonly FailBucket[] = ['undocumented', 'unused', 'missing-local'];

function asString(value: unknown, key: string, source: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Config "${key}" in ${source} must be a string.`);
  }
  return value;
}

function asBoolean(value: unknown, key: string, source: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Config "${key}" in ${source} must be a boolean.`);
  }
  return value;
}

function asStringArray(value: unknown, key: string, source: string): string[] {
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    throw new Error(`Config "${key}" in ${source} must be an array of strings.`);
  }
  return value as string[];
}

function asFailBuckets(value: unknown, source: string): FailBucket[] {
  const arr = asStringArray(value, 'failOn', source);
  for (const item of arr) {
    if (!VALID_BUCKETS.includes(item as FailBucket)) {
      throw new Error(
        `Config "failOn" in ${source} has invalid bucket "${item}". ` +
          `Valid values: ${VALID_BUCKETS.join(', ')}.`,
      );
    }
  }
  return arr as FailBucket[];
}

/** Validate and merge a parsed config object on top of the defaults. */
export function mergeConfig(input: unknown, source = '<config>'): EnvDoctorConfig {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error(`Config in ${source} must be a JSON object.`);
  }
  const obj = input as Record<string, unknown>;
  const cfg: EnvDoctorConfig = {
    ...DEFAULT_CONFIG,
    exclude: [...DEFAULT_CONFIG.exclude],
    ignore: [...DEFAULT_CONFIG.ignore],
    patterns: [...DEFAULT_CONFIG.patterns],
    source: [...DEFAULT_CONFIG.source],
    failOn: [...DEFAULT_CONFIG.failOn],
  };

  if (obj.source !== undefined) cfg.source = asStringArray(obj.source, 'source', source);
  if (obj.exclude !== undefined) cfg.exclude = asStringArray(obj.exclude, 'exclude', source);
  if (obj.ignore !== undefined) cfg.ignore = asStringArray(obj.ignore, 'ignore', source);
  if (obj.patterns !== undefined) cfg.patterns = asStringArray(obj.patterns, 'patterns', source);
  if (obj.useDefaultPatterns !== undefined) {
    cfg.useDefaultPatterns = asBoolean(obj.useDefaultPatterns, 'useDefaultPatterns', source);
  }
  if (obj.detectDestructuring !== undefined) {
    cfg.detectDestructuring = asBoolean(obj.detectDestructuring, 'detectDestructuring', source);
  }
  if (obj.exampleFile !== undefined) cfg.exampleFile = asString(obj.exampleFile, 'exampleFile', source);
  if (obj.localFile !== undefined) cfg.localFile = asString(obj.localFile, 'localFile', source);
  if (obj.placeholder !== undefined) cfg.placeholder = asString(obj.placeholder, 'placeholder', source);
  if (obj.failOn !== undefined) cfg.failOn = asFailBuckets(obj.failOn, source);

  return cfg;
}

/** Load `.envdoctorrc.json` (or an explicit path), falling back to defaults. */
export async function loadConfig(options: {
  cwd: string;
  configPath?: string;
}): Promise<EnvDoctorConfig> {
  const explicit = options.configPath;
  const file = explicit
    ? path.resolve(options.cwd, explicit)
    : path.resolve(options.cwd, CONFIG_FILENAME);

  let raw: string | undefined;
  try {
    raw = await readFile(file, 'utf8');
  } catch {
    if (explicit) {
      throw new Error(`Config file not found: ${file}`);
    }
    return { ...DEFAULT_CONFIG };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in ${file}: ${(err as Error).message}`);
  }

  return mergeConfig(parsed, file);
}

/** The effective list of reference-pattern sources for a config. */
export function resolvePatterns(cfg: EnvDoctorConfig): string[] {
  const base = cfg.useDefaultPatterns ? [...DEFAULT_PATTERNS] : [];
  return [...base, ...cfg.patterns];
}

/** Parse a CLI `--fail-on` value (comma list, or "none") into buckets. */
export function parseFailOn(value: string): FailBucket[] {
  const parts = value
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parts.length === 0 || parts.includes('none')) {
    return [];
  }

  for (const part of parts) {
    if (!VALID_BUCKETS.includes(part as FailBucket)) {
      throw new Error(
        `Invalid --fail-on value "${part}". ` +
          `Valid values: ${VALID_BUCKETS.join(', ')}, none.`,
      );
    }
  }
  return parts as FailBucket[];
}
