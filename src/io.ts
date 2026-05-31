import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseEnvKeys } from './parser.js';

export interface EnvFileKeys {
  /** Variable names declared in the file (empty when the file is absent). */
  keys: string[];
  /** Whether the file exists and was read. */
  exists: boolean;
}

/**
 * Read a `.env`-style file and return only its variable names. Values never
 * leave the parser. A missing file yields `{ keys: [], exists: false }`.
 */
export async function readEnvKeys(cwd: string, file: string): Promise<EnvFileKeys> {
  const full = path.resolve(cwd, file);
  try {
    const content = await readFile(full, 'utf8');
    return { keys: parseEnvKeys(content), exists: true };
  } catch {
    return { keys: [], exists: false };
  }
}
