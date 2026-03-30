import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 通过quotation_batches的variantId回填quotation_items的SKU
const [skuResult] = await conn.execute(`
  UPDATE quotation_items qi
  JOIN quotation_batches qb ON qb.quotationItemId = qi.id
  JOIN product_variants pv ON qb.variantId = pv.id
  SET qi.supplierSku = pv.supplierSku,
      qi.customerSku = pv.customerSku
  WHERE qb.variantId IS NOT NULL
    AND (qi.supplierSku IS NULL OR qi.customerSku IS NULL)
`);
console.log('SKU backfill:', skuResult.affectedRows, 'rows updated');

// 回填重量/CBM
const [weightResult] = await conn.execute(`
  UPDATE quotation_items qi
  JOIN quotation_batches qb ON qb.quotationItemId = qi.id
  JOIN (
    SELECT variantId, 
           MIN(grossWeight) as grossWeight, 
           MIN(netWeight) as netWeight, 
           MIN(cbm) as cbm,
           MIN(piecesPerBox) as piecesPerBox
    FROM package_boxes
    GROUP BY variantId
  ) pb ON qb.variantId = pb.variantId
  SET qi.grossWeight = pb.grossWeight,
      qi.netWeight = pb.netWeight,
      qi.cbm = pb.cbm,
      qi.piecesPerBox = pb.piecesPerBox
  WHERE qb.variantId IS NOT NULL
    AND (qi.grossWeight IS NULL OR qi.netWeight IS NULL OR qi.cbm IS NULL)
`);
console.log('Weight/CBM backfill:', weightResult.affectedRows, 'rows updated');

await conn.end();
