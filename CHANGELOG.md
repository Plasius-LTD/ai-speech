# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - Pinned patched transitive npm dependencies to clear the current audit baseline.
  - (placeholder)

## [1.0.0] - 2026-07-15

- **Added**
  - (placeholder)

- **Changed**
  - **Breaking:** replaced the exported Player System audio rollout value from `isekai.player-system.audio.enabled` to `harmony.player-system.audio.enabled`. The next release is a major version and intentionally provides no alias, dual-read parsing, or legacy runtime fallback.

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.7] - 2026-07-12

- **Added**
  - Player System audio contracts for narrated responses, localized cues, repeating warnings, priority/ducking policy, and combat-safe delivery under `isekai.player-system.audio.enabled`.

- **Changed**
  - (none)

- **Fixed**
  - (none)

- **Security**
  - Audio contracts use opaque utterance/cue identifiers and bounded warning delivery; raw speech text and provider credentials remain outside the package.

## [0.1.6] - 2026-06-28

- **Added**
  - (placeholder)

- **Changed**
  - Refreshed development dependency baselines to `@types/node@26.0.1`, `@typescript-eslint/*@8.62.0`, `eslint@10.6.0`, `globals@17.7.0`, and `vitest@4.1.9`.

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.5] - 2026-06-22

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.4] - 2026-06-22

- **Added**
  - rollout-control, player-address, cache-planning, and voice-tier contracts for tracked TTS caching work

- **Changed**
  - the package descriptor now points at the tracked TTS cache feature flag instead of the original scaffold placeholder

- **Fixed**
  - default player-address rendering now redacts user/account identifiers before cache planning

- **Security**
  - near-text reuse is now fail-closed for private, moderated, or identifier-bearing speech unless the caller narrows scope safely

## [0.1.1] - 2026-05-13

- Added initial public package scaffold with governance, legal, docs, build, test, and pack-check baselines.


[0.1.1]: https://github.com/Plasius-LTD/ai-speech/releases/tag/v0.1.1
[0.1.4]: https://github.com/Plasius-LTD/ai-speech/releases/tag/v0.1.4
[0.1.5]: https://github.com/Plasius-LTD/ai-speech/releases/tag/v0.1.5
[0.1.6]: https://github.com/Plasius-LTD/ai-speech/releases/tag/v0.1.6
[0.1.7]: https://github.com/Plasius-LTD/ai-speech/releases/tag/v0.1.7
[1.0.0]: https://github.com/Plasius-LTD/ai-speech/releases/tag/v1.0.0
