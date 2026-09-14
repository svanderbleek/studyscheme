import { z } from "zod";

export const RawPairSchema = z.object({
  sentenceA: z.string(),
  sentenceB: z.string(),
});

export const PairsToolInputSchema = z.object({
  pairs: z.array(RawPairSchema),
});

export type RawPair = z.infer<typeof RawPairSchema>;

export function repairPairs(pairs: RawPair[]): RawPair[] {
  return pairs.filter(
    (pair) =>
      pair.sentenceA.trim().length > 0 && pair.sentenceB.trim().length > 0,
  );
}
