#!/usr/bin/env node
import { appendFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { runCheck } from './commands/check.js';
import { runInit } from './commands/init.js';
import { runSync } from './commands/sync.js';
import { parseFailOn } from './config.js';
import type { OutputFormat } from './report.js';
import { VERSION } from './version.js';

const BOOLEAN_FLAGS = new Set(['write', 'force', 'help', 'version']);
const VALUE_FLAGS = new Set(['cwd', 'config', 'format', 'fail-on', 'placeholder']);
const EMPTY_VALUE_ALLOWED_FLAGS = new Set(['placeholder']);

interface ParsedArgs {
  positionals: string[];
  flags: Record<string, string | boolean>;
}

function parseArgv(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '-h') {
      flags.help = true;
    } else if (arg === '-v') {
      flags.version = true;
    } else if (arg === '--') {
      positionals.push(...argv.slice(i + 1));
      break;
    } else if (arg.startsWith('--')) {
      const body = arg.slice(2);
      const eq = body.indexOf('=');
      if (eq !== -1) {
        const name = body.slice(0, eq);
        flags[name] = normalizeValueFlag(name, body.slice(eq + 1));
      } else if (body.startsWith('no-')) {
        flags[body.slice(3)] = false;
      } else if (BOOLEAN_FLAGS.has(body)) {
        flags[body] = true;
      } else if (VALUE_FLAGS.has(body)) {
        const next = argv[i + 1];
        if (next === undefined || next.startsWith('-')) {
          throw new Error(`Missing value for --${body}.`);
        }
        flags[body] = next;
        i += 1;
      } else {
        const next = argv[i + 1];
        if (next === undefined || next.startsWith('-')) {
          flags[body] = true;
        } else {
          flags[body] = next;
          i += 1;
        }
      }
    } else {
      positionals.push(arg);
    }
  }

  return { positionals, flags };
}

function normalizeValueFlag(name: string, value: string): string {
  if (VALUE_FLAGS.has(name) && value.length === 0 && !EMPTY_VALUE_ALLOWED_FLAGS.has(name)) {
    throw new Error(`Missing value for --${name}.`);
  }
  return value;
}

const HELP = `env-doctor — keep your .env.example honest

Usage:
  env-doctor <command> [options]

Commands:
  check            Compare code references against the example and local env files
  sync             Propose example-file additions for undocumented variables
  init             Scaffold an example env file from code references

Options:
  --cwd <dir>          Run as if in <dir> (default: current directory)
  --config <path>      Path to .envdoctorrc.json
  --format <fmt>       check: text | json | markdown (default: text)
  --fail-on <list>     check: comma list of undocumented,unused,missing-local,none
  --write              sync/init: write changes to disk
  --force              init: overwrite an existing example file
  --placeholder <val>  sync/init: placeholder for new variables (default: empty)
  -h, --help           Show this help
  -v, --version        Show the version

env-doctor reports variable NAMES only — it never prints values.
Docs: https://github.com/anthill24/env-doctor`;

function parseFormat(value: string | boolean | undefined): OutputFormat {
  if (value === undefined) return 'text';
  if (value === 'text' || value === 'json' || value === 'markdown') return value;
  throw new Error(`Invalid --format value "${String(value)}". Use text, json, or markdown.`);
}

function flagString(name: string, value: string | boolean | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return normalizeValueFlag(name, value);
  throw new Error(`Missing value for --${name}.`);
}

function writeStepSummary(markdown: string): void {
  const target = process.env.GITHUB_STEP_SUMMARY;
  if (!target) return;
  try {
    appendFileSync(target, `${markdown}\n`, 'utf8');
  } catch {
    // A summary file we cannot write to must never break the check itself.
  }
}

async function main(argv: string[]): Promise<number> {
  const { positionals, flags } = parseArgv(argv);

  if (flags.version) {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }

  const command = positionals[0];

  if (!command) {
    process.stdout.write(`${HELP}\n`);
    return flags.help ? 0 : 1;
  }
  if (flags.help) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }

  const cwdFlag = flagString('cwd', flags.cwd);
  const cwd = cwdFlag !== undefined ? path.resolve(cwdFlag) : process.cwd();
  const configPath = flagString('config', flags.config);
  const placeholder = flagString('placeholder', flags.placeholder);

  switch (command) {
    case 'check': {
      const format = parseFormat(flags.format);
      const failOn =
        flags['fail-on'] !== undefined ? parseFailOn(String(flags['fail-on'])) : undefined;
      const result = await runCheck({ cwd, configPath, format, failOn });
      process.stdout.write(`${result.output}\n`);
      writeStepSummary(result.summaryMarkdown);
      return result.exitCode;
    }
    case 'sync': {
      const result = await runSync({
        cwd,
        configPath,
        write: flags.write === true,
        placeholder,
      });
      process.stdout.write(`${result.output}\n`);
      return 0;
    }
    case 'init': {
      const result = await runInit({
        cwd,
        configPath,
        write: flags.write === true,
        force: flags.force === true,
        placeholder,
      });
      process.stdout.write(`${result.output}\n`);
      return result.exitCode;
    }
    default: {
      process.stderr.write(`Unknown command: ${command}\n\n${HELP}\n`);
      return 1;
    }
  }
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err: unknown) => {
    process.stderr.write(`env-doctor: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  });
