# AGENTS.md

Guidance for AI coding agents (and humans) working in this repository.

## What this project is

env-doctor is a CLI + GitHub Action that cross-checks a project's
`.env.example` against the environment variables referenced in code and present
in the local `.env`. It reports three buckets: used-but-undocumented,
documented-but-unused, and documented-but-missing-locally.

## The one rule you must never break

**env-doctor reports variable NAMES only. It must never read, print, copy, log,
or persist a VALUE from any env file.**

This is the project's reason to exist and its core safety property. Concretely:

- [`src/parser.ts`](./src/parser.ts) is the **only** place env-file contents are
  parsed. It returns variable names and discards values. Do not add an API that
  returns values from this module.
- `sync`/`init` write **placeholders only** and must never copy a value from
  `.env`. `sync` must not read the local env file at all.
- Every formatter in [`src/report.ts`](./src/report.ts) operates on names.

If you touch parsing, reporting, `sync`, or `init`, you must keep
[`test/no-secret-leak.test.ts`](./test/no-secret-leak.test.ts) passing. If you
add a new command or output format, add it to that test's coverage. The test
seeds canary secret values (including a multiline key) and asserts none appear
in any output.

## Project layout

```
src/
  cli.ts          # arg parsing + dispatch; writes $GITHUB_STEP_SUMMARY
  config.ts       # .envdoctorrc.json loading/validation, fail-on parsing
  parser.ts       # dotenv-style parser — NAMES ONLY (safety boundary)
  patterns.ts     # default reference regexes
  scanner.ts      # glob + scan source for references
  analyze.ts      # compute the three buckets
  report.ts       # text / json / markdown formatters (names only)
  io.ts           # read an env file -> names
  commands/       # check.ts, sync.ts, init.ts
  index.ts        # public library API
  version.ts      # VERSION (kept in sync with package.json by a test)
test/
  fixtures/       # sample projects + env files (excluded from lint/typecheck)
  *.test.ts
```

## Conventions

- **Language/tooling:** TypeScript, ESM, Node 20+. Build with `tsup`, test with
  `vitest`, lint with `eslint` (flat config), typecheck with `tsc --noEmit`.
- **Imports:** relative imports use `.js` extensions (bundler resolution).
- **Pure core, thin CLI:** command functions in `src/commands/*` return result
  objects (output strings + exit code). `cli.ts` does the printing and process
  side effects. Keep it that way so behavior stays unit-testable.
- **Determinism:** bucket output is sorted; keep it stable.

## Before you commit

Run the full local gate (this mirrors CI):

```bash
npm run lint
npm run typecheck
npm run build
npm test
node dist/cli.js check   # self-check / dogfood; must exit 0
```

All must pass. CI runs the same on Node 20 and 22.

## Things to be careful about

- Don't backdate commits or pad history.
- Don't add real secrets, `.env` files with real values, or API keys anywhere.
- Keep `VERSION` in `src/version.ts` equal to `package.json` (a test enforces
  this; bump both together on release).
- New runtime dependencies should be rare and well justified — the value of an
  env-hygiene tool is partly its small, auditable surface.
