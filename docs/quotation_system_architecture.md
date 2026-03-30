# 报价管理系统架构设计文档

## 1. 业务需求分析

### 1.1 报价与订单的本质区别

| 维度 | 报价（Quotation） | 订单（Order） |
|------|------------------|--------------|
| **业务性质** | 商务洽谈阶段的价格提案 | 正式的销售合同 |
| **业务目的** | 向客户展示价格方案，争取订单 | 执行生产、发货、收款 |
| **状态流转** | 草稿→已发送→已接受/已拒绝/已过期 | 待确认→生产中→已发货→已完成→已取消 |
| **会计处理** | 不产生应收账款，不影响库存 | 产生应收账款，影响库存预留 |
| **可修改性** | 可以多次修改和重新发送 | 确认后修改需要严格的审批流程 |
| **转换关系** | 被客户接受后转换为正式订单 | 直接进入生产和物流流程 |
| **有效期** | 有明确的报价有效期 | 无有效期概念，有交货期 |
| **版本控制** | 支持多版本报价（修改后创建新版本） | 不支持版本控制 |

### 1.2 核心业务流程

```
报价流程：
1. 业务员创建报价（草稿状态）
   ├── 选择客户
   ├── 选择报价模式（订单模式/批次模式）
   ├── 添加产品和批次
   ├── 设置价格
   └── 设置有效期

2. 发送给客户（已发送状态）
   ├── 生成PDF报价单
   ├── 发送邮件给客户
   └── 记录发送时间

3. 客户反馈
   ├── 接受 → 转换为订单（已接受状态）
   ├── 拒绝 → 标记为已拒绝
   ├── 要求修改 → 创建新版本报价
   └── 超过有效期 → 自动标记为已过期

4. 报价转订单
   ├── 保留所有产品和价格信息
   ├── 建立报价与订单的关联关系
   ├── 订单状态初始化为"待确认"
   └── 报价状态更新为"已接受"并记录转换的订单ID
```

### 1.3 报价模式支持

报价系统需要支持两种报价模式，与订单系统保持一致：

1. **订单模式（fob_only）**
   - 使用产品的默认批次
   - 根据客户的FOB级别自动填充价格
   - 简化流程，适合标准化产品报价

2. **批次模式（batch_selection）**
   - 可以选择特定批次
   - 支持特殊包装、颜色、材料的定制报价
   - 适合定制化产品报价

## 2. 数据模型设计

### 2.1 数据库表结构

#### quotations 表（报价主表）

```sql
CREATE TABLE quotations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quotation_number VARCHAR(50) UNIQUE NOT NULL COMMENT '报价单号，格式：QUO-YYYYMMDD-XXX',
  
  -- 客户信息
  customer_id INT NOT NULL COMMENT '客户ID',
  customer_name VARCHAR(255) NOT NULL COMMENT '客户名称（冗余字段）',
  contact_person VARCHAR(100) COMMENT '联系人',
  contact_phone VARCHAR(50) COMMENT '联系电话',
  contact_email VARCHAR(255) COMMENT '联系邮箱',
  shipping_address TEXT COMMENT '收货地址',
  
  -- 报价模式
  quotation_mode ENUM('fob_only', 'batch_selection') NOT NULL DEFAULT 'batch_selection' COMMENT '报价模式',
  currency VARCHAR(10) NOT NULL DEFAULT 'USD' COMMENT '货币',
  
  -- 报价状态
  status ENUM('draft', 'sent', 'accepted', 'rejected', 'expired') NOT NULL DEFAULT 'draft' COMMENT '报价状态',
  
  -- 金额信息
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT '报价总额',
  
  -- 有效期
  valid_until DATE COMMENT '报价有效期',
  
  -- 备注
  notes TEXT COMMENT '内部备注',
  customer_notes TEXT COMMENT '客户备注（显示在报价单上）',
  
  -- 版本控制
  version INT NOT NULL DEFAULT 1 COMMENT '版本号',
  parent_quotation_id INT COMMENT '父报价ID（用于版本追踪）',
  
  -- 转换关系
  converted_to_order_id INT COMMENT '转换的订单ID',
  converted_at TIMESTAMP COMMENT '转换时间',
  
  -- 发送记录
  sent_at TIMESTAMP COMMENT '发送时间',
  sent_by INT COMMENT '发送人ID',
  
  -- 审计字段
  created_by INT NOT NULL COMMENT '创建人ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP COMMENT '软删除时间',
  
  -- 索引
  INDEX idx_customer (customer_id),
  INDEX idx_status (status),
  INDEX idx_quotation_number (quotation_number),
  INDEX idx_valid_until (valid_until),
  INDEX idx_created_at (created_at),
  
  -- 外键
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (parent_quotation_id) REFERENCES quotations(id),
  FOREIGN KEY (converted_to_order_id) REFERENCES orders(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

#### quotation_items 表（报价产品明细）

```sql
CREATE TABLE quotation_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quotation_id INT NOT NULL COMMENT '报价ID',
  product_id INT NOT NULL COMMENT '产品ID',
  product_name VARCHAR(255) NOT NULL COMMENT '产品名称（冗余）',
  product_sku VARCHAR(100) NOT NULL COMMENT '产品SKU（冗余）',
  
  -- FOB模式字段
  fob_quantity INT COMMENT 'FOB数量',
  fob_unit_price DECIMAL(15, 2) COMMENT 'FOB单价',
  fob_subtotal DECIMAL(15, 2) COMMENT 'FOB小计',
  
  -- 排序
  sort_order INT NOT NULL DEFAULT 0 COMMENT '排序顺序',
  
  -- 审计字段
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- 索引
  INDEX idx_quotation (quotation_id),
  INDEX idx_product (product_id),
  
  -- 外键
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

