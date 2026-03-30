# 外贸B2B ERP管理系统 - 任务清单

## Phase 15: 材料管理系统重构 - 动态材料类型

### Phase 1: 材料类型管理页面
- [x] 创建MaterialTypes.tsx页面组件
- [x] 实现材料类型列表显示（表格视图，包含图标、名称、排序值）
- [x] 实现新建材料类型功能（名称、图标、排序）
- [x] 实现编辑材料类型功能
- [x] 实现删除材料类型功能（检查是否有供应商使用，使用AlertDialog确认）
- [x] 实现排序功能（上移/下移按钮）
- [x] 在App.tsx添加/materials/types路由
- [x] 测试所有功能（新建、编辑、删除、排序）

### Phase 2: 优化供应商管理页面
- [x] 修改MaterialSuppliersTab.tsx添加材料类型选择器
  - [x] 添加materialTypeId字段到SupplierFormData接口
  - [x] 添加材料类型查询（trpc.materialTypes.list.useQuery()）
  - [x] 在创建对话框中添加材料类型选择器
  - [x] 在编辑对话框中添加材料类型选择器
  - [x] 在供应商列表表格中添加材料类型列
- [x] 修改后端API支持materialTypeId
  - [x] 修改suppliers.list API使用leftJoin返回materialType信息
  - [x] 在suppliers.create API的input schema中添加materialTypeId字段
  - [x] 在suppliers.update API的input schema中添加materialTypeId字段
- [x] 测试供应商管理功能
  - [x] 创建新供应商并选择材料类型（测试通过：木腿供应商）
  - [x] 编辑现有供应商并更改材料类型（测试通过：测试供应商A改为配件）
  - [x] 验证列表显示材料类型（测试通过）

### Phase 3: 测试完整多材料工作流
- [ ] 创建批次并添加多种材料类型（布料 + 木腿 + 扶手）
- [ ] 验证VariantMaterialsManager显示所有用户定义的材料类型
- [ ] 测试订单详情显示多材料
- [ ] 验证材料类型筛选功能

## 已完成的Phase

### Phase 14: 材料管理系统重构 - 后端API开发
- [x] 创建material_types表和materialTypeId字段
- [x] 插入默认材料类型数据（9种类型）
- [x] 迁移现有供应商数据
- [x] 创建materialTypes API（list/create/update/delete/reorder）
- [x] 修改materials.colors.list API支持按materialTypeId筛选
- [x] 核心功能：创建批次时自动添加ORIGINAL-ORIG-01为默认颜色材料
- [x] 核心功能：默认颜色材料（sortOrder=0）不可删除
- [x] 前端UI开发：修改VariantMaterialsManager组件使用动态材料类型

### Phase 13: 修复批次材料编辑对话框中无法更换材料选择的问题
- [x] 添加清除按钮（✕图标）到材料颜色输入框
- [x] 材料类型切换时自动清除颜色选择
- [x] 修复TypeScript类型错误

### Phase 11: 修复TypeScript类型错误并完成多材料管理功能测试
- [x] 修复VariantMaterialsManager.tsx的TypeScript类型定义
- [x] 修复ProductVariants.tsx的JSX结构
- [x] 完整流程测试（编辑对话框、添加材料、材料选择器等）

### Phase 10: 优化多材料管理UI（用户反馈）
- [x] 移除编辑对话框中旧的"布料颜色"选择器
- [x] 修改VariantMaterialsManager组件，将材料类型图标改为材料图片

### Phase 8-9: 实现编辑对话框多材料选择功能
- [x] 创建VariantMaterialsManager通用组件
- [x] 在ProductVariants编辑对话框中集成组件
- [x] 订单显示优化（OrderDetail.tsx）
- [x] 修复材料管理页面500错误

### Phase 7: 移除批次编号链接
- [x] 移除批次编号链接，准备改进编辑对话框

### Phase 5: 前端UI开发 - 多材料支持功能
- [x] 创建材料类型常量定义（client/src/constants/materialTypes.ts）
- [x] 重写MaterialSelectionTab组件
- [x] 优化订单详情页面（OrderDetail.tsx）
- [x] 功能测试验证

### Phase 4: 后端API开发 - 完成
- [x] 创建批次材料管理核心逻辑（server/variantMaterials.ts）
- [x] 创建tRPC路由（server/routers/variantMaterials.ts）
- [x] 修改订单查询逻辑（server/orders.ts）
- [x] 注册到主router（server/routers.ts）
- [x] 编写单元测试（server/variantMaterials.test.ts）

### Phase 3: 数据库Schema设计 - 完成
- [x] 创建variant_materials表
- [x] 添加sortOrder字段支持材料排序
- [x] 执行数据库迁移

### Phase 2: 材料管理系统分析 - 完成
- [x] 分析现有材料管理系统
- [x] 设计多材料支持方案
- [x] 确定数据库Schema设计

### Phase 1: 项目初始化 - 完成
- [x] 创建项目基础结构
- [x] 配置开发环境
- [x] 创建基础数据库表

## 其他已完成功能
- [x] 客户管理（CRUD、搜索、筛选、详情页）
- [x] 产品管理（CRUD、分类、批次管理）
- [x] 订单管理（CRUD、状态管理、详情页）
- [x] 材料管理（供应商、布板、颜色）
- [x] 报价管理
- [x] 用户管理
- [x] 权限管理
- [x] 仪表盘统计

### Phase 3: 添加供应商材料类型筛选功能
- [x] 在MaterialSuppliersTab.tsx添加材料类型筛选下拉菜单
- [x] 实现筛选逻辑（按materialTypeId筛选供应商）
- [x] 添加“全部”选项显示所有供应商
- [x] 测试筛选功能

### Phase 4: 测试完整多材料工作流
- [x] 创建产品批次并添加多种材料类型（布料 + 木腿 + 扶手）
- [x] 验证VariantMaterialsManager显示所有用户定义的材料类型
- [x] 测试订单详情显示多材料
- [x] 验证材料选择器功能正常

### Phase 5: 优化材料类型管理页面
- [x] 修改materialTypes.list API返回使用统计（关联的供应商数量）
- [x] 在MaterialTypes.tsx页面显示使用统计
- [ ] 在删除材料类型时显示关联的供应商数量
- [ ] 测试使用统计功能
