/** A category of mismatch that `env-doctor check` can report. */
export type FailBucket = 'undocumented' | 'unused' | 'missing-local';

/** Resolved configuration used by every command. */
export interface EnvDoctorConfig {
  /** Glob patterns of source files to scan for environment-variable references. */
  source: string[];
  /** Glob patterns to exclude while scanning (node_modules, dist, …). */
  exclude: string[];
  /** Variable NAMES to ignore entirely — never reported in any bucket. */
  ignore: string[];
  /** Custom reference regexes, each with one capture group for the variable name. */
  patterns: string[];
  /** Include the built-in JS/TS reference patterns in addition to `patterns`. */
  useDefaultPatterns: boolean;
  /** File that documents the variable contract (the "example"). */
  exampleFile: string;
  /** File that holds the developer's local values. */
  localFile: string;
  /** Which buckets cause `check` to exit non-zero. */
  failOn: FailBucket[];
  /**
   * Placeholder written for newly added variables by `sync`/`init`.
   * This is NEVER a real value — env-doctor never copies values from `.env`.
   */
  placeholder: string;
}
