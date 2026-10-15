import dns from "node:dns/promises";
import net from "node:net";
import type { Bot } from "./bots";

// verified: the request came from an IP the operator says belongs to the bot
// claimed:  identity wasn't checked (no published method, or the check failed to run)
// spoofed:  the user-agent claims to be the bot, but the IP doesn't belong to it
export type Status = "verified" | "claimed" | "spoofed";

const HOUR = 60 * 60 * 1000;
const MAX_CACHE = 5000;
const resultCache = new Map<string, { status: Status; expires: number }>();
const listCache = new Map<string, { prefixes: string[] | null; expires: number }>();

export async function verifyBot(bot: Bot, ip: string | null): Promise<Status> {
  if (!ip || bot.verify.kind === "none") return "claimed";

  const key = `${bot.id}|${ip}`;
  const cached = resultCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.status;

  const status =
    bot.verify.kind === "ip-list"
      ? await checkIpList(bot.verify.urls, ip)
      : await checkReverseDns(bot.verify.domains, ip);

  // "claimed" here means the check couldn't run; retry soon rather than in a day.
  if (resultCache.size >= MAX_CACHE) resultCache.clear();
  resultCache.set(key, { status, expires: Date.now() + (status === "claimed" ? HOUR / 6 : 24 * HOUR) });
  return status;
}

async function checkIpList(urls: string[], ip: string): Promise<Status> {
  const lists = await Promise.all(urls.map(loadPrefixes));
  if (lists.every((list) => list === null)) return "claimed";
  const prefixes = lists.flatMap((list) => list ?? []);
  return prefixes.some((cidr) => inCidr(ip, cidr)) ? "verified" : "spoofed";
}

// null means the list couldn't be fetched. Failures are cached briefly so an
// outage doesn't add a 5-second wait to every request.
async function loadPrefixes(url: string): Promise<string[] | null> {
  const cached = listCache.get(url);
  if (cached && cached.expires > Date.now()) return cached.prefixes;

  let prefixes: string[] | null = null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const json = (await res.json()) as {
        prefixes?: { ipv4Prefix?: string; ipv6Prefix?: string }[];
      };
      const list = (json.prefixes ?? [])
        .map((p) => p.ipv4Prefix ?? p.ipv6Prefix)
        .filter((p): p is string => Boolean(p));
      if (list.length > 0) prefixes = list;
    }
  } catch {
    // fall through with null
  }
  listCache.set(url, { prefixes, expires: Date.now() + (prefixes ? 6 * HOUR : HOUR / 6) });
  return prefixes;
}

// Forward-confirmed reverse DNS: the IP's hostname must end in the operator's
// domain, and that hostname must resolve back to the same IP.
async function checkReverseDns(domains: string[], ip: string): Promise<Status> {
  let hostnames: string[];
  try {
    hostnames = await dns.reverse(ip);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    return code === "ENOTFOUND" || code === "ENODATA" ? "spoofed" : "claimed";
  }

  const host = hostnames.find((h) =>
    domains.some((d) => h === d || h.endsWith(`.${d}`)),
  );
  if (!host) return "spoofed";

  try {
    const addresses = await dns.lookup(host, { all: true });
    const target = parseIp(ip);
    const matches = addresses.some((a) => {
      const parsed = parseIp(a.address);
      return parsed && target && parsed.n === target.n && parsed.v === target.v;
    });
    return matches ? "verified" : "spoofed";
  } catch {
    return "claimed";
  }
}

function ipv4ToBigInt(ip: string): bigint {
  return ip.split(".").reduce((acc, o) => (acc << 8n) + BigInt(o), 0n);
}

function parseIp(raw: string): { v: 4 | 6; n: bigint } | null {
  let ip = raw.trim().split("%")[0];
  if (ip.toLowerCase().startsWith("::ffff:") && net.isIPv4(ip.slice(7))) {
    ip = ip.slice(7);
  }
  if (net.isIPv4(ip)) return { v: 4, n: ipv4ToBigInt(ip) };
  if (!net.isIPv6(ip)) return null;

  // An embedded IPv4 tail (e.g. 64:ff9b::1.2.3.4) becomes two hex groups.
  const lastColon = ip.lastIndexOf(":");
  const last = ip.slice(lastColon + 1);
  if (net.isIPv4(last)) {
    const n = ipv4ToBigInt(last);
    ip = `${ip.slice(0, lastColon + 1)}${(n >> 16n).toString(16)}:${(n & 0xffffn).toString(16)}`;
  }

  let groups: string[];
  if (ip.includes("::")) {
    const [head, rest] = ip.split("::");
    const h = head ? head.split(":") : [];
    const t = rest ? rest.split(":") : [];
    const fill = 8 - h.length - t.length;
    if (fill < 0) return null;
    groups = [...h, ...Array(fill).fill("0"), ...t];
  } else {
    groups = ip.split(":");
  }
  if (groups.length !== 8) return null;
  return {
    v: 6,
    n: groups.reduce((acc, g) => (acc << 16n) + BigInt(parseInt(g, 16) || 0), 0n),
  };
}

function inCidr(ip: string, cidr: string): boolean {
  const [base, bitsRaw] = cidr.split("/");
  const a = parseIp(ip);
  const b = parseIp(base);
  if (!a || !b || a.v !== b.v) return false;
  const width = a.v === 4 ? 32 : 128;
  const bits = bitsRaw === undefined ? width : Number(bitsRaw);
  if (!Number.isInteger(bits) || bits < 0 || bits > width) return false;
  const all = (1n << BigInt(width)) - 1n;
  const mask = all ^ ((1n << BigInt(width - bits)) - 1n);
  return (a.n & mask) === (b.n & mask);
}
