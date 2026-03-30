# 客户详情页面性能分析和优化方案

## 当前性能问题分析

### 1. 数据加载问题
**问题识别：**
- 页面同时发起4个独立的tRPC查询：
  - `companies.getById` - 获取公司信息
  - `contacts.getByCompany` - 获取联系人列表
  - `followUps.getByCompany` - 获取跟进记录
  - `companies.getOrderStats` - 获取订单统计
- 每个查询都是独立的HTTP请求，没有批量处理
- 用户添加联系人或跟进记录后，调用`refetch()`会重新加载所有数据

**影响：**
- 初始加载时间长（4个串行或并行请求）
- 每次添加操作后都要等待所有数据重新加载
- 网络延迟被放大

### 2. React重渲染问题
**问题识别：**
- 没有使用`React.memo`优化子组件
- 没有使用`useMemo`缓存计算结果
- 没有使用`useCallback`缓存回调函数
- 每次父组件重渲染，所有子组件都会重渲染

**影响：**
- 不必要的DOM diff计算
- 页面响应变慢

### 3. 乐观更新缺失
**问题识别：**
- 添加联系人和跟进记录时没有使用乐观更新
- 用户操作后需要等待服务器响应才能看到结果

**影响：**
- 用户体验差，感觉页面"卡顿"
- 即使网络正常也会有明显延迟

## 优化方案

### 方案1：实现乐观更新（Optimistic Updates）
**优先级：高**
**预期提升：用户感知速度提升80%**

```typescript
// 添加联系人时的乐观更新
const utils = trpc.useUtils();
const createContact = trpc.customerManagement.contacts.create.useMutation({
  onMutate: async (newContact) => {
    // 取消正在进行的查询
    await utils.customerManagement.contacts.getByCompany.cancel(companyId);
    
    // 获取当前数据快照
    const previousContacts = utils.customerManagement.contacts.getByCompany.getData(companyId);
    
    // 乐观更新UI
    utils.customerManagement.contacts.getByCompany.setData(companyId, (old) => [
      ...(old || []),
      { ...newContact, id: Date.now(), createdAt: new Date() }
    ]);
    
    return { previousContacts };
  },
  onError: (err, newContact, context) => {
    // 回滚到之前的数据
    utils.customerManagement.contacts.getByCompany.setData(
      companyId,
      context?.previousContacts
    );
  },
  onSettled: () => {
    // 最终同步服务器数据
    utils.customerManagement.contacts.getByCompany.invalidate(companyId);
  },
});
```

### 方案2：使用React性能优化Hooks
**优先级：中**
**预期提升：减少50%不必要的重渲染**

```typescript
// 使用useMemo缓存计算结果
const sortedContacts = useMemo(() => {
  return contacts?.sort((a, b) => 
    a.importance === 'high' ? -1 : 1
  );
}, [contacts]);

// 使用useCallback缓存回调函数
const handleAddContact = useCallback((data) => {
  createContact.mutate(data);
}, [createContact]);

// 使用React.memo优化子组件
const ContactCard = React.memo(({ contact, onEdit, onDelete }) => {
  // ...
});
```

### 方案3：减少不必要的refetch调用
**优先级：高**
**预期提升：减少70%的网络请求**

```typescript
// 当前代码问题：
const createContact = trpc.customerManagement.contacts.create.useMutation({
  onSuccess: async (data) => {
    await linkContact.mutateAsync({ companyId, contactId: data.id });
    toast.success("联系人添加成功");
    setIsAddContactOpen(false);
    refetch(); // ❌ 这会重新加载所有数据（公司信息、联系人、跟进记录、订单统计）
  },
});

// 优化后：只invalidate需要更新的查询
const createContact = trpc.customerManagement.contacts.create.useMutation({
  onSuccess: async (data) => {
    await linkContact.mutateAsync({ companyId, contactId: data.id });
    toast.success("联系人添加成功");
    setIsAddContactOpen(false);
    // ✅ 只更新联系人列表
    utils.customerManagement.contacts.getByCompany.invalidate(companyId);
  },
});
```

### 方案4：使用骨架屏替代Loading Spinner
**优先级：低**
**预期提升：改善用户感知体验**

```typescript
// 使用Skeleton组件显示加载状态
{isLoading ? (
  <div className="space-y-4">
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
) : (
  // 实际内容
)}
```

### 方案5：批量查询优化（后端优化）
**优先级：低**
**预期提升：减少30%的数据库查询时间**

考虑创建一个聚合查询接口：
```typescript
// server/routers.ts
getCustomerDetailData: protectedProcedure
  .input(z.object({ companyId: z.number() }))
  .query(async ({ input }) => {
    // 一次性返回所有需要的数据
    const [company, contacts, followUps, orderStats] = await Promise.all([
      getCompanyById(input.companyId),
      getContactsByCompany(input.companyId),
      getFollowUpsByCompany(input.companyId),
      getOrderStats(input.companyId),
    ]);
    return { company, contacts, followUps, orderStats };
  }),
```

## 实施优先级

1. **立即实施（Phase 8）：**
   - 方案1：实现乐观更新
   - 方案3：减少不必要的refetch

2. **短期实施（Phase 8）：**
   - 方案2：React性能优化Hooks

3. **长期优化（未来迭代）：**
   - 方案4：骨架屏
   - 方案5：批量查询优化

## 预期效果

实施方案1和方案3后：
- 用户操作响应时间：从1-2秒降低到<100ms（乐观更新）
- 网络请求数量：减少70%
- 用户感知速度：提升80%
- 页面流畅度：显著提升
