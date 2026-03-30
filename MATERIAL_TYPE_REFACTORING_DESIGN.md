# 材料管理系统重构设计文档

**版本：** Phase 14  
**日期：** 2026-02-20  
**回滚版本：** 6b9fb8a6（如果重构出现问题可以回滚）

---

## 一、背景与目标

### 当前问题

1. **默认材料类型不合理**：每个批次默认必须选择"布料颜色"，但并非所有产品都有布料（例如桌子）
2. **材料类型硬编码**：9种材料类型在前端硬编码，无法动态管理
3. **材料层级关系不完整**：缺少材料类型管理，无法建立完整的层级关系

### 改进目标

1. **默认材料改为"颜色"**：所有产品都有颜色，解决"桌子没有布料"的问题
2. **材料类型动态管理**：从数据库读取材料类型，用户可以自定义
3. **建立完整的材料层级关系**：类型 → 供应商 → 布板 → 颜色
4. **自动添加默认颜色**：新建批次时自动添加ORIGINAL-ORIG-01作为默认颜色
5. **颜色材料不可删除**：第一个材料（颜色）永远不可删除，但可以编辑更换

---

## 二、数据库设计

### 2.1 新增表：material_types（材料类型）

```sql
CREATE TABLE material_types (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL COMMENT '材料类型名称（例如：布料、木腿、扶手）',
  icon VARCHAR(10) COMMENT 'Emoji图标（例如：🧵、🪑、🛋️）',
  sortOrder INT DEFAULT 0 COMMENT '排序顺序',
  erpCompanyId INT NOT NULL COMMENT '所属公司ID',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP NULL,
  INDEX idx_company (erpCompanyId),
  INDEX idx_sort (sortOrder)
);
```

### 2.2 修改表：material_suppliers（添加materialTypeId）

```sql
ALTER TABLE material_suppliers
ADD COLUMN materialTypeId INT COMMENT '材料类型ID',
ADD CONSTRAINT fk_supplier_type 
  FOREIGN KEY (materialTypeId) 
  REFERENCES material_types(id) 
  ON DELETE SET NULL;
```

### 2.3 默认数据插入

```sql
-- 为每个公司插入默认材料类型
INSERT INTO material_types (name, icon, sortOrder, erpCompanyId) VALUES
('布料', '🧵', 1, ?),
('木腿', '🪑', 2, ?),
('扶手', '🛋️', 3, ?),
('填充物', '🧶', 4, ?),
('坐垫', '💺', 5, ?),
('靠背', '🪑', 6, ?),
('框架', '🔲', 7, ?),
('配件', '🔧', 8, ?),
('其他', '📦', 9, ?);
```

---

## 三、数据层级关系

```
材料类型（material_types）
  └─ 供应商（material_suppliers.materialTypeId）
      └─ 布板/类别（material_boards.supplierId）
          └─ 颜色（material_colors.boardId）
```

**查询示例：**

```sql
-- 查询某个材料类型下的所有颜色
SELECT 
  mt.name AS typeName,
  ms.name AS supplierName,
  mb.boardCode AS boardCode,
  mc.colorCode AS colorCode,
  mc.colorName AS colorName
FROM material_types mt
JOIN material_suppliers ms ON ms.materialTypeId = mt.id
JOIN material_boards mb ON mb.supplierId = ms.id
JOIN material_colors mc ON mc.boardId = mb.id
WHERE mt.id = ? AND mt.erpCompanyId = ?;
```

---

## 四、API设计

### 4.1 材料类型管理API

**Router:** `materialTypes`

| API | 方法 | 描述 |
|-----|------|------|
| `materialTypes.list` | Query | 列出所有材料类型 |
| `materialTypes.create` | Mutation | 创建材料类型 |
| `materialTypes.update` | Mutation | 更新材料类型 |
| `materialTypes.delete` | Mutation | 删除材料类型（软删除） |

**示例：**

```typescript
// 列出所有材料类型
const types = await trpc.materialTypes.list.useQuery();

// 创建材料类型
const createType = trpc.materialTypes.create.useMutation();
await createType.mutateAsync({
  name: '金属腿',
  icon: '🦿',
  sortOrder: 10
});
```

### 4.2 修改现有API

**materials.colors.list**

添加`materialTypeId`参数，支持按材料类型筛选：

```typescript
materials.colors.list.useQuery({
  materialTypeId: 1, // 只查询"布料"类型的颜色
  search: 'Original'
});
```

**variantMaterials.create**

支持自动添加默认颜色材料：

```typescript
// 创建批次时自动添加默认颜色
await variantMaterials.create({
  variantId: 123,
  materialColorId: 1, // ORIGINAL-ORIG-01
  materialType: 'fabric', // 默认类型：布料
  isPrimary: true,
  sortOrder: 0
});
```

---

## 五、前端UI设计

### 5.1 材料类型管理页面

**路径：** `/materials/types`

**功能：**
- 列表显示所有材料类型（卡片布局）
- 创建新材料类型（对话框）
- 编辑材料类型（对话框）
- 删除材料类型（确认对话框）
- 拖拽排序

**UI示例：**

