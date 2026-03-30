/**
 * 批量为无批次的产品补充默认批次
 * 运行: npx tsx scripts/backfill-default-variants.ts
 */
import { getDb } from "../server/db";
import { products, productVariants, variantPricing } from "../drizzle/schema";
import { eq, notExists, sql } from "drizzle-orm";

async function backfillDefaultVariants() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 查询所有没有批次的产品
  const productsWithoutVariants = await db
    .select({ id: products.id, sku: products.sku, name: products.name, erpCompanyId: products.erpCompanyId })
    .from(products)
    .where(
      notExists(
        db.select({ id: productVariants.id })
          .from(productVariants)
          .where(eq(productVariants.productId, products.id))
      )
    );

  console.log(`\n找到 ${productsWithoutVariants.length} 个没有批次的产品，开始补充默认批次...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const product of productsWithoutVariants) {
    try {
      const defaultVariantCode = `${product.sku}-V001`;
      
      // 检查variantCode是否已存在（防止重复）
      const existing = await db
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(eq(productVariants.variantCode, defaultVariantCode))
        .limit(1);
      
      const finalCode = existing.length > 0 
        ? `${product.sku}-V001-${Date.now()}` 
        : defaultVariantCode;

      const [{ id: variantId }] = await db.insert(productVariants).values({
        productId: product.id,
        variantCode: finalCode,
        variantName: '原版',
        otherChanges: 'Auto-generated default batch (backfill)',
        isDefault: true,
        variantType: 'universal',
        status: 'active',
        productionStatus: 'completed',
        erpCompanyId: product.erpCompanyId,
      }).$returningId();

      // 创建默认定价记录
      await db.insert(variantPricing).values({
        variantId,
        sellingPriceFobL1: '0.00',
        sellingPriceFobL2: '0.00',
        sellingPriceFobL3: '0.00',
        effectiveDate: new Date(),
        isCurrent: true,
      });

      console.log(`  ✅ ${product.sku} (ID: ${product.id}) → 批次 ${finalCode}`);
      successCount++;
    } catch (err) {
      console.error(`  ❌ ${product.sku} (ID: ${product.id}) 失败:`, err);
      errorCount++;
    }
  }

  console.log(`\n完成！成功: ${successCount}，失败: ${errorCount}`);
  process.exit(0);
}

backfillDefaultVariants().catch(console.error);
