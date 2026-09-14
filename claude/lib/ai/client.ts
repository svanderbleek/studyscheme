import Anthropic from "@anthropic-ai/sdk";

// Resolves ANTHROPIC_API_KEY from the environment.
export const anthropic = new Anthropic();

// Extraction is bounded summarization, not frontier reasoning — use the
// cheapest tier to keep the recurring per-resource cost low.
export const MODEL = "claude-haiku-4-5-20251001";
