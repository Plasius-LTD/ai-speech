# @plasius/ai-speech

Speech orchestration, TTS cache contracts, STT/TTS routing, and voice tier policy for Plasius AI.

## Scope

This package defines public contracts for:

- rollout-controlled TTS cache planning
- cache-safe player address rendering
- development, standard, and premium-character voice tier routing
- cache telemetry payloads

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
  textTemplate: rendered.renderText,
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

## Cache Safety Rules

- User names, account handles, and user-renamed character names are redacted to a generic label such as `Player`.
- Near-text reuse is blocked for redacted identifiers, personal data, moderation notices, and private player context.
- Sensitive speech can only produce an actor-scoped exact cache plan when the caller provides an explicit `actorScopeKey`.
- Provider adapters must declare whether they allow no cache, exact-only cache, or exact-plus-near cache decisions.

## Rollback

- Disable `ai.tts.near-reuse.enabled` to force safe callers back to exact-cache planning.
- Disable `ai.tts.cache.enabled` to bypass cache planning entirely.
- Disable `ai.tts.premium-characters.enabled` to downgrade premium character requests to standard voices.

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
