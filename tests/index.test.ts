import { describe, expect, it } from "vitest";

import {
  AI_SPEECH_DEFAULT_PLAYER_LABEL,
  AI_SPEECH_AUDIO_CHANNELS,
  AI_SPEECH_AUDIO_CUE_FAMILIES,
  AI_SPEECH_ENV_PREFIX,
  AI_SPEECH_FEATURE_FLAGS,
  AI_SPEECH_FEATURE_FLAG_ID,
  AI_SPEECH_PLAYER_SYSTEM_AUDIO_FLAG_ID,
  AI_SPEECH_PACKAGE,
  AI_SPEECH_ROLLOUTS,
  createAiSpeechLocalizedCue,
  createAiSpeechNarratedResponse,
  createAiSpeechRepeatingWarning,
  createAiSpeechCacheKey,
  createAiSpeechNearReuseFingerprint,
  isAiSpeechFeatureEnabled,
  packageDescriptor,
  planAiSpeechCache,
  renderAiSpeechText,
  resolveAiSpeechAudioPolicy,
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

  it("fails closed for unknown feature flag lookups", () => {
    expect(
      isAiSpeechFeatureEnabled("ai.tts.future-flag.enabled" as never, {
        [AI_SPEECH_FEATURE_FLAGS.ttsCache]: true,
      })
    ).toBe(false);
  });
});

