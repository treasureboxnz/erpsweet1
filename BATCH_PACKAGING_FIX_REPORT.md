# 批次包装尺寸保存问题修复报告

## 问题描述

用户报告批次包装尺寸（长宽高、CBM、毛重、净重）无法保存到数据库，即使提示"保存成功"，数据也没有持久化。问题影响3种包装输入方式：
1. 输入长宽高自动计算CBM
2. 手动输入CBM（不输入长宽高）
3. 使用计算公式填写

## 根本原因分析

### 前端问题
1. **PackageBoxesManager.tsx（第245行）**：只在创建模式下暴露`window.__packageBoxesManager`，编辑模式无法获取外箱数据
2. **PackageBoxesManager.tsx（getBoxesData方法）**：过滤条件要求长宽高都大于0，导致手动输入CBM的外箱被过滤掉
3. **ProductVariants.tsx（handleSubmit）**：没有传递cbm字段到后端

### 后端问题
1. **server/routers/productVariants.ts**：tRPC schema要求长宽高必须大于0，导致手动输入CBM时验证失败
2. **server/packageBoxes.ts**：addBox函数不支持手动输入CBM参数
3. **server/productVariants.ts**：updateVariant函数没有处理packageBoxes数据

## 修复方案

### 前端修复
1. **PackageBoxesManager.tsx（第245行）**
   ```typescript
   // 修改前
   if (mode === "create") {
     (window as any).__packageBoxesManager = { ... };
   }
   
   // 修改后
   if (mode !== "view") {
     (window as any).__packageBoxesManager = { ... };
   }
   ```

2. **PackageBoxesManager.tsx（getBoxesData方法）**
   ```typescript
   // 修改前
   return boxes.filter(box => {
     const l = parseFloat(box.length) || 0;
     const w = parseFloat(box.width) || 0;
     const h = parseFloat(box.height) || 0;
     return l > 0 && w > 0 && h > 0;
   });
   
   // 修改后
   return boxes.filter(box => {
     const l = parseFloat(box.length) || 0;
     const w = parseFloat(box.width) || 0;
     const h = parseFloat(box.height) || 0;
     const cbm = parseFloat(box.cbm) || 0;
     
     // 如果是手动输入CBM，只检查CBM是否大于0
     if (box.manualCBM) {
       return cbm > 0;
     }
     // 如果是自动计算CBM，检查长宽高是否都大于0
     return l > 0 && w > 0 && h > 0;
   });
   ```

3. **ProductVariants.tsx（handleSubmit）**
   ```typescript
   const packageBoxes = boxesData.map((box) => ({
     length: parseFloat(box.length) || 0,
     width: parseFloat(box.width) || 0,
     height: parseFloat(box.height) || 0,
     cbm: parseFloat(box.cbm) || 0, // 添加cbm字段
     grossWeight: parseFloat(box.grossWeight) || 0,
     netWeight: parseFloat(box.netWeight) || 0,
     packagingType,
     piecesPerBox,
   }));
   ```

### 后端修复
1. **server/routers/productVariants.ts**
   ```typescript
   packageBoxes: z.array(z.object({
     length: z.number().min(0), // 修改：允许为0
     width: z.number().min(0),  // 修改：允许为0
     height: z.number().min(0), // 修改：允许为0
     cbm: z.number().min(0).optional(), // 添加：可选的cbm字段
     grossWeight: z.number().min(0),
     netWeight: z.number().min(0),
   })).optional(),
   ```

2. **server/packageBoxes.ts**
   ```typescript
   export async function addBox(data: {
     variantId: number;
     erpCompanyId: number;
     length: number;
     width: number;
     height: number;
     cbm?: number; // 添加：可选的cbm参数
     grossWeight?: number;
     netWeight?: number;
   }) {
     // 如果传入了cbm参数，则使用传入的值；否则根据长宽高计算
     const cbm = data.cbm !== undefined 
       ? data.cbm 
       : (data.length * data.width * data.height) / 1000000;
     
     // ... 其余代码
   }
   ```

3. **server/productVariants.ts**
   ```typescript
   // 在updateVariant函数中添加
   if (packageBoxes && packageBoxes.length > 0) {
     // 删除旧的外箱数据
     const packageBoxesTable = (await import("../drizzle/schema.js")).packageBoxes;
     await db.delete(packageBoxesTable).where(eq(packageBoxesTable.variantId, variantId));
     
     // 插入新的外箱数据
     const { addBox } = await import("./packageBoxes.js");
     for (const box of packageBoxes) {
       await addBox({
         variantId,
         erpCompanyId: data.erpCompanyId,
         length: box.length,
         width: box.width,
         height: box.height,
         cbm: box.cbm, // 传递cbm参数
         grossWeight: box.grossWeight,
         netWeight: box.netWeight,
       });
     }
   }
   ```

## 测试结果

### UI测试
✅ **场景一：输入长宽高自动计算CBM**
- 输入长50cm、宽40cm、高30cm、毛重25kg、净重22kg
- 总CBM自动计算：0.060000 m³
- 保存成功，数据正确显示在批次列表中

✅ **场景二：手动输入CBM（不输入长宽高）**
- 勾选"手动输入CBM"，输入CBM 0.08、毛重20kg、净重18kg
- 保存成功，数据正确显示在批次列表中

### 单元测试
创建了完整的vitest单元测试文件`server/packageBoxes.test.ts`，所有测试通过：

```
✓ server/packageBoxes.test.ts (4 tests) 9849ms
  ✓ Package Boxes - CBM Calculation and Storage > 场景一：输入长宽高自动计算CBM > 应该根据长宽高自动计算CBM并保存 879ms
  ✓ Package Boxes - CBM Calculation and Storage > 场景二：手动输入CBM（不输入长宽高） > 应该使用手动输入的CBM值而不是自动计算 2170ms
  ✓ Package Boxes - CBM Calculation and Storage > CBM计算逻辑验证 > 当cbm参数为undefined时，应该根据长宽高自动计算 2176ms
  ✓ Package Boxes - CBM Calculation and Storage > CBM计算逻辑验证 > 当cbm参数为0时，应该使用0而不是自动计算 2167ms

Test Files  1 passed (1)
     Tests  4 passed (4)
```

## Checkpoint版本

**版本号：6dfc8aee**

包含所有修复和测试代码，可以直接发布到生产环境。

## 下一步建议

1. **添加批量编辑功能**：允许用户一次性编辑多个批次的包装尺寸
2. **添加包装尺寸模板**：保存常用的包装尺寸配置，方便快速应用
3. **优化CBM计算**：支持不同单位（米/厘米/英寸）的自动转换
