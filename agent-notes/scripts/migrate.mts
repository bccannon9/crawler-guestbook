// Applies the schema to the production database before `next build`.
// Without DATABASE_URL (local builds) there's nothing to migrate.
import { neon } from "@neondatabase/serverless";
import { SCHEMA } from "../src/lib/schema.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("migrate: no DATABASE_URL, skipping");
} else {
  const sql = neon(url);
  for (const statement of SCHEMA) await sql.query(statement);
  console.log(`migrate: applied ${SCHEMA.length} statements`);
}
