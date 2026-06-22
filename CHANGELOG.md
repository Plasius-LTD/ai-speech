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
