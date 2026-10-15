import { connection } from "next/server";
import { getBot } from "@/lib/bots";
import { recentVisits, totals } from "@/lib/db";

export async function GET() {
  await connection();
  const [t, rows] = await Promise.all([totals(), recentVisits(100)]);
  const visits = rows.map((v) => {
    const bot = getBot(v.bot_id);
    return {
      id: v.id,
      time: new Date(v.ts).toISOString(),
      bot: bot?.name ?? v.bot_id,
      operator: bot?.operator,
      category: bot?.category,
      identity: v.status,
      path: v.path,
      userAgent: v.user_agent,
    };
  });
  return Response.json({ totals: t, visits });
}
