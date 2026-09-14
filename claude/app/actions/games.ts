"use server";

import { redirect } from "next/navigation";
import { getResource } from "@/app/actions/resources";
import { getOrExtractPairs } from "@/lib/cache/pairs-cache";

export async function generatePairs(resourceId: string) {
  await getResource(resourceId);
  await getOrExtractPairs(resourceId);
  redirect(`/resources/${resourceId}`);
}