#### quotation_batches 表（报价批次明细）

```sql
CREATE TABLE quotation_batches (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quotation_item_id INT NOT NULL COMMENT '报价产品明细ID',
  variant_id INT NOT NULL COMMENT '批次ID',
  variant_name VARCHAR(255) NOT NULL COMMENT '批次名称（冗余）',
  
  -- 批次信息
  quantity INT NOT NULL COMMENT '数量',
  unit_price DECIMAL(15, 2) NOT NULL COMMENT '单价',
  subtotal DECIMAL(15, 2) NOT NULL COMMENT '小计',
  
  -- 排序
  sort_order INT NOT NULL DEFAULT 0 COMMENT '排序顺序',
  
  -- 审计字段
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- 索引
  INDEX idx_quotation_item (quotation_item_id),
  INDEX idx_variant (variant_id),
  
  -- 外键
  FOREIGN KEY (quotation_item_id) REFERENCES quotation_items(id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES product_variants(id)
);
```

### 2.2 orders 表扩展

需要在 orders 表中添加以下字段：

```sql
ALTER TABLE orders ADD COLUMN created_from_quotation_id INT COMMENT '来源报价ID';
ALTER TABLE orders ADD COLUMN created_from_quotation_number VARCHAR(50) COMMENT '来源报价单号（冗余）';
ALTER TABLE orders ADD INDEX idx_quotation_source (created_from_quotation_id);
ALTER TABLE orders ADD FOREIGN KEY (created_from_quotation_id) REFERENCES quotations(id);
```

## 3. API设计

### 3.1 报价CRUD API

#### 创建报价
```typescript
POST /api/trpc/quotations.create
Request: {
  customerId: number;
  quotationMode: 'fob_only' | 'batch_selection';
  currency: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  shippingAddress?: string;
  validUntil?: string; // ISO date
  notes?: string;
  customerNotes?: string;
  items: Array<{
    productId: number;
    fobQuantity?: number;
    fobUnitPrice?: number;
    batches?: Array<{
      variantId: number;
      quantity: number;
      unitPrice: number;
    }>;
  }>;
}
Response: {
  id: number;
  quotationNumber: string;
  status: string;
  totalAmount: number;
  ...
}
```

#### 获取报价列表
```typescript
GET /api/trpc/quotations.list
Request: {
  page?: number;
  pageSize?: number;
  status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  customerId?: number;
  search?: string; // 搜索报价单号或客户名称
  startDate?: string;
  endDate?: string;
}
Response: {
  items: Quotation[];
  total: number;
  page: number;
  pageSize: number;
}
```

#### 获取报价详情
```typescript
GET /api/trpc/quotations.getById
Request: {
  id: number;
}
Response: {
  ...quotation,
  items: Array<{
    ...item,
    batches: Batch[];
  }>;
  customer: Customer;
  createdByUser: User;
}
```

#### 更新报价
```typescript
PUT /api/trpc/quotations.update
Request: {
  id: number;
  // 同创建报价的字段
}
Response: {
  success: boolean;
  quotation: Quotation;
}
```

