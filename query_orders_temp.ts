import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.log("no db"); return; }
  
  const rows = await db.execute(sql`
    SELECT o.id, o.orderNumber, p.name as productName, 
      SUBSTRING(p.imageUrl, 1, 60) as imageUrl, 
      pv.id as variantId, pv.supplierId
    FROM orders o
    JOIN order_items oi ON oi.orderId = o.id
    JOIN products p ON p.id = oi.productId
    LEFT JOIN product_variants pv ON pv.id = oi.variantId
    WHERE p.imageUrl IS NOT NULL AND p.imageUrl != ''
    ORDER BY o.id DESC
    LIMIT 20
  `);
  
  (rows[0] as any[]).forEach((r: any) => {
    console.log(`Order:${r.orderNumber}(${r.id}) Product:${r.productName} hasImage:${!!r.imageUrl} variantId:${r.variantId} supplierId:${r.supplierId}`);
  });
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
