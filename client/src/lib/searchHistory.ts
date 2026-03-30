/**
 * 客户SKU搜索历史记录管理工具
 * 使用localStorage存储，每个客户最多保疙10条搜索历史
 * 支持按使用频率排序，最常用的SKU显示在最前面
 */

export interface SearchHistoryItem {
  sku: string;
  timestamp: number;
  count: number;  // 使用次数
  productName?: string;
  batchCode?: string;
}

const MAX_HISTORY_ITEMS = 10;
const STORAGE_KEY = 'customer_sku_search_history';

/**
 * 获取指定客户的搜索历史记录
 * @param customerId 客户ID
 * @returns 搜索历史记录数组，按使用频率降序排列（次数相同时按时间倒序）
 */
export function getSearchHistory(customerId: number): SearchHistoryItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const allHistory = JSON.parse(data);
    const history = allHistory[customerId] || [];
    
    // 按使用频率降序排序，次数相同时按时间倒序
    return history.sort((a: SearchHistoryItem, b: SearchHistoryItem) => {
      if (b.count !== a.count) {
        return b.count - a.count;  // 按count降序
      }
      return b.timestamp - a.timestamp;  // count相同时按timestamp倒序
    });
  } catch (error) {
    console.error('Failed to get search history:', error);
    return [];
  }
}

/**
 * 添加搜索历史记录
 * @param customerId 客户ID
 * @param item 搜索历史项（不包含timestamp和count）
 */
export function addSearchHistory(
  customerId: number,
  item: Omit<SearchHistoryItem, 'timestamp' | 'count'>
): void {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const allHistory = data ? JSON.parse(data) : {};
    
    const customerHistory = allHistory[customerId] || [];
    
    // 查找是否已存在相同SKU的记录
    const existingIndex = customerHistory.findIndex((h: SearchHistoryItem) => h.sku === item.sku);
    
    if (existingIndex !== -1) {
      // 如果已存在，增加计数并更新时间戳
      customerHistory[existingIndex] = {
        ...customerHistory[existingIndex],
        ...item,  // 更新productName和batchCode
        count: customerHistory[existingIndex].count + 1,
        timestamp: Date.now()
      };
    } else {
      // 如果不存在，添加新记录
      customerHistory.push({
        ...item,
        count: 1,
        timestamp: Date.now()
      });
    }
    
    // 按使用频率排序后，只保留前10条
    const sorted = customerHistory.sort((a: SearchHistoryItem, b: SearchHistoryItem) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return b.timestamp - a.timestamp;
    });
    
    allHistory[customerId] = sorted.slice(0, MAX_HISTORY_ITEMS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allHistory));
  } catch (error) {
    console.error('Failed to add search history:', error);
  }
}

/**
 * 清除指定客户的搜索历史记录
 * @param customerId 客户ID
 */
export function clearSearchHistory(customerId: number): void {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return;
    
    const allHistory = JSON.parse(data);
    delete allHistory[customerId];
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allHistory));
  } catch (error) {
    console.error('Failed to clear search history:', error);
  }
}
