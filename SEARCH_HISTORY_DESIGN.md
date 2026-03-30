# 客户SKU搜索历史记录功能设计文档

## 功能概述

为客户SKU搜索功能添加搜索历史记录和常用SKU快捷选择功能，提高用户搜索效率。

## 设计方案

### 方案A：localStorage存储（推荐）

**优点**：
- 实现简单，无需后端API
- 响应速度快，无网络延迟
- 不占用数据库空间
- 适合个人使用场景

**缺点**：
- 数据仅存储在本地浏览器，换浏览器或清除缓存会丢失
- 无法跨设备同步

**实现方案**：
1. 使用localStorage存储每个客户的搜索历史（最多保留10条）
2. 数据结构：`{ customerId: [{ sku, timestamp, productName, batchCode }] }`
3. 在搜索框下方显示历史记录，点击快速填充
4. 提供"清除历史"按钮

### 方案B：数据库存储

**优点**：
- 数据持久化，不会丢失
- 可跨设备同步
- 可统计分析用户搜索行为

**缺点**：
- 需要创建新表和API
- 增加数据库负担
- 实现复杂度高

**实现方案**：
1. 创建`search_history`表：
   ```sql
   CREATE TABLE search_history (
     id INT PRIMARY KEY AUTO_INCREMENT,
     user_id INT NOT NULL,
     customer_id INT NOT NULL,
     customer_sku VARCHAR(255) NOT NULL,
     product_name VARCHAR(255),
     batch_code VARCHAR(255),
     search_count INT DEFAULT 1,
     last_searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```
2. 创建tRPC API：
   - `searchHistory.list` - 获取搜索历史
   - `searchHistory.create` - 记录搜索
   - `searchHistory.clear` - 清除历史
3. 前端调用API显示历史记录

## 推荐方案：方案A（localStorage）

**理由**：
1. 用户明确要求"尽量选择简单的办法"
2. 搜索历史是个人使用场景，不需要跨设备同步
3. 实现快速，无需修改数据库和后端
4. 符合用户"尽量自动化，少问技术上的问题"的要求

## UI设计

### 搜索框下方显示历史记录

```
┌─────────────────────────────────────────────┐
│ 客户货号搜索                                  │
├─────────────────────────────────────────────┤
│ 输入客户货号: [_______________] [搜索]        │
│                                             │
│ 📜 最近搜索:                                 │
│ ┌─────────────────────────────────────────┐ │
│ │ CLIENT-SKU-ABC-001 (Modern Dining Chair)│ │
│ │ CLIENT-SKU-TEST-UI-002 (Oak Table)      │ │
│ │ CLIENT-SKU-UI-TEST-003 (Leather Sofa)   │ │
│ └─────────────────────────────────────────┘ │
│ [清除历史]                                   │
└─────────────────────────────────────────────┘
```

### 交互逻辑

1. 用户搜索成功后，自动保存到历史记录
2. 点击历史记录项，自动填充到搜索框并执行搜索
3. 点击"清除历史"按钮，清空当前客户的搜索历史
4. 历史记录最多显示10条，按时间倒序排列

## 实现步骤

### 步骤1：创建localStorage工具函数

创建`client/src/lib/searchHistory.ts`：

```typescript
interface SearchHistoryItem {
  sku: string;
  timestamp: number;
  productName?: string;
  batchCode?: string;
}

const MAX_HISTORY_ITEMS = 10;
const STORAGE_KEY = 'customer_sku_search_history';

export function getSearchHistory(customerId: number): SearchHistoryItem[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  
  const allHistory = JSON.parse(data);
  return allHistory[customerId] || [];
}

export function addSearchHistory(
  customerId: number,
  item: Omit<SearchHistoryItem, 'timestamp'>
): void {
  const data = localStorage.getItem(STORAGE_KEY);
  const allHistory = data ? JSON.parse(data) : {};
  
  const customerHistory = allHistory[customerId] || [];
  
  // 移除重复项
  const filtered = customerHistory.filter((h: SearchHistoryItem) => h.sku !== item.sku);
  
  // 添加新项到开头
  filtered.unshift({
    ...item,
    timestamp: Date.now()
  });
  
  // 限制最多10条
  allHistory[customerId] = filtered.slice(0, MAX_HISTORY_ITEMS);
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allHistory));
}

export function clearSearchHistory(customerId: number): void {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return;
  
  const allHistory = JSON.parse(data);
  delete allHistory[customerId];
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allHistory));
}
```

### 步骤2：修改OrderCreate.tsx

在搜索成功后调用`addSearchHistory`，在搜索框下方显示历史记录。

### 步骤3：修改QuotationCreate.tsx和QuotationEdit.tsx

同样添加搜索历史记录功能。

## 测试计划

1. 测试搜索历史记录保存功能
2. 测试点击历史记录快速搜索功能
3. 测试清除历史功能
4. 测试不同客户的历史记录隔离
5. 测试历史记录最多10条限制

## 预期效果

- 用户搜索过的客户SKU会自动保存到历史记录
- 下次搜索时，可以直接点击历史记录快速填充
- 提高搜索效率，减少重复输入
- 用户体验更加流畅
