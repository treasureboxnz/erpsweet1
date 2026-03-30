# 多租户审查报告

## 发现的问题

### 1. systemSettings表 - 已修复
- 旧代码：settingKey有单独unique约束，查询不带erpCompanyId过滤
- 修复：改为(erpCompanyId, settingKey)复合唯一约束，所有查询/更新都带erpCompanyId

### 2. 数据库中存在大量erpCompanyId为NULL的历史数据
以下表有NULL记录：
- attributes: 19 NULL / 121 total
- companies: 124 NULL / 327 total
- company_assignees: 2 NULL / 2 total
- company_contacts: 37 NULL / 110 total
- contacts: 92 NULL / 219 total
- follow_up_records: 63 NULL / 68 total
- material_colors: 10 NULL / 89 total
- operation_logs: 302 NULL / 415 total
- order_items: 6 NULL / 6 total
- order_status_history: 4 NULL / 4 total
- price_history: 217 NULL / 217 total
- product_images: 3 NULL / 23 total
- product_suppliers: 1 NULL / 4 total

### 3. routers.ts中的产品路由 - 部分缺少erpCompanyId
以下产品子路由没有传递erpCompanyId：
- batchUpdateStatus: 没有erpCompanyId过滤
- getPricing: 没有erpCompanyId过滤
- getCostSnapshots: 没有erpCompanyId过滤
- getPriceHistory: 没有erpCompanyId过滤
- getSuppliers: 没有erpCompanyId过滤
- addSupplier: 没有erpCompanyId过滤
- removeSupplier: 没有erpCompanyId过滤
- setPrimarySupplier: 没有erpCompanyId过滤

### 4. permissionManagement路由 - 0个erpCompanyId
- 职位和权限管理完全没有租户隔离

### 5. CASAVIVA公司没有自己的systemSettings
- erpCompanyId=60001的公司没有任何设置记录
- 需要在新公司创建时初始化默认设置
