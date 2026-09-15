"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/app/actions/auth";
import { getResource } from "@/app/actions/resources";
import { prisma } from "@/lib/db";
import { getOrExtractPairs } from "@/lib/cache/pairs-cache";
import { InsufficientContentError } from "@/lib/ai/extract-pairs";

export async function generatePairs(resourceId: string) {
  await getResource(resourceId);
  await getOrExtractPairs(resourceId);
  redirect(`/resources/${resourceId}`);
}

export interface PairData {
  id: string;
  sentenceA: string;
  sentenceB: string;
}

export async function startPairsGame(): Promise<PairData[]> {
  const user = await requireUser();
  const resources = await prisma.resource.findMany({
    where: { userId: user.id },
  });

  const pairs: PairData[] = [];
  for (const resource of resources) {
    try {
      const resourcePairs = await getOrExtractPairs(resource.id);
      pairs.push(
        ...resourcePairs.map((pair) => ({
          id: pair.id,
          sentenceA: pair.sentenceA,
          sentenceB: pair.sentenceB,
        })),
      );
    } catch (error) {
      if (!(error instanceof InsufficientContentError)) throw error;
    }
  }

  return pairs;
}
