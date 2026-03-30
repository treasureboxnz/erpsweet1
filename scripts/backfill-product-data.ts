/**
 * 批量补全产品数据：
 * 1. 为缺少CBM/尺寸的批次补充合理的家具尺寸数据
 * 2. 为缺少价格的批次补充FOB价格
 * 3. 为缺少材料的批次关联默认材料颜色
 */
import { sql } from "drizzle-orm";
import { getDb } from "../server/db";

// 产品类型与尺寸/价格映射（根据产品名称推断）
const productDimensions: Record<number, {
  productLength: number; productWidth: number; productHeight: number;
  packageLength: number; packageWidth: number; packageHeight: number;
  cbm: number; grossWeight: number; netWeight: number;
  fobL1: number; fobL2: number; fobL3: number; costRmb: number;
}> = {
  // Sofa Beds (沙发床) - 约 200x90x85cm
  60001: { productLength: 200, productWidth: 90, productHeight: 85, packageLength: 205, packageWidth: 95, packageHeight: 45, cbm: 0.877, grossWeight: 65, netWeight: 58, fobL1: 285, fobL2: 265, fobL3: 248, costRmb: 1480 },
  60002: { productLength: 195, productWidth: 88, productHeight: 83, packageLength: 200, packageWidth: 93, packageHeight: 44, cbm: 0.819, grossWeight: 68, netWeight: 61, fobL1: 318, fobL2: 295, fobL3: 275, costRmb: 1620 },
  60003: { productLength: 198, productWidth: 86, productHeight: 82, packageLength: 203, packageWidth: 91, packageHeight: 43, cbm: 0.795, grossWeight: 58, netWeight: 52, fobL1: 268, fobL2: 248, fobL3: 232, costRmb: 1350 },
  60004: { productLength: 260, productWidth: 160, productHeight: 85, packageLength: 265, packageWidth: 165, packageHeight: 45, cbm: 1.965, grossWeight: 95, netWeight: 86, fobL1: 425, fobL2: 395, fobL3: 368, costRmb: 2180 },
  60005: { productLength: 155, productWidth: 82, productHeight: 80, packageLength: 160, packageWidth: 87, packageHeight: 42, cbm: 0.584, grossWeight: 48, netWeight: 43, fobL1: 218, fobL2: 198, fobL3: 185, costRmb: 1120 },
  // Armchairs (扶手椅) - 约 75x75x85cm
  60006: { productLength: 78, productWidth: 76, productHeight: 88, packageLength: 83, packageWidth: 81, packageHeight: 46, cbm: 0.309, grossWeight: 22, netWeight: 19, fobL1: 128, fobL2: 118, fobL3: 110, costRmb: 650 },
  60007: { productLength: 76, productWidth: 74, productHeight: 86, packageLength: 81, packageWidth: 79, packageHeight: 45, cbm: 0.288, grossWeight: 20, netWeight: 18, fobL1: 118, fobL2: 108, fobL3: 100, costRmb: 598 },
  60008: { productLength: 80, productWidth: 78, productHeight: 90, packageLength: 85, packageWidth: 83, packageHeight: 47, cbm: 0.332, grossWeight: 24, netWeight: 21, fobL1: 138, fobL2: 128, fobL3: 118, costRmb: 698 },
  60009: { productLength: 74, productWidth: 72, productHeight: 84, packageLength: 79, packageWidth: 77, packageHeight: 44, cbm: 0.268, grossWeight: 18, netWeight: 16, fobL1: 108, fobL2: 98, fobL3: 92, costRmb: 548 },
  60010: { productLength: 72, productWidth: 70, productHeight: 82, packageLength: 77, packageWidth: 75, packageHeight: 43, cbm: 0.249, grossWeight: 17, netWeight: 15, fobL1: 98, fobL2: 90, fobL3: 84, costRmb: 498 },
  // Dining Tables (餐桌) - 约 160x90x75cm
  60011: { productLength: 160, productWidth: 90, productHeight: 75, packageLength: 165, packageWidth: 95, packageHeight: 15, cbm: 0.235, grossWeight: 45, netWeight: 40, fobL1: 198, fobL2: 182, fobL3: 168, costRmb: 980 },
  60012: { productLength: 120, productWidth: 120, productHeight: 75, packageLength: 125, packageWidth: 125, packageHeight: 15, cbm: 0.234, grossWeight: 52, netWeight: 46, fobL1: 228, fobL2: 208, fobL3: 195, costRmb: 1150 },
  60013: { productLength: 180, productWidth: 90, productHeight: 75, packageLength: 185, packageWidth: 95, packageHeight: 15, cbm: 0.264, grossWeight: 55, netWeight: 49, fobL1: 248, fobL2: 228, fobL3: 212, costRmb: 1250 },
  60014: { productLength: 150, productWidth: 80, productHeight: 75, packageLength: 155, packageWidth: 85, packageHeight: 15, cbm: 0.198, grossWeight: 42, netWeight: 37, fobL1: 188, fobL2: 172, fobL3: 158, costRmb: 950 },
  60015: { productLength: 200, productWidth: 100, productHeight: 78, packageLength: 205, packageWidth: 105, packageHeight: 16, cbm: 0.344, grossWeight: 68, netWeight: 61, fobL1: 298, fobL2: 275, fobL3: 258, costRmb: 1480 },
  // Dining Chairs (餐椅) - 约 48x55x90cm (部分批次缺少尺寸)
  60016: { productLength: 48, productWidth: 55, productHeight: 90, packageLength: 53, packageWidth: 60, packageHeight: 48, cbm: 0.152, grossWeight: 8.5, netWeight: 7.5, fobL1: 45, fobL2: 42, fobL3: 38, costRmb: 228 },
  60017: { productLength: 50, productWidth: 52, productHeight: 88, packageLength: 55, packageWidth: 57, packageHeight: 47, cbm: 0.148, grossWeight: 7.8, netWeight: 6.8, fobL1: 42, fobL2: 38, fobL3: 35, costRmb: 208 },
  60018: { productLength: 46, productWidth: 50, productHeight: 82, packageLength: 51, packageWidth: 55, packageHeight: 44, cbm: 0.123, grossWeight: 6.5, netWeight: 5.8, fobL1: 38, fobL2: 35, fobL3: 32, costRmb: 188 },
  60019: { productLength: 50, productWidth: 54, productHeight: 92, packageLength: 55, packageWidth: 59, packageHeight: 49, cbm: 0.159, grossWeight: 9.2, netWeight: 8.1, fobL1: 52, fobL2: 48, fobL3: 44, costRmb: 258 },
  60020: { productLength: 46, productWidth: 48, productHeight: 96, packageLength: 51, packageWidth: 53, packageHeight: 52, cbm: 0.141, grossWeight: 7.2, netWeight: 6.4, fobL1: 40, fobL2: 37, fobL3: 34, costRmb: 198 },
  // Test/misc products
  180001: { productLength: 50, productWidth: 50, productHeight: 50, packageLength: 55, packageWidth: 55, packageHeight: 55, cbm: 0.166, grossWeight: 10, netWeight: 9, fobL1: 50, fobL2: 45, fobL3: 40, costRmb: 250 },
  180002: { productLength: 60, productWidth: 60, productHeight: 60, packageLength: 65, packageWidth: 65, packageHeight: 65, cbm: 0.274, grossWeight: 15, netWeight: 13, fobL1: 65, fobL2: 60, fobL3: 55, costRmb: 320 },
  210001: { productLength: 40, productWidth: 40, productHeight: 40, packageLength: 45, packageWidth: 45, packageHeight: 45, cbm: 0.091, grossWeight: 5, netWeight: 4.5, fobL1: 35, fobL2: 32, fobL3: 28, costRmb: 180 },
  240001: { productLength: 45, productWidth: 45, productHeight: 45, packageLength: 50, packageWidth: 50, packageHeight: 50, cbm: 0.125, grossWeight: 7, netWeight: 6, fobL1: 40, fobL2: 36, fobL3: 32, costRmb: 200 },
  270001: { productLength: 55, productWidth: 55, productHeight: 55, packageLength: 60, packageWidth: 60, packageHeight: 60, cbm: 0.216, grossWeight: 12, netWeight: 11, fobL1: 58, fobL2: 52, fobL3: 48, costRmb: 290 },
};

