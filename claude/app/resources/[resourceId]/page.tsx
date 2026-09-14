import Link from "next/link";
import { getResource } from "@/app/actions/resources";

export default async function ResourceDetailPage(
  props: PageProps<"/resources/[resourceId]">,
) {
  const { resourceId } = await props.params;
  const resource = await getResource(resourceId);

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
    </div>
  );
}
