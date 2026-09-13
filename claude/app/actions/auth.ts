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
  const emailRaw = String(formData.get("email") ?? "").trim();
  const email = emailRaw.length > 0 ? emailRaw.toLowerCase() : null;

  if (!name) return;

  const user = email
    ? await prisma.user.upsert({
        where: { email },
        update: { name },
        create: { name, email },
      })
    : await prisma.user.create({ data: { name } });

  const session = await getSession();
  session.userId = user.id;
  await session.save();
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect("/");
}
