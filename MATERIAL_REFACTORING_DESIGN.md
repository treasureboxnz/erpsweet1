# 材料管理系统重构设计文档

## 1. 现状分析

### 1.1 当前数据库结构

经过分析，系统已经具备了基础的多材料支持框架：

#### 现有表结构：

1. **material_categories** (材料类别表)
   - 用于分类不同类型的材料（布料、脚、面板等）
   - 字段：id, erpCompanyId, name, code, description, sortOrder
   - 状态：✅ 已存在

2. **material_suppliers** (材料供应商表)
   - 关联到材料类别（categoryId）
   - 字段：id, erpCompanyId, categoryId, name, code, contactPerson, etc.
   - 状态：✅ 已存在

3. **material_boards** (布板表)
   - 关联到供应商（supplierId）
   - 字段：id, erpCompanyId, supplierId, boardNumber, boardName, materialType, pricePerMeter, etc.
   - 状态：✅ 已存在

4. **material_colors** (材料颜色表)
   - 关联到布板（boardId）
   - 字段：id, erpCompanyId, boardId, colorCode, colorName, fullCode, imageUrl, etc.
   - 状态：✅ 已存在

5. **variant_materials** (批次-材料关联表)
   - 多对多关联表，支持一个批次关联多个材料
   - 字段：id, erpCompanyId, variantId, materialColorId, quantityUsed, notes
   - 状态：✅ 已存在

6. **product_variants** (产品批次表)
   - 包含 materialColorId 字段（单一材料关联）
   - 状态：⚠️ 需要修改（移除单一材料关联）

### 1.2 核心问题

1. **product_variants表的冗余字段**
   - `materialColorId` 字段仍然存在，与 `variant_materials` 表的多对多关系冲突
   - 需要决定：保留（向后兼容）还是移除（清理架构）

2. **材料类型的灵活性**
   - `material_categories` 表已经支持多种材料类型
   - `material_boards` 表的 `materialType` 字段与类别系统有重复
   - 需要统一材料类型的管理方式

3. **订单显示逻辑**
   - 当前订单查询可能仍然使用 `materialColorId` 字段
   - 需要修改为从 `variant_materials` 表加载材料列表
   - 前端显示限制为3个材料图片（但后台加载全部）

### 1.3 用户需求回顾

根据用户要求（Plan A）：

1. ✅ 创建 `variant_materials` 表（已存在）
2. ✅ 创建 `material_types` 表（已存在，名为 `material_categories`）
3. ⏳ 允许用户通过"+"按钮添加多个材料到批次
4. ⏳ 每个材料有：类型、颜色/板选择、排序
5. ⏳ 订单显示：最多3个材料图片
6. ⏳ 订单详情：加载所有材料
7. ⏳ 合同生成：包含所有材料详细说明

## 2. 重构方案设计

### 2.1 数据库层修改

#### 方案A：渐进式重构（推荐）

**优点：**
- 向后兼容，现有数据不受影响
- 可以逐步迁移旧批次到新系统
- 降低风险

**实施步骤：**

1. **保留 `product_variants.materialColorId` 字段**
   - 标记为 deprecated（注释说明）
   - 新批次不再使用此字段（设为 null）
   - 旧批次保持现有值

2. **增强 `variant_materials` 表**
   ```sql
   ALTER TABLE variant_materials ADD COLUMN sortOrder INT DEFAULT 0 NOT NULL;
   ALTER TABLE variant_materials ADD COLUMN materialType VARCHAR(50);
   ```
   - `sortOrder`: 材料显示顺序（用于订单显示）
   - `materialType`: 材料类型标识（如：fabric, leg, armrest）

3. **创建数据迁移脚本**
   - 将现有批次的 `materialColorId` 迁移到 `variant_materials` 表
   - 设置 `sortOrder = 0`, `materialType = 'fabric'`

#### 方案B：激进式重构

**优点：**
- 架构更清晰
- 没有冗余字段

**缺点：**
- 需要修改大量代码
- 风险较高
- 可能破坏现有功能

**不推荐**，因为用户强调"谨慎实施"。

### 2.2 材料类型管理

