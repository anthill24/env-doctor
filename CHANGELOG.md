# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-05-31

Initial release.

### Added

- `env-doctor check` — cross-checks code references against `.env.example` and
  `.env`, reporting three buckets (used-but-undocumented, documented-but-unused,
  documented-but-missing-locally). Names only. Exit code driven by `--fail-on`.
- `--format text | json | markdown` for `check`.
- `env-doctor sync` — proposes `.env.example` additions for undocumented
  variables using placeholders; `--write` to apply. Never reads `.env`.
- `env-doctor init` — scaffolds a `.env.example` from code references; `--write`
  / `--force`.
- Default detection for `process.env.X`, `process.env['X']`,
  `import.meta.env.X`, and bracket variants. Custom regex patterns via config.
- Destructuring detection for `const { X } = process.env` / `import.meta.env`
  (renames, defaults and rest elements handled). Toggle with
  `detectDestructuring`.
- `.envdoctorrc.json` configuration (source globs, excludes, ignored names,
  custom patterns, example/local file names, fail-on buckets, placeholder).
- GitHub Action (`action.yml`) that writes a names-only summary to
  `$GITHUB_STEP_SUMMARY` and fails the build on undocumented variables
  (configurable).
- Programmatic API exported from the package entry point.
- **Names-only safety guarantee**, enforced in code and verified by a dedicated
  no-secret-leak test suite.

[Unreleased]: https://github.com/anthill24/env-doctor/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/anthill24/env-doctor/releases/tag/v0.1.0
