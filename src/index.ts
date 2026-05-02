export interface AiPackageDescriptor {
  readonly packageName: string;
  readonly featureFlagId: string;
  readonly envPrefix: string;
  readonly summary: string;
}

export const AI_SPEECH_PACKAGE = "@plasius/ai-speech";
export const AI_SPEECH_FEATURE_FLAG_ID = "ai.speech.enabled";
export const AI_SPEECH_ENV_PREFIX = "AI_SPEECH";

export const packageDescriptor: AiPackageDescriptor = Object.freeze({
  packageName: AI_SPEECH_PACKAGE,
  featureFlagId: AI_SPEECH_FEATURE_FLAG_ID,
  envPrefix: AI_SPEECH_ENV_PREFIX,
  summary: "Speech orchestration, TTS cache contracts, STT/TTS routing, and voice tier policy for Plasius AI.",
});
