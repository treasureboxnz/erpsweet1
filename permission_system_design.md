# 权限管理系统架构设计

## 系统概述

基于RBAC（Role-Based Access Control）模型的权限管理系统，支持灵活的岗位定义和细粒度的权限控制。

## 核心概念

### 1. 岗位（Position/Role）
- 系统预设岗位：超级管理员(super_admin)、管理员(admin)、操作员(operator)
- 自定义岗位：经理(manager)、验货员(inspector)、采购(purchaser)、财务(finance)等
- 每个用户只能属于一个岗位

### 2. 权限（Permission）
- 权限类型：
  - `read`: 只读（查看）
  - `write`: 编辑（创建、修改）
  - `download`: 下载（导出数据）
  - `delete`: 删除
  - `all`: 全部权限（包含以上所有）

### 3. 模块（Module）
- 客户管理（customer_management）
- 产品管理（product_management）
- 订单管理（order_management）
- 报表中心（report_center）
- 用户管理（user_management）
- 操作日志（operation_logs）

### 4. 权限矩阵
岗位 x 模块 x 权限类型的三维矩阵，定义每个岗位在每个模块中拥有的权限。

## 数据库Schema设计

### positions表（岗位表）
```sql
CREATE TABLE positions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,           -- 岗位名称（英文标识）
  display_name VARCHAR(100) NOT NULL,          -- 岗位显示名称（中文）
  description TEXT,                             -- 岗位描述
  is_system BOOLEAN DEFAULT FALSE,              -- 是否系统预设岗位（不可删除）
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

预设岗位数据：
- super_admin: 超级管理员（系统岗位，不可删除）
- admin: 管理员（系统岗位，不可删除）
- operator: 操作员（系统岗位，不可删除）
- manager: 经理
- inspector: 验货员
- purchaser: 采购
- finance: 财务

### permissions表（权限表）
```sql
CREATE TABLE permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  position_id INT NOT NULL,                     -- 岗位ID
  module VARCHAR(100) NOT NULL,                 -- 模块标识
  permission_type VARCHAR(50) NOT NULL,         -- 权限类型：read/write/download/delete/all
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_permission (position_id, module, permission_type)
);
```

### 扩展users表
```sql
ALTER TABLE users ADD COLUMN position_id INT;
ALTER TABLE users ADD FOREIGN KEY (position_id) REFERENCES positions(id);
```

## 默认权限配置

### 超级管理员（super_admin）
所有模块的全部权限（all）

### 管理员（admin）
所有模块的全部权限（all），但不能管理超级管理员账户

### 操作员（operator）
- 客户管理：read, write
- 产品管理：read, write
- 订单管理：read, write
- 报表中心：read, download
- 用户管理：无权限
- 操作日志：read

### 经理（manager）
- 客户管理：all
- 产品管理：all
- 订单管理：all
- 报表中心：all
- 用户管理：read
- 操作日志：read

### 验货员（inspector）
- 客户管理：read
- 产品管理：read, write
- 订单管理：read, write
- 报表中心：read
- 用户管理：无权限
- 操作日志：read

### 采购（purchaser）
- 客户管理：read
- 产品管理：all
- 订单管理：read, write
- 报表中心：read, download
- 用户管理：无权限
- 操作日志：read

### 财务（finance）
- 客户管理：read
- 产品管理：read
- 订单管理：all
- 报表中心：all
- 用户管理：无权限
- 操作日志：read

## API设计

### 岗位管理API
- `GET /api/trpc/positions.list` - 获取岗位列表
- `POST /api/trpc/positions.create` - 创建岗位（仅管理员/超级管理员）
- `PUT /api/trpc/positions.update` - 更新岗位（仅管理员/超级管理员）
- `DELETE /api/trpc/positions.delete` - 删除岗位（仅管理员/超级管理员，不能删除系统岗位）

### 权限管理API
- `GET /api/trpc/permissions.getByPosition` - 获取指定岗位的权限
- `GET /api/trpc/permissions.getMatrix` - 获取权限矩阵
- `POST /api/trpc/permissions.updateMatrix` - 更新权限矩阵（仅管理员/超级管理员）

### 权限检查API
- `GET /api/trpc/permissions.check` - 检查当前用户是否有指定权限
- `GET /api/trpc/permissions.getCurrentUserPermissions` - 获取当前用户的所有权限

## 前端实现

### usePermission Hook
```typescript
function usePermission() {
  const { data: user } = useAuth();
  const { data: permissions } = trpc.permissions.getCurrentUserPermissions.useQuery();
  
  const hasPermission = (module: string, type: PermissionType) => {
    if (!permissions) return false;
    return permissions.some(p => 
      p.module === module && (p.permission_type === type || p.permission_type === 'all')
    );
  };
  
  const canRead = (module: string) => hasPermission(module, 'read');
  const canWrite = (module: string) => hasPermission(module, 'write');
  const canDownload = (module: string) => hasPermission(module, 'download');
  const canDelete = (module: string) => hasPermission(module, 'delete');
  
  return { hasPermission, canRead, canWrite, canDownload, canDelete };
}
```

### 权限控制组件
```typescript
function PermissionGuard({ module, type, children }) {
  const { hasPermission } = usePermission();
  
  if (!hasPermission(module, type)) {
    return null;
  }
  
  return children;
}
```

## 后端实现

### 权限验证中间件
```typescript
function requirePermission(module: string, type: PermissionType) {
  return async (opts: any) => {
    const { ctx } = opts;
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    
    const hasPermission = await checkUserPermission(ctx.user.id, module, type);
    if (!hasPermission) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    
    return opts.next();
  };
}
```

## 批量操作权限控制

### 客户列表批量删除
- 只有拥有`customer_management`模块的`delete`或`all`权限的用户才能看到批量删除按钮
- 后端API验证用户权限后才执行删除操作
- 记录操作日志

## 迁移策略

1. 创建新表（positions, permissions）
2. 初始化预设岗位数据
3. 初始化默认权限配置
4. 为现有用户分配岗位（根据当前的role字段）
5. 更新所有API，添加权限验证
6. 更新前端，添加权限控制

## 扩展性

- 新增模块时，自动为所有岗位创建该模块的权限配置（默认无权限）
- 支持自定义权限类型（未来扩展）
- 支持权限继承（未来扩展）