describe("ai-speech player address policy", () => {
  it("uses generic player labels as reusable public address text", () => {
    expect(
      resolveAiSpeechPlayerAddress({
        source: "generic-player",
        fallbackLabel: "Hero",
      })
    ).toEqual({
      source: "generic-player",
      renderText: "Hero",
      exactReuseAllowed: true,
      nearReuseAllowed: true,
      redacted: false,
      reasonCodes: ["generic-player-address"],
    });
  });

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

  it("falls back authored character addresses when no safe name is provided", () => {
    expect(
      resolveAiSpeechPlayerAddress({
        source: "authored-character",
        rawValue: "   ",
        fallbackLabel: "Adventurer",
      })
    ).toEqual({
      source: "authored-character",
      renderText: "Adventurer",
      exactReuseAllowed: true,
      nearReuseAllowed: true,
      redacted: false,
      reasonCodes: ["player-address-fell-back-to-generic-label"],
    });
  });

  it("falls back class or faction titles only when their safe title is blank", () => {
    expect(
      resolveAiSpeechPlayerAddress({
        source: "faction-title",
        rawValue: "   ",
        fallbackLabel: "Ally",
      })
    ).toEqual({
      source: "faction-title",
      renderText: "Ally",
      exactReuseAllowed: true,
      nearReuseAllowed: true,
      redacted: false,
      reasonCodes: ["player-address-fell-back-to-generic-label"],
    });

    expect(
      resolveAiSpeechPlayerAddress({
        source: "authored-character",
        rawValue: "Mara",
      })
    ).toMatchObject({
      renderText: "Mara",
      reasonCodes: [],
    });
  });

  it("rejects empty templates and missing player placeholders", () => {
    expect(() => renderAiSpeechText({ textTemplate: "   " })).toThrow(
      "Speech text template must be a non-empty string."
    );
    expect(() =>
      renderAiSpeechText({ textTemplate: "Welcome back, {playerAddress}." })
    ).toThrow(
      "Speech text template requires playerAddress when using the {playerAddress} placeholder."
    );
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

  it("uses a global exact cache when near-reuse is not enabled", () => {
    expect(
      planAiSpeechCache({
        utteranceClass: "system-generic",
        textTemplate: "The server restarts at midnight.",
        voice,
        featureFlags: {
          [AI_SPEECH_FEATURE_FLAGS.ttsCache]: true,
        },
      })
    ).toMatchObject({
      mode: "exact",
      sharingScope: "global",
      reasonCodes: ["near-reuse-disabled-or-ineligible"],
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

  it("defaults to standard voices outside development", () => {
    expect(
      resolveAiSpeechVoiceTier({
        environment: "production",
      })
    ).toEqual({
      requestedTier: "standard",
      resolvedTier: "standard",
      reasonCodes: [],
    });
  });

  it("uses standard voices when development voices are requested outside development", () => {
    expect(
      resolveAiSpeechVoiceTier({
        environment: "production",
        requestedTier: "development",
      })
    ).toEqual({
      requestedTier: "development",
      resolvedTier: "standard",
      fallbackTier: "standard",
      reasonCodes: ["development-voices-limited-to-development-environments"],
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

describe("ai-speech Player System audio contracts", () => {
  const base = {
    id: "system-status",
    priority: "high" as const,
    ducking: "music" as const,
    combatSafeDelivery: "full" as const,
  };

  it("exports separate channels and localized cue families", () => {
    expect(AI_SPEECH_AUDIO_CHANNELS).toEqual([
      "narrated-response",
      "localized-cue",
      "repeating-warning",
    ]);
    expect(AI_SPEECH_AUDIO_CUE_FAMILIES).toContain("tutorial");
    expect(AI_SPEECH_PLAYER_SYSTEM_AUDIO_FLAG_ID).toBe(
      "isekai.player-system.audio.enabled"
    );
  });

  it("creates immutable narrated, localized, and repeating contracts", () => {
    const narration = createAiSpeechNarratedResponse({
      ...base,
      utteranceId: "mission-briefing-1",
      locale: "en-GB",
      combatSafeDelivery: "condensed",
    });
    const cue = createAiSpeechLocalizedCue({
      ...base,
      cueFamily: "tutorial",
      cueId: "tutorial-first-spell",
      locale: "en-GB",
    });
    const warning = createAiSpeechRepeatingWarning({
      ...base,
      priority: "critical",
      warningId: "combat-threat",
      intervalSeconds: 5,
      maximumOccurrencesPerMinute: 6,
    });

    expect(narration.channel).toBe("narrated-response");
    expect(narration.combatSafeDelivery).toBe("condensed");
    expect(cue).toMatchObject({
      channel: "localized-cue",
      cueFamily: "tutorial",
      cueId: "tutorial-first-spell",
    });
    expect(warning).toMatchObject({
      channel: "repeating-warning",
      intervalSeconds: 5,
      maximumOccurrencesPerMinute: 6,
    });
    expect(Object.isFrozen(narration)).toBe(true);
    expect(Object.isFrozen(cue)).toBe(true);
    expect(Object.isFrozen(warning)).toBe(true);
  });

  it("rejects unbounded repeating warning delivery", () => {
    expect(() =>
      createAiSpeechRepeatingWarning({
        ...base,
        warningId: "combat-threat",
        intervalSeconds: 0,
        maximumOccurrencesPerMinute: 6,
      })
    ).toThrow("Warning intervalSeconds must be between 1 and 3600");
    expect(() =>
      createAiSpeechRepeatingWarning({
        ...base,
        warningId: "combat-threat",
        intervalSeconds: 5,
        maximumOccurrencesPerMinute: 61,
      })
    ).toThrow("Warning maximumOccurrencesPerMinute must be between 1 and 60");
  });

  it("rejects unknown audio enum values", () => {
    expect(() =>
      createAiSpeechLocalizedCue({
        ...base,
        cueFamily: "unknown" as never,
        cueId: "unknown-cue",
        locale: "en-GB",
      })
    ).toThrow("Audio cue family is not supported: unknown");
  });

  it("fails closed when audio rollout is missing", () => {
    const decision = resolveAiSpeechAudioPolicy({
      contract: createAiSpeechLocalizedCue({
        ...base,
        cueFamily: "status",
        cueId: "status-ready",
        locale: "en-GB",
      }),
      focusMode: "ambient",
    });

    expect(decision).toEqual({
      deliver: false,
      mode: "deferred",
      ducking: "none",
      reasonCodes: ["player-system-audio-rollout-disabled"],
    });
  });

  it("suppresses lower-priority audio in combat-safe mode", () => {
    const decision = resolveAiSpeechAudioPolicy({
      contract: createAiSpeechLocalizedCue({
        ...base,
        priority: "normal",
        cueFamily: "mission",
        cueId: "mission-progress",
        locale: "en-GB",
      }),
      focusMode: "combat-safe",
      featureFlags: {
        [AI_SPEECH_PLAYER_SYSTEM_AUDIO_FLAG_ID]: true,
      },
    });

    expect(decision).toMatchObject({
      deliver: false,
      reasonCodes: ["combat-safe-priority-suppressed"],
    });
  });

  it("condenses narrated responses and bypasses ducking for critical warnings", () => {
    const narrationDecision = resolveAiSpeechAudioPolicy({
      contract: createAiSpeechNarratedResponse({
        ...base,
        utteranceId: "tutorial-combat-hint",
        locale: "en-GB",
        combatSafeDelivery: "condensed",
      }),
      focusMode: "combat-safe",
      featureFlags: {
        [AI_SPEECH_PLAYER_SYSTEM_AUDIO_FLAG_ID]: true,
      },
    });
    const warningDecision = resolveAiSpeechAudioPolicy({
      contract: createAiSpeechRepeatingWarning({
        ...base,
        priority: "critical",
        warningId: "critical-threat",
        intervalSeconds: 3,
        maximumOccurrencesPerMinute: 10,
      }),
      focusMode: "combat-safe",
      featureFlags: {
        [AI_SPEECH_PLAYER_SYSTEM_AUDIO_FLAG_ID]: true,
      },
    });

    expect(narrationDecision).toMatchObject({
      deliver: true,
      mode: "condensed",
      ducking: "music",
    });
    expect(
      resolveAiSpeechAudioPolicy({
        contract: createAiSpeechNarratedResponse({
          ...base,
          utteranceId: "tutorial-deferred-hint",
          locale: "en-GB",
          combatSafeDelivery: "deferred",
        }),
        focusMode: "combat-safe",
        featureFlags: {
          [AI_SPEECH_PLAYER_SYSTEM_AUDIO_FLAG_ID]: true,
        },
      })
    ).toMatchObject({
      deliver: false,
      mode: "deferred",
    });
    expect(warningDecision).toMatchObject({
      deliver: true,
      mode: "full",
      ducking: "none",
      reasonCodes: ["critical-priority-bypasses-ducking"],
    });
  });

  it("suppresses duplicate and muted dispatches", () => {
    const contract = createAiSpeechLocalizedCue({
      ...base,
      cueFamily: "status",
      cueId: "status-ready",
      locale: "en-GB",
    });
    const enabledFlags = {
      [AI_SPEECH_PLAYER_SYSTEM_AUDIO_FLAG_ID]: true,
    };

    expect(
      resolveAiSpeechAudioPolicy({
        contract,
        focusMode: "focused",
        featureFlags: enabledFlags,
        activeContractIds: [contract.id],
      }).reasonCodes
    ).toEqual(["duplicate-audio-contract-suppressed"]);
    expect(
      resolveAiSpeechAudioPolicy({
        contract,
        focusMode: "focused",
        featureFlags: enabledFlags,
        userMuted: true,
      }).reasonCodes
    ).toEqual(["user-muted"]);
    expect(
      resolveAiSpeechAudioPolicy({
        contract: createAiSpeechLocalizedCue({
          ...base,
          cueFamily: "status",
          cueId: "status-suppressed",
          locale: "en-GB",
          combatSafeDelivery: "suppressed",
        }),
        focusMode: "ambient",
        featureFlags: enabledFlags,
      }).reasonCodes
    ).toEqual(["audio-contract-suppressed"]);
    expect(
      resolveAiSpeechAudioPolicy({
        contract,
        focusMode: "focused",
        featureFlags: enabledFlags,
        masterMuted: true,
      }).reasonCodes
    ).toEqual(["master-muted"]);
  });
});
