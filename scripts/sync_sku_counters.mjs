import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 同步 order 计数器
const [orderRows] = await conn.execute(
  `SELECT MAX(CAST(SUBSTRING(orderNumber, 4) AS UNSIGNED)) as maxNum FROM orders WHERE erpCompanyId=1 AND orderNumber REGEXP '^ORD[0-9]+$'`
);
const orderMax = orderRows[0].maxNum || 0;
await conn.execute('UPDATE sku_rules SET currentCounter=? WHERE erpCompanyId=1 AND ruleType=?', [orderMax, 'order']);
console.log('Updated order counter to', orderMax);

// 同步 product 计数器
const [productRows] = await conn.execute(
  `SELECT MAX(CAST(SUBSTRING(productCode, 4) AS UNSIGNED)) as maxNum FROM products WHERE erpCompanyId=1 AND productCode REGEXP '^PRD[0-9]+$'`
);
const productMax = productRows[0].maxNum || 0;
await conn.execute('UPDATE sku_rules SET currentCounter=? WHERE erpCompanyId=1 AND ruleType=?', [productMax, 'product']);
console.log('Updated product counter to', productMax);

// 同步 customer 计数器
const [customerRows] = await conn.execute(
  `SELECT MAX(CAST(SUBSTRING(customerCode, 4) AS UNSIGNED)) as maxNum FROM companies WHERE erpCompanyId=1 AND customerCode REGEXP '^CUS[0-9]+$'`
);
const customerMax = customerRows[0].maxNum || 0;
await conn.execute('UPDATE sku_rules SET currentCounter=? WHERE erpCompanyId=1 AND ruleType=?', [customerMax, 'customer']);
console.log('Updated customer counter to', customerMax);

// 同步 supplier 计数器
const [supplierRows] = await conn.execute(
  `SELECT MAX(CAST(SUBSTRING(supplierCode, 4) AS UNSIGNED)) as maxNum FROM suppliers WHERE erpCompanyId=1 AND supplierCode REGEXP '^SUP[0-9]+$'`
);
const supplierMax = supplierRows[0].maxNum || 0;
await conn.execute('UPDATE sku_rules SET currentCounter=? WHERE erpCompanyId=1 AND ruleType=?', [supplierMax, 'supplier']);
console.log('Updated supplier counter to', supplierMax);

await conn.end();
console.log('Done!');
