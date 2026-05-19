import { describe, expect, it } from "vitest";

import {
  AI_SPEECH_DEFAULT_PLAYER_LABEL,
  AI_SPEECH_ENV_PREFIX,
  AI_SPEECH_FEATURE_FLAGS,
  AI_SPEECH_FEATURE_FLAG_ID,
  AI_SPEECH_PACKAGE,
  AI_SPEECH_ROLLOUTS,
  createAiSpeechCacheKey,
  createAiSpeechNearReuseFingerprint,
  isAiSpeechFeatureEnabled,
  packageDescriptor,
  planAiSpeechCache,
  renderAiSpeechText,
  resolveAiSpeechPlayerAddress,
  resolveAiSpeechRolloutDecision,
  resolveAiSpeechVoiceTier,
} from "../src/index.js";

describe("@plasius/ai-speech package descriptor", () => {
  it("exports the package descriptor contract", () => {
    expect(packageDescriptor.packageName).toBe(AI_SPEECH_PACKAGE);
    expect(packageDescriptor.featureFlagId).toBe(AI_SPEECH_FEATURE_FLAG_ID);
    expect(packageDescriptor.envPrefix).toBe(AI_SPEECH_ENV_PREFIX);
    expect(packageDescriptor.summary.length).toBeGreaterThan(0);
  });

  it("uses the tracked feature flags for rollout", () => {
    expect(AI_SPEECH_FEATURE_FLAGS).toEqual({
      ttsCache: "ai.tts.cache.enabled",
      ttsNearReuse: "ai.tts.near-reuse.enabled",
      premiumCharacters: "ai.tts.premium-characters.enabled",
    });
  });
});

describe("ai-speech rollout controls", () => {
  it("fails closed for cache when the snapshot has no value", () => {
    expect(
      resolveAiSpeechRolloutDecision(AI_SPEECH_ROLLOUTS.ttsCache, {})
    ).toMatchObject({
      enabled: false,
      source: "default",
    });
    expect(isAiSpeechFeatureEnabled(AI_SPEECH_FEATURE_FLAGS.ttsCache, {})).toBe(
      false
    );
  });

  it("reads feature state from the remote snapshot", () => {
    expect(
      resolveAiSpeechRolloutDecision(AI_SPEECH_ROLLOUTS.ttsNearReuse, {
        [AI_SPEECH_FEATURE_FLAGS.ttsNearReuse]: true,
      })
    ).toMatchObject({
      enabled: true,
      source: "snapshot",
    });
  });
});

describe("ai-speech player address policy", () => {
  it("redacts user-provided names from default render text", () => {
    expect(
      resolveAiSpeechPlayerAddress({
        source: "user-name",
        rawValue: "Captain Zephod",
      })
    ).toEqual({
      source: "user-name",
      renderText: AI_SPEECH_DEFAULT_PLAYER_LABEL,
      exactReuseAllowed: true,
      nearReuseAllowed: false,
      redacted: true,
      reasonCodes: ["player-identifier-redacted-from-render-text"],
    });
  });

  it("renders cache-safe text with player placeholders", () => {
    expect(
      renderAiSpeechText({
        textTemplate: "Welcome back, {playerAddress}.",
        playerAddress: {
          source: "class-title",
          rawValue: "Ranger",
        },
      })
    ).toEqual({
      renderText: "Welcome back, Ranger.",
      normalizedRenderText: "welcome back, ranger.",
      playerAddress: {
        source: "class-title",
        renderText: "Ranger",
        exactReuseAllowed: true,
        nearReuseAllowed: true,
        redacted: false,
        reasonCodes: [],
      },
    });
  });
});