#### 删除报价（软删除）
```typescript
DELETE /api/trpc/quotations.delete
Request: {
  id: number;
}
Response: {
  success: boolean;
}
```

### 3.2 报价状态管理API

#### 发送报价
```typescript
POST /api/trpc/quotations.send
Request: {
  id: number;
  email?: string; // 可选，覆盖客户默认邮箱
}
Response: {
  success: boolean;
  sentAt: string;
}
```

#### 标记为已接受
```typescript
POST /api/trpc/quotations.markAsAccepted
Request: {
  id: number;
}
Response: {
  success: boolean;
  quotation: Quotation;
}
```

#### 标记为已拒绝
```typescript
POST /api/trpc/quotations.markAsRejected
Request: {
  id: number;
  reason?: string;
}
Response: {
  success: boolean;
  quotation: Quotation;
}
```

### 3.3 报价转订单API

```typescript
POST /api/trpc/quotations.convertToOrder
Request: {
  quotationId: number;
  orderData?: {
    // 可选的订单额外信息
    notes?: string;
    expectedDeliveryDate?: string;
  };
}
Response: {
  success: boolean;
  order: Order;
  quotation: Quotation; // 更新后的报价（状态变为accepted）
}
```

### 3.4 报价复制API（创建新版本）

```typescript
POST /api/trpc/quotations.duplicate
Request: {
  quotationId: number;
  createNewVersion: boolean; // true=创建新版本（关联父报价），false=完全独立的副本
}
Response: {
  success: boolean;
  newQuotation: Quotation;
}
```

### 3.5 报价统计API

```typescript
GET /api/trpc/quotations.stats
Request: {
  startDate?: string;
  endDate?: string;
}
Response: {
  totalQuotations: number;
  byStatus: {
    draft: number;
    sent: number;
    accepted: number;
    rejected: number;
    expired: number;
  };
  conversionRate: number; // 接受率
  totalValue: number; // 总报价金额
  acceptedValue: number; // 已接受报价金额
}
```

## 4. 前端UI设计

### 4.1 页面结构

```
/quotations                 # 报价列表页
/quotations/new             # 新建报价页
/quotations/:id             # 报价详情页
/quotations/:id/edit        # 编辑报价页
```

### 4.2 报价列表页 (/quotations)

**功能模块：**
- 顶部操作栏
  - 新建报价按钮
  - 搜索框（报价单号、客户名称）
  - 筛选器（状态、日期范围、客户）
  - 导出按钮

- 报价列表表格
  - 列：报价单号、客户名称、报价模式、总金额、状态、有效期、创建时间、操作
  - 状态标签颜色：
    - 草稿：灰色
    - 已发送：蓝色
    - 已接受：绿色
    - 已拒绝：红色
    - 已过期：橙色
  - 有效期倒计时（距离过期还有X天）
  - 快速操作：查看、编辑、复制、转订单、发送、删除

- 分页组件

**状态筛选器：**
```tsx
<Select value={statusFilter} onValueChange={setStatusFilter}>
  <SelectItem value="all">全部状态</SelectItem>
  <SelectItem value="draft">草稿</SelectItem>
  <SelectItem value="sent">已发送</SelectItem>
  <SelectItem value="accepted">已接受</SelectItem>
  <SelectItem value="rejected">已拒绝</SelectItem>
  <SelectItem value="expired">已过期</SelectItem>
</Select>
```

### 4.3 新建报价页 (/quotations/new)

**页面布局：**

```
┌─────────────────────────────────────────────────────────┐
│ 新建报价                                    [取消] [保存草稿] [发送报价] │
├─────────────────────────────────────────────────────────┤
│ 客户信息                                                  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 报价单号: QUO-20260216-XXX (自动生成)                  │ │
│ │ 客户: [选择客户▼]  货币: [USD▼]                       │ │
│ │ 报价模式: ○订单模式 ●批次模式                          │ │
│ │ 有效期: [选择日期]                                     │ │
│ │ 联系人: [____]  电话: [____]  邮箱: [____]            │ │
│ │ 收货地址: [________________]                          │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ 产品明细                                    [+ 添加产品]   │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 产品1: Modern Upholstered Dining Chair - Gray        │ │
│ │ SKU: DC-001-GRY                                      │ │
│ │                                                       │ │
│ │ [批次模式下显示批次列表]                               │ │
│ │ 批次: DC-001-GRY-V003  数量: 10  单价: $119  小计: $1,190 │ │
│ │                                          [+ 添加批次]  │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ 备注信息                                                  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 内部备注: [________________]                          │ │
│ │ 客户备注: [________________] (显示在报价单上)          │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│                                   报价总额: $1,190.00     │
└─────────────────────────────────────────────────────────┘
```

