# Contributing to env-doctor

Thanks for your interest! env-doctor is a young, actively maintained project and
contributions are welcome — bug reports, ideas, docs, and code.

## Ground rules

- Be kind and constructive.
- The **names-only safety guarantee is non-negotiable**: env-doctor must never
  read, print, copy, or persist a *value* from any env file. If your change
  touches parsing, reporting, `sync`, or `init`, keep
  [`test/no-secret-leak.test.ts`](./test/no-secret-leak.test.ts) green and extend
  it to cover anything new. See [SECURITY.md](./SECURITY.md) and
  [AGENTS.md](./AGENTS.md).
- Never commit real secrets, real `.env` files, or API keys.

## Getting set up

```bash
git clone https://github.com/anthill24/env-doctor.git
cd env-doctor
npm install
```

Requires Node.js 20+.

## Development workflow

```bash
npm run build       # bundle with tsup -> dist/
npm run dev         # tsup watch mode
npm test            # run the Vitest suite
npm run test:watch  # watch tests
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
```

Before opening a PR, run the full gate (this is exactly what CI checks):

```bash
npm run lint && npm run typecheck && npm run build && npm test && node dist/cli.js check
```

## Adding env-reference detection

Detection patterns live in [`src/patterns.ts`](./src/patterns.ts). Each pattern
is a regex source string with **exactly one capture group** that yields the
variable name. If you add support for a new language or access style:

1. Add the pattern (or document it as user-supplied config).
2. Add a test in [`test/scanner.test.ts`](./test/scanner.test.ts).
3. Add a fixture under `test/fixtures/` if it helps.

## Pull requests

- Branch from `main` (e.g. `feat/python-detection`, `fix/bracket-parsing`).
- Keep PRs focused; one logical change per PR.
- Update `README.md` / `CHANGELOG.md` when behavior changes.
- Fill in the PR template, including the safety checklist.
- All CI checks must pass (Node 20 and 22).

## Reporting bugs and requesting features

Use the [issue templates](https://github.com/anthill24/env-doctor/issues/new/choose).
If a bug involves a **value** showing up in output, please report it privately
as described in [SECURITY.md](./SECURITY.md) instead of opening a public issue.

## License

By contributing, you agree that your contributions are licensed under the
project's [MIT License](./LICENSE).