#### 当前状态：
- `material_categories` 表已存在，支持材料类型管理
- `material_boards.materialType` 字段存在冗余

#### 优化方案：
1. **使用 `material_categories` 作为唯一的材料类型来源**
2. **保留 `material_boards.materialType` 作为描述性字段**（如：绒布、麻布）
3. **在 `material_boards` 表添加 `categoryId` 字段**（可选）
   ```sql
   ALTER TABLE material_boards ADD COLUMN categoryId INT;
   ALTER TABLE material_boards ADD FOREIGN KEY (categoryId) REFERENCES material_categories(id);
   ```

### 2.3 订单查询优化

#### 当前逻辑（推测）：
```sql
SELECT p.*, mc.imageUrl 
FROM product_variants pv
LEFT JOIN material_colors mc ON pv.materialColorId = mc.id
WHERE pv.id = ?
```

#### 新逻辑：
```sql
SELECT 
  pv.*,
  vm.id as vmId,
  vm.sortOrder,
  vm.materialType,
  mc.imageUrl,
  mc.colorName,
  mb.boardNumber
FROM product_variants pv
LEFT JOIN variant_materials vm ON pv.id = vm.variantId
LEFT JOIN material_colors mc ON vm.materialColorId = mc.id
LEFT JOIN material_boards mb ON mc.boardId = mb.id
WHERE pv.id = ?
ORDER BY vm.sortOrder ASC
LIMIT 3  -- 前端显示限制
```

#### 合同生成查询（加载全部）：
```sql
-- 同上，但移除 LIMIT 3
```

### 2.4 前端UI设计

#### 批次创建/编辑页面：

