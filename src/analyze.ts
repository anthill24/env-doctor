import type { FailBucket } from './types.js';

export interface Analysis {
  /** Variable names referenced in code (after ignores), sorted. */
  used: string[];
  /** Variable names declared in the example file (after ignores), sorted. */
  documented: string[];
  /** Variable names present in the local file (after ignores), sorted. */
  local: string[];
  /** Whether a local env file was found. */
  hasLocal: boolean;
  /** Referenced in code but absent from the example file. */
  usedButUndocumented: string[];
  /** Declared in the example file but never referenced in code. */
  documentedButUnused: string[];
  /** Declared in the example file but absent from the local file. */
  documentedButMissingLocally: string[];
}

function sortUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

/**
 * Cross-check the three sources of truth and bucket the differences.
 * All inputs and outputs are variable NAMES only.
 */
export function analyze(input: {
  codeRefs: string[];
  documented: string[];
  local: string[];
  hasLocal: boolean;
  ignore?: string[];
}): Analysis {
  const ignore = new Set(input.ignore ?? []);
  const keep = (name: string): boolean => !ignore.has(name);

  const used = sortUnique(input.codeRefs.filter(keep));
  const documented = sortUnique(input.documented.filter(keep));
  const local = sortUnique(input.local.filter(keep));

  const documentedSet = new Set(documented);
  const usedSet = new Set(used);
  const localSet = new Set(local);

  return {
    used,
    documented,
    local,
    hasLocal: input.hasLocal,
    usedButUndocumented: used.filter((name) => !documentedSet.has(name)),
    documentedButUnused: documented.filter((name) => !usedSet.has(name)),
    documentedButMissingLocally: input.hasLocal
      ? documented.filter((name) => !localSet.has(name))
      : [],
  };
}

/** Whether any of the requested buckets is non-empty. */
export function bucketHasFailure(analysis: Analysis, failOn: FailBucket[]): boolean {
  return failOn.some((bucket) => {
    if (bucket === 'undocumented') return analysis.usedButUndocumented.length > 0;
    if (bucket === 'unused') return analysis.documentedButUnused.length > 0;
    if (bucket === 'missing-local') return analysis.documentedButMissingLocally.length > 0;
    return false;
  });
}
