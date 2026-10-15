export type Category = "training" | "search" | "user";

export type Verification =
  | { kind: "ip-list"; urls: string[] }
  | { kind: "rdns"; domains: string[] }
  | { kind: "none" };

export interface Bot {
  id: string;
  name: string;
  operator: string;
  category: Category;
  match: RegExp;
  verify: Verification;
  note?: string;
}

// Order matters: more specific patterns come before broader ones
// (e.g. OAI-SearchBot before GPTBot, Perplexity-User before PerplexityBot).
export const BOTS: Bot[] = [
  {
    id: "oai-searchbot",
    name: "OAI-SearchBot",
    operator: "OpenAI",
    category: "search",
    match: /OAI-SearchBot/i,
    verify: { kind: "ip-list", urls: ["https://openai.com/searchbot.json"] },
  },
  {
    id: "chatgpt-user",
    name: "ChatGPT-User",
    operator: "OpenAI",
    category: "user",
    match: /ChatGPT-User/i,
    verify: { kind: "ip-list", urls: ["https://openai.com/chatgpt-user.json"] },
  },
  {
    id: "gptbot",
    name: "GPTBot",
    operator: "OpenAI",
    category: "training",
    match: /GPTBot/i,
    verify: { kind: "ip-list", urls: ["https://openai.com/gptbot.json"] },
  },
  {
    id: "claude-searchbot",
    name: "Claude-SearchBot",
    operator: "Anthropic",
    category: "search",
    match: /Claude-SearchBot/i,
    verify: { kind: "none" },
  },
  {
    id: "claude-user",
    name: "Claude-User",
    operator: "Anthropic",
    category: "user",
    match: /Claude-User/i,
    verify: { kind: "none" },
  },
  {
    id: "claudebot",
    name: "ClaudeBot",
    operator: "Anthropic",
    category: "training",
    match: /ClaudeBot|anthropic-ai/i,
    verify: { kind: "none" },
  },
  {
    id: "perplexity-user",
    name: "Perplexity-User",
    operator: "Perplexity",
    category: "user",
    match: /Perplexity-User/i,
    verify: { kind: "ip-list", urls: ["https://www.perplexity.ai/perplexity-user.json"] },
  },
  {
    id: "perplexitybot",
    name: "PerplexityBot",
    operator: "Perplexity",
    category: "search",
    match: /PerplexityBot/i,
    verify: { kind: "ip-list", urls: ["https://www.perplexity.ai/perplexitybot.json"] },
  },
  {
    id: "mistralai-user",
    name: "MistralAI-User",
    operator: "Mistral",
    category: "user",
    match: /MistralAI-User/i,
    verify: { kind: "none" },
  },
  {
    id: "duckassistbot",
    name: "DuckAssistBot",
    operator: "DuckDuckGo",
    category: "user",
    match: /DuckAssistBot/i,
    verify: { kind: "none" },
  },
  {
    id: "meta-externalfetcher",
    name: "meta-externalfetcher",
    operator: "Meta",
    category: "user",
    match: /meta-externalfetcher/i,
    verify: { kind: "none" },
  },
  {
    id: "meta-externalagent",
    name: "meta-externalagent",
    operator: "Meta",
    category: "training",
    match: /meta-externalagent/i,
    verify: { kind: "none" },
  },
  {
    id: "ccbot",
    name: "CCBot",
    operator: "Common Crawl",
    category: "training",
    match: /CCBot/i,
    verify: { kind: "none" },
    note: "Common Crawl's archive is one of the most widely used sources of LLM training data.",
  },
  {
    id: "bytespider",
    name: "Bytespider",
    operator: "ByteDance",
    category: "training",
    match: /Bytespider/i,
    verify: { kind: "none" },
  },
  {
    id: "amazonbot",
    name: "Amazonbot",
    operator: "Amazon",
    category: "training",
    match: /Amazonbot/i,
    verify: { kind: "rdns", domains: ["crawl.amazonbot.amazon"] },
  },
  {
    id: "cohere",
    name: "cohere-ai",
    operator: "Cohere",
    category: "training",
    match: /cohere-ai|cohere-training-data-crawler/i,
    verify: { kind: "none" },
  },
  {
    id: "ai2bot",
    name: "AI2Bot",
    operator: "Allen Institute for AI",
    category: "training",
    match: /AI2Bot/i,
    verify: { kind: "none" },
  },
  {
    id: "diffbot",
    name: "Diffbot",
    operator: "Diffbot",
    category: "training",
    match: /Diffbot/i,
    verify: { kind: "none" },
  },
  {
    id: "youbot",
    name: "YouBot",
    operator: "You.com",
    category: "search",
    match: /YouBot/i,
    verify: { kind: "none" },
  },
  {
    id: "applebot",
    name: "Applebot",
    operator: "Apple",
    category: "search",
    match: /Applebot/i,
    verify: { kind: "rdns", domains: ["applebot.apple.com"] },
    note: "Apple's AI training opt-out is the separate robots.txt token Applebot-Extended.",
  },
  {
    id: "googlebot",
    name: "Googlebot",
    operator: "Google",
    category: "search",
    match: /Googlebot/i,
    verify: { kind: "rdns", domains: ["googlebot.com", "google.com"] },
    note: "Feeds Google Search and AI Overviews. Gemini training opt-out is the robots.txt token Google-Extended.",
  },
  {
    id: "bingbot",
    name: "bingbot",
    operator: "Microsoft",
    category: "search",
    match: /bingbot/i,
    verify: { kind: "rdns", domains: ["search.msn.com"] },
    note: "Feeds Bing and Copilot.",
  },
];

export function identifyBot(userAgent: string): Bot | undefined {
  return BOTS.find((bot) => bot.match.test(userAgent));
}

export function getBot(id: string): Bot | undefined {
  return BOTS.find((bot) => bot.id === id);
}
