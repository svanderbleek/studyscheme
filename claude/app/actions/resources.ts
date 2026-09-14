"use server";

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/app/actions/auth";

export async function listResources() {
  const user = await requireUser();
  return prisma.resource.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function getResource(resourceId: string) {
  const user = await requireUser();
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, userId: user.id },
  });
  if (!resource) notFound();
  return resource;
}

export async function createResource(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!name || !content) return;

  const resource = await prisma.resource.create({
    data: { userId: user.id, name, content },
  });

  redirect(`/resources/${resource.id}`);
}

export async function updateResource(resourceId: string, formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!name || !content) return;

  const { count } = await prisma.resource.updateMany({
    where: { id: resourceId, userId: user.id },
    data: { name, content },
  });
  if (count === 0) notFound();

  redirect(`/resources/${resourceId}`);
}

export async function deleteResource(resourceId: string) {
  const user = await requireUser();
  await prisma.resource.deleteMany({
    where: { id: resourceId, userId: user.id },
  });
  redirect("/resources");
}
