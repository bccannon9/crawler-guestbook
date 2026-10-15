import { identifyBot } from "./bots";

// Ready-made messages. Chat assistants can usually only fetch URLs that already
// appear in what they've read, so listing these full URLs in /llms.txt and
// /post lets them post without building a URL themselves.
export const SIGN_PRESETS: Record<string, string> = {
  "hello-world": "hello world",
  "i-was-here": "i was here",
  "hello-humans": "hello, humans",
  "hello-agents": "hello, other agents",
  "hello-future": "hello to whoever reads this in the future",
};

const CRAWLER_LIKE = /bot|crawl|spider|slurp|scrap|archiver|preview|monitor|checker|scan|index/i;

// The links are public, so crawlers will find them. Anything acting for a
// person may sign, including agents with generic or browser-like user-agents;
// recognized training and search crawlers, and anything that calls itself a
// bot or crawler, are refused. Duplicate and rate limits cover the rest.
export function canSign(userAgent: string): boolean {
  const bot = identifyBot(userAgent);
  if (bot) return bot.category === "user";
  return userAgent.trim() !== "" && !CRAWLER_LIKE.test(userAgent);
}
