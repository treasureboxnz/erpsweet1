/**
 * 检查产品数据完整性：批次、价格、图片、材料、尺寸
 */
import { sql } from "drizzle-orm";
import { getDb } from "../server/db";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB connection failed");

  const rows = await db.execute(sql`
    SELECT 
      p.id as product_id,
      p.name as product_name,
      p.sku,
      p.erpCompanyId,
      CASE WHEN p.imageUrl IS NOT NULL AND p.imageUrl != '' THEN 'has_url' ELSE 'no_url' END as product_image_status,
      COUNT(DISTINCT pv.id) as variant_count,
      COUNT(DISTINCT pi.id) as product_image_count,
      COUNT(DISTINCT vp.id) as pricing_count,
      COUNT(DISTINCT vm.id) as material_count,
      SUM(CASE WHEN pv.productLength IS NOT NULL THEN 1 ELSE 0 END) as variants_with_dims,
      SUM(CASE WHEN pv.cbm IS NOT NULL THEN 1 ELSE 0 END) as variants_with_cbm
    FROM products p
    LEFT JOIN product_variants pv ON pv.productId = p.id
    LEFT JOIN product_images pi ON pi.productId = p.id
    LEFT JOIN variant_pricing vp ON vp.variantId = pv.id AND vp.isCurrent = 1
    LEFT JOIN variant_materials vm ON vm.variantId = pv.id
    GROUP BY p.id, p.name, p.sku, p.erpCompanyId, p.imageUrl
    ORDER BY p.id
  `);

  const data = rows[0] as any[];
  console.log(`\n=== 产品数据完整性报告 ===`);
  console.log(`总产品数: ${data.length}`);
  console.log(`无批次: ${data.filter(r => Number(r.variant_count) === 0).length}`);
  console.log(`无图片: ${data.filter(r => r.product_image_status === "no_url" && Number(r.product_image_count) === 0).length}`);
  console.log(`无定价: ${data.filter(r => Number(r.pricing_count) === 0 && Number(r.variant_count) > 0).length}`);
  console.log(`无材料: ${data.filter(r => Number(r.material_count) === 0 && Number(r.variant_count) > 0).length}`);
  console.log(`无尺寸: ${data.filter(r => Number(r.variants_with_dims) === 0 && Number(r.variant_count) > 0).length}`);
  console.log(`无CBM:  ${data.filter(r => Number(r.variants_with_cbm) === 0 && Number(r.variant_count) > 0).length}`);

  console.log("\n--- 需要图片的产品 ---");
  data.filter(r => r.product_image_status === "no_url" && Number(r.product_image_count) === 0)
    .forEach(r => console.log(`  [${r.product_id}] ${r.product_name} (${r.sku}) erpCompanyId=${r.erpCompanyId}`));

  console.log("\n--- 需要定价的产品 ---");
  data.filter(r => Number(r.pricing_count) === 0 && Number(r.variant_count) > 0)
    .forEach(r => console.log(`  [${r.product_id}] ${r.product_name} - 批次数:${r.variant_count}`));

  console.log("\n--- 需要材料的产品 ---");
  data.filter(r => Number(r.material_count) === 0 && Number(r.variant_count) > 0)
    .forEach(r => console.log(`  [${r.product_id}] ${r.product_name} - 批次数:${r.variant_count}`));

  console.log("\n--- 需要CBM/尺寸的产品 ---");
  data.filter(r => (Number(r.variants_with_cbm) === 0 || Number(r.variants_with_dims) === 0) && Number(r.variant_count) > 0)
    .forEach(r => console.log(`  [${r.product_id}] ${r.product_name} - cbm:${r.variants_with_cbm} dims:${r.variants_with_dims}`));

  console.log("\n--- 完整数据 ---");
  data.forEach(r => {
    console.log(`[${r.product_id}] ${r.product_name} | img:${r.product_image_status}(${r.product_image_count}) | variants:${r.variant_count} | pricing:${r.pricing_count} | materials:${r.material_count} | dims:${r.variants_with_dims} | cbm:${r.variants_with_cbm}`);
  });

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
