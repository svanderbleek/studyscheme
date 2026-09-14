import { redirect } from "next/navigation";
import { createOrResumeUser, getCurrentUser } from "@/app/actions/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/resources");
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold">Welcome to StudyScheme</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Enter a name to get started. Using the same name again brings you
          back to that account.
        </p>
        <form action={createOrResumeUser} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Name
            <input
              type="text"
              name="name"
              required
              className="rounded border border-black/15 px-3 py-2 dark:border-white/20"
            />
          </label>
          <button
            type="submit"
            className="rounded bg-foreground px-4 py-2 text-background"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
