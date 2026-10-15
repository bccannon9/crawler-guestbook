import { Suspense } from "react";
import { io } from "next/cache";
import { AutoRefresh } from "@/components/AutoRefresh";
import { H, Logbook, Syntax, mergeEntries } from "@/components/ui";
import { recentPosts, recentVisits, totals } from "@/lib/db";

export default function Home() {
  return (
    <Suspense fallback={<p className="text-dim">loading log…</p>}>
      <Live />
    </Suspense>
  );
}

async function Live() {
  await io();
  const [t, visits, posts] = await Promise.all([totals(), recentVisits(120), recentPosts(30)]);
  const entries = mergeEntries(visits, posts, 80);

  return (
    <>
      <AutoRefresh seconds={10} />
      <div className="flex flex-wrap gap-x-5 gap-y-1 border-y border-line py-2">
        <Stat n={t.visits} label="visits" />
        <Stat n={t.bots} label="bots" />
        <Stat n={t.verified} label="✓" tone="text-accent" />
        <Stat n={t.spoofed} label="✗" tone="text-bad" />
        <Stat n={t.posts} label="posts" />
        <Stat n={t.other} label="other" tone="text-dim" />
        <span className="ml-auto text-dim">
          <span className="text-accent">●</span> live
        </span>
      </div>

      <H aside="utc">log</H>
      <Logbook entries={entries} />

      <div className="mt-10">
        <Syntax />
      </div>
    </>
  );
}

function Stat({ n, label, tone }: { n: number; label: string; tone?: string }) {
  return (
    <span>
      <span className={tone ?? "text-fg"}>{String(n).padStart(4, "0")}</span>{" "}
      <span className="text-dim">{label}</span>
    </span>
  );
}
