/**
 * 数据迁移脚本：将尺寸单位从 cm 统一改为 m
 * 
 * 影响表：
 * 1. package_boxes: length, width, height (÷100)
 * 2. product_variants: packageLength, packageWidth, packageHeight (÷100)
 *    注意：productLength, productWidth, productHeight 是产品尺寸，也统一改为 m
 * 
 * CBM 值不变（已经是正确的 m³）
 */

import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

try {
  console.log('=== 开始数据迁移：cm → m ===\n');

  // 1. 查看 package_boxes 当前数据范围
  const [pbStats] = await conn.query(
    'SELECT COUNT(*) as cnt, MIN(length) min_l, MAX(length) max_l, AVG(length) avg_l FROM package_boxes'
  );
  console.log('package_boxes 当前尺寸范围:', pbStats[0]);

  // 2. 查看 product_variants 当前数据范围
  const [pvStats] = await conn.query(
    'SELECT COUNT(*) as cnt, MIN(packageLength) min_pl, MAX(packageLength) max_pl, MIN(productLength) min_prod, MAX(productLength) max_prod FROM product_variants WHERE packageLength IS NOT NULL OR productLength IS NOT NULL'
  );
  console.log('product_variants 当前尺寸范围:', pvStats[0]);

  // 判断是否已经是 m 单位（如果最大值 < 10，说明已经是 m 了）
  const maxPbLength = parseFloat(pbStats[0].max_l || 0);
  const maxPvProd = parseFloat(pvStats[0].max_prod || 0);

  if (maxPbLength < 10 && maxPvProd < 10) {
    console.log('\n✅ 数据已经是 m 单位，无需迁移');
    process.exit(0);
  }

  console.log('\n开始迁移...');

  // 3. 迁移 package_boxes：length, width, height ÷ 100
  const [pbResult] = await conn.query(
    `UPDATE package_boxes 
     SET length = ROUND(length / 100, 4),
         width = ROUND(width / 100, 4),
         height = ROUND(height / 100, 4),
         updatedAt = NOW()
     WHERE length > 10 OR width > 10 OR height > 10`
  );
  console.log(`✅ package_boxes 迁移完成: ${pbResult.affectedRows} 条记录`);

  // 4. 迁移 product_variants：packageLength, packageWidth, packageHeight ÷ 100
  const [pvPkgResult] = await conn.query(
    `UPDATE product_variants 
     SET packageLength = ROUND(packageLength / 100, 4),
         packageWidth = ROUND(packageWidth / 100, 4),
         packageHeight = ROUND(packageHeight / 100, 4),
         updatedAt = NOW()
     WHERE (packageLength > 10 OR packageWidth > 10 OR packageHeight > 10)
       AND packageLength IS NOT NULL`
  );
  console.log(`✅ product_variants.package 尺寸迁移完成: ${pvPkgResult.affectedRows} 条记录`);

  // 5. 迁移 product_variants：productLength, productWidth, productHeight ÷ 100
  const [pvProdResult] = await conn.query(
    `UPDATE product_variants 
     SET productLength = ROUND(productLength / 100, 4),
         productWidth = ROUND(productWidth / 100, 4),
         productHeight = ROUND(productHeight / 100, 4),
         updatedAt = NOW()
     WHERE (productLength > 10 OR productWidth > 10 OR productHeight > 10)
       AND productLength IS NOT NULL`
  );
  console.log(`✅ product_variants.product 尺寸迁移完成: ${pvProdResult.affectedRows} 条记录`);

  // 6. 验证迁移结果
  const [pbAfter] = await conn.query(
    'SELECT COUNT(*) as cnt, MIN(length) min_l, MAX(length) max_l, AVG(length) avg_l FROM package_boxes'
  );
  console.log('\n迁移后 package_boxes 尺寸范围:', pbAfter[0]);

  const [pvAfter] = await conn.query(
    'SELECT MIN(packageLength) min_pl, MAX(packageLength) max_pl, MIN(productLength) min_prod, MAX(productLength) max_prod FROM product_variants WHERE packageLength IS NOT NULL OR productLength IS NOT NULL'
  );
  console.log('迁移后 product_variants 尺寸范围:', pvAfter[0]);

  console.log('\n=== 迁移完成 ===');

} catch (err) {
  console.error('迁移失败:', err.message);
  process.exit(1);
} finally {
  await conn.end();
}
