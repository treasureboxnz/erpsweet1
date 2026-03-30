-- ============================================================================
-- 材料管理系统重构 - 数据库迁移脚本
-- 版本: v1.0
-- 日期: 2026-02-20
-- 目的: 为 variant_materials 表添加必要字段，支持多材料管理
-- ============================================================================

-- 阶段1: 添加新字段到 variant_materials 表
-- ----------------------------------------------------------------------------

-- 添加 sortOrder 字段（材料显示顺序，用于订单显示优先级）
ALTER TABLE variant_materials 
ADD COLUMN sortOrder INT DEFAULT 0 NOT NULL 
COMMENT '材料显示顺序，数字越小优先级越高，用于订单显示时选择前3个材料';

-- 添加 materialType 字段（材料类型标识，如 fabric, leg, armrest）
ALTER TABLE variant_materials 
ADD COLUMN materialType VARCHAR(50) DEFAULT 'fabric' 
COMMENT '材料类型标识：fabric(布料), leg(木腿), armrest(扶手), filling(填充物)等';

-- 添加索引以优化查询性能
CREATE INDEX idx_variant_materials_sort ON variant_materials(variantId, sortOrder);
CREATE INDEX idx_variant_materials_type ON variant_materials(materialType);

-- 阶段2: 为 material_boards 表添加 categoryId 字段（可选）
-- ----------------------------------------------------------------------------

-- 添加 categoryId 字段，关联到 material_categories 表
ALTER TABLE material_boards 
ADD COLUMN categoryId INT NULL 
COMMENT '材料类别ID，关联到material_categories表';

-- 添加外键约束
ALTER TABLE material_boards 
ADD CONSTRAINT fk_material_boards_category 
FOREIGN KEY (categoryId) REFERENCES material_categories(id) 
ON DELETE SET NULL;

-- 添加索引
CREATE INDEX idx_material_boards_category ON material_boards(categoryId);

-- 阶段3: 数据迁移 - 将现有批次的单一材料迁移到 variant_materials 表
-- ----------------------------------------------------------------------------

-- 为已有批次创建 variant_materials 记录
-- 只迁移那些有 materialColorId 但在 variant_materials 表中没有记录的批次
INSERT INTO variant_materials (
  erpCompanyId,
  variantId,
  materialColorId,
  sortOrder,
  materialType,
  quantityUsed,
  notes,
  createdAt,
  updatedAt
)
SELECT 
  pv.erpCompanyId,
  pv.id AS variantId,
  pv.materialColorId,
  0 AS sortOrder, -- 默认排序为0（最高优先级）
  'fabric' AS materialType, -- 默认类型为布料
  NULL AS quantityUsed, -- 旧数据没有用量信息
  'Migrated from product_variants.materialColorId' AS notes,
  NOW() AS createdAt,
  NOW() AS updatedAt
FROM product_variants pv
WHERE pv.materialColorId IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM variant_materials vm 
    WHERE vm.variantId = pv.id 
      AND vm.materialColorId = pv.materialColorId
  );

-- 阶段4: 验证数据迁移
-- ----------------------------------------------------------------------------

-- 检查迁移结果
SELECT 
  '迁移统计' AS info,
  COUNT(*) AS total_variants,
  SUM(CASE WHEN materialColorId IS NOT NULL THEN 1 ELSE 0 END) AS variants_with_old_material,
  (SELECT COUNT(DISTINCT variantId) FROM variant_materials) AS variants_with_new_materials
FROM product_variants;

-- 检查是否有遗漏的批次
SELECT 
  pv.id,
  pv.variantCode,
  pv.variantName,
  pv.materialColorId,
  COUNT(vm.id) AS material_count
FROM product_variants pv
LEFT JOIN variant_materials vm ON pv.id = vm.variantId
WHERE pv.materialColorId IS NOT NULL
GROUP BY pv.id, pv.variantCode, pv.variantName, pv.materialColorId
HAVING material_count = 0;

-- ============================================================================
-- 注意事项
-- ============================================================================
-- 
-- 1. 本脚本采用"渐进式重构"策略，保留 product_variants.materialColorId 字段
-- 2. 新批次应该使用 variant_materials 表，将 materialColorId 设为 NULL
-- 3. 旧批次数据已自动迁移到 variant_materials 表
-- 4. 订单查询逻辑需要修改为优先使用 variant_materials 表
-- 5. 如果 variant_materials 表为空，可以fallback到 materialColorId 字段
-- 
-- ============================================================================
-- 回滚脚本（如果需要）
-- ============================================================================
-- 
-- -- 删除新增字段
-- ALTER TABLE variant_materials DROP COLUMN sortOrder;
-- ALTER TABLE variant_materials DROP COLUMN materialType;
-- ALTER TABLE material_boards DROP FOREIGN KEY fk_material_boards_category;
-- ALTER TABLE material_boards DROP COLUMN categoryId;
-- 
-- -- 删除索引
-- DROP INDEX idx_variant_materials_sort ON variant_materials;
-- DROP INDEX idx_variant_materials_type ON variant_materials;
-- DROP INDEX idx_material_boards_category ON material_boards;
-- 
-- -- 删除迁移的数据（谨慎操作！）
-- DELETE FROM variant_materials WHERE notes = 'Migrated from product_variants.materialColorId';
-- 
-- ============================================================================
