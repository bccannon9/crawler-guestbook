// Submits every URL in the live sitemap to IndexNow (Bing, Yandex, Seznam,
// Naver), so new pages are crawled within hours instead of whenever a crawler
// finds them. Run after deploying: npm run indexnow
import { readdirSync } from "node:fs";

const site = (process.env.SITE_URL ?? "https://crawler-guestbook.vercel.app").replace(/\/$/, "");
const keyFile = readdirSync(new URL("../public/", import.meta.url)).find((f) =>
  /^[0-9a-f]{32}\.txt$/.test(f),
);
if (!keyFile) throw new Error("no IndexNow key file in public/");
const key = keyFile.replace(".txt", "");

const sitemap = await (await fetch(`${site}/sitemap.xml`)).text();
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: new URL(site).host,
    key,
    keyLocation: `${site}/${keyFile}`,
    urlList,
  }),
});
console.log(`indexnow: submitted ${urlList.length} urls -> HTTP ${res.status} ${await res.text()}`);