// 材料颜色映射：根据产品特征选择合适的材料
// 沙发床/扶手椅 → 布料材料；餐桌 → 使用默认颜色
const productMaterialMap: Record<number, number> = {
  60002: 5,   // Navy Blue → 深蓝色天鹅绒 HM-M02-01
  60003: 4,   // Beige → 米色亚麻布 HM-A01-03
  60004: 7,   // Charcoal → 炭灰色羊毛 HM-M02-03
  60005: 6,   // Teal → 浅绿色棉布 HM-M02-02
  60007: 11,  // Mustard Yellow → 腮红粉丝绸 (最接近暖色) HM-C03-04
  60008: 8,   // Cream Boucle → 奶油色结子呢 HM-C03-01
  60009: 4,   // Oak & Beige → 米色亚麻布 HM-A01-03
  60010: 10,  // Emerald Green → 橄榄绿帆布 HM-C03-03
  60013: 30008, // Walnut Dining Table → 默认颜色
  60014: 30008, // Glass Top → 默认颜色
  60015: 30008, // Acacia Dining Table → 默认颜色
  180001: 30008,
  210001: 30008,
  270001: 30008,
};

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB connection failed");

  let updated = 0;
  let pricingAdded = 0;
  let materialsAdded = 0;

  // 1. 获取所有需要补充尺寸/价格的批次
  const variants = await db.execute(sql`
    SELECT pv.id as variant_id, pv.productId, pv.variantName, pv.variantCode, pv.erpCompanyId,
           pv.productLength, pv.cbm,
           p.name as product_name,
           (SELECT COUNT(*) FROM variant_pricing vp WHERE vp.variantId = pv.id AND vp.isCurrent = 1) as pricing_count
    FROM product_variants pv
    JOIN products p ON p.id = pv.productId
    ORDER BY pv.productId, pv.id
  `);

  const variantRows = variants[0] as any[];
  console.log(`\n=== 开始批量补全数据 ===`);
  console.log(`总批次数: ${variantRows.length}`);

  for (const v of variantRows) {
    const dims = productDimensions[v.productId];
    if (!dims) continue;

    // 1a. 补充尺寸和CBM
    if (!v.productLength || !v.cbm) {
      await db.execute(sql`
        UPDATE product_variants SET
          productLength = ${dims.productLength},
          productWidth = ${dims.productWidth},
          productHeight = ${dims.productHeight},
          packageLength = ${dims.packageLength},
          packageWidth = ${dims.packageWidth},
          packageHeight = ${dims.packageHeight},
          cbm = ${dims.cbm}
        WHERE id = ${v.variant_id}
      `);
      updated++;
      console.log(`  ✅ 尺寸已补充: [${v.variant_id}] ${v.product_name} - ${v.variantName}`);
    }

    // 1b. 补充价格（如果没有当前价格）
    if (Number(v.pricing_count) === 0) {
      await db.execute(sql`
        INSERT INTO variant_pricing (
          erpCompanyId, variantId,
          factoryCostRmbIncTax, myCostRmb,
          sellingPriceFobL1, sellingPriceFobL2, sellingPriceFobL3,
          effectiveDate, isCurrent
        ) VALUES (
          ${v.erpCompanyId}, ${v.variant_id},
          ${dims.costRmb}, ${dims.costRmb},
          ${dims.fobL1}, ${dims.fobL2}, ${dims.fobL3},
          NOW(), 1
        )
      `);
      pricingAdded++;
      console.log(`  ✅ 价格已补充: [${v.variant_id}] ${v.product_name} - FOB L1: $${dims.fobL1}`);
    }
  }

  // 2. 补充材料
  const variantsNeedingMaterials = await db.execute(sql`
    SELECT pv.id as variant_id, pv.productId, pv.variantName, pv.erpCompanyId
    FROM product_variants pv
    WHERE NOT EXISTS (
      SELECT 1 FROM variant_materials vm WHERE vm.variantId = pv.id
    )
    ORDER BY pv.productId
  `);

  const materialRows = variantsNeedingMaterials[0] as any[];
  console.log(`\n需要补充材料的批次: ${materialRows.length}`);

  for (const v of materialRows) {
    const colorId = productMaterialMap[v.productId] || 30008; // 默认使用 Original 默认
    await db.execute(sql`
      INSERT INTO variant_materials (erpCompanyId, variantId, materialColorId, sortOrder, materialType)
      VALUES (${v.erpCompanyId}, ${v.variant_id}, ${colorId}, 0, 'fabric')
    `);
    materialsAdded++;
    console.log(`  ✅ 材料已补充: [${v.variant_id}] productId=${v.productId} - colorId=${colorId}`);
  }

  console.log(`\n=== 补全完成 ===`);
  console.log(`尺寸/CBM更新: ${updated} 个批次`);
  console.log(`价格补充: ${pricingAdded} 个批次`);
  console.log(`材料补充: ${materialsAdded} 个批次`);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
