# Changelog

All notable changes to this project are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [3.0.3] - 2026-11-26

### Changed

- Depends on `@trpc/client` 11.31.4.
- Built and released with pnpm 12.24.0.

## [3.0.2] - 2026-11-26

### Fixed

- An expired setup token now points to where a new one is created instead of failing without
  guidance.
- A failed create is reported as such instead of dereferencing an empty result.

### Changed

- Consumes `@entrolytics/trpc-client` 3.1.1 and `@entrolytics/shared` 3.2.1.
- Dependencies updated to their latest releases; the toolchain moved to tsdown, the oxc tools and
  pnpm 12.23.

[Unreleased]: https://github.com/entrolytics/cli/compare/v3.0.3...HEAD
[3.0.3]: https://github.com/entrolytics/cli/compare/v3.0.2...v3.0.3
[3.0.2]: https://github.com/entrolytics/cli/releases/tag/v3.0.2
