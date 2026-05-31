# Security Policy

## env-doctor's core security property

env-doctor exists to make environment-variable contracts honest **without ever
handling secret values**. The tool reports variable **names** and their
presence/absence only. By design it never reads, prints, copies, logs, or
persists a *value* from `.env`, `.env.example`, or any other env file.

This property is:

- **Enforced in code** — values are discarded inside the parser
  ([`src/parser.ts`](./src/parser.ts)) and never reach a reporter or file writer.
- **Tested** — [`test/no-secret-leak.test.ts`](./test/no-secret-leak.test.ts)
  seeds canary secret values (including a multiline private key) and asserts no
  value appears in any command, any format, or any file env-doctor writes.

If you ever observe an actual env **value** in env-doctor's output, that is a
security vulnerability. Please report it.

## Reporting a vulnerability

Please **do not** open a public issue for anything that involves a real secret
value or a leak of values.

Instead, use GitHub's private vulnerability reporting:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability** (GitHub Private Vulnerability Reporting).
3. Include reproduction steps. **Do not include real secrets** — use redacted or
   synthetic values that still reproduce the issue.

You can expect an acknowledgement, and we'll work with you on a fix and
coordinated disclosure. As a small project there is no formal SLA, but
value-leak reports are treated as the highest priority.

## Supported versions

env-doctor is pre-1.0. Security fixes are applied to the latest released
version. Pin to a tag (e.g. `anthill24/env-doctor@v0.1.0`) when using the Action.

## Scope notes

- env-doctor reads files you point it at and scans your source for variable
  references. It makes no network requests.
- Detection is regex-based; false positives/negatives in *name* detection are
  correctness bugs, not security issues — please file those as normal issues.
