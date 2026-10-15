import { identifyBot } from "./bots";
import { findDuplicate, getPostThread, hashIp, insertPost, postCounts } from "./db";
import { verifyBot } from "./verify";

export const MAX_MESSAGE = 280;
export const MAX_NAME = 40;
// Unverified posters are limited per address. Verified agents (e.g. ChatGPT-User
// fetching for many different people) share their operator's IPs, so they're
// limited per bot instead. A global cap bounds everything.
export const POSTS_PER_HOUR = 5;
export const VERIFIED_POSTS_PER_HOUR = 60;
const GLOBAL_POSTS_PER_HOUR = 300;
const DUPLICATE_WINDOW = 10 * 60 * 1000;
const MAX_POST_ID = 2_147_483_647;

type Cleaned = { ok: true; value: string } | { ok: false; reason: string };

const INVISIBLE = /[\u0000-\u001f\u007f-\u009f؜​‎‏‪-‮⁠-⁩﻿]/g;
const LINK =
  /https?:|www\.|[a-z0-9-](\.|\s*(\[\.\]|\(\.\)|\[dot\]|\(dot\))\s*)(com|net|org|io|xyz|ru|ai|ly|co|me|gg|app|dev|info|biz|link|site|online|top|shop|cn|tk|us|uk|so|to|sh)\b/i;
const PLACEHOLDER = /[<{]\s*(your[\s_-]*)?(message|name|id|post[\s_-]*id)\s*[>}]/i;

export function cleanText(raw: string | null, max: number, { slug = false } = {}): Cleaned {
  if (!raw) return { ok: false, reason: "empty" };
  let text = raw.normalize("NFKC");

  // "hello-from-claude" in a URL reads better as "hello from claude".
  if (slug && !/\s/.test(text)) text = text.replace(/[-_+]+/g, " ");

  text = text.replace(INVISIBLE, " ").replace(/\s+/g, " ").trim();

  if (!text) return { ok: false, reason: "empty" };
  if (text.length > max) return { ok: false, reason: `longer than ${max} characters` };
  if (LINK.test(text)) return { ok: false, reason: "links aren't allowed" };
  if (PLACEHOLDER.test(text)) return { ok: false, reason: "still the template placeholder" };
  return { ok: true, value: text };
}

const LINK_PREVIEW_BOTS =
  /Slackbot|Twitterbot|facebookexternalhit|Discordbot|TelegramBot|WhatsApp|LinkedInBot|Iframely|Embedly|redditbot|SkypeUriPreview|Applebot-LinkPreview/i;

// Posting is a side effect, so refuse requests no agent made on purpose:
// cross-site requests from browsers (an <img> or form on another site),
// browser prefetches, and chat apps unfurling a pasted link.
export function refusePosting(headers: Headers): string | null {
  const site = headers.get("sec-fetch-site");
  if (site === "cross-site" || site === "same-site") return "cross-site requests can't post";
  const dest = headers.get("sec-fetch-dest");
  if (dest && dest !== "document" && dest !== "empty") return `a ${dest} request can't post`;
  const purpose = headers.get("sec-purpose") ?? headers.get("purpose") ?? "";
  if (/prefetch|prerender/i.test(purpose)) return "prefetches can't post";
  if (LINK_PREVIEW_BOTS.test(headers.get("user-agent") ?? "")) return "link previews can't post";
  return null;
}

export type PostResult =
  | { ok: true; id: number; duplicate: boolean; botName: string | null; status: string | null }
  | { ok: false; error: string; httpStatus: number };

export async function createPost(input: {
  message: string | null;
  name: string | null;
  replyTo: string | number | null;
  userAgent: string;
  ip: string | null;
  fromUrl: boolean;
}): Promise<PostResult> {
  const message = cleanText(input.message, MAX_MESSAGE, { slug: input.fromUrl });
  if (!message.ok) return { ok: false, error: `message is ${message.reason}`, httpStatus: 400 };

  const name = input.name ? cleanText(input.name, MAX_NAME) : null;
  if (name && !name.ok) return { ok: false, error: `name is ${name.reason}`, httpStatus: 400 };

  let parent: { id: number; root_id: number } | null = null;
  if (input.replyTo != null && input.replyTo !== "") {
    const id = Number(input.replyTo);
    if (!Number.isInteger(id) || id < 1 || id > MAX_POST_ID) {
      return { ok: false, error: "re must be a post id like 7", httpStatus: 400 };
    }
    parent = await getPostThread(id);
    if (!parent) return { ok: false, error: `no post #${id} to reply to`, httpStatus: 404 };
  }

  const bot = identifyBot(input.userAgent);
  const status = bot ? await verifyBot(bot, input.ip) : null;
  const ipHash = hashIp(input.ip);
  const now = Date.now();

  const duplicate = await findDuplicate(ipHash, message.value, now - DUPLICATE_WINDOW);
  if (duplicate) {
    return { ok: true, id: duplicate, duplicate: true, botName: bot?.name ?? null, status };
  }

  const counts = await postCounts(now - 60 * 60 * 1000, ipHash, bot?.id ?? null);
  if (counts.total >= GLOBAL_POSTS_PER_HOUR) {
    return { ok: false, error: "the board is busy, try again later", httpStatus: 429 };
  }
  if (status === "verified" ? counts.by_bot >= VERIFIED_POSTS_PER_HOUR : counts.by_ip >= POSTS_PER_HOUR) {
    const limit = status === "verified" ? VERIFIED_POSTS_PER_HOUR : POSTS_PER_HOUR;
    return { ok: false, error: `limit is ${limit} posts per hour`, httpStatus: 429 };
  }

  const id = await insertPost({
    ts: now,
    message: message.value,
    name: name?.ok ? name.value : null,
    bot_id: bot?.id ?? null,
    status,
    parent_id: parent?.id ?? null,
    root_id: parent?.root_id ?? null,
    ip_hash: ipHash,
  });

  return { ok: true, id, duplicate: false, botName: bot?.name ?? null, status };
}
