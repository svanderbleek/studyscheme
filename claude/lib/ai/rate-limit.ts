import { headers } from "next/headers";
import { prisma } from "@/lib/db";

const MAX_PER_IP = 5; // AI extraction events per IP, ever

export class RateLimitExceededError extends Error {}

async function getClientIp(): Promise<string> {
  const forwardedFor = (await headers()).get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

export async function checkAiRateLimit(): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;

  const ip = await getClientIp();
  const record = await prisma.aiRateLimit.findUnique({ where: { ip } });

  if (record && record.count >= MAX_PER_IP) {
    throw new RateLimitExceededError(
      "AI extraction rate limit reached for this network.",
    );
  }

  await prisma.aiRateLimit.upsert({
    where: { ip },
    create: { ip, count: 1 },
    update: { count: { increment: 1 } },
  });
}
