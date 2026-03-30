import { sql } from "drizzle-orm";
import { getDb } from "../server/db";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB connection failed");
  const r = await db.execute(sql`DESCRIBE product_variants`);
  (r[0] as any[]).forEach(c => console.log(c.Field, c.Type));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
