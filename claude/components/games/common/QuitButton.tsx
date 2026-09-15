import Link from "next/link";

export function QuitButton() {
  return (
    <Link
      href="/resources"
      className="rounded border border-black/15 px-4 py-2 text-sm dark:border-white/20"
    >
      Quit
    </Link>
  );
}