**组件复用：**
- 复用订单创建页面的产品选择组件
- 复用批次选择组件
- 复用价格计算逻辑

**新增字段：**
- 有效期选择器（DatePicker）
- 客户备注（面向客户的说明文本）

### 4.4 报价详情页 (/quotations/:id)

**页面布局：**

```
┌─────────────────────────────────────────────────────────┐
│ 报价详情 QUO-20260216-001                                 │
│ 状态: [已发送]  有效期: 2026-03-16 (还有28天)             │
│                                                           │
│ [编辑] [复制] [转为订单] [发送邮件] [导出PDF] [删除]      │
├─────────────────────────────────────────────────────────┤
│ 客户信息                                                  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 客户: ABC Furniture                                   │ │
│ │ 联系人: John Smith  电话: +1-555-1234                 │ │
│ │ 邮箱: john@abcfurniture.com                          │ │
│ │ 收货地址: 123 Main St, New York, NY 10001            │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ 产品明细                                                  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 产品1: Modern Upholstered Dining Chair - Gray        │ │
│ │ SKU: DC-001-GRY                                      │ │
│ │                                                       │ │
│ │ 批次: DC-001-GRY-V003                                │ │
│ │ 数量: 10  单价: $119.00  小计: $1,190.00             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ 备注信息                                                  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 客户备注: This is a special order for Q1 2026...     │ │
│ │ 内部备注: Customer requested expedited shipping      │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│                                   报价总额: $1,190.00     │
│                                                           │
│ 操作记录                                                  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 2026-02-16 10:30  Eric Zhou 创建报价                 │ │
│ │ 2026-02-16 11:00  Eric Zhou 发送报价给客户            │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**操作按钮逻辑：**
- 编辑：仅草稿状态可编辑
- 复制：创建新版本或完全独立的副本
- 转为订单：仅已发送/已接受状态可转换
- 发送邮件：生成PDF并发送给客户
- 导出PDF：下载报价单PDF
- 删除：软删除（仅草稿状态可删除）

### 4.5 报价转订单确认对话框

```tsx
<Dialog>
  <DialogTitle>转换为订单</DialogTitle>
  <DialogContent>
    <p>确认将报价 <strong>QUO-20260216-001</strong> 转换为订单吗？</p>
    <p>转换后将：</p>
    <ul>
      <li>创建新订单，包含所有产品和价格信息</li>
      <li>报价状态更新为"已接受"</li>
      <li>建立报价与订单的关联关系</li>
    </ul>
    
    <Label>订单备注（可选）</Label>
    <Textarea placeholder="添加订单备注..." />
    
    <Label>预计交货日期（可选）</Label>
    <DatePicker />
  </DialogContent>
  <DialogActions>
    <Button variant="outline">取消</Button>
    <Button>确认转换</Button>
  </DialogActions>
</Dialog>
```

## 5. 导航菜单更新

在侧边栏导航中，将"订单管理"扩展为二级菜单：

```tsx
<NavItem icon={ShoppingCart} label="订单管理">
  <NavSubItem href="/quotations" label="报价管理" />
  <NavSubItem href="/orders" label="订单管理" />
