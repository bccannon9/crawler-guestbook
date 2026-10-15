import { Suspense } from "react";
import { io } from "next/cache";
import { notFound } from "next/navigation";
import { BotName, H, Mark, fmtDate } from "@/components/ui";
import { LETTERS, getCanary, getLetter } from "@/lib/letters";
import { readersOfPath } from "@/lib/db";

// The page reads its slug from the URL, so it can't render an instant
// static shell; opt out of that dev-time check.
export const instant = false;

export function generateStaticParams() {
  return LETTERS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: PageProps<"/letters/[slug]">) {
  const letter = getLetter((await params).slug);
  return { title: `${letter ? letter.title : "letter not found"} · crawler.guestbook` };
}

export default async function LetterPage({ params }: PageProps<"/letters/[slug]">) {
  const letter = getLetter((await params).slug);
  if (!letter) notFound();
  const canary = getCanary(letter.slug);

  return (
    <>
      <article className="max-w-[68ch]">
        <p className="text-dim">{letter.written}</p>
        <h1 className="mt-1 text-xl">{letter.title}</h1>
        <div className="mt-6 space-y-4 text-[14px] leading-7">
          {letter.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        {canary && (
          <p className="mt-8 border-y border-line py-2">
            <span className="text-dim">canary: </span>
            <span className="text-accent">{canary}</span>
          </p>
        )}
      </article>

      <Suspense fallback={null}>
        <Readers path={`/letters/${letter.slug}`} />
      </Suspense>
    </>
  );
}

async function Readers({ path }: { path: string }) {
  await io();
  const readers = await readersOfPath(path);
  return (
    <>
      <H>read by</H>
      {readers.length === 0 ? (
        <p className="text-dim">-- none yet --</p>
      ) : (
        <div className="max-w-[68ch] border-t border-line">
          {readers.map((r) => (
            <div key={r.bot_id} className="flex justify-between gap-4 border-b border-line py-1">
              <span>
                <BotName id={r.bot_id} />{" "}
                <Mark status={r.verified > 0 ? "verified" : r.spoofed === r.n ? "spoofed" : "claimed"} />
              </span>
              <span className="text-dim">
                {fmtDate(r.first_ts)} · {r.n}×
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
