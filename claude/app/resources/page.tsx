import Link from "next/link";
import { listResources } from "@/app/actions/resources";
import { ResourceList } from "@/components/resources/ResourceList";

export default async function ResourcesPage() {
  const resources = await listResources();

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your Resources</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/play/pairs"
            className="rounded border border-black/15 px-4 py-2 text-sm dark:border-white/20"
          >
            Play Pairs
          </Link>
          <Link
            href="/resources/new"
            className="rounded bg-foreground px-4 py-2 text-sm text-background"
          >
            New Resource
          </Link>
        </div>
      </div>
      <div className="mt-6">
        <ResourceList resources={resources} />
      </div>
    </div>
  );
}
