# 多租户架构改造方案

## 1. 表重命名

### 1.1 将 `companies` 表改名为 `customers`
当前的 `companies` 表是客户公司表，需要改名为 `customers` 以避免与多租户的公司表混淆。

**影响的表：**
- `companies` → `customers`
- `companyContacts` → `customerContacts`
- `companyAssignees` → `customerAssignees`
- `companyAttachmentCategories` → `customerAttachmentCategories`
- `companyAttachments` → `customerAttachments`

**影响的字段：**
- 所有引用 `companyId` 的地方需要改为 `customerId`（仅限客户相关表）

## 2. 新建 `companies` 表（多租户公司表）

```typescript
export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  companyCode: varchar("companyCode", { length: 50 }).notNull().unique(), // 公司代码（登录用）
  companyName: varchar("companyName", { length: 200 }).notNull(), // 公司名称（中文）
  companyNameEn: varchar("companyNameEn", { length: 200 }), // 公司名称（英文）
  logo: text("logo"), // 公司Logo
  address: text("address"), // 公司地址
  email: varchar("email", { length: 320 }), // 公司邮箱
  phone: varchar("phone", { length: 50 }), // 公司电话
  status: mysqlEnum("status", ["active", "suspended", "deleted"]).default("active").notNull(),
  plan: mysqlEnum("plan", ["free", "basic", "pro", "enterprise"]).default("free").notNull(), // 订阅计划
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

## 3. 修改 `users` 表

### 3.1 移除 Manus OAuth 字段
- 移除 `openId` 字段
- 移除 `loginMethod` 字段

### 3.2 添加邮箱密码登录字段
- 添加 `companyId` 字段（外键关联 companies.id）
- 修改 `email` 字段为 `notNull()` 和 `unique()`
- 添加 `passwordHash` 字段（varchar 255）
- 添加 `mustChangePassword` 字段（boolean，默认 true）

### 3.3 修改后的 users 表结构
```typescript
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull().references(() => companies.id), // 所属公司
  email: varchar("email", { length: 320 }).notNull().unique(), // 邮箱（登录账号）
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(), // 密码哈希
  mustChangePassword: boolean("mustChangePassword").default(true).notNull(), // 首次登录必须修改密码
  name: text("name"),
  role: mysqlEnum("role", ["operator", "admin", "super_admin"]).default("operator").notNull(),
  positionId: int("positionId").references(() => positions.id),
  status: mysqlEnum("status", ["active", "suspended", "deleted"]).default("active").notNull(),
  avatarUrl: text("avatarUrl"),
  displayName: varchar("displayName", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
```

## 4. 添加 `companyId` 字段到所有业务表

### 4.1 需要添加 companyId 的表（共38个）

**核心业务表：**
1. `positions` - 岗位表
2. `permissions` - 权限表
3. `productCategories` - 产品分类表
4. `products` - 产品表
5. `productImages` - 产品图片表
6. `priceHistory` - 价格历史表
7. `customers` - 客户表（原companies）
8. `contacts` - 联系人表
9. `customerContacts` - 客户-联系人关联表（原companyContacts）
10. `followUpRecords` - 跟进记录表
11. `orders` - 订单表
12. `orderItems` - 订单明细表
13. `operationLogs` - 操作日志表

**产品批次相关表：**
14. `productSuppliers` - 产品-供应商关联表
15. `productVariants` - 产品批次表
16. `variantCustomerLinks` - 批次-客户关联表
17. `variantPricing` - 批次定价表
18. `variantPricingHistory` - 批次定价历史表
19. `variantImages` - 批次图片表
20. `suppliers` - 供应商表
21. `supplierCategories` - 供应商分类表
22. `variantSuppliers` - 批次-供应商版本表

**媒体和分类表：**
23. `mediaLibrary` - 媒体库表
24. `categories` - 分类表
25. `tags` - 标签表
26. `productCategoryLinks` - 产品-分类关联表
27. `productTagLinks` - 产品-标签关联表

**订单和客户相关表：**
28. `orderStatusHistory` - 订单状态历史表
29. `attributes` - 属性表
30. `customerAssignees` - 客户分配表（原companyAssignees）
31. `customerAttachmentCategories` - 客户附件分类表（原companyAttachmentCategories）
32. `customerAttachments` - 客户附件表（原companyAttachments）
33. `productBatches` - 产品批次表
34. `customerPriceHistory` - 客户价格历史表

**报价相关表：**
35. `quotations` - 报价单表
36. `quotationItems` - 报价单明细表
37. `quotationBatches` - 报价单批次表
38. `quotationVersions` - 报价单版本表
39. `quotationApprovals` - 报价单审批表
40. `quotationTemplates` - 报价单模板表

**材料相关表：**
41. `materialCategories` - 材料分类表
42. `materialSuppliers` - 材料供应商表
43. `materialBoards` - 材料板材表
44. `materialColors` - 材料颜色表
45. `variantMaterials` - 批次-材料关联表

### 4.2 不需要添加 companyId 的表
- `userInvitations` - 用户邀请表（已有 companyId 的概念，但需要改为关联新的 companies 表）
- `systemSettings` - 系统设置表（全局设置）
- `customers` - 旧的客户表（已废弃，需要删除）
- `customerFollowUps` - 旧的客户跟进表（已废弃，需要删除）

## 5. 数据迁移步骤

### 5.1 创建测试公司
```sql
INSERT INTO companies (companyCode, companyName, companyNameEn, status, plan) 
VALUES ('TEST', '测试公司', 'Test Company', 'active', 'free');
```

### 5.2 更新现有数据
```sql
-- 更新所有业务表的 companyId 为 1（测试公司）
UPDATE positions SET companyId = 1;
UPDATE permissions SET companyId = 1;
UPDATE productCategories SET companyId = 1;
UPDATE products SET companyId = 1;
-- ... 依此类推
```

### 5.3 创建超级管理员账号
```sql
-- 密码：admin123（需要先用 bcrypt 生成哈希）
INSERT INTO users (companyId, email, passwordHash, name, role, status, mustChangePassword) 
VALUES (1, 'admin@test.com', '$2a$10$...', 'Admin', 'super_admin', 'active', true);
```

## 6. 后端改造清单

### 6.1 Context 改造
- 修改 `server/_core/context.ts`
- 从 session token 获取用户信息和 companyId
- 移除 Manus OAuth 相关代码

### 6.2 认证系统改造
- 创建 `server/utils/password.ts`（密码加密工具）
- 创建 `server/utils/session.ts`（Session 管理工具）
- 创建 `server/routers/auth.ts`（认证 API）

### 6.3 数据库查询改造
- 修改所有 `server/db.ts` 中的查询函数，添加 companyId 过滤
- 修改所有 `server/routers.ts` 中的 procedures，使用 ctx.companyId

## 7. 前端改造清单

### 7.1 登录页面
- 创建 `client/src/pages/Login.tsx`
- 实现两步登录（公司代码 + 邮箱密码）

### 7.2 用户管理
- 创建 `client/src/pages/ChangePassword.tsx`
- 创建 `client/src/pages/UserManagement.tsx`

### 7.3 移除 Manus OAuth
- 移除所有 OAuth 相关代码
- 更新 `useAuth` hook

## 8. 测试计划

### 8.1 数据隔离测试
- 创建两个公司（TEST, DEMO）
- 创建测试数据
- 验证不同公司看不到彼此的数据

### 8.2 认证测试
- 测试公司代码验证
- 测试邮箱密码登录
- 测试首次登录修改密码
- 测试用户管理功能

## 9. 风险和注意事项

### 9.1 数据迁移风险
- 现有数据需要全部设置 companyId = 1
- 外键约束可能导致迁移失败
- 需要备份数据库

### 9.2 兼容性风险
- 所有查询必须添加 companyId 过滤
- 遗漏任何一个查询都会导致数据泄露
- 需要全面测试所有模块

### 9.3 性能风险
- 添加 companyId 字段后需要添加索引
- 查询性能可能受影响
- 需要优化慢查询

## 10. 实施顺序

1. **第一步**：修改 schema.ts（表重命名 + 新建 companies + 修改 users + 添加 companyId）
2. **第二步**：运行 `pnpm db:push`（推送数据库变更）
3. **第三步**：数据迁移（插入测试公司 + 更新现有数据）
4. **第四步**：后端认证系统改造
5. **第五步**：后端业务逻辑改造（添加 companyId 过滤）
6. **第六步**：前端登录页面实现
7. **第七步**：前端用户管理实现
8. **第八步**：全面测试
9. **第九步**：部署上线
