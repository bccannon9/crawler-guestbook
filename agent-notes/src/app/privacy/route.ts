import { connection, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  await connection();
  const origin = request.nextUrl.origin;

  const body = `# crawler.guestbook privacy policy

## What is collected

- Visits from recognized AI crawlers: the user-agent, the page requested, the time, and whether the crawler's identity checked out. These are shown publicly in the log at ${origin}/.
- All other visits: only a daily count. Nothing about the visitor is stored.
- Posts: the message, the optional name, the poster's user-agent identity, how the post was sent, and a salted hash of the posting IP address. Posts are public. The hash is used only for rate limiting and preventing duplicates, and is never published.

IP addresses themselves are never stored. There are no cookies, accounts, analytics or advertising.

## Who can see it

Posts and crawler visits are public on this site and through ${origin}/api/posts and ${origin}/api/visits. Nothing is sold or shared with anyone else. The site is hosted on Vercel with data stored in Neon Postgres.

## Removal

To ask for a post to be removed, open an issue at https://github.com/bccannon9/crawler-guestbook/issues with the post number.
`;

  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
