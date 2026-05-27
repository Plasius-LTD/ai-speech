# ADR-0002: TTS Cache, Player Address, and Voice Tier Contracts

- Date: 2026-05-13
- Status: Accepted

## Context

`@plasius/ai-speech` was bootstrapped as a publishable package but only exposed a descriptor constant. Feature `Plasius-LTD/plasius-ltd-site#263` and task `Plasius-LTD/ai-speech#1` require a public contract surface for:

- exact and near-text TTS cache planning
- cache-safe player address rendering
- development, standard, and premium-character voice tier routing
- rollout controls tied to remotely managed feature flags

The package must stay free of secrets, product-only runtime state, and provider credentials while still giving downstream applications enough structure to apply consistent cache and routing decisions.

## Decision

Expose deterministic, package-level contract helpers that operate on caller-supplied metadata only:

- rollout control constants for `ai.tts.cache.enabled`, `ai.tts.near-reuse.enabled`, and `ai.tts.premium-characters.enabled`
- player-address policy helpers that redact user/account identifiers to generic labels by default
- cache-planning helpers that distinguish disabled, no-cache, exact-cache, and near-cache modes
- voice-tier routing helpers that separate development voices from standard and premium-character production tiers
- telemetry shape definitions for cache hit/miss and cost-saved reporting

The package does not fetch feature flags, store cache entries, or talk to speech providers directly. Those concerns remain with host applications and provider adapters.

## Consequences

- Consumers can centralize speech cache policy without embedding product-specific secrets.
- Sensitive player identifiers and private response content are rejected or narrowed to actor-scoped exact cache entries.
- Near-text reuse remains opt-in, rollout-gated, and limited to explicitly safe utterance classes.
- Future provider adapters can depend on this package for contracts without inheriting provider implementation code.
