export interface AiPackageDescriptor {
  readonly packageName: string;
  readonly featureFlagId: string;
  readonly envPrefix: string;
  readonly summary: string;
}

function requireNonEmptyString(value: string, label: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  return trimmed;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

export const AI_SPEECH_PACKAGE = "@plasius/ai-speech";
export const AI_SPEECH_ENV_PREFIX = "AI_SPEECH";

export const AI_SPEECH_FEATURE_FLAGS = {
  ttsCache: "ai.tts.cache.enabled",
  ttsNearReuse: "ai.tts.near-reuse.enabled",
  premiumCharacters: "ai.tts.premium-characters.enabled",
} as const;

export type AiSpeechFeatureFlagKey =
  (typeof AI_SPEECH_FEATURE_FLAGS)[keyof typeof AI_SPEECH_FEATURE_FLAGS];

export type AiSpeechFeatureFlagSnapshot = Readonly<
  Record<string, boolean | undefined>
>;

export const AI_SPEECH_FEATURE_FLAG_ID = AI_SPEECH_FEATURE_FLAGS.ttsCache;

export const AI_SPEECH_ROLLOUT_EVALUATORS = [
  "remote-flag-service",
  "host-application",
  "break-glass-env",
] as const;

export type AiSpeechRolloutEvaluator =
  (typeof AI_SPEECH_ROLLOUT_EVALUATORS)[number];

export const AI_SPEECH_ROLLOUT_FALLBACK_MODES = [
  "fail-closed",
  "fail-open",
] as const;

export type AiSpeechRolloutFallbackMode =
  (typeof AI_SPEECH_ROLLOUT_FALLBACK_MODES)[number];

export interface AiSpeechRolloutControl {
  readonly featureFlag: AiSpeechFeatureFlagKey;
  readonly evaluator: AiSpeechRolloutEvaluator;
  readonly defaultEnabled: boolean;
  readonly fallbackMode: AiSpeechRolloutFallbackMode;
}

export interface AiSpeechRolloutDecision extends AiSpeechRolloutControl {
  readonly enabled: boolean;
  readonly source: "snapshot" | "default";
}

export const AI_SPEECH_ROLLOUTS = Object.freeze({
  ttsCache: Object.freeze<AiSpeechRolloutControl>({
    featureFlag: AI_SPEECH_FEATURE_FLAGS.ttsCache,
    evaluator: "remote-flag-service",
    defaultEnabled: false,
    fallbackMode: "fail-closed",
  }),
  ttsNearReuse: Object.freeze<AiSpeechRolloutControl>({
    featureFlag: AI_SPEECH_FEATURE_FLAGS.ttsNearReuse,
    evaluator: "remote-flag-service",
    defaultEnabled: false,
    fallbackMode: "fail-closed",
  }),
  premiumCharacters: Object.freeze<AiSpeechRolloutControl>({
    featureFlag: AI_SPEECH_FEATURE_FLAGS.premiumCharacters,
    evaluator: "remote-flag-service",
    defaultEnabled: false,
    fallbackMode: "fail-closed",
  }),
});

export function resolveAiSpeechRolloutDecision(
  control: AiSpeechRolloutControl,
  snapshot: AiSpeechFeatureFlagSnapshot = {}
): AiSpeechRolloutDecision {
  const resolved = snapshot[control.featureFlag];
  if (typeof resolved === "boolean") {
    return {
      ...control,
      enabled: resolved,
      source: "snapshot",
    };
  }

  return {
    ...control,
    enabled: control.defaultEnabled,
    source: "default",
  };
}

export function isAiSpeechFeatureEnabled(
  featureFlag: AiSpeechFeatureFlagKey,
  snapshot: AiSpeechFeatureFlagSnapshot = {}
): boolean {
  const control = Object.values(AI_SPEECH_ROLLOUTS).find(
    (candidate) => candidate.featureFlag === featureFlag
  );

  if (!control) {
    return false;
  }

  return resolveAiSpeechRolloutDecision(control, snapshot).enabled;
}

export const AI_SPEECH_VOICE_TIERS = [
  "development",
  "standard",
  "premium-character",
] as const;

export type AiSpeechVoiceTier = (typeof AI_SPEECH_VOICE_TIERS)[number];

export const AI_SPEECH_ENVIRONMENTS = [
  "development",
  "preview",
  "production",
] as const;

export type AiSpeechEnvironment = (typeof AI_SPEECH_ENVIRONMENTS)[number];

export interface AiSpeechVoiceTierDecision {
  readonly requestedTier: AiSpeechVoiceTier;
  readonly resolvedTier: AiSpeechVoiceTier;
  readonly fallbackTier?: AiSpeechVoiceTier;
  readonly reasonCodes: readonly string[];
}

export interface ResolveAiSpeechVoiceTierInput {
  readonly environment: AiSpeechEnvironment;
  readonly requestedTier?: AiSpeechVoiceTier;
  readonly featureFlags?: AiSpeechFeatureFlagSnapshot;
}

export function resolveAiSpeechVoiceTier(
  input: ResolveAiSpeechVoiceTierInput
): AiSpeechVoiceTierDecision {
  const requestedTier =
    input.requestedTier ??
    (input.environment === "development" ? "development" : "standard");

  if (
    requestedTier === "premium-character" &&
    !isAiSpeechFeatureEnabled(
      AI_SPEECH_FEATURE_FLAGS.premiumCharacters,
      input.featureFlags
    )
  ) {
    return {
      requestedTier,
      resolvedTier: "standard",
      fallbackTier: "standard",
      reasonCodes: ["premium-character-rollout-disabled"],
    };
  }

  if (
    requestedTier === "development" &&
    input.environment !== "development"
  ) {
    return {
      requestedTier,
      resolvedTier: "standard",
      fallbackTier: "standard",
      reasonCodes: ["development-voices-limited-to-development-environments"],
    };
  }

  return {
    requestedTier,
    resolvedTier: requestedTier,
    reasonCodes: [],
  };
}

export const AI_SPEECH_PLAYER_ADDRESS_SOURCES = [
  "generic-player",
  "class-title",
  "faction-title",
  "authored-character",
  "user-name",
  "account-handle",
  "user-renamed-character",
] as const;

export type AiSpeechPlayerAddressSource =
  (typeof AI_SPEECH_PLAYER_ADDRESS_SOURCES)[number];

export const AI_SPEECH_DEFAULT_PLAYER_LABEL = "Player";

export interface AiSpeechPlayerAddressInput {
  readonly source: AiSpeechPlayerAddressSource;
  readonly rawValue?: string;
  readonly fallbackLabel?: string;
}

export interface AiSpeechPlayerAddressDecision {
  readonly source: AiSpeechPlayerAddressSource;
  readonly renderText: string;
  readonly exactReuseAllowed: boolean;
  readonly nearReuseAllowed: boolean;
  readonly redacted: boolean;
  readonly reasonCodes: readonly string[];
}

export function resolveAiSpeechPlayerAddress(
  input: AiSpeechPlayerAddressInput
): AiSpeechPlayerAddressDecision {
  const fallbackLabel =
    normalizeWhitespace(input.fallbackLabel ?? "") ||
    AI_SPEECH_DEFAULT_PLAYER_LABEL;
  const rawValue = normalizeWhitespace(input.rawValue ?? "");

  switch (input.source) {
    case "generic-player":
      return {
        source: input.source,
        renderText: fallbackLabel,
        exactReuseAllowed: true,
        nearReuseAllowed: true,
        redacted: false,
        reasonCodes: ["generic-player-address"],
      };
    case "class-title":
    case "faction-title":
      return {
        source: input.source,
        renderText: rawValue || fallbackLabel,
        exactReuseAllowed: true,
        nearReuseAllowed: true,
        redacted: false,
        reasonCodes: rawValue ? [] : ["player-address-fell-back-to-generic-label"],
      };
    case "authored-character":
      return {
        source: input.source,
        renderText: rawValue || fallbackLabel,
        exactReuseAllowed: true,
        nearReuseAllowed: true,
        redacted: false,
        reasonCodes: rawValue ? [] : ["player-address-fell-back-to-generic-label"],
      };
    case "user-name":
    case "account-handle":
    case "user-renamed-character":
      return {
        source: input.source,
        renderText: fallbackLabel,
        exactReuseAllowed: true,
        nearReuseAllowed: false,
        redacted: true,
        reasonCodes: ["player-identifier-redacted-from-render-text"],
      };
  }
}

export interface AiSpeechRenderTextInput {
  readonly textTemplate: string;
  readonly playerAddress?: AiSpeechPlayerAddressInput;
}

export interface AiSpeechRenderTextResult {
  readonly renderText: string;
  readonly normalizedRenderText: string;
  readonly playerAddress?: AiSpeechPlayerAddressDecision;
}

export function renderAiSpeechText(
  input: AiSpeechRenderTextInput
): AiSpeechRenderTextResult {
  const textTemplate = requireNonEmptyString(
    input.textTemplate,
    "Speech text template"
  );
  const hasPlayerPlaceholder = textTemplate.includes("{playerAddress}");

  if (hasPlayerPlaceholder && !input.playerAddress) {
    throw new Error(
      "Speech text template requires playerAddress when using the {playerAddress} placeholder."
    );
  }

  const playerAddress = input.playerAddress
    ? resolveAiSpeechPlayerAddress(input.playerAddress)
    : undefined;
  const renderText = normalizeWhitespace(
    hasPlayerPlaceholder && playerAddress
      ? textTemplate.replace(/\{playerAddress\}/gu, playerAddress.renderText)
      : textTemplate
  );

  return {
    renderText,
    normalizedRenderText: normalizeAiSpeechText(renderText),
    playerAddress,
  };
}

export function normalizeAiSpeechText(value: string): string {
  return requireNonEmptyString(
    normalizeWhitespace(value).toLocaleLowerCase("en-GB"),
    "Speech text"
  );
}

export const AI_SPEECH_PROVIDER_CACHE_PERMISSIONS = [
  "forbidden",
  "exact-only",
  "exact-and-near",
] as const;

export type AiSpeechProviderCachePermission =
  (typeof AI_SPEECH_PROVIDER_CACHE_PERMISSIONS)[number];

export const AI_SPEECH_CACHE_MODES = [
  "disabled",
  "no-cache",
  "exact",
  "near",
] as const;

export type AiSpeechCacheMode = (typeof AI_SPEECH_CACHE_MODES)[number];

export const AI_SPEECH_CACHE_SCOPES = ["none", "actor", "global"] as const;

export type AiSpeechCacheScope = (typeof AI_SPEECH_CACHE_SCOPES)[number];

export const AI_SPEECH_UTTERANCE_CLASSES = [
  "system-generic",
  "game-npc-dialogue",
  "game-bark",
  "player-address",
  "moderation-notice",
  "private-response",
] as const;

export type AiSpeechUtteranceClass =
  (typeof AI_SPEECH_UTTERANCE_CLASSES)[number];

export const AI_SPEECH_NEAR_REUSE_SAFE_CLASSES = [
  "system-generic",
  "game-npc-dialogue",
  "game-bark",
  "player-address",
] as const satisfies readonly AiSpeechUtteranceClass[];

const AI_SPEECH_NEAR_REUSE_SAFE_CLASS_SET: ReadonlySet<AiSpeechUtteranceClass> =
  new Set(AI_SPEECH_NEAR_REUSE_SAFE_CLASSES);

export interface AiSpeechCacheKeyInput {
  readonly providerId: string;
  readonly modelId: string;
  readonly voiceId: string;
  readonly locale: string;
  readonly format: string;
  readonly pronunciationVersion: string;
  readonly normalizedRenderText: string;
  readonly styleId?: string;
  readonly scopeDiscriminator?: string;
}

export interface AiSpeechVoiceProfileRef {
  readonly providerId: string;
  readonly modelId: string;
  readonly voiceId: string;
  readonly locale: string;
  readonly format: string;
  readonly pronunciationVersion: string;
  readonly styleId?: string;
  readonly cachePermission: AiSpeechProviderCachePermission;
  readonly tier?: AiSpeechVoiceTier;
  readonly profileId?: string;
}

export interface AiSpeechCacheTelemetry {
  readonly cacheHits: number;
  readonly nearCacheHits: number;
  readonly cacheMisses: number;
  readonly charactersSaved: number;
  readonly estimatedCostSavedUsd?: number;
  readonly voiceProfileIds?: readonly string[];
}

export interface PlanAiSpeechCacheInput {
  readonly utteranceClass: AiSpeechUtteranceClass;
  readonly textTemplate: string;
  readonly playerAddress?: AiSpeechPlayerAddressInput;
  readonly voice: AiSpeechVoiceProfileRef;
  readonly featureFlags?: AiSpeechFeatureFlagSnapshot;
  readonly actorScopeKey?: string;
  readonly containsPersonalData?: boolean;
  readonly containsPrivateContext?: boolean;
  readonly containsModerationNotice?: boolean;
}

export interface AiSpeechCachePlan {
  readonly mode: AiSpeechCacheMode;
  readonly sharingScope: AiSpeechCacheScope;
  readonly renderText: string;
  readonly normalizedRenderText: string;
  readonly exactKey?: string;
  readonly nearKey?: string;
  readonly enabledFeatureFlags: readonly AiSpeechFeatureFlagKey[];
  readonly playerAddress?: AiSpeechPlayerAddressDecision;
  readonly reasonCodes: readonly string[];
}

export function createAiSpeechCacheKey(input: AiSpeechCacheKeyInput): string {
  const scopeDiscriminator = normalizeWhitespace(input.scopeDiscriminator ?? "");
  return [
    requireNonEmptyString(input.providerId, "Provider id"),
    requireNonEmptyString(input.modelId, "Model id"),
    requireNonEmptyString(input.voiceId, "Voice id"),
    requireNonEmptyString(input.locale, "Locale"),
    normalizeWhitespace(input.styleId ?? "") || "_",
    requireNonEmptyString(input.format, "Format"),
    requireNonEmptyString(
      input.pronunciationVersion,
      "Pronunciation version"
    ),
    scopeDiscriminator || "global",
    normalizeAiSpeechText(input.normalizedRenderText),
  ]
    .map((segment) => encodeURIComponent(segment))
    .join("::");
}

export function createAiSpeechNearReuseFingerprint(value: string): string {
  const normalized = normalizeAiSpeechText(value)
    .replace(/[^a-z0-9\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

  return requireNonEmptyString(normalized, "Near-reuse fingerprint");
}

export function isAiSpeechNearReuseSafeClass(
  utteranceClass: AiSpeechUtteranceClass
): boolean {
  return AI_SPEECH_NEAR_REUSE_SAFE_CLASS_SET.has(utteranceClass);
}

export function planAiSpeechCache(
  input: PlanAiSpeechCacheInput
): AiSpeechCachePlan {
  const rendered = renderAiSpeechText({
    textTemplate: input.textTemplate,
    playerAddress: input.playerAddress,
  });
  const enabledFeatureFlags: AiSpeechFeatureFlagKey[] = [];
  const cacheEnabled = isAiSpeechFeatureEnabled(
    AI_SPEECH_FEATURE_FLAGS.ttsCache,
    input.featureFlags
  );

  if (!cacheEnabled) {
    return {
      mode: "disabled",
      sharingScope: "none",
      renderText: rendered.renderText,
      normalizedRenderText: rendered.normalizedRenderText,
      enabledFeatureFlags,
      playerAddress: rendered.playerAddress,
      reasonCodes: ["tts-cache-rollout-disabled"],
    };
  }

  enabledFeatureFlags.push(AI_SPEECH_FEATURE_FLAGS.ttsCache);

  if (input.voice.cachePermission === "forbidden") {
    return {
      mode: "no-cache",
      sharingScope: "none",
      renderText: rendered.renderText,
      normalizedRenderText: rendered.normalizedRenderText,
      enabledFeatureFlags,
      playerAddress: rendered.playerAddress,
      reasonCodes: ["provider-forbids-tts-caching"],
    };
  }

  const containsSensitiveContent =
    Boolean(input.containsPersonalData) ||
    Boolean(input.containsPrivateContext) ||
    Boolean(input.containsModerationNotice) ||
    Boolean(rendered.playerAddress?.redacted);
  const actorScopeKey = normalizeWhitespace(input.actorScopeKey ?? "");

  const actorScopeRequired =
    containsSensitiveContent || input.utteranceClass === "private-response";

  if (actorScopeRequired && !actorScopeKey) {
    return {
      mode: "no-cache",
      sharingScope: "none",
      renderText: rendered.renderText,
      normalizedRenderText: rendered.normalizedRenderText,
      enabledFeatureFlags,
      playerAddress: rendered.playerAddress,
      reasonCodes: ["actor-scope-key-required-for-sensitive-cache-entry"],
    };
  }

  const exactKey = createAiSpeechCacheKey({
    ...input.voice,
    normalizedRenderText: rendered.normalizedRenderText,
    scopeDiscriminator: actorScopeRequired ? actorScopeKey : undefined,
  });

  const nearReuseEnabled =
    input.voice.cachePermission === "exact-and-near" &&
    isAiSpeechFeatureEnabled(
      AI_SPEECH_FEATURE_FLAGS.ttsNearReuse,
      input.featureFlags
    ) &&
    isAiSpeechNearReuseSafeClass(input.utteranceClass) &&
    !containsSensitiveContent &&
    (rendered.playerAddress?.nearReuseAllowed ?? true);

  if (!nearReuseEnabled) {
    return {
      mode: "exact",
      sharingScope: actorScopeRequired ? "actor" : "global",
      renderText: rendered.renderText,
      normalizedRenderText: rendered.normalizedRenderText,
      exactKey,
      enabledFeatureFlags,
      playerAddress: rendered.playerAddress,
      reasonCodes: containsSensitiveContent
        ? ["exact-cache-only-for-sensitive-or-redacted-content"]
        : ["near-reuse-disabled-or-ineligible"],
    };
  }

  enabledFeatureFlags.push(AI_SPEECH_FEATURE_FLAGS.ttsNearReuse);

  const nearKey = createAiSpeechCacheKey({
    ...input.voice,
    normalizedRenderText: createAiSpeechNearReuseFingerprint(
      rendered.normalizedRenderText
    ),
  });

  return {
    mode: "near",
    sharingScope: "global",
    renderText: rendered.renderText,
    normalizedRenderText: rendered.normalizedRenderText,
    exactKey,
    nearKey,
    enabledFeatureFlags,
    playerAddress: rendered.playerAddress,
    reasonCodes: ["near-reuse-eligible"],
  };
}

export const AI_SPEECH_PLAYER_SYSTEM_AUDIO_FLAG_ID =
  "isekai.player-system.audio.enabled" as const;

export const AI_SPEECH_AUDIO_CHANNELS = [
  "narrated-response",
  "localized-cue",
  "repeating-warning",
] as const;

export type AiSpeechAudioChannel = (typeof AI_SPEECH_AUDIO_CHANNELS)[number];

export const AI_SPEECH_AUDIO_PRIORITIES = [
  "critical",
  "high",
  "normal",
  "low",
] as const;

export type AiSpeechAudioPriority =
  (typeof AI_SPEECH_AUDIO_PRIORITIES)[number];

export const AI_SPEECH_AUDIO_DUCKING_MODES = [
  "none",
  "music",
  "non-critical",
  "lower-priority",
] as const;

export type AiSpeechAudioDuckingMode =
  (typeof AI_SPEECH_AUDIO_DUCKING_MODES)[number];

export const AI_SPEECH_AUDIO_CUE_FAMILIES = [
  "status",
  "tutorial",
  "mission",
  "mcc",
  "warning",
] as const;

export type AiSpeechAudioCueFamily =
  (typeof AI_SPEECH_AUDIO_CUE_FAMILIES)[number];

export const AI_SPEECH_AUDIO_FOCUS_MODES = [
  "ambient",
  "focused",
  "combat-safe",
] as const;

export type AiSpeechAudioFocusMode =
  (typeof AI_SPEECH_AUDIO_FOCUS_MODES)[number];

export const AI_SPEECH_AUDIO_COMBAT_SAFE_DELIVERIES = [
  "full",
  "condensed",
  "deferred",
  "suppressed",
] as const;

export type AiSpeechAudioCombatSafeDelivery =
  (typeof AI_SPEECH_AUDIO_COMBAT_SAFE_DELIVERIES)[number];

export interface AiSpeechAudioContractBase {
  readonly id: string;
  readonly featureFlagId: typeof AI_SPEECH_PLAYER_SYSTEM_AUDIO_FLAG_ID;
  readonly priority: AiSpeechAudioPriority;
  readonly ducking: AiSpeechAudioDuckingMode;
  readonly combatSafeDelivery: AiSpeechAudioCombatSafeDelivery;
}

export interface AiSpeechNarratedResponseContract
  extends AiSpeechAudioContractBase {
  readonly channel: "narrated-response";
  readonly utteranceId: string;
  readonly locale: string;
}

export interface AiSpeechLocalizedCueContract extends AiSpeechAudioContractBase {
  readonly channel: "localized-cue";
  readonly cueFamily: AiSpeechAudioCueFamily;
  readonly cueId: string;
  readonly locale: string;
}

export interface AiSpeechRepeatingWarningContract
  extends AiSpeechAudioContractBase {
  readonly channel: "repeating-warning";
  readonly warningId: string;
  readonly intervalSeconds: number;
  readonly maximumOccurrencesPerMinute: number;
}

export type AiSpeechAudioContract =
  | AiSpeechNarratedResponseContract
  | AiSpeechLocalizedCueContract
  | AiSpeechRepeatingWarningContract;

export interface AiSpeechAudioContractBaseInput {
  readonly id: string;
  readonly priority: AiSpeechAudioPriority;
  readonly ducking: AiSpeechAudioDuckingMode;
  readonly combatSafeDelivery: AiSpeechAudioCombatSafeDelivery;
}

export interface CreateAiSpeechNarratedResponseInput
  extends AiSpeechAudioContractBaseInput {
  readonly utteranceId: string;
  readonly locale: string;
}

export interface CreateAiSpeechLocalizedCueInput
  extends AiSpeechAudioContractBaseInput {
  readonly cueFamily: AiSpeechAudioCueFamily;
  readonly cueId: string;
  readonly locale: string;
}

export interface CreateAiSpeechRepeatingWarningInput
  extends AiSpeechAudioContractBaseInput {
  readonly warningId: string;
  readonly intervalSeconds: number;
  readonly maximumOccurrencesPerMinute: number;
}

function requireAudioEnum<T extends string>(
  value: T,
  allowed: readonly T[],
  label: string
): T {
  if (!allowed.includes(value)) {
    throw new Error(`${label} is not supported: ${value}.`);
  }

  return value;
}

function requireBoundedAudioNumber(
  value: number,
  minimum: number,
  maximum: number,
  label: string
): number {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(
      `${label} must be between ${minimum} and ${maximum}, inclusive.`
    );
  }

  return value;
}

function createAiSpeechAudioContractBase(
  input: AiSpeechAudioContractBaseInput
): AiSpeechAudioContractBase {
  return {
    id: requireNonEmptyString(input.id, "Audio contract id"),
    featureFlagId: AI_SPEECH_PLAYER_SYSTEM_AUDIO_FLAG_ID,
    priority: requireAudioEnum(
      input.priority,
      AI_SPEECH_AUDIO_PRIORITIES,
      "Audio priority"
    ),
    ducking: requireAudioEnum(
      input.ducking,
      AI_SPEECH_AUDIO_DUCKING_MODES,
      "Audio ducking mode"
    ),
    combatSafeDelivery: requireAudioEnum(
      input.combatSafeDelivery,
      AI_SPEECH_AUDIO_COMBAT_SAFE_DELIVERIES,
      "Combat-safe audio delivery"
    ),
  };
}

export function createAiSpeechNarratedResponse(
  input: CreateAiSpeechNarratedResponseInput
): AiSpeechNarratedResponseContract {
  return Object.freeze({
    ...createAiSpeechAudioContractBase(input),
    channel: "narrated-response" as const,
    utteranceId: requireNonEmptyString(input.utteranceId, "Utterance id"),
    locale: requireNonEmptyString(input.locale, "Locale"),
  });
}

export function createAiSpeechLocalizedCue(
  input: CreateAiSpeechLocalizedCueInput
): AiSpeechLocalizedCueContract {
  return Object.freeze({
    ...createAiSpeechAudioContractBase(input),
    channel: "localized-cue" as const,
    cueFamily: requireAudioEnum(
      input.cueFamily,
      AI_SPEECH_AUDIO_CUE_FAMILIES,
      "Audio cue family"
    ),
    cueId: requireNonEmptyString(input.cueId, "Cue id"),
    locale: requireNonEmptyString(input.locale, "Locale"),
  });
}

export function createAiSpeechRepeatingWarning(
  input: CreateAiSpeechRepeatingWarningInput
): AiSpeechRepeatingWarningContract {
  return Object.freeze({
    ...createAiSpeechAudioContractBase(input),
    channel: "repeating-warning" as const,
    warningId: requireNonEmptyString(input.warningId, "Warning id"),
    intervalSeconds: requireBoundedAudioNumber(
      input.intervalSeconds,
      1,
      3600,
      "Warning intervalSeconds"
    ),
    maximumOccurrencesPerMinute: requireBoundedAudioNumber(
      input.maximumOccurrencesPerMinute,
      1,
      60,
      "Warning maximumOccurrencesPerMinute"
    ),
  });
}

export interface ResolveAiSpeechAudioPolicyInput {
  readonly contract: AiSpeechAudioContract;
  readonly focusMode: AiSpeechAudioFocusMode;
  readonly featureFlags?: AiSpeechFeatureFlagSnapshot;
  readonly masterMuted?: boolean;
  readonly userMuted?: boolean;
  readonly activeContractIds?: readonly string[];
}

export interface AiSpeechAudioPolicyDecision {
  readonly deliver: boolean;
  readonly mode: "full" | "condensed" | "deferred";
  readonly ducking: AiSpeechAudioDuckingMode;
  readonly reasonCodes: readonly string[];
}

function isPlayerSystemAudioEnabled(
  featureFlags: AiSpeechFeatureFlagSnapshot = {}
): boolean {
  return featureFlags[AI_SPEECH_PLAYER_SYSTEM_AUDIO_FLAG_ID] === true;
}

export function resolveAiSpeechAudioPolicy(
  input: ResolveAiSpeechAudioPolicyInput
): AiSpeechAudioPolicyDecision {
  const { contract } = input;

  if (!isPlayerSystemAudioEnabled(input.featureFlags)) {
    return {
      deliver: false,
      mode: "deferred",
      ducking: "none",
      reasonCodes: ["player-system-audio-rollout-disabled"],
    };
  }

  if (input.masterMuted || input.userMuted) {
    return {
      deliver: false,
      mode: "deferred",
      ducking: "none",
      reasonCodes: [input.masterMuted ? "master-muted" : "user-muted"],
    };
  }

  if (input.activeContractIds?.includes(contract.id)) {
    return {
      deliver: false,
      mode: "deferred",
      ducking: "none",
      reasonCodes: ["duplicate-audio-contract-suppressed"],
    };
  }

  if (
    input.focusMode === "combat-safe" &&
    contract.priority !== "critical" &&
    contract.priority !== "high"
  ) {
    return {
      deliver: false,
      mode: "deferred",
      ducking: "none",
      reasonCodes: ["combat-safe-priority-suppressed"],
    };
  }

  if (contract.combatSafeDelivery === "suppressed") {
    return {
      deliver: false,
      mode: "deferred",
      ducking: "none",
      reasonCodes: ["audio-contract-suppressed"],
    };
  }

  const mode =
    input.focusMode === "combat-safe"
      ? contract.combatSafeDelivery === "condensed"
        ? "condensed"
        : contract.combatSafeDelivery === "deferred"
          ? "deferred"
          : "full"
      : "full";
  const ducking = contract.priority === "critical" ? "none" : contract.ducking;

  return {
    deliver: mode !== "deferred",
    mode,
    ducking,
    reasonCodes:
      contract.priority === "critical"
        ? ["critical-priority-bypasses-ducking"]
        : [],
  };
}

export const packageDescriptor: AiPackageDescriptor = Object.freeze({
  packageName: AI_SPEECH_PACKAGE,
  featureFlagId: AI_SPEECH_FEATURE_FLAG_ID,
  envPrefix: AI_SPEECH_ENV_PREFIX,
  summary:
    "Speech orchestration, TTS cache contracts, STT/TTS routing, and voice tier policy for Plasius AI.",
});
