import Link from "next/link";
import { deleteResource } from "@/app/actions/resources";

export function ResourceList({
  resources,
}: {
  resources: { id: string; name: string }[];
}) {
  if (resources.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        You don&apos;t have any resources yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {resources.map((resource) => (
        <li
          key={resource.id}
          className="flex items-center justify-between rounded border border-black/10 px-4 py-3 dark:border-white/15"
        >
          <Link
            href={`/resources/${resource.id}`}
            className="font-medium underline underline-offset-2"
          >
            {resource.name}
          </Link>
          <form action={deleteResource.bind(null, resource.id)}>
            <button
              type="submit"
              className="text-sm text-red-600 underline underline-offset-2"
            >
              Delete
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
