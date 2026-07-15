# @plasius/ai-speech

Speech orchestration, TTS cache contracts, STT/TTS routing, and voice tier policy for Plasius AI.

## Scope

This package defines public contracts for:

- rollout-controlled TTS cache planning
- cache-safe player address rendering
- development, standard, and premium-character voice tier routing
- cache telemetry payloads
- Player System narrated responses, localized one-shot cues, and repeating warnings
- priority, ducking, suppression, and combat-safe delivery policy

It does not fetch remote feature flags, talk to providers, or store cache entries directly. Host applications and provider adapters remain responsible for runtime I/O.

## Install

```bash
npm install @plasius/ai-speech
```

## Usage

```ts
import {
  AI_SPEECH_FEATURE_FLAGS,
  planAiSpeechCache,
  renderAiSpeechText,
  resolveAiSpeechVoiceTier,
} from "@plasius/ai-speech";

const rendered = renderAiSpeechText({
  textTemplate: "Welcome back, {playerAddress}.",
  playerAddress: {
    source: "user-name",
    rawValue: "Captain Zephod",
  },
});

const cachePlan = planAiSpeechCache({
  utteranceClass: "player-address",
  textTemplate: "Welcome back, {playerAddress}.",
  playerAddress: {
    source: "user-name",
    rawValue: "Captain Zephod",
  },
  voice: {
    providerId: "openai",
    modelId: "gpt-tts-1",
    voiceId: "narrator",
    locale: "en-GB",
    format: "mp3",
    pronunciationVersion: "2026-05",
    cachePermission: "exact-and-near",
  },
  actorScopeKey: "user-42",
  featureFlags: {
    [AI_SPEECH_FEATURE_FLAGS.ttsCache]: true,
    [AI_SPEECH_FEATURE_FLAGS.ttsNearReuse]: true,
  },
});

const voiceTier = resolveAiSpeechVoiceTier({
  environment: "production",
  requestedTier: "premium-character",
  featureFlags: {
    [AI_SPEECH_FEATURE_FLAGS.premiumCharacters]: false,
  },
});

console.log(rendered.renderText);
console.log(cachePlan.mode);
console.log(voiceTier.resolvedTier);
```

## Rollout Controls

- `ai.tts.cache.enabled`: master switch for exact-cache planning
- `ai.tts.near-reuse.enabled`: enables near-text reuse only for approved low-risk utterance classes
- `ai.tts.premium-characters.enabled`: enables premium character voices in production routes

Default behavior is fail-closed when the caller does not provide a remote flag snapshot.

## Player System audio contracts

Player System audio is enabled by the remotely evaluated
`harmony.player-system.audio.enabled` flag. The package keeps the three delivery
channels distinct so hosts can apply separate UX and accessibility behavior:

- `narrated-response` uses an opaque utterance ID and locale; raw speech text
  stays with the host/provider pipeline.
- `localized-cue` uses a stable cue ID, locale, and one of the exported families
  `status`, `tutorial`, `mission`, `mcc`, or `warning`.
- `repeating-warning` requires bounded repeat intervals and per-minute limits.

Contracts carry `critical`, `high`, `normal`, or `low` priority plus an explicit
ducking mode. Critical audio bypasses ducking. Combat-safe policy suppresses
normal and low priority audio, allows high and critical audio, and can condense
or defer narration according to the contract. Rollout-disabled, muted, duplicate,
and explicitly suppressed dispatches fail closed with a reason code.

```ts
import {
  AI_SPEECH_PLAYER_SYSTEM_AUDIO_FLAG_ID,
  createAiSpeechNarratedResponse,
  resolveAiSpeechAudioPolicy,
} from "@plasius/ai-speech";

const narration = createAiSpeechNarratedResponse({
  id: "tutorial-combat-hint",
  utteranceId: "tutorial-combat-hint-v1",
  locale: "en-GB",
  priority: "high",
  ducking: "music",
  combatSafeDelivery: "condensed",
});

const decision = resolveAiSpeechAudioPolicy({
  contract: narration,
  focusMode: "combat-safe",
  featureFlags: {
    [AI_SPEECH_PLAYER_SYSTEM_AUDIO_FLAG_ID]: true,
  },
});
```

## Project Harmony namespace migration

The Project Harmony cutover is a breaking public-contract change. Consumers
moving to the next major release must replace
`isekai.player-system.audio.enabled` with
`harmony.player-system.audio.enabled` before enabling
`harmony.namespace-cutover.enabled`.

The package publishes only the Harmony value. It provides no alias, dual-read
parsing, environment fallback, or runtime translation for the previous product
namespace. Host applications remain responsible for remote flag evaluation.

## Cache Safety Rules

- User names, account handles, and user-renamed character names are redacted to a generic label such as `Player`.
- Near-text reuse is blocked for redacted identifiers, personal data, moderation notices, and private player context.
- Sensitive speech can only produce an actor-scoped exact cache plan when the caller provides an explicit `actorScopeKey`.
- Provider adapters must declare whether they allow no cache, exact-only cache, or exact-plus-near cache decisions.

## Rollback

- Disable `ai.tts.near-reuse.enabled` to force safe callers back to exact-cache planning.
- Disable `ai.tts.cache.enabled` to bypass cache planning entirely.
- Disable `ai.tts.premium-characters.enabled` to downgrade premium character requests to standard voices.
- For namespace rollback, disable `harmony.namespace-cutover.enabled`, restore the previous coordinated package majors, and complete the approved reverse stored-value migration before re-enabling consumers.

## Development

```bash
npm install
npm run build
npm test
npm run test:coverage
npm run pack:check
```

## Governance

- Security policy: [SECURITY.md](./SECURITY.md)
- Code of conduct: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- ADRs: [docs/adrs](./docs/adrs)
- CLA and legal docs: [legal](./legal)

## License

Apache-2.0
