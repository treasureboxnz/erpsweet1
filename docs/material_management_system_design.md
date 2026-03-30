# 材料管理系统设计文档

## 1. 业务背景

### 1.1 业务需求
外贸家具企业需要管理大量的布料、材料供应商和材料样品。材料管理的核心特点：

1. **三级结构**：工厂名称（供应商） → 布料板编号 → 布料号码（颜色）
2. **价格管理**：同一布料板的所有颜色共享价格（例如：布板008的32个颜色都是15元/米）
3. **图片管理**：每个颜色可以上传照片，用于展示和选择
4. **批次引用**：在产品批次管理中选择布料时，可以读取布料信息和照片
5. **数量级**：几百种布料，每种布料可能有几十个颜色

### 1.2 使用场景

**场景1：材料采购员录入新布料板**
1. 选择供应商（工厂）
2. 输入布料板编号（如：008）
3. 设置布料板价格（如：15元/米）
4. 添加多个颜色（如：32个颜色）
5. 为每个颜色上传照片

**场景2：业务员创建产品批次时选择布料**
1. 在批次创建页面选择"使用特定布料"
2. 按供应商筛选布料板
3. 选择布料板后，看到所有可用颜色及照片
4. 选择具体颜色，系统自动读取价格和照片
5. 批次记录中保留布料信息引用

**场景3：查看批次详情时显示布料信息**
1. 打开批次详情页
2. 看到使用的布料照片
3. 看到布料供应商、板号、颜色、价格信息
4. 可以点击查看布料详细信息

---

## 2. 数据库设计

### 2.1 材料供应商表 (material_suppliers)

