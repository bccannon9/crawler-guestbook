import { Suspense } from "react";
import { io } from "next/cache";
import { notFound } from "next/navigation";
import { H, Logbook, fmtDate, mergeEntries } from "@/components/ui";
import { BOTS, getBot } from "@/lib/bots";
import { botSummaries, recentPosts, recentVisits, topPaths } from "@/lib/db";

// The page reads its id from the URL, so it can't render an instant
// static shell; opt out of that dev-time check.
export const instant = false;

export function generateStaticParams() {
  return BOTS.map((bot) => ({ id: bot.id }));
}

export async function generateMetadata({ params }: PageProps<"/bots/[id]">) {
  const bot = getBot((await params).id);
  return { title: `${bot ? bot.name : "unknown bot"} · crawler.guestbook` };
}

export default async function BotPage({ params }: PageProps<"/bots/[id]">) {
  const bot = getBot((await params).id);
  if (!bot) notFound();

  const check =
    bot.verify.kind === "ip-list"
      ? "ip-list"
      : bot.verify.kind === "rdns"
        ? `rdns *.${bot.verify.domains.join(" | *.")}`
        : "none";

  return (
    <>
      <h1 className="text-2xl text-fg">{bot.name}</h1>
      <p className="text-dim">
        {bot.operator} · {bot.category} · check: {check}
      </p>
      {bot.note && <p className="text-dim">note: {bot.note}</p>}
      <Suspense fallback={<p className="mt-6 text-dim">loading…</p>}>
        <Sightings id={bot.id} />
      </Suspense>
    </>
  );
}

async function Sightings({ id }: { id: string }) {
  await io();
  const summary = (await botSummaries()).find((s) => s.bot_id === id);
  if (!summary) return <p className="mt-6 text-dim">-- not yet sighted --</p>;

  const [visits, posts, paths] = await Promise.all([
    recentVisits(60, id),
    recentPosts(20, id),
    topPaths(id),
  ]);

  return (
    <>
      <p className="mt-4 flex flex-wrap gap-x-5 border-y border-line py-2">
        <span>{String(summary.visits).padStart(4, "0")} <span className="text-dim">visits</span></span>
        <span className="text-accent">{summary.verified} <span className="text-dim">✓</span></span>
        <span className="text-bad">{summary.spoofed} <span className="text-dim">✗</span></span>
        <span className="text-dim">first {fmtDate(summary.first_ts)}</span>
        <span className="text-dim">last {fmtDate(summary.last_ts)}</span>
      </p>

      <H>most read</H>
      <div className="border-t border-line">
        {paths.map((p) => (
          <div key={p.path} className="flex justify-between gap-4 border-b border-line py-1">
            <span className="truncate">{p.path}</span>
            <span className="text-dim">{p.n}</span>
          </div>
        ))}
      </div>

      <H>log</H>
      <Logbook entries={mergeEntries(visits, posts, 60)} showBot={false} />
    </>
  );
}
