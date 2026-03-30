# 客户添加功能Bug修复验证报告

## Bug描述
客户添加表单提交时失败，因为前端发送了空字符串("")到后端，而数据库schema中某些字段设置了default值，空字符串与default值冲突导致SQL插入错误。

## 根本原因
1. 前端表单收集数据时，未填写的字段被设置为空字符串("")
2. 后端接收到空字符串后，尝试插入数据库
3. 数据库schema中的字段有default值，但Drizzle ORM将空字符串视为有效值而不是使用default
4. 导致SQL插入失败

## 修复方案
### 前端修复（client/src/pages/CustomersNew.tsx）
修改`handleSubmit`函数，过滤掉空字符串，只发送有值的字段：

```typescript
const handleSubmit = () => {
  if (!formData.companyName) {
    toast.error("请输入公司名称");
    return;
  }
  // Filter out empty strings to prevent SQL errors with default values
  const cleanData: any = {
    companyName: formData.companyName,
    createdBy: user?.id,
  };
  
  if (formData.customerCode) cleanData.customerCode = formData.customerCode;
  if (formData.customerType) cleanData.customerType = formData.customerType;
  if (formData.country) cleanData.country = formData.country;
  if (formData.city) cleanData.city = formData.city;
  if (formData.website) cleanData.website = formData.website;
  if (formData.notes) cleanData.notes = formData.notes;
  
  createCompany.mutate(cleanData);
};
```

### 后端修复（server/customerManagement.ts）
已有的`createCompany`函数已经实现了过滤undefined值的逻辑：

```typescript
export async function createCompany(data: InsertCompany) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Filter out undefined values to prevent SQL errors
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  ) as InsertCompany;

  const result = await db.insert(companies).values(cleanData);
  return result[0].insertId;
}
```

## 测试结果

### 单元测试
运行了5个测试用例，全部通过：
- ✅ should create company with minimal required fields only
- ✅ should create company with partial fields without errors
- ✅ should update company with partial fields
- ✅ should create contact with minimal fields
- ✅ should create follow-up record with minimal fields

### 浏览器测试
1. 打开客户列表页面
2. 点击"添加客户"按钮
3. 只填写必填字段（公司名称：Casa Viva Furniture Australia）和国家（Australia）
4. 点击"创建客户"按钮
5. ✅ 成功创建客户，页面自动刷新，新客户出现在列表顶部
6. ✅ 客户总数从11增加到12
7. ✅ 新客户信息正确显示：公司名称、类型（直接客户）、国家（Australia）

## 结论
Bug已成功修复。前端现在只发送有值的字段，避免了空字符串与数据库default值的冲突。系统现在可以正常创建客户，即使只填写最少的必填字段。

## 修复日期
2026年2月11日
