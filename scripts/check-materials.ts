import { sql } from "drizzle-orm";
import { getDb } from "../server/db";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB connection failed");

  // 查询默认颜色
  const defaultColors = await db.execute(sql`
    SELECT mc.id, mc.colorCode, mc.colorName, mc.fullCode, mc.erpCompanyId, mc.isLocked
    FROM material_colors mc
    WHERE mc.isLocked = 1 OR mc.colorCode = 'DEFAULT-001'
    LIMIT 5
  `);
  console.log("Default colors:", JSON.stringify((defaultColors[0] as any[]), null, 2));

  // 查询前10个可用颜色
  const colors = await db.execute(sql`
    SELECT mc.id, mc.colorCode, mc.colorName, mc.fullCode, mc.erpCompanyId
    FROM material_colors mc
    WHERE mc.status = 'active'
    ORDER BY mc.id
    LIMIT 10
  `);
  console.log("Available colors:", JSON.stringify((colors[0] as any[]), null, 2));

  // 查询需要补充材料的批次
  const variants = await db.execute(sql`
    SELECT pv.id as variant_id, pv.productId, pv.variantName, pv.variantCode, pv.erpCompanyId,
           p.name as product_name
    FROM product_variants pv
    JOIN products p ON p.id = pv.productId
    WHERE NOT EXISTS (
      SELECT 1 FROM variant_materials vm WHERE vm.variantId = pv.id
    )
    AND p.id IN (60002,60003,60004,60005,60007,60008,60009,60010,60013,60014,60015,270001)
    ORDER BY pv.productId
  `);
  console.log("Variants needing materials:", JSON.stringify((variants[0] as any[]), null, 2));

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
