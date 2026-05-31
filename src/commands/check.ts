import { analyze, bucketHasFailure, type Analysis } from '../analyze.js';
import { loadConfig, resolvePatterns } from '../config.js';
import { readEnvKeys } from '../io.js';
import {
  formatJson,
  formatMarkdown,
  formatText,
  type OutputFormat,
} from '../report.js';
import { compilePatterns, scanSources } from '../scanner.js';
import type { EnvDoctorConfig, FailBucket } from '../types.js';

export interface CheckOptions {
  cwd: string;
  configPath?: string;
  format?: OutputFormat;
  /** Overrides `config.failOn` when provided (e.g. from `--fail-on`). */
  failOn?: FailBucket[];
}

export interface CheckResult {
  analysis: Analysis;
  /** Output rendered in the requested format (names only). */
  output: string;
  /** Markdown summary suitable for `$GITHUB_STEP_SUMMARY` (names only). */
  summaryMarkdown: string;
  /** 0 when clean (per failOn), 1 when a failing bucket is non-empty. */
  exitCode: number;
  filesScanned: number;
  config: EnvDoctorConfig;
}

export async function runCheck(options: CheckOptions): Promise<CheckResult> {
  const config = await loadConfig({ cwd: options.cwd, configPath: options.configPath });
  const failOn = options.failOn ?? config.failOn;

  const patterns = compilePatterns(resolvePatterns(config));
  const { refs, filesScanned } = await scanSources({
    cwd: options.cwd,
    source: config.source,
    exclude: config.exclude,
    patterns,
  });

  const example = await readEnvKeys(options.cwd, config.exampleFile);
  const local = await readEnvKeys(options.cwd, config.localFile);

  const analysis = analyze({
    codeRefs: refs,
    documented: example.keys,
    local: local.keys,
    hasLocal: local.exists,
    ignore: config.ignore,
  });

  const meta = {
    exampleFile: config.exampleFile,
    localFile: config.localFile,
    filesScanned,
  };

  const format = options.format ?? 'text';
  const output =
    format === 'json'
      ? formatJson(analysis)
      : format === 'markdown'
        ? formatMarkdown(analysis, meta)
        : formatText(analysis, meta);

  return {
    analysis,
    output,
    summaryMarkdown: formatMarkdown(analysis, meta),
    exitCode: bucketHasFailure(analysis, failOn) ? 1 : 0,
    filesScanned,
    config,
  };
}
