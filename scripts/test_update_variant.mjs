import { createConnection } from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from '../drizzle/schema.js';
import { eq } from 'drizzle-orm';

const conn = await createConnection(process.env.DATABASE_URL);
const db = drizzle(conn, { schema, mode: 'default' });

// 模拟前端传入的数据（来自截图）
const variantId = 570004;
const updateData = {
  variantName: "0.5",
  fabricChange: undefined,
  legTypeChange: undefined,
  heightChange: undefined,
  packagingChange: undefined,
  otherChanges: undefined,
  productLength: "48",
  productWidth: "55",
  productHeight: "90",
  packageLength: "53",
  packageWidth: "60",
  packageHeight: "48",
  cbm: null,
  variantType: "universal",
  productionStatus: "designing",
  supplierId: 30004,
  materialColorId: 30008,
  sellingPriceRMB: "318.69",
  sellingPriceFOB: "129.35",
  costPriceRMB: "299",
  erpCompanyId: 1,
};

// 从data中提取packageBoxes和erpCompanyId
const { packageBoxes: newPackageBoxes, erpCompanyId, ...variantData } = updateData;

// 过滤掉undefined字段
const cleanData = Object.fromEntries(
  Object.entries(variantData).filter(([_, v]) => v !== undefined)
);

console.log('Updating with data:', JSON.stringify(cleanData, null, 2));

try {
  await db
    .update(schema.productVariants)
    .set(cleanData)
    .where(eq(schema.productVariants.id, variantId));
  console.log('Update success!');
} catch (e) {
  console.error('Update error:', e.message);
  console.error('SQL:', e.sql);
  console.error('Parameters:', e.parameters);
}

await conn.end();
