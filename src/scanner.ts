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

// Matches object-destructuring from process.env / import.meta.env, including an
// optional TypeScript type annotation. The annotation branch accepts object
// type literals so the captured group stays on the destructuring pattern, not
// the inline type. Illustrative forms (source keys on the right of the arrow)
// — written without the trailing assignment so this comment is not itself
// matched when env-doctor scans its own source:
//   { A, B: localB, C = '...', ...rest }  ->  A, B, C
//   { A }: Record<string, string>         ->  A
//   { A, B }: { A: string; B: string }    ->  A, B
const DESTRUCTURE_RE =
  /\{([^{}]*)\}\s*(?::\s*(?:\{(?:[^{}]|\{[^{}]*\})*\}|[^={}])*)?=\s*(?:process\.env|import\.meta\.env)\b/g;

/**
 * Find variable names introduced by destructuring `process.env` /
 * `import.meta.env`. Renames (`A: local`) yield the source key; defaults
 * (`A = '…'`) yield the key; rest elements (`...rest`) are skipped.
 */
export function scanDestructuring(content: string): string[] {
  const found: string[] = [];
  const re = new RegExp(DESTRUCTURE_RE.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    for (const rawPart of match[1].split(',')) {
      const part = rawPart.trim();
      if (!part || part.startsWith('...')) {
        continue;
      }
      // The source key is the token before any rename (`:`) or default (`=`).
      const name = part.split(/[:=]/, 1)[0].trim();
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        found.push(name);
      }
    }
    if (match.index === re.lastIndex) {
      re.lastIndex += 1;
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
  detectDestructuring?: boolean;
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
    if (options.detectDestructuring) {
      for (const name of scanDestructuring(content)) {
        refs.add(name);
      }
    }
  }

  return { refs: [...refs], filesScanned };
}
