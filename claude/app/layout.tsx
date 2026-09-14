import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getCurrentUser, logout } from "@/app/actions/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudyScheme",
  description: "Play games to study your resources.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="flex items-center justify-between border-b border-black/10 px-6 py-4 dark:border-white/15">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold">
              StudyScheme
            </Link>
            {user && (
              <Link href="/resources" className="text-sm underline underline-offset-2">
                Resources
              </Link>
            )}
          </div>
          {user && (
            <div className="flex items-center gap-3 text-sm">
              <span>{user.name}</span>
              <form action={logout}>
                <button type="submit" className="underline underline-offset-2">
                  Log out
                </button>
              </form>
            </div>
          )}
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