describe("ai-speech cache contracts", () => {
  const voice = {
    providerId: "openai",
    modelId: "gpt-tts-1",
    voiceId: "narrator",
    locale: "en-GB",
    format: "mp3",
    pronunciationVersion: "2026-05",
    cachePermission: "exact-and-near" as const,
  };

  it("produces deterministic exact cache keys", () => {
    expect(
      createAiSpeechCacheKey({
        ...voice,
        normalizedRenderText: "welcome back, ranger.",
      })
    ).toContain("welcome%20back%2C%20ranger.");
  });

  it("builds a normalized near-reuse fingerprint", () => {
    expect(
      createAiSpeechNearReuseFingerprint("Welcome   back, Ranger!!!")
    ).toBe("welcome back ranger");
  });

  it("returns disabled when the cache flag is off", () => {
    expect(
      planAiSpeechCache({
        utteranceClass: "system-generic",
        textTemplate: "Patch notes are now available.",
        voice,
        featureFlags: {},
      })
    ).toMatchObject({
      mode: "disabled",
      sharingScope: "none",
      reasonCodes: ["tts-cache-rollout-disabled"],
    });
  });

  it("returns a near-reuse plan for safe low-risk speech", () => {
    expect(
      planAiSpeechCache({
        utteranceClass: "game-npc-dialogue",
        textTemplate: "The harbor is open at dawn.",
        voice,
        featureFlags: {
          [AI_SPEECH_FEATURE_FLAGS.ttsCache]: true,
          [AI_SPEECH_FEATURE_FLAGS.ttsNearReuse]: true,
        },
      })
    ).toMatchObject({
      mode: "near",
      sharingScope: "global",
      enabledFeatureFlags: [
        AI_SPEECH_FEATURE_FLAGS.ttsCache,
        AI_SPEECH_FEATURE_FLAGS.ttsNearReuse,
      ],
      reasonCodes: ["near-reuse-eligible"],
    });
  });

  it("falls back to actor-scoped exact cache for redacted player identifiers", () => {
    expect(
      planAiSpeechCache({
        utteranceClass: "player-address",
        textTemplate: "Well met, {playerAddress}.",
        playerAddress: {
          source: "user-renamed-character",
          rawValue: "Starcrusher",
        },
        voice,
        actorScopeKey: "user-42",
        featureFlags: {
          [AI_SPEECH_FEATURE_FLAGS.ttsCache]: true,
          [AI_SPEECH_FEATURE_FLAGS.ttsNearReuse]: true,
        },
      })
    ).toMatchObject({
      mode: "exact",
      sharingScope: "actor",
      renderText: "Well met, Player.",
      reasonCodes: ["exact-cache-only-for-sensitive-or-redacted-content"],
    });
  });

  it("refuses to cache sensitive speech without an actor scope", () => {
    expect(
      planAiSpeechCache({
        utteranceClass: "private-response",
        textTemplate: "Your account recovery code expires in 5 minutes.",
        voice,
        featureFlags: {
          [AI_SPEECH_FEATURE_FLAGS.ttsCache]: true,
        },
        containsPrivateContext: true,
      })
    ).toMatchObject({
      mode: "no-cache",
      sharingScope: "none",
      reasonCodes: ["actor-scope-key-required-for-sensitive-cache-entry"],
    });
  });

  it("requires a non-empty actorScopeKey for sensitive speech", () => {
    expect(
      planAiSpeechCache({
        utteranceClass: "private-response",
        textTemplate: "Your account recovery code expires in 5 minutes.",
        voice,
        actorScopeKey: "   ",
        featureFlags: {
          [AI_SPEECH_FEATURE_FLAGS.ttsCache]: true,
        },
        containsPrivateContext: true,
      })
    ).toMatchObject({
      mode: "no-cache",
      sharingScope: "none",
      reasonCodes: ["actor-scope-key-required-for-sensitive-cache-entry"],
    });
  });

  it("refuses to cache when the provider disallows reuse", () => {
    expect(
      planAiSpeechCache({
        utteranceClass: "system-generic",
        textTemplate: "Hello there.",
        voice: {
          ...voice,
          cachePermission: "forbidden",
        },
        featureFlags: {
          [AI_SPEECH_FEATURE_FLAGS.ttsCache]: true,
        },
      })
    ).toMatchObject({
      mode: "no-cache",
      sharingScope: "none",
      reasonCodes: ["provider-forbids-tts-caching"],
    });
  });
});

describe("ai-speech voice tier routing", () => {
  it("defaults to development voices in development", () => {
    expect(
      resolveAiSpeechVoiceTier({
        environment: "development",
      })
    ).toEqual({
      requestedTier: "development",
      resolvedTier: "development",
      reasonCodes: [],
    });
  });

  it("falls back from premium character voices when rollout is disabled", () => {
    expect(
      resolveAiSpeechVoiceTier({
        environment: "production",
        requestedTier: "premium-character",
        featureFlags: {},
      })
    ).toEqual({
      requestedTier: "premium-character",
      resolvedTier: "standard",
      fallbackTier: "standard",
      reasonCodes: ["premium-character-rollout-disabled"],
    });
  });

  it("keeps premium character voices when rollout is enabled", () => {
    expect(
      resolveAiSpeechVoiceTier({
        environment: "production",
        requestedTier: "premium-character",
        featureFlags: {
          [AI_SPEECH_FEATURE_FLAGS.premiumCharacters]: true,
        },
      })
    ).toEqual({
      requestedTier: "premium-character",
      resolvedTier: "premium-character",
      reasonCodes: [],
    });
  });
});
