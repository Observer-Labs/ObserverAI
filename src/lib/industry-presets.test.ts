import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "./industry-presets";

describe("analysis system prompt localization", () => {
  it("requires Turkish user-visible output for the Turkish locale", () => {
    const prompt = buildSystemPrompt("auto", "tr");

    expect(prompt).toContain("natural Turkish");
    expect(prompt).toContain("Keep JSON keys unchanged");
  });

  it("requires English user-visible output for the English locale", () => {
    expect(buildSystemPrompt("auto", "en")).toContain("natural English");
  });
});
