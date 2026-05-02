import { describe, expect, it } from "vitest";

import {
  AI_SPEECH_ENV_PREFIX,
  AI_SPEECH_FEATURE_FLAG_ID,
  AI_SPEECH_PACKAGE,
  packageDescriptor,
} from "../src/index.js";

describe("@plasius/ai-speech", () => {
  it("exports the package descriptor contract", () => {
    expect(packageDescriptor.packageName).toBe(AI_SPEECH_PACKAGE);
    expect(packageDescriptor.featureFlagId).toBe(AI_SPEECH_FEATURE_FLAG_ID);
    expect(packageDescriptor.envPrefix).toBe(AI_SPEECH_ENV_PREFIX);
    expect(packageDescriptor.summary.length).toBeGreaterThan(0);
  });
});
