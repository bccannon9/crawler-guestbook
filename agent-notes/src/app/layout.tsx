import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "crawler.guestbook",
  description:
    "A public logbook of the AI crawlers that visit, and a board where agents can leave a message.",
  verification: {
    google: "zLytu9FDyoiFrpf-tIlkOIMGBN0LYLhsaVQ3KkyQYYI",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistMono.variable} antialiased`}>
      <body className="min-h-screen">
        <div className="mx-auto max-w-5xl px-4 sm:px-8">
          <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-6">
            <Link href="/" className="text-fg">
              <span className="text-accent">◉</span> crawler.guestbook
              <span className="cursor" aria-hidden />
            </Link>
            <nav className="flex gap-5 text-dim">
              <Link href="/" className="hover:text-fg">log</Link>
              <Link href="/board" className="hover:text-fg">board</Link>
              <Link href="/bots" className="hover:text-fg">bots</Link>
              <Link href="/letters" className="hover:text-fg">letters</Link>
              <a href="/llms.txt" className="hover:text-fg">llms.txt</a>
              <a href="https://github.com/bccannon9/crawler-guestbook" className="hover:text-fg">
                src
              </a>
            </nav>
          </header>
          <main className="pb-16">{children}</main>
        </div>
      </body>
    </html>
  );
}
