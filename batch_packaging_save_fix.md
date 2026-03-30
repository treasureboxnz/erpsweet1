# 批次包装尺寸保存问题修复

## 任务时间
2026-02-22 04:00 - 04:30

## 问题描述
用户报告：编辑批次时输入包装尺寸（长宽高、毛重、净重），点击"保存修改"后，数据没有保存到数据库。

## 测试发现的问题

### 问题1：CBM没有自动计算
**测试场景**：输入长0.5m、宽0.4m、高0.3m

**期望结果**：CBM应该自动计算为 0.5 × 0.4 × 0.3 = 0.06 m³

**实际结果**：总CBM显示为 0.000000 m³，没有自动计算

### 问题2：保存后没有成功toast提示
**期望结果**：点击"保存修改"后应该显示成功toast提示

**实际结果**：没有任何toast提示

### 问题3：数据没有保存到数据库
**测试步骤**：
1. 编辑批次"专属批次" (DC-001-GRY-V037)
2. 输入长0.5、宽0.4、高0.3、毛重30、净重27
3. 点击"保存修改"

**期望结果**：
- 总CBM: 0.06 m³
- 总毛重: 30.00 kg
- 总净重: 27.00 kg

**实际结果**：
- 总CBM: 0.00 m³
- 总毛重: 0.00 kg
- 总净重: 0.00 kg

## 代码分析

### 根本原因

**PackageBoxesManager.tsx（第245行）**：
```typescript
if (mode === "create") {  // ❌ 只在创建模式下暴露数据
  (window as any).__packageBoxesManager = { ... };
}
```

**ProductVariants.tsx（第461行）**：
```typescript
if (!editingVariantId && (window as any).__packageBoxesManager) {  // ❌ 只在创建模式下获取数据
  const boxesData = (window as any).__packageBoxesManager.getBoxesData();
  ...
}
```

**问题分析**：
1. PackageBoxesManager组件只在创建模式下暴露`window.__packageBoxesManager`
2. ProductVariants的handleSubmit函数只在创建模式下获取外箱数据
3. 在编辑模式下，外箱数据无法传递给handleSubmit函数
4. 导致保存时外箱数据丢失

## 修复方案

### 修复1：PackageBoxesManager.tsx
```typescript
// 修改前
if (mode === "create") {
  (window as any).__packageBoxesManager = { ... };
}

// 修改后
if (mode !== "view") {  // ✅ 创建和编辑模式都暴露数据
  (window as any).__packageBoxesManager = { ... };
}
```

### 修复2：ProductVariants.tsx
```typescript
// 修改前
if (!editingVariantId && (window as any).__packageBoxesManager) {
  const boxesData = (window as any).__packageBoxesManager.getBoxesData();
  ...
}

// 修复后
if ((window as any).__packageBoxesManager) {  // ✅ 移除editingVariantId条件
  const boxesData = (window as any).__packageBoxesManager.getBoxesData();
  ...
}
```

## 修复文件
- [x] `/home/ubuntu/foreign-trade-erp/client/src/components/PackageBoxesManager.tsx`（第245行）
- [x] `/home/ubuntu/foreign-trade-erp/client/src/components/ProductVariants.tsx`（第461行）

## 下一步
- [ ] 重新测试所有3种输入方式：
  1. 场景一：输入长宽高自动计算CBM
  2. 场景二：手动输入CBM
  3. 场景三：使用计算公式填写
- [ ] 验证数据能正确保存到数据库
- [ ] 验证批次列表正确显示保存的数据
- [ ] 保存最终checkpoint


## 修复完成（2026-02-22 04:30）

### 后端修复
除了前端修复，还需要修复后端：

#### 1. server/routers/productVariants.ts
- 在update mutation的input schema中添加`packageBoxes`参数
- 在update mutation的实现中传递`packageBoxes`和`erpCompanyId`给updateVariant函数

#### 2. server/productVariants.ts
- 修改updateVariant函数签名，添加`packageBoxes`和`erpCompanyId`参数
- 添加逻辑：先删除旧的外箱数据，再插入新的外箱数据

### 测试结果（场景一）
✅ **测试通过！**

**测试步骤**：
1. 编辑批次"专属批次" (DC-001-GRY-V037)
2. 输入长50cm、宽40cm、高30cm、毛重25kg、净重22kg
3. 点击"保存修改"

**结果**：
- ✅ 总CBM自动计算：0.060000 m³
- ✅ 保存成功（对话框关闭）
- ✅ 数据保存到数据库（SQL查询返回1行）
- ✅ 批次列表显示更新后的数据：
  - 总CBM: 0.06 m³
  - 总毛重: 25.00 kg
  - 总净重: 22.00 kg

### 下一步
- [ ] 移除调试console.log代码
- [ ] 测试场景二：直接输入CBM
- [ ] 测试场景三：使用计算公式
- [ ] 测试3种包装方式（single、mixed、bulk）
- [ ] 创建checkpoint保存修复


