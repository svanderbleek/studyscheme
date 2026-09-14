import { prisma } from "@/lib/db";
import { extractPairs } from "@/lib/ai/extract-pairs";

const MIN_PAIRS_PER_ROUND = 4;

export async function getOrExtractPairs(resourceId: string) {
  const existing = await prisma.pair.findMany({ where: { resourceId } });
  if (existing.length >= MIN_PAIRS_PER_ROUND) return existing;

  const resource = await prisma.resource.findUniqueOrThrow({
    where: { id: resourceId },
  });
  const rawPairs = await extractPairs(resource.content);

  return prisma.$transaction(async (tx) => {
    await tx.pair.deleteMany({ where: { resourceId } });
    await tx.pair.createMany({
      data: rawPairs.map((pair) => ({
        resourceId,
        sentenceA: pair.sentenceA,
        sentenceB: pair.sentenceB,
      })),
    });
    return tx.pair.findMany({ where: { resourceId } });
  });
}
