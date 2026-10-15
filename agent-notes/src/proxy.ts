import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { clientIp, recordRequest } from "@/lib/record";

// Every request passes through here. Logging happens after the response is
// sent, so verification lookups never slow a crawler down.
export function proxy(request: NextRequest, event: NextFetchEvent) {
  // A HEAD usually precedes a GET of the same page; count the GET only.
  if (request.method === "HEAD" || request.method === "OPTIONS") return NextResponse.next();

  const info = {
    path: request.nextUrl.pathname,
    userAgent: request.headers.get("user-agent") ?? "",
    ip: clientIp(request.headers),
    isBackground:
      request.headers.has("rsc") || request.headers.has("next-router-prefetch"),
  };

  event.waitUntil(
    recordRequest(info).catch((err) => console.error("guestbook: failed to record", err)),
  );

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