**材料选择区域：**
```
┌─────────────────────────────────────────────────┐
│ 材料配置                                         │
├─────────────────────────────────────────────────┤
│                                                 │
│ 材料1: [类型: 布料 ▼] [供应商: DAV ▼]          │
│        [布板: A87 ▼] [颜色: 08-米白 ▼]          │
│        [用量: 5.2 米] [↑] [↓] [删除]            │
│                                                 │
│ 材料2: [类型: 木腿 ▼] [供应商: XX木业 ▼]       │
│        [型号: L-001 ▼] [颜色: 胡桃木 ▼]         │
│        [用量: 4 件] [↑] [↓] [删除]              │
│                                                 │
│ [+ 添加材料]                                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

**交互逻辑：**
1. 点击"+ 添加材料"按钮，新增一行材料输入
2. 选择材料类型后，动态加载对应的供应商列表
3. 选择供应商后，加载对应的布板/型号列表
4. 选择布板后，加载颜色列表
5. [↑] [↓] 按钮调整材料显示顺序（影响订单中的显示优先级）
6. [删除] 按钮移除该材料

#### 订单列表/明细页面：

**材料显示（保持现有布局）：**
```
┌─────────────────────────────────────────┐
│ 批次信息                                 │
├─────────────────────────────────────────┤
│ 材料: [图1] [图2] [图3] +2              │
│       ↑ 最多显示3个，超过显示"+N"       │
└─────────────────────────────────────────┘
```

**关键点：**
- ⚠️ **不改变现有table-form布局**
- 只显示前3个材料的图片
- 如果超过3个，显示"+N"标识
- 点击"+N"可以展开查看全部材料

#### 订单详情页面：

**材料详情（可展开）：**
```
┌─────────────────────────────────────────────────┐
│ 材料详情 [展开 ▼]                               │
├─────────────────────────────────────────────────┤
│ 1. 布料 - DAV-A87-08 (米白)                     │
│    用量: 5.2米 | 单价: ¥45/米                   │
│    [图片预览]                                    │
│                                                 │
│ 2. 木腿 - XX木业-L001 (胡桃木)                  │
│    用量: 4件 | 单价: ¥120/件                    │
│    [图片预览]                                    │
│                                                 │
│ 3. 填充物 - YY厂-F003 (高密度海绵)              │
│    用量: 2kg | 单价: ¥80/kg                     │
│                                                 │
│ ... (显示所有材料)                              │
└─────────────────────────────────────────────────┘
```

#### 合同生成页面：

**材料规格表：**
```
| 序号 | 材料类型 | 供应商 | 型号/布板 | 颜色 | 用量 | 单价 | 小计 |
|------|---------|--------|-----------|------|------|------|------|
| 1    | 布料    | DAV    | A87       | 08   | 5.2m | ¥45  | ¥234 |
| 2    | 木腿    | XX木业 | L-001     | 胡桃 | 4pcs | ¥120 | ¥480 |
| 3    | 填充物  | YY厂   | F-003     | -    | 2kg  | ¥80  | ¥160 |
```

## 3. 实施计划

### Phase 1: 数据库Schema修改 ✅（本阶段）

1. ✅ 分析现有结构
2. ⏳ 设计新字段
3. ⏳ 编写迁移SQL
4. ⏳ 用户评审

### Phase 2: 数据库迁移实施

1. 备份现有数据
2. 执行schema修改
3. 运行数据迁移脚本
4. 验证数据完整性

### Phase 3: 后端API开发

1. 修改批次创建API（支持材料数组）
2. 修改批次编辑API（支持材料增删改）
3. 修改批次查询API（返回材料列表）
4. 修改订单查询API（支持材料限制）
5. 开发材料管理API（排序、删除）

### Phase 4: 前端UI开发

1. 批次创建/编辑页面：动态材料输入
2. 订单列表：3个材料图片显示
3. 订单详情：全部材料展示
4. 合同生成：材料规格表

### Phase 5: 测试验证

1. 创建包含多种材料的批次
2. 验证订单显示逻辑
3. 验证合同生成
4. 验证旧数据兼容性

## 4. 风险评估

### 高风险项：
1. ❌ 删除 `product_variants.materialColorId` 字段
   - **缓解措施**：保留字段，标记为deprecated

### 中风险项：
1. ⚠️ 修改订单查询逻辑
   - **缓解措施**：先实现新逻辑，保留旧逻辑作为fallback

### 低风险项：
1. ✅ 添加新字段到 `variant_materials`
2. ✅ 前端UI新增功能

## 5. 向后兼容性保证

### 数据层：
- 保留 `product_variants.materialColorId` 字段
- 旧批次数据自动迁移到 `variant_materials` 表
- 新批次使用 `variant_materials` 表

### API层：
- 批次查询API同时返回旧字段和新字段
- 前端优先使用新字段，fallback到旧字段

### UI层：
- 订单显示逻辑兼容单材料和多材料
- 如果 `variant_materials` 为空，使用 `materialColorId`

## 6. 待用户确认的关键决策

### 决策1: 是否保留 `product_variants.materialColorId` 字段？
- **选项A（推荐）**: 保留，标记为deprecated，逐步迁移
- **选项B**: 删除，强制使用 `variant_materials` 表

### 决策2: `material_boards` 表是否添加 `categoryId` 字段？
- **选项A（推荐）**: 添加，统一材料类型管理
- **选项B**: 不添加，保持现有结构

### 决策3: `variant_materials` 表需要添加哪些字段？
- **必需字段**: `sortOrder` (排序)
- **可选字段**: `materialType` (材料类型标识，如 'fabric', 'leg')
- **建议**: 添加 `materialType` 便于前端分类显示

### 决策4: 订单显示的3个材料图片如何选择？
- **选项A（推荐）**: 按 `sortOrder` 排序，取前3个
- **选项B**: 按材料类型优先级（如：布料 > 木腿 > 填充物）
- **选项C**: 随机选择3个

## 7. 下一步行动

等待用户确认以上设计方案后，将进入Phase 2（数据库迁移实施）。

**请用户重点确认：**
1. ✅ 是否采用"渐进式重构"方案（保留旧字段）？
2. ✅ `variant_materials` 表需要添加 `sortOrder` 和 `materialType` 字段？
3. ✅ 订单显示3个材料图片的选择逻辑（按sortOrder排序）？
4. ✅ 是否需要为 `material_boards` 添加 `categoryId` 字段？

---

**文档版本**: v1.0  
**创建日期**: 2026-02-20  
**作者**: Manus AI Agent  
**状态**: 待用户评审
