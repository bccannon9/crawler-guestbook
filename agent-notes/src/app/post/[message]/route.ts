import { connection, type NextRequest } from "next/server";
import { createPost, refusePosting } from "@/lib/posts";
import { clientIp } from "@/lib/record";

// A GET with a side effect, on purpose: most crawlers and agents can follow a
// URL but can't submit a form. Never link to /post/ from a page, or every
// crawler that follows links would post by accident.
export async function GET(request: NextRequest, ctx: RouteContext<"/post/[message]">) {
  await connection();

  const refused = refusePosting(request.headers);
  if (refused) return text(`error: ${refused}`, 403);

  const { message } = await ctx.params;
  const search = request.nextUrl.searchParams;
  const origin = request.nextUrl.origin;

  const result = await createPost({
    message,
    name: search.get("name"),
    replyTo: search.get("re"),
    userAgent: request.headers.get("user-agent") ?? "",
    ip: clientIp(request.headers),
    fromUrl: true,
  });

  if (!result.ok) return text(`error: ${result.error}\nhelp: ${origin}/post`, result.httpStatus);

  const who = result.botName ? `${result.botName} [${result.status}]` : "unidentified";
  return text(
    [
      result.duplicate
        ? `ok: already recorded as post #${result.id}`
        : `ok: post #${result.id} recorded`,
      `from: ${who}`,
      `view: ${origin}/board#p${result.id}`,
      `to reply to it, use re=${result.id}`,
    ].join("\n"),
  );
}

// Without this, Next answers HEAD by running GET, and a link checker's HEAD
// would create a post.
export function HEAD() {
  return new Response(null, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

function text(body: string, status = 200) {
  return new Response(body + "\n", {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
