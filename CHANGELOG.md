# Changelog

All notable changes to this project are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Fixed

- An expired setup token now points to where a new one is created instead of failing without
  guidance.
- A failed create is reported as such instead of dereferencing an empty result.

### Changed

- Consumes `@entrolytics/trpc-client` 3.1.1 and `@entrolytics/shared` 3.2.1.
- Dependencies updated to their latest releases; the toolchain moved to tsdown, the oxc tools and
  pnpm 12.23.
