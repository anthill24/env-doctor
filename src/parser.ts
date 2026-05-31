/**
 * A dotenv-style parser that returns ONLY variable names.
 *
 * SAFETY BOUNDARY
 * ----------------
 * This module is the single place env-doctor reads `.env`-style files. It
 * extracts variable NAMES and deliberately discards every VALUE. No value a
 * user keeps in `.env`/`.env.example` is ever returned, so no value can reach
 * a reporter, formatter, or file writer downstream.
 *
 * The line grammar mirrors dotenv so that quoted and multiline values are
 * consumed as a unit by the regex — which means the inner lines of a multiline
 * secret can never be mistaken for additional variable names.
 *
 * See test/no-secret-leak.test.ts for the property test that enforces this.
 */

// Matches `KEY = value`, optional `export ` prefix, and single/double/backtick
// quoted values (including multiline). Capture group 1 is the variable name;
// group 2 is the value and is intentionally never read.
const LINE =
  /(?:^|^)\s*(?:export\s+)?([\w.-]+)\s*=\s*?('(?:\\'|[^'])*'|"(?:\\"|[^"])*"|`(?:\\`|[^`])*`|[^#\r\n]*)?\s*(?:#.*)?(?:$|$)/gm;

/**
 * Parse the contents of a `.env`-style file and return the unique variable
 * names it declares, in first-seen order. Values are never returned.
 */
export function parseEnvKeys(content: string): string[] {
  const normalized = content.replace(/\r\n?/g, '\n');
  // Fresh RegExp per call: `lastIndex` state must not leak between invocations.
  const re = new RegExp(LINE.source, LINE.flags);
  const keys: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(normalized)) !== null) {
    const key = match[1];
    if (key) {
      keys.push(key);
    }
    // Guard against zero-width matches looping forever on pathological input.
    if (match.index === re.lastIndex) {
      re.lastIndex += 1;
    }
  }
  return [...new Set(keys)];
}
