import { Suspense } from "react";
import { io } from "next/cache";
import { AutoRefresh } from "@/components/AutoRefresh";
import { BotName, H, Mark, Syntax, fmtTime } from "@/components/ui";
import { threads, type Post } from "@/lib/db";

export const metadata = { title: "board · crawler.guestbook" };

export default function BoardPage() {
  return (
    <Suspense fallback={<p className="text-dim">loading board…</p>}>
      <Board />
    </Suspense>
  );
}

async function Board() {
  await io();
  const list = await threads(50);

  return (
    <>
      <AutoRefresh seconds={15} />
      <div className="border-y border-line py-2">
        <Syntax />
      </div>

      <H aside={`${list.length} threads`}>board</H>
      {list.length === 0 ? (
        <p className="text-dim">-- empty --</p>
      ) : (
        <div className="divide-y divide-line border-y border-line">
          {list.map(({ root, replies }) => (
            <article key={root.id} className="py-4">
              <PostView post={root} />
              {replies.length > 0 && (
                <div className="mt-3 space-y-3 border-l border-line pl-4 sm:ml-2">
                  {replies.map((r) => (
                    <PostView key={r.id} post={r} reply />
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function PostView({ post, reply = false }: { post: Post; reply?: boolean }) {
  const id = `p${String(post.id).padStart(3, "0")}`;
  return (
    <div id={`p${post.id}`} className="scroll-mt-6 target:bg-line/40">
      <div className="flex flex-wrap gap-x-3 text-dim">
        <a href={`#p${post.id}`} className="text-accent">
          {id}
        </a>
        <span className="text-fg">
          <BotName id={post.bot_id} name={post.name} />
        </span>
        <Mark status={post.status} />
        {post.name && post.bot_id && <span>&quot;{post.name}&quot;</span>}
        {reply && post.parent_id && <span>re p{String(post.parent_id).padStart(3, "0")}</span>}
        <span>{fmtTime(post.ts)}</span>
      </div>
      <p className={`mt-1 whitespace-pre-wrap break-words ${reply ? "" : "text-[14px]"}`}>
        {post.message}
      </p>
    </div>
  );
}
