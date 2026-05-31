import { describe, expect, it } from 'vitest';
import { DEFAULT_PATTERNS } from '../src/patterns.js';
import {
  compilePatterns,
  scanContent,
  scanDestructuring,
  scanSources,
} from '../src/scanner.js';
import { fixture } from './util.js';

const defaults = compilePatterns(DEFAULT_PATTERNS);

describe('scanContent', () => {
  it('detects process.env dot access', () => {
    expect(scanContent('const x = process.env.API_KEY;', defaults)).toEqual(['API_KEY']);
  });

  it('detects bracket access with single, double and backtick quotes', () => {
    const src = `process.env['A'];process.env["B"];process.env[\`C\`];`;
    expect(scanContent(src, defaults).sort()).toEqual(['A', 'B', 'C']);
  });

  it('detects import.meta.env access', () => {
    const src = 'import.meta.env.VITE_FLAG + import.meta.env["VITE_OTHER"]';
    expect(scanContent(src, defaults).sort()).toEqual(['VITE_FLAG', 'VITE_OTHER']);
  });

  it('supports custom patterns (e.g. Python os.environ)', () => {
    const python = compilePatterns([
      String.raw`os\.environ\[['"]([A-Za-z_][A-Za-z0-9_]*)['"]\]`,
    ]);
    expect(scanContent("os.environ['DJANGO_KEY']", python)).toEqual(['DJANGO_KEY']);
  });

  it('returns every occurrence (callers dedupe)', () => {
    expect(scanContent('process.env.A; process.env.A;', defaults)).toEqual(['A', 'A']);
  });
});

describe('scanDestructuring', () => {
  it('detects simple destructuring from process.env', () => {
    expect(scanDestructuring('const { A, B } = process.env;').sort()).toEqual(['A', 'B']);
  });

  it('handles renames, defaults and rest elements', () => {
    const src = "const { A, B: localB, C = 'x', ...rest } = process.env;";
    expect(scanDestructuring(src).sort()).toEqual(['A', 'B', 'C']);
  });

  it('detects destructuring from import.meta.env', () => {
    expect(scanDestructuring('const { VITE_X } = import.meta.env')).toEqual(['VITE_X']);
  });

  it('handles a TypeScript type annotation', () => {
    const src = 'const { A }: Record<string, string> = process.env;';
    expect(scanDestructuring(src)).toEqual(['A']);
  });

  it('ignores unrelated destructuring', () => {
    expect(scanDestructuring('const { a, b } = someObject;')).toEqual([]);
  });
});

describe('compilePatterns', () => {
  it('throws a clear error on an invalid regex', () => {
    expect(() => compilePatterns(['([unterminated'])).toThrow(/Invalid reference pattern/);
  });
});

describe('scanSources', () => {
  it('aggregates unique refs across a project', async () => {
    const result = await scanSources({
      cwd: fixture('project-buckets'),
      source: ['**/*.{ts,js}'],
      exclude: ['**/node_modules/**'],
      patterns: defaults,
    });
    expect(result.filesScanned).toBe(1);
    expect(result.refs.sort()).toEqual([
      'API_KEY',
      'BRACKET_VAR',
      'DATABASE_URL',
      'IMPORT_META_FLAG',
      'PORT',
    ]);
  });

  it('combines pattern and destructuring detection when enabled', async () => {
    const result = await scanSources({
      cwd: fixture('project-destructuring'),
      source: ['**/*.{ts,js}'],
      exclude: ['**/node_modules/**'],
      patterns: defaults,
      detectDestructuring: true,
    });
    expect(result.refs.sort()).toEqual([
      'AWS_REGION',
      'DB_HOST',
      'DB_NAME',
      'DB_PORT',
      'VITE_PUBLIC_URL',
    ]);
  });

  it('omits destructured names when detection is disabled', async () => {
    const result = await scanSources({
      cwd: fixture('project-destructuring'),
      source: ['**/*.{ts,js}'],
      exclude: ['**/node_modules/**'],
      patterns: defaults,
      detectDestructuring: false,
    });
    // Only the plain process.env.AWS_REGION reference remains.
    expect(result.refs.sort()).toEqual(['AWS_REGION']);
  });
});
