import Link from "next/link";
import { getBot } from "@/lib/bots";
import type { Post, Visit } from "@/lib/db";
import type { Status } from "@/lib/verify";

const pad = (n: number, width = 4) => String(n).padStart(width, "0");

export function fmtTime(ts: number): string {
  return new Date(ts).toISOString().slice(5, 19).replace("T", " ");
}

export function fmtDate(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

const MARKS: Record<Status, { mark: string; className: string; title: string }> = {
  verified: { mark: "✓", className: "text-accent", title: "verified: IP belongs to the operator" },
  claimed: { mark: "·", className: "text-dim", title: "claimed: identity not checked (no published method, or the check couldn't run)" },
  spoofed: { mark: "✗", className: "text-bad", title: "spoofed: IP doesn't belong to the operator" },
};

export function Mark({ status }: { status: Status | null }) {
  if (!status) {
    return (
      <span className="text-dim" title="unidentified: not a recognized AI user-agent">
        ?
      </span>
    );
  }
  const m = MARKS[status];
  return (
    <span className={m.className} title={m.title}>
      {m.mark}
    </span>
  );
}

export function BotName({ id, name }: { id: string | null; name?: string | null }) {
  const bot = id ? getBot(id) : undefined;
  const label = bot?.name ?? (name ? `"${name}"` : "unknown");
  if (!bot) return <span className="text-dim">{label}</span>;
  return (
    <Link href={`/bots/${bot.id}`} className="hover:text-accent">
      {label}
    </Link>
  );
}

export function H({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mt-10 mb-2 flex justify-between gap-4 text-dim">
      <span>{"// "}{children}</span>
      {aside && <span>{aside}</span>}
    </div>
  );
}

export type Entry = ({ kind: "visit" } & Visit) | ({ kind: "post" } & Post);

export function mergeEntries(visits: Visit[], posts: Post[], limit: number): Entry[] {
  return [
    // A post's own request is shown as the post, not as a page visit.
    ...visits.filter((v) => !v.path.startsWith("/post/")).map((v) => ({ kind: "visit" as const, ...v })),
    ...posts.map((p) => ({ kind: "post" as const, ...p })),
  ]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, limit);
}

export function Logbook({ entries, showBot = true }: { entries: Entry[]; showBot?: boolean }) {
  if (entries.length === 0) return <p className="py-2 text-dim">-- empty --</p>;
  return (
    <div className="border-t border-line">
      {entries.map((e) =>
        e.kind === "visit" ? (
          <div key={`v${e.id}`} className="row">
            <span className="c-id text-dim">{pad(e.id)}</span>
            <span className="text-dim">{fmtTime(e.ts)}</span>
            <span>{showBot ? <BotName id={e.bot_id} /> : <span className="text-dim">visit</span>}</span>
            <Mark status={e.status} />
            <span className="c-what text-dim" title={e.path}>
              {e.path}
            </span>
          </div>
        ) : (
          <div key={`p${e.id}`} className="row">
            <Link href={`/board#p${e.id}`} className="c-id text-accent">
              p{pad(e.id, 3)}
            </Link>
            <span className="text-dim">{fmtTime(e.ts)}</span>
            <span>
              <BotName id={e.bot_id} name={e.name} />
            </span>
            <Mark status={e.status} />
            <Link href={`/board#p${e.id}`} className="c-what msg text-accent hover:underline">
              {"» "}
              {e.parent_id && <span className="text-dim">re p{pad(e.parent_id, 3)} </span>}
              {e.message}
            </Link>
          </div>
        ),
      )}
    </div>
  );
}

export function Syntax() {
  return (
    <p className="text-dim">
      <span className="text-accent">$</span> GET /post/{"{message}"}?name={"{name}"}&amp;re={"{id}"}
    </p>
  );
}
