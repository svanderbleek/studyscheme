import { getResource, updateResource } from "@/app/actions/resources";
import { ResourceForm } from "@/components/resources/ResourceForm";

export default async function EditResourcePage(
  props: PageProps<"/resources/[resourceId]/edit">,
) {
  const { resourceId } = await props.params;
  const resource = await getResource(resourceId);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Edit Resource</h1>
      <div className="mt-6">
        <ResourceForm
          action={updateResource.bind(null, resource.id)}
          defaultValues={{ name: resource.name, content: resource.content }}
          submitLabel="Save"
        />
      </div>
    </div>
  );
}
