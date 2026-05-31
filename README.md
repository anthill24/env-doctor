# env-doctor

[![CI](https://github.com/anthill24/env-doctor/actions/workflows/ci.yml/badge.svg)](https://github.com/anthill24/env-doctor/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)

**Keep your `.env.example` honest.** env-doctor cross-checks the environment
variables your code actually references against your `.env.example` (the
documented contract) and your local `.env`, so a new contributor's first
`npm run dev` doesn't fail on a variable nobody wrote down.

> **Names only, always.** env-doctor reports variable **names** and their
> presence/absence. It **never reads, prints, copies, or logs a value** from any
> env file — not in the terminal, not in JSON, not in CI summaries, not when it
> writes files. This is enforced in code and covered by tests. See
> [Safety guarantee](#safety-guarantee).

---

## The problem

`.env.example` is supposed to be the contract: "here are the variables this
project needs." In practice it drifts:

- Someone adds `process.env.STRIPE_KEY` to the code but forgets to document it →
  the next person clones the repo and hits a confusing runtime crash.
- A variable gets removed from the code but lingers in `.env.example` forever.
- `.env.example` lists `REDIS_URL`, but your local `.env` never got it, so half
  the team is running without a cache and nobody knows.

env-doctor catches all three.

## What it reports

`env-doctor check` produces three buckets — **names only**:

| Bucket | Meaning |
| --- | --- |
| **Used but undocumented** | Referenced in code, missing from `.env.example`. New contributors will hit this. |
| **Documented but unused** | In `.env.example`, never referenced in code. Probably dead config. |
| **Documented but missing locally** | In `.env.example`, missing from your `.env`. Your local setup is incomplete. |

## Install

```bash
# one-off
npx env-doctor check

# or add to your project
npm install --save-dev env-doctor
```

Requires **Node.js 20+**.

> Until env-doctor is published to npm, install it straight from GitHub:
> `npm install --save-dev github:anthill24/env-doctor`.

## Usage

```bash
env-doctor check                  # human-readable report (exit 1 if undocumented vars exist)
env-doctor check --format json    # machine-readable, names only
env-doctor sync                   # preview .env.example additions for undocumented vars
env-doctor sync --write           # apply them (placeholders only, never real values)
env-doctor init                   # scaffold a .env.example from code references
env-doctor init --write           # write it (use --force to overwrite)
```

### `check`

```
$ env-doctor check
env-doctor — environment variable check

✖  Referenced in code but missing from .env.example (2)
     DATABASE_URL
     STRIPE_KEY

⚠  In .env.example but never referenced in code (1)
     LEGACY_FLAG

⚠  In .env.example but missing from .env (1)
     REDIS_URL

Scanned 42 source files.
```

Exit code is `1` when a "failing" bucket is non-empty (by default, *used but
undocumented*), otherwise `0` — perfect for CI. Configure which buckets fail
with `--fail-on`:

```bash
env-doctor check --fail-on undocumented,missing-local
env-doctor check --fail-on none   # report only, never fail
```

### `sync`

Proposes additions to `.env.example` for every variable used in code but not yet
documented. Values are **placeholders** (empty by default) — env-doctor never
reads your `.env`, so a real secret can never end up in the example file.

```bash
env-doctor sync                       # dry run, shows the diff
env-doctor sync --write               # appends NAME= lines to .env.example
env-doctor sync --write --placeholder changeme
```

### `init`

Scaffolds a fresh `.env.example` from the variables your code references.

```bash
env-doctor init            # preview
env-doctor init --write    # create .env.example (refuses to clobber; use --force)
```

### Common options

| Flag | Applies to | Description |
| --- | --- | --- |
| `--cwd <dir>` | all | Run as if in `<dir>`. |
| `--config <path>` | all | Path to a config file. |
| `--format <fmt>` | `check` | `text` (default), `json`, or `markdown`. |
| `--fail-on <list>` | `check` | Comma list of `undocumented,unused,missing-local,none`. |
| `--write` | `sync`, `init` | Write changes to disk. |
| `--force` | `init` | Overwrite an existing example file. |
| `--placeholder <val>` | `sync`, `init` | Placeholder for new variables (default: empty). |

## Safety guarantee

env-doctor is built around one rule: **it only ever handles variable names, never
values.**

- The dotenv parser ([`src/parser.ts`](./src/parser.ts)) is the single place env
  files are read. It extracts **names** and discards every value by
  construction — values never leave that module.
- `sync` and `init` write **placeholders only**; `sync` does not even read your
  local `.env`.
- Every output format (text, JSON, GitHub summary) is built from names only.

This is verified by [`test/no-secret-leak.test.ts`](./test/no-secret-leak.test.ts),
which seeds fixtures with canary secret values (including a multiline private
key) and asserts that **no value ever appears** in any command's output, in any
format, including files written to disk and the CI step summary.

If you ever see a value in env-doctor output, that's a security bug — please
report it (see [SECURITY.md](./SECURITY.md)).

## Configuration

Drop a `.envdoctorrc.json` in your project root (or point at one with
`--config`):

```json
{
  "source": ["src/**/*.{ts,tsx,js,jsx}"],
  "exclude": ["**/node_modules/**", "**/dist/**"],
  "ignore": ["NODE_ENV", "CI"],
  "patterns": ["os\\.environ\\[['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]\\]"],
  "useDefaultPatterns": true,
  "exampleFile": ".env.example",
  "localFile": ".env",
  "failOn": ["undocumented"],
  "placeholder": ""
}
```

| Key | Default | Description |
| --- | --- | --- |
| `source` | `["**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}"]` | Globs of files to scan. |
| `exclude` | `node_modules`, `dist`, `build`, `coverage`, `.git` | Globs to skip. |
| `ignore` | `[]` | Variable **names** to ignore in every bucket. |
| `patterns` | `[]` | Extra reference regexes (one capture group = the name). |
| `useDefaultPatterns` | `true` | Include the built-in JS/TS patterns. |
| `detectDestructuring` | `true` | Detect `const { NAME } = process.env`. |
| `exampleFile` | `.env.example` | The documented contract. |
| `localFile` | `.env` | Your local values. |
| `failOn` | `["undocumented"]` | Buckets that make `check` exit non-zero. |
| `placeholder` | `""` | Placeholder for new vars in `sync`/`init`. |

### Default detection patterns

Out of the box, env-doctor finds:

- `process.env.NAME`
- `process.env['NAME']` / `["NAME"]` / `` [`NAME`] ``
- `import.meta.env.NAME` (Vite-style)
- `import.meta.env['NAME']`
- destructuring: `const { NAME, OTHER: alias, WITH_DEFAULT = '…' } = process.env`
  (also `import.meta.env`) — toggle with `detectDestructuring`

Add `patterns` for other languages or access styles — for example, Python's
`os.environ['NAME']`. Custom patterns are **added** to the defaults unless you
set `"useDefaultPatterns": false`.

### How detection works (and its limits)

Detection is text/regex-based, so it's fast and language-agnostic — but it has
the trade-offs you'd expect:

- References inside **comments or strings** are still matched.
- Dynamic access (`process.env[someVariable]`) can't be resolved statically.
- Destructuring is matched with a regex, so deeply nested or unusual forms may
  be missed; disable it with `"detectDestructuring": false`.

Use `ignore` to silence known false positives.

## GitHub Action

env-doctor ships as a composite Action. It writes a **names-only** summary to
the job summary and fails the build when code references a variable missing from
`.env.example`.

```yaml
# .github/workflows/env-doctor.yml
name: env-doctor
on: [pull_request]

jobs:
  env-contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anthill24/env-doctor@v0.1.0
        with:
          working-directory: '.'
          fail-on: 'undocumented'   # or e.g. 'undocumented,missing-local', or 'none'
```

| Input | Default | Description |
| --- | --- | --- |
| `working-directory` | `.` | Directory to check. |
| `config` | `''` | Path to `.envdoctorrc.json` (relative to `working-directory`). |
| `fail-on` | `undocumented` | Buckets that fail the build, or `none`. |

## Programmatic API

env-doctor is also a library (names-only, same guarantee):

```ts
import { runCheck } from 'env-doctor';

const { analysis, exitCode } = await runCheck({ cwd: process.cwd(), format: 'json' });
console.log(analysis.usedButUndocumented); // string[] of names
```

## Maintenance status

**Status: early / v0.1.0.** This is a young project, actively maintained by its
author. The core (parsing, scanning, the three buckets, and the names-only
guarantee) is tested and stable. APIs may still change before 1.0. Issues and
PRs are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md). No claims are made
about adoption or production use; try it on your own project and judge for
yourself.

## Roadmap

- [ ] First-class Python detection (`os.environ`, `os.getenv`).
- [ ] Detect variables in `docker-compose.yml` / Compose `environment:` blocks.
- [ ] `--verbose` mode showing which files reference each variable (names + paths only).
- [ ] Monorepo / multiple `.env.example` support.

See the [issue tracker](https://github.com/anthill24/env-doctor/issues) for the
current list.

## Contributing

Bug reports, ideas, and PRs are welcome. Start with
[CONTRIBUTING.md](./CONTRIBUTING.md), and please read
[SECURITY.md](./SECURITY.md) before reporting anything that involves a value
appearing in output.

## License

[MIT](./LICENSE) © 2026 Anthony (anthill24)
