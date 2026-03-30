import { drizzle } from 'drizzle-orm/mysql2';
import { productSuppliers, products, suppliers } from '../drizzle/schema';
import { asc, and, eq } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const db = drizzle(connectionString);

async function main() {
  console.log('开始为前10个产品关联供应商...');
  
  // 获取前10个产品
  const productList = await db.select().from(products).orderBy(asc(products.id)).limit(10);
  console.log(`找到 ${productList.length} 个产品`);
  
  // 获取所有供应商
  const supplierList = await db.select().from(suppliers).orderBy(asc(suppliers.id));
  console.log(`找到 ${supplierList.length} 个供应商`);
  
  if (productList.length === 0 || supplierList.length === 0) {
    console.log('❌ 产品或供应商数量不足');
    process.exit(1);
  }
  
  // 为每个产品关联一个供应商
  for (let i = 0; i < productList.length; i++) {
    const product = productList[i];
    // 循环使用供应商列表
    const supplier = supplierList[i % supplierList.length];
    
    try {
      // 检查是否已经关联
      const existing = await db
        .select()
        .from(productSuppliers)
        .where(and(
          eq(productSuppliers.productId, product.id),
          eq(productSuppliers.supplierId, supplier.id)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        console.log(`⏭️  产品 ${product.name} (ID: ${product.id}) 已关联供应商 ${supplier.supplierName} (ID: ${supplier.id})，跳过`);
        continue;
      }
      
      await db.insert(productSuppliers).values({
        productId: product.id,
        supplierId: supplier.id,
        isPrimary: i === 0, // 第一个产品的供应商设为主供应商
      });
      console.log(`✅ 产品 ${product.name} (ID: ${product.id}) 已关联供应商 ${supplier.supplierName} (ID: ${supplier.id})`);
    } catch (error: any) {
      console.error(`❌ 关联失败 - 产品 ${product.name} (ID: ${product.id}) 和供应商 ${supplier.supplierName} (ID: ${supplier.id}):`, error.message);
    }
  }
  
  console.log('✅ 所有产品-供应商关联完成！');
  process.exit(0);
}

main().catch((error) => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});