## 场景二测试结果（2026-02-22 04:46）

### 问题发现
场景二（手动输入CBM）初次测试失败，发现以下问题：

#### 问题1：getBoxesData过滤逻辑错误
**位置**：PackageBoxesManager.tsx 第234-241行

**问题**：过滤条件要求长宽高都大于0，导致手动输入CBM时（长宽高为0）数据被过滤掉。

**修复**：
```typescript
// 修复前
const getBoxesData = useCallback(() => {
  return boxes.filter(box => {
    const l = parseFloat(box.length) || 0;
    const w = parseFloat(box.width) || 0;
    const h = parseFloat(box.height) || 0;
    return l > 0 && w > 0 && h > 0;  // ❌ 过滤掉了手动输入CBM的外箱
  });
}, [boxes]);

// 修复后
const getBoxesData = useCallback(() => {
  return boxes.filter(box => {
    // 如果是手动输入CBM，只检查CBM是否大于0
    if (box.manualCBM) {
      const cbm = parseFloat(box.cbm) || 0;
      return cbm > 0;
    }
    // 如果是自动计算CBM，检查长宽高是否都大于0
    const l = parseFloat(box.length) || 0;
    const w = parseFloat(box.width) || 0;
    const h = parseFloat(box.height) || 0;
    return l > 0 && w > 0 && h > 0;
  });
}, [boxes]);
```

#### 问题2：tRPC schema验证失败
**位置**：server/routers/productVariants.ts

**错误信息**：
```
Too small: expected number to be >0
path: ["packageBoxes", 0, "length"]
path: ["packageBoxes", 0, "width"]
path: ["packageBoxes", 0, "height"]
```

**问题**：tRPC schema要求length、width、height必须大于0（positive），但手动输入CBM时这些字段为0。

**修复**：
```typescript
// 修复前
packageBoxes: z.array(z.object({
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  grossWeight: z.number().nonnegative().optional(),
  netWeight: z.number().nonnegative().optional(),
})).optional(),

// 修复后
packageBoxes: z.array(z.object({
  length: z.number().nonnegative(), // 允许为0（手动输入CBM时）
  width: z.number().nonnegative(), // 允许为0（手动输入CBM时）
  height: z.number().nonnegative(), // 允许为0（手动输入CBM时）
  cbm: z.number().positive().optional(), // 手动输入的CBM值
  grossWeight: z.number().nonnegative().optional(),
  netWeight: z.number().nonnegative().optional(),
  packagingType: z.string().optional(),
  piecesPerBox: z.number().positive().optional(),
})).optional(),
```

#### 问题3：后端addBox函数强制计算CBM
**位置**：server/packageBoxes.ts 第42行

**问题**：addBox函数强制根据长宽高计算CBM，忽略了手动输入的CBM值。

**修复**：
```typescript
// 修复后
export async function addBox(data: {
  erpCompanyId: number;
  variantId: number;
  length: number;
  width: number;
  height: number;
  grossWeight?: number;
  netWeight?: number;
  cbm?: number; // 新增：可选的手动输入CBM值
}) {
  // 如果传入了cbm参数，则使用传入的值；否则根据长宽高计算
  const cbm = data.cbm !== undefined 
    ? data.cbm 
    : (data.length * data.width * data.height) / 1000000;
  
  // ... 其余代码
}
```

#### 问题4：前端未传递cbm字段
**位置**：client/src/components/ProductVariants.tsx

**问题**：前端构造packageBoxes数据时，没有传递cbm字段。

**修复**：
```typescript
// 修复后
const packageBoxes = boxesData.map((box: any) => ({
  length: parseFloat(box.length) || 0,
  width: parseFloat(box.width) || 0,
  height: parseFloat(box.height) || 0,
  cbm: parseFloat(box.cbm) || undefined, // 新增：传递cbm字段
  grossWeight: parseFloat(box.grossWeight) || 0,
  netWeight: parseFloat(box.netWeight) || 0,
  packagingType: packagingType || "single",
  piecesPerBox: piecesPerBox || 1,
}));
```

### 测试结果
✅ **场景二测试通过！**

**测试步骤**：
1. 编辑批次"0.5" (DC-001-GRY-V036)
2. 勾选"手动输入CBM"
3. 输入CBM 0.08 m³、毛重20kg、净重18kg
4. 点击"保存修改"

**结果**：
- ✅ 总CBM正确显示：0.080000 m³
- ✅ 保存成功（对话框关闭）
- ✅ 数据保存到数据库（SQL查询返回1行）
- ✅ 批次列表显示更新后的数据：
  - 总CBM: 0.08 m³
  - 总毛重: 20.00 kg
  - 总净重: 18.00 kg

### 下一步
- [ ] 测试场景三：使用计算公式填写
- [ ] 测试3种包装方式（single、mixed、bulk）
- [ ] 编写vitest单元测试
- [ ] 创建checkpoint保存修复