```
┌─────────────────────────────────────────┐
│ 材料类型管理                             │
│ ┌───────┐ ┌───────┐ ┌───────┐          │
│ │🧵 布料│ │🪑 木腿│ │🛋️ 扶手│ [+ 新建] │
│ │ 编辑  │ │ 编辑  │ │ 编辑  │          │
│ └───────┘ └───────┘ └───────┘          │
└─────────────────────────────────────────┘
```

### 5.2 批次材料管理组件（VariantMaterialsManager）

**改进点：**

1. **第一个材料固定为"颜色"**
   - 显示"⭐ 主材料 颜色"标签
   - 不显示删除按钮
   - 可以编辑更换颜色

2. **材料类型选择器动态加载**
   - 从`materialTypes.list` API读取
   - 显示图标+名称（例如：🧵 布料）

3. **新建批次自动添加默认颜色**
   - 批次创建成功后，自动调用`variantMaterials.create`
   - 添加ORIGINAL-ORIG-01作为默认颜色材料

**UI示例：**

```
批次材料清单
┌──────────────────────────────────────────┐
│ ⭐ 主材料 颜色                            │
│ [ORIG] SYS-DEFAULT - DEFAULT-BOARD - ... │
│        [编辑] [上移] [下移]              │ ← 没有删除按钮
├──────────────────────────────────────────┤
│ 🪑 木腿                                   │
│ [JX-C] JX - C03 - 01 · 灰褐色黑度        │
│        [编辑] [上移] [下移] [删除]       │
└──────────────────────────────────────────┘
[+ 添加更多材料]
```

### 5.3 供应商管理页面

**改进点：**

1. **创建/编辑供应商时选择材料类型**
   - 添加"材料类型"下拉选择器
   - 从`materialTypes.list` API读取

2. **按材料类型筛选供应商**
   - 添加材料类型Tab（全部、布料、木腿、扶手...）

---

## 六、实施步骤

### Phase 1: 分析需求并创建设计文档 ✅
- [x] 创建本设计文档

### Phase 2: 数据库设计和迁移
1. 创建material_types表
2. 为material_suppliers表添加materialTypeId字段
3. 插入默认材料类型数据
4. 迁移现有供应商数据

### Phase 3: 后端API开发
1. 创建materialTypes.ts核心逻辑
2. 创建materialTypes tRPC router
3. 修改materials.colors.list API
4. 修改variantMaterials.create API
5. 编写单元测试

### Phase 4: 前端UI开发
1. 创建材料类型管理页面
2. 修改VariantMaterialsManager组件
3. 修改批次创建逻辑
4. 修改供应商管理页面

### Phase 5: 测试验证并交付
1. 测试所有功能
2. 验证向后兼容性
3. 保存checkpoint

---

## 七、风险与注意事项

### 7.1 数据迁移风险

**风险：** 现有供应商数据没有materialTypeId，可能导致查询失败

**解决方案：**
- 为现有供应商数据自动分配材料类型（根据名称或手动分类）
- 允许materialTypeId为NULL（向后兼容）

### 7.2 向后兼容性

**风险：** 旧批次没有默认颜色材料

**解决方案：**
- 查询批次材料时，如果没有材料，显示"暂无材料"
- 提供"一键添加默认颜色"按钮

### 7.3 UI交互变化

**风险：** 用户习惯改变（第一个材料不可删除）

**解决方案：**
- 在UI上明确标识"主材料"
- 提供提示信息："主材料不可删除，但可以修改类型和颜色"

---

## 八、测试计划

### 8.1 单元测试

- [ ] materialTypes.list API测试
- [ ] materialTypes.create API测试
- [ ] materialTypes.update API测试
- [ ] materialTypes.delete API测试
- [ ] materials.colors.list按类型筛选测试
- [ ] variantMaterials.create默认颜色测试

### 8.2 集成测试

- [ ] 创建批次自动添加默认颜色
- [ ] 编辑批次材料（颜色不可删除）
- [ ] 材料类型管理（增删改查）
- [ ] 供应商按材料类型筛选
- [ ] 数据层级关系查询（类型→供应商→布板→颜色）

### 8.3 用户验收测试

- [ ] 用户创建新批次，验证默认颜色自动添加
- [ ] 用户编辑批次材料，验证颜色不可删除
- [ ] 用户创建材料类型，验证动态加载
- [ ] 用户创建供应商，验证材料类型选择

---

## 九、总结

本次重构将解决以下核心问题：

1. ✅ **默认材料合理化**：所有产品都有颜色，不再强制要求布料
2. ✅ **材料类型动态管理**：用户可以自定义材料类型
3. ✅ **完整的材料层级关系**：类型 → 供应商 → 布板 → 颜色
4. ✅ **自动化默认设置**：新建批次自动添加默认颜色
5. ✅ **数据完整性保护**：颜色材料不可删除，确保每个批次都有颜色信息

**预期效果：**

- 用户体验更加流畅（不再需要为桌子选择布料）
- 材料管理更加灵活（可以自定义材料类型）
- 数据结构更加完整（建立完整的层级关系）
- 系统更加健壮（默认颜色确保数据完整性）
