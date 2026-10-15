import { BOTS, identifyBot } from "./bots";
import { countOtherVisit, insertVisit } from "./db";
import { LETTERS } from "./letters";
import { verifyBot } from "./verify";

export interface RequestInfo {
  path: string;
  userAgent: string;
  ip: string | null;
  // Client-side navigations and prefetches aren't new visits.
  isBackground: boolean;
}

const KNOWN_PATHS = new Set([
  "/",
  "/board",
  "/bots",
  "/letters",
  "/llms.txt",
  "/robots.txt",
  "/sitemap.xml",
  "/post",
  "/sign",
  "/mcp",
  "/api/posts",
  "/api/visits",
  ...BOTS.map((b) => `/bots/${b.id}`),
  ...LETTERS.map((l) => `/letters/${l.slug}`),
]);

// Paths are shown publicly, so only real pages are stored as-is. Post
// messages (accepted or rejected) and made-up URLs never reach the log.
export function publicPath(path: string): string {
  if (path === "/post" || path.startsWith("/post/")) return "/post";
  if (path.startsWith("/sign/")) return "/sign";
  const trimmed = path.length > 1 ? path.replace(/\/+$/, "") : path;
  return KNOWN_PATHS.has(trimmed) ? trimmed : "(unknown)";
}

export async function recordRequest(info: RequestInfo) {
  const bot = identifyBot(info.userAgent);

  if (!bot) {
    if (!info.isBackground && !info.path.startsWith("/api/")) await countOtherVisit();
    return;
  }

  const status = await verifyBot(bot, info.ip);
  await insertVisit({
    ts: Date.now(),
    bot_id: bot.id,
    status,
    path: publicPath(info.path),
    user_agent: info.userAgent.slice(0, 500),
  });
}

// Vercel sets x-vercel-forwarded-for and overwrites x-forwarded-for, so
// neither can be spoofed by the client there.
export function clientIp(headers: Headers): string | null {
  const forwarded = (headers.get("x-vercel-forwarded-for") ?? headers.get("x-forwarded-for"))
    ?.split(",")[0]
    ?.trim();
  return forwarded || headers.get("x-real-ip") || null;
}
