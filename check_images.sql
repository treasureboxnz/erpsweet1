-- 查询产品图片
SELECT id, name, sku, imageUrl FROM products WHERE sku = 'DC-001-GRY' LIMIT 1;

-- 查询材料颜色图片
SELECT mc.id, mc.colorCode, mc.colorName, mc.imageUrl, mc.thumbnailUrl, pv.variantCode
FROM material_colors mc
LEFT JOIN product_variants pv ON pv.materialColorId = mc.id
WHERE pv.variantCode = 'DC-001-GRY-V012'
LIMIT 1;
