import { createResource } from "@/app/actions/resources";
import { ResourceForm } from "@/components/resources/ResourceForm";

export default function NewResourcePage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold">New Resource</h1>
      <div className="mt-6">
        <ResourceForm action={createResource} submitLabel="Create" />
      </div>
    </div>
  );
}
