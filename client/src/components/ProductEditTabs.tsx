import { useState } from "react";

// 一级导航配置
const primaryTabs = [
  { id: "overview", label: "概览" },
  { id: "media", label: "媒体" },
  { id: "variants", label: "批次" },
  { id: "pricing", label: "定价" },
  { id: "suppliers", label: "供应商" },
  { id: "orders", label: "订单" },
  { id: "files", label: "文件" },
];

// 二级导航配置
const subTabs: Record<string, Array<{ id: string; label: string }>> = {
  variants: [
    { id: "all", label: "所有批次" },
    { id: "archived", label: "已归档" },
  ],
  pricing: [
    { id: "cost", label: "成本与定价" },
    { id: "fob", label: "售价" },
  ],
  suppliers: [
    { id: "list", label: "供应商列表" },
    { id: "quotes", label: "报价比较" },
  ],
  media: [
    { id: "images", label: "图片" },
    { id: "videos", label: "视频" },
    { id: "3d", label: "3D模型" },
  ],
  orders: [
    { id: "all", label: "所有订单" },
    { id: "pending", label: "待处理" },
    { id: "completed", label: "已完成" },
  ],
  files: [
    { id: "documents", label: "文档" },
    { id: "specifications", label: "规格说明" },
  ],
};

interface ProductEditTabsProps {
  activeTab: string;
  activeSubTab?: string;
  onTabChange: (tab: string, subTab?: string) => void;
}

export default function ProductEditTabs({
  activeTab,
  activeSubTab,
  onTabChange,
}: ProductEditTabsProps) {
  const currentSubTabs = subTabs[activeTab] || [];

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto">
        {/* 一级导航 - 下划线式 */}
        <div className="flex gap-1 px-6">
          {primaryTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                const defaultSubTab = subTabs[tab.id]?.[0]?.id;
                onTabChange(tab.id, defaultSubTab);
              }}
              className={`
                relative px-6 py-4 text-sm font-medium transition-all
                ${
                  activeTab === tab.id
                    ? "text-gray-900"
                    : "text-gray-600 hover:text-gray-900"
                }
              `}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
              )}
            </button>
          ))}
        </div>

        {/* 二级导航 - 胶囊式 */}
        {currentSubTabs.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
            <div className="flex gap-2">
              {currentSubTabs.map((subTab) => (
                <button
                  key={subTab.id}
                  onClick={() => onTabChange(activeTab, subTab.id)}
                  className={`
                    px-4 py-1.5 rounded-full text-sm font-medium transition-all
                    ${
                      activeSubTab === subTab.id
                        ? "bg-gray-900 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                    }
                  `}
                >
                  {subTab.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
