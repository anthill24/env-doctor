import type { Analysis } from './analyze.js';

export type OutputFormat = 'text' | 'json' | 'markdown';

export interface ReportMeta {
  exampleFile: string;
  localFile: string;
  filesScanned: number;
}

/**
 * Every formatter in this module emits variable NAMES only. Values are never
 * available here — `Analysis` carries names, not values — but we keep this
 * invariant explicit because this is the user-facing output boundary.
 */

export function isClean(analysis: Analysis): boolean {
  return (
    analysis.usedButUndocumented.length === 0 &&
    analysis.documentedButUnused.length === 0 &&
    analysis.documentedButMissingLocally.length === 0
  );
}

export function formatJson(analysis: Analysis): string {
  const payload = {
    ok: isClean(analysis),
    usedButUndocumented: analysis.usedButUndocumented,
    documentedButUnused: analysis.documentedButUnused,
    documentedButMissingLocally: analysis.documentedButMissingLocally,
    counts: {
      used: analysis.used.length,
      documented: analysis.documented.length,
      local: analysis.hasLocal ? analysis.local.length : null,
    },
  };
  return JSON.stringify(payload, null, 2);
}

function textSection(symbol: string, heading: string, names: string[]): string[] {
  if (names.length === 0) return [];
  const lines = [`${symbol}  ${heading} (${names.length})`];
  for (const name of names) {
    lines.push(`     ${name}`);
  }
  lines.push('');
  return lines;
}

export function formatText(analysis: Analysis, meta: ReportMeta): string {
  const lines: string[] = ['env-doctor — environment variable check', ''];

  if (isClean(analysis)) {
    lines.push(`✔  ${meta.exampleFile} is in sync with the code.`);
  } else {
    lines.push(
      ...textSection(
        '✖',
        `Referenced in code but missing from ${meta.exampleFile}`,
        analysis.usedButUndocumented,
      ),
      ...textSection(
        '⚠',
        `In ${meta.exampleFile} but never referenced in code`,
        analysis.documentedButUnused,
      ),
    );
    if (analysis.hasLocal) {
      lines.push(
        ...textSection(
          '⚠',
          `In ${meta.exampleFile} but missing from ${meta.localFile}`,
          analysis.documentedButMissingLocally,
        ),
      );
    }
  }

  if (!analysis.hasLocal) {
    lines.push(`(no ${meta.localFile} found — skipped the local check)`);
  }
  lines.push(
    `Scanned ${meta.filesScanned} source file${meta.filesScanned === 1 ? '' : 's'}.`,
  );

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
}

function markdownSection(heading: string, exampleFile: string, names: string[]): string[] {
  if (names.length === 0) return [];
  const lines = ['', `### ${heading.replace('{example}', `\`${exampleFile}\``)}`];
  for (const name of names) {
    lines.push(`- \`${name}\``);
  }
  return lines;
}

export function formatMarkdown(analysis: Analysis, meta: ReportMeta): string {
  const lines: string[] = ['## env-doctor', ''];

  if (isClean(analysis)) {
    lines.push(`✔ \`${meta.exampleFile}\` is in sync with the code.`);
  } else {
    lines.push(
      '| Check | Count |',
      '| --- | ---: |',
      `| Referenced in code but missing from \`${meta.exampleFile}\` | ${analysis.usedButUndocumented.length} |`,
      `| In \`${meta.exampleFile}\` but never referenced in code | ${analysis.documentedButUnused.length} |`,
    );
    if (analysis.hasLocal) {
      lines.push(
        `| In \`${meta.exampleFile}\` but missing from \`${meta.localFile}\` | ${analysis.documentedButMissingLocally.length} |`,
      );
    }
    lines.push(
      ...markdownSection(
        'Referenced in code but missing from {example}',
        meta.exampleFile,
        analysis.usedButUndocumented,
      ),
      ...markdownSection(
        'In {example} but never referenced in code',
        meta.exampleFile,
        analysis.documentedButUnused,
      ),
    );
    if (analysis.hasLocal) {
      lines.push(
        ...markdownSection(
          'In {example} but missing from `' + meta.localFile + '`',
          meta.exampleFile,
          analysis.documentedButMissingLocally,
        ),
      );
    }
  }

  lines.push('', `_Scanned ${meta.filesScanned} source file${meta.filesScanned === 1 ? '' : 's'}. Variable names only — no values are ever shown._`);
  return lines.join('\n');
}
