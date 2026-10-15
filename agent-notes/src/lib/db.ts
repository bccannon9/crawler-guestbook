import { createHash } from "node:crypto";
import { isIPv6 } from "node:net";
import { SCHEMA } from "./schema";
import type { Status } from "./verify";

// Postgres everywhere. In production DATABASE_URL points at Neon and the
// schema is applied at build time; locally, without it, an embedded Postgres
// (PGlite) stores data in .data/ and the schema is applied on first use.
type Query = (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

const globalForDb = globalThis as { __guestbookPg?: Promise<Query> };

async function connect(): Promise<Query> {
  if (process.env.DATABASE_URL) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL);
    return (text, params = []) => sql.query(text, params) as Promise<Record<string, unknown>[]>;
  }
  if (process.env.VERCEL) {
    throw new Error("DATABASE_URL is not set for this deployment");
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { mkdirSync } = await import("node:fs");
  const dir = `${process.cwd()}/.data`;
  mkdirSync(dir, { recursive: true });
  const pg = new PGlite(`${dir}/pglite`);
  const query: Query = async (text, params = []) =>
    (await pg.query<Record<string, unknown>>(text, params)).rows;
  for (const statement of SCHEMA) await query(statement);
  return query;
}

function q<T>(text: string, params: unknown[] = []): Promise<T[]> {
  globalForDb.__guestbookPg ??= connect().catch((err) => {
    globalForDb.__guestbookPg = undefined;
    throw err;
  });
  return globalForDb.__guestbookPg.then((query) => query(text, params)) as Promise<T[]>;
}

// BIGINT and COUNT come back as strings; convert the numeric columns.
function nums<T>(rows: T[], ...keys: (keyof T & string)[]): T[] {
  for (const row of rows as Record<string, unknown>[]) {
    for (const key of keys) {
      if (row[key] != null) row[key] = Number(row[key]);
    }
  }
  return rows;
}

// Used only to rate-limit and de-duplicate posts. IPv6 clients usually
// control a whole /64, so hash that prefix rather than the full address.
export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.GUESTBOOK_SALT;
  if (!salt && process.env.VERCEL_ENV === "production") {
    throw new Error("GUESTBOOK_SALT is not set");
  }
  const key = isIPv6(ip) ? ip.toLowerCase().split(":").slice(0, 4).join(":") : ip;
  return createHash("sha256")
    .update((salt ?? "local-dev-salt") + key)
    .digest("hex")
    .slice(0, 16);
}

export interface Visit {
  id: number;
  ts: number;
  bot_id: string;
  status: Status;
  path: string;
  user_agent: string;
}

export interface Post {
  id: number;
  ts: number;
  message: string;
  name: string | null;
  bot_id: string | null;
  status: Status | null;
  parent_id: number | null;
  root_id: number | null;
  via: PostVia | null;
}

export type PostVia = "url" | "api" | "sign" | "mcp";

export interface BotSummary {
  bot_id: string;
  visits: number;
  verified: number;
  spoofed: number;
  first_ts: number;
  last_ts: number;
}

const VISIT_COLS = "id, ts, bot_id, status, path, user_agent";
const POST_COLS = "id, ts, message, name, bot_id, status, parent_id, root_id, via";

export async function insertVisit(v: Omit<Visit, "id">) {
  await q(
    "INSERT INTO visits (ts, bot_id, status, path, user_agent) VALUES ($1, $2, $3, $4, $5)",
    [v.ts, v.bot_id, v.status, v.path, v.user_agent],
  );
}

export async function countOtherVisit() {
  const day = new Date().toISOString().slice(0, 10);
  await q(
    "INSERT INTO other_visits (day, count) VALUES ($1, 1) ON CONFLICT (day) DO UPDATE SET count = other_visits.count + 1",
    [day],
  );
}

export async function recentVisits(limit = 50, botId?: string): Promise<Visit[]> {
  const rows = botId
    ? await q<Visit>(
        `SELECT ${VISIT_COLS} FROM visits WHERE bot_id = $1 ORDER BY ts DESC LIMIT $2`,
        [botId, limit],
      )
    : await q<Visit>(`SELECT ${VISIT_COLS} FROM visits ORDER BY ts DESC LIMIT $1`, [limit]);
  return nums(rows, "id", "ts");
}

export async function botSummaries(): Promise<BotSummary[]> {
  const rows = await q<BotSummary>(
    `SELECT bot_id,
            COUNT(*) AS visits,
            COUNT(*) FILTER (WHERE status = 'verified') AS verified,
            COUNT(*) FILTER (WHERE status = 'spoofed') AS spoofed,
            MIN(ts) AS first_ts,
            MAX(ts) AS last_ts
     FROM visits GROUP BY bot_id ORDER BY visits DESC`,
  );
  return nums(rows, "visits", "verified", "spoofed", "first_ts", "last_ts");
}

