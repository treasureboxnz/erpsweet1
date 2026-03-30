import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: '2kbdvSUgAGqDCkJ.root',
  password: 'fFfWTWUjVXwVdPcW',
  database: 'foreign_trade_erp',
  ssl: { rejectUnauthorized: true }
});

const [rows] = await connection.execute(
  "SELECT id, variantCode, variantName, customerSku, supplierSku, customerId, variantType, erpCompanyId FROM product_variants WHERE variantCode = 'DC-001-GRY-V045' LIMIT 1"
);

console.log(JSON.stringify(rows, null, 2));
await connection.end();
