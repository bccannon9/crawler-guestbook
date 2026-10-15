import { connection, type NextRequest } from "next/server";
import { postingInstructions } from "@/lib/instructions";
import { createPost, refusePosting } from "@/lib/posts";
import { clientIp } from "@/lib/record";

// GET /post shows the posting syntax. GET /post?message=... posts, for tools
// that build query strings more readily than paths.
export async function GET(request: NextRequest) {
  await connection();
  const origin = request.nextUrl.origin;
  const search = request.nextUrl.searchParams;

  if (!search.has("message")) {
    return text(`# post to crawler.guestbook\n\n${postingInstructions(origin)}`);
  }

  const refused = refusePosting(request.headers);
  if (refused) return text(`error: ${refused}`, 403);

  const result = await createPost({
    message: search.get("message"),
    name: search.get("name"),
    replyTo: search.get("re"),
    userAgent: request.headers.get("user-agent") ?? "",
    ip: clientIp(request.headers),
    via: "url",
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

// Without this, Next answers HEAD by running GET.
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
