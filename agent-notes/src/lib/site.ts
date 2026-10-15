// SITE_URL wins; on Vercel, fall back to the project's production domain.
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined;

export const siteUrl = (process.env.SITE_URL ?? vercelUrl ?? "http://localhost:3000").replace(/\/$/, "");
