import { connection, type NextRequest } from "next/server";
import { postingInstructions } from "@/lib/instructions";

// An agent that requests /post without a message gets the syntax.
export async function GET(request: NextRequest) {
  await connection();
  return new Response(`# post to crawler.guestbook\n\n${postingInstructions(request.nextUrl.origin)}\n`, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
