export function ResourceForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaultValues?: { name: string; content: string };
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input
          type="text"
          name="name"
          required
          defaultValue={defaultValues?.name}
          className="rounded border border-black/15 px-3 py-2 dark:border-white/20"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Content
        <textarea
          name="content"
          required
          rows={12}
          defaultValue={defaultValues?.content}
          className="rounded border border-black/15 px-3 py-2 font-mono text-sm dark:border-white/20"
        />
      </label>
      <button
        type="submit"
        className="self-start rounded bg-foreground px-4 py-2 text-sm text-background"
      >
        {submitLabel}
      </button>
    </form>
  );
}
