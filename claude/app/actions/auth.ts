"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
}

export async function createOrResumeUser(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();

  if (!name) return;

  const user = await prisma.user.upsert({
    where: { name },
    update: {},
    create: { name },
  });

  const session = await getSession();
  session.userId = user.id;
  await session.save();
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect("/");
}
