import { readFile } from 'node:fs/promises';
import { glob } from 'tinyglobby';

/**
 * Compile reference-pattern source strings into global RegExps.
 * Throws a clear error if any pattern is not a valid regular expression.
 */
export function compilePatterns(patterns: readonly string[]): RegExp[] {
  return patterns.map((source) => {
    try {
      return new RegExp(source, 'g');
    } catch (err) {
      throw new Error(
        `Invalid reference pattern: ${source}\n  ${(err as Error).message}`,
      );
    }
  });
}

/**
 * Find every variable name referenced in a single chunk of source text.
 * Returns names in the order they are found (duplicates included; callers dedupe).
 */
export function scanContent(content: string, patterns: readonly RegExp[]): string[] {
  const found: string[] = [];
  for (const pattern of patterns) {
    const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
    const re = new RegExp(pattern.source, flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(content)) !== null) {
      if (match[1]) {
        found.push(match[1]);
      }
      if (match.index === re.lastIndex) {
        re.lastIndex += 1;
      }
    }
  }
  return found;
}

export interface ScanResult {
  /** Unique variable names referenced anywhere in the scanned sources. */
  refs: string[];
  /** How many files were read. */
  filesScanned: number;
}

/** Scan all source files matching the configured globs for env references. */
export async function scanSources(options: {
  cwd: string;
  source: string[];
  exclude: string[];
  patterns: readonly RegExp[];
}): Promise<ScanResult> {
  const files = await glob(options.source, {
    cwd: options.cwd,
    ignore: options.exclude,
    absolute: true,
    onlyFiles: true,
    dot: false,
  });

  const refs = new Set<string>();
  let filesScanned = 0;

  for (const file of files) {
    let content: string;
    try {
      content = await readFile(file, 'utf8');
    } catch {
      continue;
    }
    filesScanned += 1;
    for (const name of scanContent(content, options.patterns)) {
      refs.add(name);
    }
  }

  return { refs: [...refs], filesScanned };
}
