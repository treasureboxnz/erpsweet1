/**
 * SmartSearchSelect - 通用智能搜索下拉组件
 *
 * 特性：
 * 1. 点击搜索框时自动展示默认推荐列表（无需先输入）
 * 2. 输入关键词时实时过滤搜索
 * 3. 支持自定义渲染每条结果
 * 4. 支持热度排序（后端按 usageCount 排序）
 * 5. 可复用 - 通过泛型支持任意数据类型
 *
 * 使用示例：
 * ```tsx
 * <SmartSearchSelect<ColorItem>
 *   value={selectedId}
 *   displayValue={selectedLabel}
 *   onSelect={(item) => setSelected(item)}
 *   onClear={() => setSelected(null)}
 *   fetchItems={async (query) => await fetchColors(query)}
 *   renderItem={(item) => <span>{item.label}</span>}
 *   placeholder="搜索颜色编号..."
 *   emptyText="暂无匹配结果"
 * />
 * ```
 */

import React, { useState, useRef, useEffect, useCallback } from "react";

export interface SmartSearchSelectProps<T> {
  /** 当前选中项的值（用于判断是否已选中） */
  value: number | string | null;
  /** 当前选中项的显示文本 */
  displayValue?: string;
  /** 选中某条时的回调 */
  onSelect: (item: T) => void;
  /** 清除选中时的回调 */
  onClear?: () => void;
  /**
   * 获取列表数据的异步函数
   * - query 为空字符串时：返回默认推荐列表（按热度排序）
   * - query 有值时：返回搜索结果
   */
  fetchItems: (query: string) => Promise<T[]>;
  /** 渲染每条结果 */
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
  /** 获取每条结果的唯一key */
  getItemKey: (item: T) => string | number;
  /** 判断某条结果是否为当前选中项 */
  isItemSelected?: (item: T) => boolean;
  /** 搜索框占位符 */
  placeholder?: string;
  /** 无结果时的提示文字 */
  emptyText?: string;
  /** 默认列表的标题（如"热门颜色"） */
  defaultListTitle?: string;
  /** 搜索结果列表的标题（如"搜索结果"） */
  searchListTitle?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 额外的 className */
  className?: string;
}

export function SmartSearchSelect<T>({
  value,
  displayValue,
  onSelect,
  onClear,
  fetchItems,
  renderItem,
  getItemKey,
  isItemSelected,
  placeholder = "搜索...",
  emptyText = "暂无匹配结果",
  defaultListTitle = "常用选项",
  searchListTitle = "搜索结果",
  disabled = false,
  className = "",
}: SmartSearchSelectProps<T>) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSelected, setIsSelected] = useState(false); // 是否已选中某项（搜索框显示选中值）

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 当外部 value 变化时，同步 isSelected 状态
  useEffect(() => {
    setIsSelected(value !== null && value !== undefined);
  }, [value]);

  // 加载数据（防抖）
  const loadItems = useCallback(
    async (searchQuery: string) => {
      setIsLoading(true);
      try {
        const results = await fetchItems(searchQuery);
        setItems(results);
      } catch (e) {
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchItems]
  );

  // 点击搜索框时打开下拉并加载默认列表
  const handleFocus = () => {
    if (disabled) return;
    setIsOpen(true);
    if (!isSelected) {
      // 未选中时，加载默认推荐列表
      loadItems("");
    }
  };

  // 输入时搜索（防抖 300ms）
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsSelected(false); // 开始输入时取消"已选中"状态

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadItems(val);
    }, 300);
  };

  // 选中某条
  const handleSelect = (item: T) => {
    onSelect(item);
    setIsSelected(true);
    setIsOpen(false);
    setQuery("");
  };

  // 清除选中
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClear?.();
    setIsSelected(false);
    setQuery("");
    setItems([]);
    setIsOpen(false);
  };

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 清理防抖
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const isSearching = query.length > 0;
  const listTitle = isSearching ? searchListTitle : defaultListTitle;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 输入框 */}
      <div
        className={`flex items-center w-full border rounded-md bg-white transition-colors ${
          isOpen ? "border-blue-500 ring-1 ring-blue-500" : "border-gray-300"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-text"}`}
        onClick={() => {
          if (!disabled) inputRef.current?.focus();
        }}
      >
        {/* 搜索图标 */}
        <svg
          className="ml-3 w-4 h-4 text-gray-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        {/* 已选中时显示选中值，否则显示输入框 */}
        {isSelected && displayValue && !isOpen ? (
          <span className="flex-1 px-2 py-2 text-sm text-gray-900 truncate">{displayValue}</span>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            placeholder={isSelected && displayValue ? displayValue : placeholder}
            disabled={disabled}
            className="flex-1 px-2 py-2 text-sm bg-transparent outline-none placeholder-gray-400"
          />
        )}

        {/* 清除按钮 */}
        {(isSelected || query) && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="mr-2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 下拉列表 */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
          {/* 列表标题 */}
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">{listTitle}</span>
            {!isSearching && (
              <span className="text-xs text-gray-400">按使用频率排序</span>
            )}
          </div>

          {/* 列表内容 */}
          <div className="max-h-56 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-6 text-gray-400">
                <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm">加载中...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-400">{emptyText}</div>
            ) : (
              items.map((item) => {
                const selected = isItemSelected ? isItemSelected(item) : false;
                return (
                  <div
                    key={getItemKey(item)}
                    onClick={() => handleSelect(item)}
                    className={`px-3 py-2 cursor-pointer transition-colors ${
                      selected
                        ? "bg-blue-50 text-blue-700"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {renderItem(item, selected)}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
