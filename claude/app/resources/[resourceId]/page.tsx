import Link from "next/link";
import { getResource } from "@/app/actions/resources";
import { generatePairs } from "@/app/actions/games";
import { prisma } from "@/lib/db";

export default async function ResourceDetailPage(
  props: PageProps<"/resources/[resourceId]">,
) {
  const { resourceId } = await props.params;
  const resource = await getResource(resourceId);
  const pairs = await prisma.pair.findMany({
    where: { resourceId: resource.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{resource.name}</h1>
        <Link
          href={`/resources/${resource.id}/edit`}
          className="text-sm underline underline-offset-2"
        >
          Edit
        </Link>
      </div>
      <pre className="mt-6 whitespace-pre-wrap rounded border border-black/10 p-4 text-sm dark:border-white/15">
        {resource.content}
      </pre>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pairs ({pairs.length})</h2>
        <form action={generatePairs.bind(null, resource.id)}>
          <button
            type="submit"
            className="rounded bg-foreground px-4 py-2 text-sm text-background"
          >
            Generate Pairs
          </button>
        </form>
      </div>
      {pairs.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {pairs.map((pair) => (
            <li
              key={pair.id}
              className="rounded border border-black/10 p-3 text-sm dark:border-white/15"
            >
              <p>{pair.sentenceA}</p>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                {pair.sentenceB}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
