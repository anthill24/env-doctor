/**
 * Public API for env-doctor.
 *
 * Everything exported here operates on variable NAMES only. The dotenv parser
 * (`parseEnvKeys`) is the single boundary that touches `.env` file contents and
 * it discards values by construction.
 */
export { parseEnvKeys } from './parser.js';
export { DEFAULT_PATTERNS } from './patterns.js';
export { compilePatterns, scanContent, scanSources, type ScanResult } from './scanner.js';
export { analyze, bucketHasFailure, type Analysis } from './analyze.js';
export { readEnvKeys, type EnvFileKeys } from './io.js';
export {
  isClean,
  formatJson,
  formatText,
  formatMarkdown,
  type OutputFormat,
  type ReportMeta,
} from './report.js';
export {
  loadConfig,
  mergeConfig,
  resolvePatterns,
  parseFailOn,
  DEFAULT_CONFIG,
  DEFAULT_EXCLUDE,
  CONFIG_FILENAME,
} from './config.js';
export { runCheck, type CheckOptions, type CheckResult } from './commands/check.js';
export { runSync, type SyncOptions, type SyncResult } from './commands/sync.js';
export { runInit, type InitOptions, type InitResult } from './commands/init.js';
export { VERSION } from './version.js';
export type { EnvDoctorConfig, FailBucket } from './types.js';
