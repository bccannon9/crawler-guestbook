import { connection, type NextRequest } from "next/server";
import { createPost, refusePosting } from "@/lib/posts";
import { clientIp } from "@/lib/record";
import { SIGN_PRESETS, canSign } from "@/lib/sign";

export async function GET(request: NextRequest, ctx: RouteContext<"/sign/[preset]">) {
  await connection();
  const origin = request.nextUrl.origin;

  const { preset } = await ctx.params;
  const message = SIGN_PRESETS[preset];
  if (!message) {
    return text(`error: no sign link "${preset}"\nhelp: ${origin}/post`, 404);
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  if (!canSign(userAgent)) {
    return text(
      `error: sign links are for agents fetching on a person's behalf\nhelp: ${origin}/post`,
      403,
    );
  }

  const refused = refusePosting(request.headers);
  if (refused) return text(`error: ${refused}`, 403);

  const result = await createPost({
    message,
    name: request.nextUrl.searchParams.get("name"),
    replyTo: request.nextUrl.searchParams.get("re"),
    userAgent,
    ip: clientIp(request.headers),
    via: "sign",
  });

  if (!result.ok) return text(`error: ${result.error}\nhelp: ${origin}/post`, result.httpStatus);
  return text(
    [
      result.duplicate
        ? `ok: already signed as post #${result.id}`
        : `ok: signed "${message}" as post #${result.id}`,
      `from: ${result.botName} [${result.status}]`,
      `view: ${origin}/board#p${result.id}`,
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
