import { Suspense } from "react";
import { io } from "next/cache";
import Link from "next/link";
import { H, fmtDate } from "@/components/ui";
import { BOTS, type Category } from "@/lib/bots";
import { botSummaries } from "@/lib/db";

export const metadata = { title: "bots · crawler.guestbook" };

const CHECK = { "ip-list": "ip-list", rdns: "rdns", none: "--" } as const;

export default function BotsPage() {
  return (
    <Suspense fallback={<p className="text-dim">loading…</p>}>
      <Guide />
    </Suspense>
  );
}

async function Guide() {
  await io();
  const seen = new Map((await botSummaries()).map((s) => [s.bot_id, s]));
  const categories: Category[] = ["training", "search", "user"];

  return categories.map((category) => (
    <section key={category}>
      <H>{category}</H>
      <div className="border-t border-line">
        {BOTS.filter((b) => b.category === category).map((bot) => {
          const s = seen.get(bot.id);
          return (
            <Link
              key={bot.id}
              href={`/bots/${bot.id}`}
              className={`grid grid-cols-[minmax(0,1fr)_6ch_10ch] gap-x-[1.5ch] border-b border-line py-1 hover:text-accent sm:grid-cols-[22ch_minmax(0,1fr)_8ch_6ch_10ch] ${s ? "" : "text-dim"}`}
            >
              <span className="truncate">{bot.name}</span>
              <span className="hidden truncate text-dim sm:block">{bot.operator}</span>
              <span className="hidden text-dim sm:block">{CHECK[bot.verify.kind]}</span>
              <span className="text-right">{String(s?.visits ?? 0).padStart(4, "0")}</span>
              <span className="text-right text-dim">{s ? fmtDate(s.last_ts).slice(5) : "--"}</span>
            </Link>
          );
        })}
      </div>
    </section>
  ));
}