```sql
CREATE TABLE material_suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_name VARCHAR(255) NOT NULL COMMENT '供应商名称（工厂名称）',
  supplier_code VARCHAR(100) UNIQUE COMMENT '供应商编号',
  contact_person VARCHAR(100) COMMENT '联系人',
  contact_phone VARCHAR(50) COMMENT '联系电话',
  contact_email VARCHAR(255) COMMENT '联系邮箱',
  address TEXT COMMENT '地址',
  notes TEXT COMMENT '备注',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  created_by INT COMMENT '创建人',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_supplier_name (supplier_name),
  INDEX idx_is_active (is_active),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

**字段说明：**
- `supplier_name`: 工厂名称，如"杭州XX纺织厂"
- `supplier_code`: 供应商编号，用于快速查找
- `is_active`: 软删除标记，不活跃的供应商不显示在选择列表中

---

### 2.2 材料板表 (material_boards)

```sql
CREATE TABLE material_boards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id INT NOT NULL COMMENT '供应商ID',
  board_code VARCHAR(100) NOT NULL COMMENT '布料板编号（如：008）',
  board_name VARCHAR(255) COMMENT '布料板名称',
  material_type VARCHAR(100) COMMENT '材料类型（布料/皮革/木材等）',
  unit_price_rmb DECIMAL(10, 2) NOT NULL COMMENT '单价（人民币/米）',
  unit VARCHAR(20) DEFAULT '米' COMMENT '计量单位',
  description TEXT COMMENT '描述',
  notes TEXT COMMENT '备注',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  created_by INT COMMENT '创建人',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_supplier_board (supplier_id, board_code),
  INDEX idx_supplier_id (supplier_id),
  INDEX idx_board_code (board_code),
  INDEX idx_is_active (is_active),
  FOREIGN KEY (supplier_id) REFERENCES material_suppliers(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

**字段说明：**
- `board_code`: 布料板编号，在同一供应商下唯一
- `unit_price_rmb`: 布料板价格，同一板的所有颜色共享此价格
- `material_type`: 材料类型，便于分类筛选
- `unique_supplier_board`: 联合唯一索引，确保同一供应商下板号不重复

---

### 2.3 材料颜色表 (material_colors)

```sql
CREATE TABLE material_colors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  board_id INT NOT NULL COMMENT '布料板ID',
  color_code VARCHAR(100) NOT NULL COMMENT '颜色编号',
  color_name VARCHAR(255) COMMENT '颜色名称（如：深灰色）',
  color_hex VARCHAR(7) COMMENT '颜色十六进制代码（如：#333333）',
  image_url TEXT COMMENT '颜色照片URL',
  image_key TEXT COMMENT '照片S3 key',
  thumbnail_url TEXT COMMENT '缩略图URL',
  stock_quantity DECIMAL(10, 2) COMMENT '库存数量',
  stock_unit VARCHAR(20) COMMENT '库存单位',
  notes TEXT COMMENT '备注',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  sort_order INT DEFAULT 0 COMMENT '排序',
  created_by INT COMMENT '创建人',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_board_color (board_id, color_code),
  INDEX idx_board_id (board_id),
  INDEX idx_color_code (color_code),
  INDEX idx_is_active (is_active),
  INDEX idx_sort_order (sort_order),
  FOREIGN KEY (board_id) REFERENCES material_boards(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

**字段说明：**
- `color_code`: 颜色编号，在同一布料板下唯一
- `color_hex`: 用于UI显示颜色预览
- `image_url`: 布料颜色照片，存储在S3
- `thumbnail_url`: 缩略图，用于列表展示
- `stock_quantity`: 可选的库存管理
- `sort_order`: 用于自定义排序

---

### 2.4 批次-材料关联表 (variant_materials)

```sql
CREATE TABLE variant_materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  variant_id INT NOT NULL COMMENT '产品批次ID',
  material_color_id INT NOT NULL COMMENT '材料颜色ID',
  material_usage VARCHAR(100) COMMENT '材料用途（主布料/辅料/填充物等）',
  quantity DECIMAL(10, 2) COMMENT '用量',
  unit VARCHAR(20) COMMENT '单位',
  unit_price_rmb DECIMAL(10, 2) COMMENT '单价（记录时的价格）',
  total_cost_rmb DECIMAL(10, 2) COMMENT '总成本',
  notes TEXT COMMENT '备注',
  created_by INT COMMENT '创建人',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_variant_id (variant_id),
  INDEX idx_material_color_id (material_color_id),
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
  FOREIGN KEY (material_color_id) REFERENCES material_colors(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

**字段说明：**
- `variant_id`: 关联到产品批次
- `material_color_id`: 关联到具体的材料颜色
- `material_usage`: 材料用途分类
- `unit_price_rmb`: 记录当时的价格（价格可能会变动）
- `total_cost_rmb`: 计算的总成本

---

## 3. API设计

### 3.1 材料供应商管理

```typescript
// 创建供应商
POST /api/material-suppliers
{
  "supplierName": "杭州XX纺织厂",
  "supplierCode": "HZ001",
  "contactPerson": "张三",
  "contactPhone": "13800138000",
  "contactEmail": "zhangsan@example.com",
  "address": "杭州市XX区XX路XX号",
  "notes": "主要供应高端布料"
}

// 获取供应商列表
GET /api/material-suppliers?page=1&pageSize=20&search=杭州&isActive=true

// 获取供应商详情
GET /api/material-suppliers/:id

// 更新供应商
PUT /api/material-suppliers/:id

// 删除供应商（软删除）
DELETE /api/material-suppliers/:id
```

---

### 3.2 材料板管理

```typescript
// 创建材料板
POST /api/material-boards
{
  "supplierId": 1,
  "boardCode": "008",
  "boardName": "高档绒布",
  "materialType": "布料",
  "unitPriceRmb": 15.00,
  "unit": "米",
  "description": "适用于沙发、椅子等家具",
  "colors": [
    {
      "colorCode": "001",
      "colorName": "深灰色",
      "colorHex": "#333333",
      "imageFile": "base64..." // 或者先上传图片获取URL
    },
    {
      "colorCode": "002",
      "colorName": "浅灰色",
      "colorHex": "#CCCCCC"
    }
    // ... 更多颜色
  ]
}

// 获取材料板列表
GET /api/material-boards?page=1&pageSize=20&supplierId=1&search=008&materialType=布料

// 获取材料板详情（包含所有颜色）
GET /api/material-boards/:id

// 更新材料板
PUT /api/material-boards/:id

// 删除材料板
DELETE /api/material-boards/:id
```

---

### 3.3 材料颜色管理

```typescript
// 添加颜色到材料板
POST /api/material-boards/:boardId/colors
{
  "colorCode": "003",
  "colorName": "米白色",
  "colorHex": "#F5F5DC",
  "imageFile": "base64..."
}

// 批量添加颜色
POST /api/material-boards/:boardId/colors/batch
{
  "colors": [
    { "colorCode": "004", "colorName": "黑色", "colorHex": "#000000" },
    { "colorCode": "005", "colorName": "白色", "colorHex": "#FFFFFF" }
  ]
}

// 更新颜色
PUT /api/material-colors/:id

// 上传颜色照片
POST /api/material-colors/:id/upload-image

// 删除颜色
DELETE /api/material-colors/:id

// 批量排序
POST /api/material-boards/:boardId/colors/reorder
{
  "colorIds": [5, 3, 1, 2, 4]
}
```

---

### 3.4 批次材料关联

```typescript
// 为批次添加材料
POST /api/variants/:variantId/materials
{
  "materialColorId": 123,
  "materialUsage": "主布料",
  "quantity": 5.5,
  "unit": "米"
}

// 获取批次的所有材料
GET /api/variants/:variantId/materials

// 更新批次材料
PUT /api/variant-materials/:id

// 删除批次材料
DELETE /api/variant-materials/:id
```

---

## 4. UI设计

### 4.1 材料管理主页面

**导航结构：**
```
材料管理
├── 材料供应商
├── 材料板管理
└── 材料库存（可选）
```

---

### 4.2 材料供应商列表页面

**布局：**
- 顶部：搜索框 + "新建供应商"按钮
- 表格列：供应商名称、编号、联系人、电话、状态、操作
- 操作：查看、编辑、删除

---

### 4.3 材料板管理页面

**布局：**
- 左侧：供应商列表（树形或列表）
- 右侧：选中供应商的材料板列表
- 材料板卡片显示：
  - 板号、名称、价格
  - 颜色数量
  - 缩略图预览（前几个颜色）

**筛选：**
- 按供应商筛选
- 按材料类型筛选
- 搜索板号或名称

---

### 4.4 材料板详情/编辑页面

**布局：**

**基本信息卡片：**
- 供应商（选择）
- 板号
- 板名称
- 材料类型
- 单价（人民币/米）
- 描述

**颜色管理区域：**
- 网格布局显示所有颜色
- 每个颜色卡片包含：
  - 颜色照片（可上传/更换）
  - 颜色编号
  - 颜色名称
  - 颜色预览（色块）
  - 删除按钮
- "添加颜色"按钮
- 支持拖拽排序

**批量操作：**
- 批量上传颜色（Excel导入）
- 批量上传照片（ZIP包）

---

### 4.5 批次创建/编辑页面集成

**在产品批次创建页面添加"材料选择"区域：**

**材料选择流程：**
1. 点击"添加材料"按钮
2. 弹出材料选择对话框：
   - 左侧：供应商列表
   - 中间：材料板列表（带价格）
   - 右侧：颜色列表（带照片）
3. 选择颜色后，自动填充：
   - 材料供应商
   - 材料板号
   - 颜色编号
   - 单价
   - 照片预览
4. 输入用量，自动计算成本

**已选材料显示：**
- 表格显示已选材料
- 列：照片、供应商、板号、颜色、用途、用量、单价、总成本
- 支持编辑和删除

---

### 4.6 批次详情页面显示材料信息

**材料信息卡片：**
- 标题："使用材料"
- 每个材料显示：
  - 材料照片（大图）
  - 供应商名称
  - 材料板号 + 颜色编号
  - 颜色名称
  - 用途
  - 用量 + 单位
  - 单价
  - 总成本
- 点击可查看材料详情

---

## 5. 业务逻辑

### 5.1 价格管理逻辑

**规则：**
1. 价格存储在`material_boards`表的`unit_price_rmb`字段
2. 同一布料板的所有颜色共享此价格
3. 在批次关联时，将当时的价格记录到`variant_materials.unit_price_rmb`
4. 如果材料板价格更新，不影响已创建的批次记录

**价格更新流程：**
1. 用户更新材料板价格
2. 系统提示："此操作不会影响已创建的批次"
3. 更新`material_boards.unit_price_rmb`
4. 新创建的批次使用新价格

---

### 5.2 图片管理逻辑

**上传流程：**
1. 用户选择图片文件
2. 前端压缩图片（可选）
3. 上传到S3
4. 生成缩略图（可以用S3的图片处理功能或后端处理）
5. 保存URL到`material_colors.image_url`和`thumbnail_url`

**图片显示优先级：**
1. 如果有`image_url`，显示图片
2. 如果有`color_hex`，显示色块
3. 否则显示默认占位图

---

### 5.3 批次材料关联逻辑

**添加材料到批次：**
1. 选择材料颜色
2. 自动读取当前价格
3. 输入用量
4. 计算总成本 = 用量 × 单价
5. 创建`variant_materials`记录

**批次成本计算：**
- 批次总成本 = 原材料成本 + 人工成本 + 其他成本
- 原材料成本 = SUM(所有材料的total_cost_rmb)

---

## 6. 实现优先级

### 第一阶段（核心功能）
1. ✅ 材料供应商CRUD
2. ✅ 材料板CRUD（包含颜色）
3. ✅ 材料颜色管理（上传照片）
4. ✅ 批次-材料关联

### 第二阶段（增强功能）
5. 材料库存管理
6. 材料价格历史记录
7. 材料使用统计报表
8. 批量导入导出

### 第三阶段（高级功能）
9. 材料成本分析
10. 供应商评价系统
11. 材料采购建议
12. 材料图片智能识别

---

## 7. 技术实现要点

### 7.1 图片上传优化
- 前端使用`react-dropzone`支持拖拽上传
- 图片压缩：使用`browser-image-compression`
- 批量上传：支持一次选择多个文件
- 进度显示：显示上传进度条

### 7.2 颜色选择器
- 使用`react-colorful`或`react-color`
- 支持手动输入十六进制代码
- 显示颜色预览

### 7.3 材料选择对话框
- 使用`@radix-ui/react-dialog`
- 三列布局：供应商 | 材料板 | 颜色
- 支持搜索和筛选
- 显示照片预览

### 7.4 数据缓存
- 使用tRPC的查询缓存
- 材料列表数据缓存5分钟
- 图片URL使用CDN缓存

---

## 8. 数据迁移计划

### 8.1 现有数据评估
- 检查是否有现有的供应商数据
- 检查产品批次中是否有材料相关字段

### 8.2 迁移步骤
1. 创建新表结构
2. 导入供应商数据（如果有）
3. 创建默认材料类型
4. 测试数据验证

---

## 9. 测试计划

### 9.1 单元测试
- 材料板价格计算
- 批次成本计算
- 图片上传功能

### 9.2 集成测试
- 创建完整的材料板（含多个颜色）
- 批次关联材料
- 价格更新后的数据一致性

### 9.3 UI测试
- 材料选择流程
- 图片上传和预览
- 批量操作

---

## 10. 未来扩展

### 10.1 多语言支持
- 材料名称支持多语言
- 颜色名称支持多语言

### 10.2 供应商门户
- 供应商可以登录查看订单
- 供应商可以更新材料信息

### 10.3 移动端支持
- 响应式设计
- 移动端照片拍摄上传

### 10.4 AI辅助
- 根据照片自动识别颜色
- 材料推荐系统
- 成本优化建议

---

## 附录：数据示例

### 示例1：杭州XX纺织厂的布料板008

**供应商信息：**
- 供应商名称：杭州XX纺织厂
- 供应商编号：HZ001

**材料板信息：**
- 板号：008
- 板名称：高档绒布
- 材料类型：布料
- 单价：15元/米

**颜色列表（32个颜色）：**
1. 001 - 深灰色 (#333333)
2. 002 - 浅灰色 (#CCCCCC)
3. 003 - 米白色 (#F5F5DC)
4. 004 - 黑色 (#000000)
5. 005 - 白色 (#FFFFFF)
... （共32个）

---

## 总结

这个材料管理系统设计遵循以下原则：

1. **三级结构清晰**：供应商 → 材料板 → 颜色
2. **价格管理合理**：板级价格，历史记录保留
3. **图片管理完善**：支持上传、预览、批量操作
4. **批次集成紧密**：无缝集成到现有批次管理
5. **扩展性强**：预留库存、统计等功能接口
6. **用户体验好**：直观的UI，便捷的操作流程

系统实现后，将大大提升材料管理效率，为产品批次管理提供强有力的支持。
