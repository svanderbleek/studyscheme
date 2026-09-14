import Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODEL } from "@/lib/ai/client";
import { PAIRS_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { PairsToolInputSchema, repairPairs, type RawPair } from "@/lib/ai/schemas";

export const MIN_PAIRS = 2;

const EXTRACT_PAIRS_TOOL: Anthropic.Tool = {
  name: "extract_pairs",
  description: "Record the extracted sentence pairs.",
  input_schema: {
    type: "object",
    properties: {
      pairs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            sentenceA: { type: "string" },
            sentenceB: { type: "string" },
          },
          required: ["sentenceA", "sentenceB"],
        },
      },
    },
    required: ["pairs"],
  },
};

export class InsufficientContentError extends Error {}

export async function extractPairs(content: string): Promise<RawPair[]> {
  const pairs = repairPairs(await requestPairs(content));
  if (pairs.length >= MIN_PAIRS) return pairs;

  const retryPairs = repairPairs(
    await requestPairs(
      content,
      `Your previous attempt did not return enough valid pairs. Extract at least ${MIN_PAIRS} pairs if the text supports it.`,
    ),
  );
  if (retryPairs.length >= MIN_PAIRS) return retryPairs;

  throw new InsufficientContentError(
    "This resource doesn't have enough content to build a Pairs game.",
  );
}

async function requestPairs(
  content: string,
  extraInstruction?: string,
): Promise<RawPair[]> {
  console.log(`[ai] extract-pairs: calling ${MODEL} (${content.length} chars)`);
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: PAIRS_SYSTEM_PROMPT,
    tools: [EXTRACT_PAIRS_TOOL],
    tool_choice: { type: "tool", name: "extract_pairs" },
    messages: [
      {
        role: "user",
        content: extraInstruction
          ? `${extraInstruction}\n\nResource text:\n${content}`
          : `Resource text:\n${content}`,
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) return [];

  const parsed = PairsToolInputSchema.safeParse(toolUse.input);
  return parsed.success ? parsed.data.pairs : [];
}
