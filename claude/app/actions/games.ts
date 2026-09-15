"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/app/actions/auth";
import { getResource } from "@/app/actions/resources";
import { prisma } from "@/lib/db";
import { getOrExtractPairs } from "@/lib/cache/pairs-cache";
import { InsufficientContentError } from "@/lib/ai/extract-pairs";
import { PAIRS_ROUND_SIZE } from "@/lib/games/constants";

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

export interface PairsGameStart {
  gameSessionId: string | null;
  pairs: PairData[];
}

export async function startPairsGame(): Promise<PairsGameStart> {
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

  if (pairs.length < PAIRS_ROUND_SIZE) {
    return { gameSessionId: null, pairs };
  }

  const gameSession = await prisma.gameSession.create({
    data: { userId: user.id },
  });

  return { gameSessionId: gameSession.id, pairs };
}

export async function recordPairResult(
  gameSessionId: string,
  pairId: string,
  correct: boolean,
) {
  const user = await requireUser();
  const session = await prisma.gameSession.findFirst({
    where: { id: gameSessionId, userId: user.id },
  });
  if (!session) return;

  await prisma.$transaction([
    prisma.gameSession.update({
      where: { id: gameSessionId },
      data: correct
        ? { correctCount: { increment: 1 } }
        : { incorrectCount: { increment: 1 } },
    }),
    ...(correct
      ? []
      : [prisma.pairAttempt.create({ data: { gameSessionId, pairId } })]),
  ]);
}