</NavItem>
```

或者使用平级结构：

```tsx
<NavItem icon={FileText} href="/quotations" label="报价管理" />
<NavItem icon={ShoppingCart} href="/orders" label="订单管理" />
```

## 6. 权限控制

### 6.1 角色权限矩阵

| 操作 | 业务员 | 经理 | 财务 | 管理员 |
|------|--------|------|------|--------|
| 查看报价列表 | ✓ | ✓ | ✓ | ✓ |
| 创建报价 | ✓ | ✓ | ✗ | ✓ |
| 编辑报价 | ✓（自己的） | ✓ | ✗ | ✓ |
| 删除报价 | ✓（草稿） | ✓ | ✗ | ✓ |
| 发送报价 | ✓ | ✓ | ✗ | ✓ |
| 转为订单 | ✓ | ✓ | ✗ | ✓ |
| 查看统计 | ✓（自己的） | ✓ | ✓ | ✓ |

## 7. 技术实现要点

### 7.1 报价单号生成规则

```typescript
// 格式：QUO-YYYYMMDD-XXX
// 示例：QUO-20260216-001
function generateQuotationNumber(): string {
  const today = new Date();
  const dateStr = format(today, 'yyyyMMdd');
  const prefix = `QUO-${dateStr}`;
  
  // 查询今天已有的报价数量
  const count = await db.quotations.count({
    where: {
      quotationNumber: {
        startsWith: prefix
      }
    }
  });
  
  const sequence = (count + 1).toString().padStart(3, '0');
  return `${prefix}-${sequence}`;
}
```

### 7.2 报价有效期自动过期

使用定时任务（cron job）每天检查过期报价：

```typescript
// 每天凌晨1点执行
cron.schedule('0 1 * * *', async () => {
  await db.quotations.updateMany({
    where: {
      status: 'sent',
      validUntil: {
        lt: new Date()
      }
    },
    data: {
      status: 'expired'
    }
  });
});
```

### 7.3 报价转订单数据转换

```typescript
async function convertQuotationToOrder(quotationId: number) {
  const quotation = await db.quotations.findUnique({
    where: { id: quotationId },
    include: {
      items: {
        include: {
          batches: true
        }
      }
    }
  });
  
  // 创建订单
  const order = await db.orders.create({
    data: {
      orderNumber: await generateOrderNumber(),
      customerId: quotation.customerId,
      orderMode: quotation.quotationMode,
      currency: quotation.currency,
      totalAmount: quotation.totalAmount,
      status: 'pending',
      createdFromQuotationId: quotation.id,
      createdFromQuotationNumber: quotation.quotationNumber,
      // 复制产品明细
      items: {
        create: quotation.items.map(item => ({
          productId: item.productId,
          fobQuantity: item.fobQuantity,
          fobUnitPrice: item.fobUnitPrice,
          fobSubtotal: item.fobSubtotal,
          batches: {
            create: item.batches.map(batch => ({
              variantId: batch.variantId,
              quantity: batch.quantity,
              unitPrice: batch.unitPrice,
              subtotal: batch.subtotal
            }))
          }
        }))
      }
    }
  });
  
  // 更新报价状态
  await db.quotations.update({
    where: { id: quotationId },
    data: {
      status: 'accepted',
      convertedToOrderId: order.id,
      convertedAt: new Date()
    }
  });
  
  return order;
}
```

## 8. 测试计划

### 8.1 单元测试

- 报价单号生成逻辑
- 报价状态流转逻辑
- 报价转订单数据转换
- 报价有效期计算
- 价格计算逻辑

### 8.2 集成测试

- 完整的报价创建流程
- 报价列表查询和筛选
- 报价状态更新
- 报价转订单流程
- 报价版本控制

### 8.3 端到端测试

- 业务员创建报价 → 发送给客户 → 转换为订单
- 报价修改 → 创建新版本
- 报价过期自动处理
- 报价权限控制

## 9. 实施计划

### Phase 1: 数据库和后端API（预计2小时）
- 创建数据库表
- 实现报价CRUD API
- 实现报价状态管理API
- 实现报价转订单API

### Phase 2: 前端UI（预计2-3小时）
- 实现报价列表页
- 实现报价创建页（复用订单创建组件）
- 实现报价详情页
- 更新导航菜单

### Phase 3: 功能完善（预计1-2小时）
- 实现报价复制功能
- 实现报价导出PDF
- 实现报价发送邮件
- 实现报价有效期自动过期

### Phase 4: 测试和优化（预计1小时）
- 单元测试
- 集成测试
- UI/UX优化
- 性能优化

**总预计时间：6-8小时**

## 10. 未来扩展

### 10.1 报价模板
- 保存常用报价配置为模板
- 快速创建基于模板的报价

### 10.2 报价审批流程
- 大额报价需要经理审批
- 审批历史记录

### 10.3 报价分析
- 报价转化率分析
- 客户报价历史分析
- 产品报价趋势分析

### 10.4 客户自助查看报价
- 生成客户专属链接
- 客户在线查看报价详情
- 客户在线接受/拒绝报价

---

**文档版本：** 1.0  
**创建日期：** 2026-02-16  
**作者：** Manus AI Assistant  
**状态：** 待审核
