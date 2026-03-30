import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { orders, orderItems, variantMaterials, materialColors, materialTypes, productVariants } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// 查询第一个订单的详细信息
const orderList = await db.select().from(orders).limit(1);
if (orderList.length === 0) {
  console.log('没有找到订单');
  process.exit(0);
}

const orderId = orderList[0].id;
console.log(`\n=== 订单 #${orderId} ===`);

// 查询订单项
const items = await db
  .select({
    item: orderItems,
    variant: productVariants,
  })
  .from(orderItems)
  .leftJoin(productVariants, eq(orderItems.variantId, productVariants.id))
  .where(eq(orderItems.orderId, orderId));

console.log(`\n找到 ${items.length} 个订单项`);

// 为每个订单项查询材料
for (const row of items) {
  console.log(`\n--- 订单项 #${row.item.id} ---`);
  console.log(`产品ID: ${row.item.productId}, 批次ID: ${row.item.variantId}`);
  
  if (row.variant?.id) {
    const materials = await db
      .select({
        id: variantMaterials.id,
        materialType: variantMaterials.materialType,
        materialTypeId: variantMaterials.materialTypeId,
        materialTypeName: materialTypes.name,
        materialTypeIcon: materialTypes.icon,
        sortOrder: variantMaterials.sortOrder,
        colorCode: materialColors.colorCode,
        colorName: materialColors.colorName,
        imageUrl: materialColors.imageUrl,
      })
      .from(variantMaterials)
      .leftJoin(materialColors, eq(variantMaterials.materialColorId, materialColors.id))
      .leftJoin(materialTypes, eq(variantMaterials.materialTypeId, materialTypes.id))
      .where(eq(variantMaterials.variantId, row.variant.id))
      .orderBy(variantMaterials.sortOrder);
    
    console.log(`材料数量: ${materials.length}`);
    materials.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.materialTypeName || m.materialType} - ${m.colorName} (${m.colorCode})`);
      console.log(`     图标: ${m.materialTypeIcon || '无'}, 图片: ${m.imageUrl ? '有' : '无'}`);
    });
  }
}

await connection.end();
