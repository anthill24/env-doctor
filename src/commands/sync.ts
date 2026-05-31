import { appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { analyze } from '../analyze.js';
import { loadConfig, resolvePatterns } from '../config.js';
import { readEnvKeys } from '../io.js';
import { compilePatterns, scanSources } from '../scanner.js';

export interface SyncOptions {
  cwd: string;
  configPath?: string;
  write?: boolean;
  /** Overrides `config.placeholder` when provided. Never a real value. */
  placeholder?: string;
}

export interface SyncResult {
  /** Undocumented variable names that sync would add (names only). */
  toAdd: string[];
  /** Proposed `NAME=placeholder` lines (placeholder is never a real value). */
  proposedLines: string[];
  written: boolean;
  exampleFile: string;
  output: string;
}

/**
 * Propose `.env.example` additions for variables referenced in code but not yet
 * documented. Placeholders are always config-driven — env-doctor NEVER reads or
 * copies a value from the local env file here (it does not read `.env` at all).
 */
export async function runSync(options: SyncOptions): Promise<SyncResult> {
  const config = await loadConfig({ cwd: options.cwd, configPath: options.configPath });
  const placeholder = options.placeholder ?? config.placeholder;

  const patterns = compilePatterns(resolvePatterns(config));
  const { refs } = await scanSources({
    cwd: options.cwd,
    source: config.source,
    exclude: config.exclude,
    patterns,
  });

  const example = await readEnvKeys(options.cwd, config.exampleFile);

  // Only the example file is consulted here — the local `.env` is never read.
  const analysis = analyze({
    codeRefs: refs,
    documented: example.keys,
    local: [],
    hasLocal: false,
    ignore: config.ignore,
  });

  const toAdd = analysis.usedButUndocumented;
  const proposedLines = toAdd.map((name) => `${name}=${placeholder}`);

  let written = false;
  if (options.write && toAdd.length > 0) {
    await appendProposedLines(
      path.resolve(options.cwd, config.exampleFile),
      example.exists,
      proposedLines,
    );
    written = true;
  }

  return {
    toAdd,
    proposedLines,
    written,
    exampleFile: config.exampleFile,
    output: renderOutput({ exampleFile: config.exampleFile, toAdd, proposedLines, written }),
  };
}

async function appendProposedLines(
  fullPath: string,
  exists: boolean,
  lines: string[],
): Promise<void> {
  let prefix = '';
  if (exists) {
    const current = await readFile(fullPath, 'utf8').catch(() => '');
    if (current.length > 0 && !current.endsWith('\n')) {
      prefix = '\n';
    }
  }
  const block = `${prefix}${lines.join('\n')}\n`;
  await appendFile(fullPath, block, 'utf8');
}

function renderOutput(input: {
  exampleFile: string;
  toAdd: string[];
  proposedLines: string[];
  written: boolean;
}): string {
  if (input.toAdd.length === 0) {
    return `✔  ${input.exampleFile} already documents every variable referenced in code.`;
  }
  if (input.written) {
    return `✔  Added ${input.toAdd.length} variable${input.toAdd.length === 1 ? '' : 's'} to ${input.exampleFile}: ${input.toAdd.join(', ')}`;
  }
  const lines = [
    `env-doctor sync — ${input.toAdd.length} undocumented variable${input.toAdd.length === 1 ? '' : 's'}`,
    '',
    `Add to ${input.exampleFile}:`,
    ...input.proposedLines.map((line) => `    ${line}`),
    '',
    'Run again with --write to apply.',
  ];
  return lines.join('\n');
}
