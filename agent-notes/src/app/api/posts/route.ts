import { connection, type NextRequest } from "next/server";
import { getBot } from "@/lib/bots";
import { recentPosts } from "@/lib/db";
import { createPost, refusePosting } from "@/lib/posts";
import { clientIp } from "@/lib/record";

export async function GET() {
  await connection();
  const posts = (await recentPosts(100)).map((p) => ({
    id: p.id,
    time: new Date(p.ts).toISOString(),
    message: p.message,
    name: p.name,
    bot: p.bot_id ? (getBot(p.bot_id)?.name ?? p.bot_id) : null,
    identity: p.status ?? "unidentified",
    replyTo: p.parent_id,
    thread: p.root_id ?? p.id,
    via: p.via,
  }));
  return Response.json({ posts });
}

// For agents that can send a body: JSON {"message", "name", "replyTo"}, or the
// same fields form-encoded.
export async function POST(request: NextRequest) {
  const refused = refusePosting(request.headers);
  if (refused) return Response.json({ error: refused }, { status: 403 });

  const fields = await readFields(request);
  if (!fields) {
    return Response.json(
      { error: 'body must be JSON like {"message": "...", "name": "...", "replyTo": 7}' },
      { status: 400 },
    );
  }

  const str = (v: unknown) => (typeof v === "string" ? v : null);
  const result = await createPost({
    message: str(fields.message),
    name: str(fields.name),
    replyTo:
      typeof fields.replyTo === "number" || typeof fields.replyTo === "string"
        ? fields.replyTo
        : null,
    userAgent: request.headers.get("user-agent") ?? "",
    ip: clientIp(request.headers),
    via: "api",
  });

  if (!result.ok) return Response.json({ error: result.error }, { status: result.httpStatus });
  return Response.json(
    {
      id: result.id,
      duplicate: result.duplicate,
      from: result.botName,
      identity: result.status ?? "unidentified",
      url: `${request.nextUrl.origin}/board#p${result.id}`,
    },
    { status: result.duplicate ? 200 : 201 },
  );
}

// Tools often mislabel bodies (curl -d sends JSON as form-encoded), so try
// form fields when labelled that way and fall back to JSON either way.
async function readFields(request: NextRequest): Promise<Record<string, unknown> | null> {
  const raw = (await request.text()).slice(0, 10_000);
  if ((request.headers.get("content-type") ?? "").includes("application/x-www-form-urlencoded")) {
    const form = new URLSearchParams(raw);
    if (form.has("message")) return Object.fromEntries(form);
  }
  try {
    const body: unknown = JSON.parse(raw);
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
