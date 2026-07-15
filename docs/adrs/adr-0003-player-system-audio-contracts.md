# ADR-0003: Player System Audio Contract Boundary

- Date: 2026-07-12
- Status: Accepted

## Context

The Player System needs stable speech-domain contracts for narrated responses,
localized one-shot cues, and repeating warnings. If each host defines these
channels and combat behavior independently, priority, ducking, suppression, and
fallback behavior will drift between the site and package consumers.

The package must remain provider- and runtime-independent. Raw narration text,
provider credentials, audio assets, playback engines, and feature-flag fetching
must remain outside the public contract package.

## Decision

`@plasius/ai-speech` owns immutable metadata contracts for the three audio
channels and deterministic policy evaluation over caller-supplied state. The
contracts use opaque IDs and locales, reuse the Player System priority
vocabulary, require explicit ducking and combat-safe delivery behavior, and
bound repeating-warning intervals and frequencies.

The policy is fail-closed when `harmony.player-system.audio.enabled` is absent or
false, when audio is muted, when a dispatch is duplicated, or when combat-safe
mode suppresses its priority. Critical audio bypasses ducking; normal and low
priority audio are suppressed during combat-safe mode; narration may be
condensed or deferred according to its contract.

Hosts own feature-flag evaluation, translations, asset resolution, playback,
captions, and non-audio accessibility fallbacks.

## Alternatives considered

- Keep the audio channel model in each host: rejected because consumers would
  reinterpret priority and combat-safe rules independently.
- Store raw narration text in the package contract: rejected because it would
  increase privacy and telemetry exposure without helping playback adapters.
- Depend on a playback engine or provider SDK: rejected because native, server,
  browser, and test consumers need the same portable contract surface.

## Impact and validation

- Public consumers can construct and evaluate deterministic, bounded dispatch
  metadata without runtime dependencies.
- The package remains compatible with existing TTS cache and voice-tier APIs.
- Unit tests cover channel separation, validation bounds, rollout fail-closed
  behavior, combat-safe reduction, critical ducking bypass, duplicate
  suppression, and mute handling.
- Release remains the normal package CI and approved `cd.yml` path; no provider
  or runtime deployment is introduced by this decision.
