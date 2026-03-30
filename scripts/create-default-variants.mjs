import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { products, productVariants, variantPricing } from '../drizzle/schema.js';
import { eq, isNull } from 'drizzle-orm';

// 数据库连接
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

console.log('🔍 查找没有批次的产品...');

// 查找所有没有批次的产品
const productsWithoutVariants = await db
  .select({
    id: products.id,
    sku: products.sku,
    name: products.name,
  })
  .from(products)
  .leftJoin(productVariants, eq(products.id, productVariants.productId))
  .where(isNull(productVariants.id));

console.log(`📦 找到 ${productsWithoutVariants.length} 个没有批次的产品`);

let createdCount = 0;
let errorCount = 0;

for (const product of productsWithoutVariants) {
  try {
    console.log(`\n处理产品: ${product.sku} - ${product.name}`);
    
    // 1. 创建默认批次
    const variantName = `${product.sku}-V001`;
    const [variantResult] = await db.insert(productVariants).values({
      productId: product.id,
      variantName: variantName,
      variantType: 'universal',
      productionStatus: 'production',
      isDefault: true,
      createdBy: 1, // 系统管理员
    });
    
    const variantId = variantResult.insertId;
    console.log(`  ✅ 创建批次: ${variantName} (ID: ${variantId})`);
    
    // 2. 创建FOB价格数据
    await db.insert(variantPricing).values({
      variantId: variantId,
      factoryPriceRmbExcludingTax: '0.00',
      factoryPriceRmbIncludingTax: '0.00',
      factoryPriceUsdFob: '0.00',
      myCostRmb: '0.00',
      myCostUsd: '0.00',
      fobFeeRmb: '0.00',
      sellingPriceRmbIncTax: '0.00',
      sellingPriceFobL1: '100.00', // 默认FOB Level 1价格
      sellingPriceFobL2: '95.00',  // 默认FOB Level 2价格
      sellingPriceFobL3: '90.00',  // 默认FOB Level 3价格
      effectiveDate: new Date(),
      isCurrent: true,
      createdBy: 1,
    });
    
    console.log(`  ✅ 创建FOB价格: L1=$100, L2=$95, L3=$90`);
    createdCount++;
    
  } catch (error) {
    console.error(`  ❌ 错误: ${error.message}`);
    errorCount++;
  }
}

console.log(`\n\n📊 完成统计:`);
console.log(`  ✅ 成功创建: ${createdCount} 个批次`);
console.log(`  ❌ 失败: ${errorCount} 个`);

await connection.end();
console.log('\n✅ 脚本执行完成!');
