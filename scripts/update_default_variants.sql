-- 为所有默认批次（isDefault=1）配置系统默认颜色、随机供应商和随机客户

-- 首先查询系统默认颜色ID
SET @default_color_id = (SELECT id FROM material_colors WHERE colorCode LIKE '%ORIG%' OR colorName LIKE '%ORIG%' OR colorName LIKE '%原色%' LIMIT 1);

-- 查询所有默认批次
SELECT id, variantCode, isDefault FROM product_variants WHERE isDefault = 1;

-- 为每个默认批次更新颜色、供应商和客户
-- 注意：这里需要手动为每个批次指定供应商和客户ID