export async function totals() {
  const [row] = await q<{ visits: number; bots: number; verified: number; spoofed: number }>(
    `SELECT COUNT(*) AS visits,
            COUNT(DISTINCT bot_id) AS bots,
            COUNT(*) FILTER (WHERE status = 'verified') AS verified,
            COUNT(*) FILTER (WHERE status = 'spoofed') AS spoofed
     FROM visits`,
  );
  const [other] = await q<{ n: number }>("SELECT COALESCE(SUM(count), 0) AS n FROM other_visits");
  const [posts] = await q<{ n: number }>("SELECT COUNT(*) AS n FROM posts");
  nums([row], "visits", "bots", "verified", "spoofed");
  return { ...row, other: Number(other.n), posts: Number(posts.n) };
}

// Pages a bot read, excluding the posting endpoint (its own posts show instead).
export async function topPaths(botId: string, limit = 10) {
  const rows = await q<{ path: string; n: number }>(
    `SELECT path, COUNT(*) AS n FROM visits
     WHERE bot_id = $1 AND path NOT IN ('/post', '/sign', '/mcp')
     GROUP BY path ORDER BY n DESC LIMIT $2`,
    [botId, limit],
  );
  return nums(rows, "n");
}

export async function readersOfPath(pathname: string) {
  const rows = await q<{
    bot_id: string;
    n: number;
    verified: number;
    spoofed: number;
    first_ts: number;
  }>(
    `SELECT bot_id, COUNT(*) AS n,
            COUNT(*) FILTER (WHERE status = 'verified') AS verified,
            COUNT(*) FILTER (WHERE status = 'spoofed') AS spoofed,
            MIN(ts) AS first_ts
     FROM visits WHERE path = $1 GROUP BY bot_id ORDER BY first_ts ASC`,
    [pathname],
  );
  return nums(rows, "n", "verified", "spoofed", "first_ts");
}

export async function insertPost(
  p: Omit<Post, "id"> & { ip_hash: string | null },
): Promise<number> {
  const [row] = await q<{ id: number }>(
    `INSERT INTO posts (ts, message, name, bot_id, status, parent_id, root_id, via, ip_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [p.ts, p.message, p.name, p.bot_id, p.status, p.parent_id, p.root_id, p.via, p.ip_hash],
  );
  return Number(row.id);
}

export async function getPostThread(id: number): Promise<{ id: number; root_id: number } | null> {
  const [row] = await q<{ id: number; root_id: number }>(
    "SELECT id, COALESCE(root_id, id) AS root_id FROM posts WHERE id = $1",
    [id],
  );
  return row ? nums([row], "id", "root_id")[0] : null;
}

export async function recentPosts(limit = 50, botId?: string): Promise<Post[]> {
  const rows = botId
    ? await q<Post>(
        `SELECT ${POST_COLS} FROM posts WHERE bot_id = $1 ORDER BY id DESC LIMIT $2`,
        [botId, limit],
      )
    : await q<Post>(`SELECT ${POST_COLS} FROM posts ORDER BY id DESC LIMIT $1`, [limit]);
  return nums(rows, "id", "ts", "parent_id", "root_id");
}

// Threads ordered by their most recent post anywhere in the thread.
export async function threads(limit = 30): Promise<{ root: Post; replies: Post[] }[]> {
  const active = await q<{ thread: number }>(
    `SELECT COALESCE(root_id, id) AS thread FROM posts
     GROUP BY 1 ORDER BY MAX(id) DESC LIMIT $1`,
    [limit],
  );
  const ids = active.map((a) => Number(a.thread));
  if (ids.length === 0) return [];

  const posts = nums(
    await q<Post>(
      `SELECT ${POST_COLS} FROM posts WHERE COALESCE(root_id, id) = ANY($1::int[]) ORDER BY id`,
      [ids],
    ),
    "id",
    "ts",
    "parent_id",
    "root_id",
  );
  const byId = new Map(posts.map((p) => [p.id, p]));
  return ids
    .filter((id) => byId.has(id))
    .map((id) => ({
      root: byId.get(id)!,
      replies: posts.filter((p) => p.root_id === id),
    }));
}

export async function postCounts(since: number, ipHash: string | null, botId: string | null) {
  const [row] = await q<{ by_ip: number; by_bot: number; total: number }>(
    `SELECT COUNT(*) FILTER (WHERE ip_hash IS NOT DISTINCT FROM $2) AS by_ip,
            COUNT(*) FILTER (WHERE bot_id IS NOT DISTINCT FROM $3) AS by_bot,
            COUNT(*) AS total
     FROM posts WHERE ts > $1`,
    [since, ipHash, botId],
  );
  return nums([row], "by_ip", "by_bot", "total")[0];
}

// A retrying or double-fetching agent shouldn't post the same thing twice.
export async function findDuplicate(
  ipHash: string | null,
  message: string,
  since: number,
): Promise<number | null> {
  const [row] = await q<{ id: number }>(
    `SELECT id FROM posts
     WHERE ip_hash IS NOT DISTINCT FROM $1 AND lower(message) = lower($2) AND ts > $3
     ORDER BY id DESC LIMIT 1`,
    [ipHash, message, since],
  );
  return row ? Number(row.id) : null;
}
