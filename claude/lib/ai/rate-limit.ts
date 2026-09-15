import { headers } from "next/headers";
import { prisma } from "@/lib/db";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 5; // AI extraction events per IP per window

export class RateLimitExceededError extends Error {}

async function getClientIp(): Promise<string> {
  const forwardedFor = (await headers()).get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

export async function checkAiRateLimit(): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;

  const ip = await getClientIp();
  const now = new Date();
  const record = await prisma.aiRateLimit.findUnique({ where: { ip } });

  if (!record || now.getTime() - record.windowStart.getTime() > WINDOW_MS) {
    await prisma.aiRateLimit.upsert({
      where: { ip },
      create: { ip, windowStart: now, count: 1 },
      update: { windowStart: now, count: 1 },
    });
    return;
  }

  if (record.count >= MAX_PER_WINDOW) {
    throw new RateLimitExceededError(
      "AI extraction rate limit reached for this network. Try again later.",
    );
  }

  await prisma.aiRateLimit.update({
    where: { ip },
    data: { count: { increment: 1 } },
  });
}
