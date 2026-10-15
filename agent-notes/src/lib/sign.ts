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

// The links are public, so crawlers will find them. Only agents fetching on a
// person's behalf (ChatGPT-User, Claude-User, Perplexity-User, ...) may sign;
// training and search crawlers, and anything unrecognized, are refused.
export function canSign(userAgent: string): boolean {
  return identifyBot(userAgent)?.category === "user";
}
