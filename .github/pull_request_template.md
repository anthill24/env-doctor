## Summary

<!-- What does this PR change, and why? -->

## Related issues

<!-- e.g. Closes #12 -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Docs
- [ ] Refactor / chore

## Checklist

- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] `node dist/cli.js check` (self-check) exits 0
- [ ] Updated `README.md` / `CHANGELOG.md` if behavior changed

## Safety (names-only guarantee)

env-doctor must never read, print, copy, or persist a **value** from any env file.

- [ ] This change does not cause any env **value** to appear in output or written files.
- [ ] If it touches parsing/reporting/`sync`/`init`, `test/no-secret-leak.test.ts` still passes (and was extended for any new output).
