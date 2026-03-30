# Casaviva ERP 设计规范

## 概述

本文档定义了Casaviva ERP系统的统一设计规范，确保所有模块保持一致的视觉风格和用户体验。

---

## 🎨 整体设计风格

**核心原则：现代化Shopify风格**

- 扁平化设计（无渐变、无阴影）
- 不使用老式标签页样式
- 充足的留白和呼吸感
- 卡片式内容布局
- 清晰的视觉层级

---

## 📐 双层导航结构标准

### 一级导航（Primary Navigation）

**视觉设计：**
- **样式**：下划线式高亮
- **激活状态**：底部黑色线条（2-3px粗细）
- **未激活状态**：无下划线，灰色文字
- **布局**：水平排列，大间距设计（gap-8或更大）
- **字体**：中等粗细（font-medium），较大字号（text-base或text-lg）

**CSS实现示例：**
```css
/* 一级Tab容器 */
.primary-tabs {
  display: flex;
  gap: 2rem; /* 大间距 */
  border-bottom: 1px solid #e5e7eb;
}

/* 一级Tab按钮 */
.primary-tab {
  padding: 1rem 0;
  font-weight: 500;
  color: #6b7280; /* 未激活：灰色 */
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

/* 一级Tab激活状态 */
.primary-tab.active {
  color: #000000; /* 激活：黑色 */
  border-bottom-color: #000000; /* 底部黑色线条 */
}
```

### 二级导航（Contextual Sub Navigation）

**视觉设计：**
- **样式**：胶囊式按钮设计
- **激活状态**：黑色填充背景 + 白色文字
- **未激活状态**：白色背景 + 黑色边框 + 黑色文字
- **布局**：水平排列，适中间距（gap-2或gap-3）
- **圆角**：较大圆角（rounded-full或rounded-lg）

**CSS实现示例：**
```css
/* 二级Tab容器 */
.secondary-tabs {
  display: flex;
  gap: 0.5rem; /* 适中间距 */
  padding: 1rem 0;
}

/* 二级Tab按钮 */
.secondary-tab {
  padding: 0.5rem 1rem;
  border-radius: 9999px; /* 胶囊式 */
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
  
  /* 未激活状态 */
  background-color: #ffffff;
  color: #000000;
  border: 1px solid #d1d5db;
}

/* 二级Tab激活状态 */
.secondary-tab.active {
  background-color: #000000; /* 黑色填充 */
  color: #ffffff; /* 白色文字 */
  border-color: #000000;
}
```

### React组件结构示例

```tsx
import { useState } from "react";

interface Tab {
  id: string;
  label: string;
  subTabs?: Array<{ id: string; label: string }>;
}

export default function ShopifyStyleTabs({ tabs }: { tabs: Tab[] }) {
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const [activeSubTab, setActiveSubTab] = useState(
    tabs[0].subTabs?.[0]?.id
  );

  const currentTab = tabs.find((t) => t.id === activeTab);

  return (
    <div>
      {/* 一级导航 */}
      <div className="flex gap-8 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setActiveSubTab(tab.subTabs?.[0]?.id);
            }}
            className={`
              px-0 py-4 font-medium transition-colors
              border-b-2 -mb-px
              ${
                activeTab === tab.id
                  ? "text-black border-black"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 二级导航 */}
      {currentTab?.subTabs && (
        <div className="flex gap-2 py-4">
          {currentTab.subTabs.map((subTab) => (
            <button
              key={subTab.id}
              onClick={() => setActiveSubTab(subTab.id)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium transition-all
                ${
                  activeSubTab === subTab.id
                    ? "bg-black text-white border-black"
                    : "bg-white text-black border border-gray-300 hover:border-gray-400"
                }
              `}
            >
              {subTab.label}
            </button>
          ))}
        </div>
      )}

      {/* 内容区域 */}
      <div className="mt-6">
        {/* 根据activeTab和activeSubTab渲染对应内容 */}
      </div>
    </div>
  );
}
```

---

## 🎯 导航层级规范

### 何时使用双层导航

**适用场景：**
- 编辑/详情页面（如产品编辑、客户详情）
- 复杂表单的模块化组织
- 需要分层展示大量信息的页面

**一级导航（6-8个Tab）：**
- 代表主要功能模块
- 示例：Overview、Media、Variants、Pricing、Suppliers、Orders、Files

**二级导航（2-4个Sub Tab）：**
- 细分一级模块的子功能
- 示例：
  - Media → Images / Videos / 3D Models
  - Pricing → Cost / Selling / FOB Structure / Price History
  - Variants → All Variants / Create Variant / Archived

### 导航命名规范

**一级导航：**
- 使用简洁的英文单词（1-2个单词）
- 首字母大写
- 避免使用动词，优先使用名词
- 示例：✅ Overview、Media、Pricing  ❌ View Product、Upload Media、Set Price

**二级导航：**
- 可以使用稍长的描述性名称
- 首字母大写
- 可以使用动词+名词组合
- 示例：✅ All Variants、Create Variant、Price History

---

## 📦 内容区域布局

### 卡片式布局

**所有内容必须使用Card组件包裹：**

```tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Section Title</CardTitle>
    <CardDescription>Brief description of this section</CardDescription>
  </CardHeader>
  <CardContent>
    {/* 内容区域 */}
  </CardContent>
</Card>
```

### 两栏布局（Overview页面推荐）

**左侧：主要内容（2/3宽度）**
- 产品信息、表单字段等

**右侧：辅助信息（1/3宽度）**
- 状态、组织信息、快速操作等

```tsx
<div className="grid grid-cols-3 gap-6">
  {/* 左侧主内容 */}
  <div className="col-span-2 space-y-6">
    <Card>...</Card>
    <Card>...</Card>
  </div>

  {/* 右侧辅助信息 */}
  <div className="space-y-6">
    <Card>...</Card>
    <Card>...</Card>
  </div>
</div>
```

---

## 🎨 颜色规范

### 主要颜色

**黑色系（用于文字、边框、激活状态）：**
- 主黑色：`#000000` 或 `text-black`
- 深灰色：`#1f2937` 或 `text-gray-800`
- 中灰色：`#6b7280` 或 `text-gray-500`
- 浅灰色：`#9ca3af` 或 `text-gray-400`

**背景色：**
- 白色：`#ffffff` 或 `bg-white`
- 浅灰背景：`#f9fafb` 或 `bg-gray-50`
- 边框灰：`#e5e7eb` 或 `border-gray-200`

**强调色（谨慎使用）：**
- 蓝色（链接、主要操作）：`#3b82f6` 或 `text-blue-500`
- 红色（删除、警告）：`#ef4444` 或 `text-red-500`
- 绿色（成功）：`#10b981` 或 `text-green-500`

---

## 📏 间距规范

### 组件间距

**一级导航：**
- Tab之间间距：`gap-8`（2rem / 32px）
- 上下内边距：`py-4`（1rem / 16px）

**二级导航：**
- Tab之间间距：`gap-2`（0.5rem / 8px）
- 按钮内边距：`px-4 py-2`（水平1rem，垂直0.5rem）

**内容区域：**
- Card之间间距：`space-y-6`（1.5rem / 24px）
- Card内边距：默认使用shadcn/ui的Card组件间距

---

## ✅ 设计检查清单

在创建新模块时，请确保：

- [ ] 使用双层导航结构（一级+二级）
- [ ] 一级导航采用下划线式高亮，黑色底部线条
- [ ] 二级导航采用胶囊式按钮，黑色填充表示激活
- [ ] 所有内容使用Card组件包裹
- [ ] 充足的留白和间距
- [ ] 扁平化设计，无渐变和阴影
- [ ] 响应式设计，适配不同屏幕尺寸
- [ ] URL参数同步（支持直接链接分享）

---

## 🔄 现有实现参考

**产品编辑页面（ProductEdit.tsx）：**
- 完整实现了双层导航结构
- 7个一级Tab：Overview、Media、Variants、Pricing、Suppliers、Orders、Files
- 多个二级Tab示例
- 可作为新模块的模板参考

**组件文件：**
- `/client/src/components/ProductEditTabs.tsx` - 导航组件
- `/client/src/pages/ProductEdit.tsx` - 完整页面实现

---

## 📝 更新日志

**2026-02-12：**
- 初始版本创建
- 定义Shopify风格双层导航标准
- 建立颜色、间距、布局规范

---

**维护说明：**
本文档应随着设计系统的演进持续更新。所有设计决策应记录在此，确保团队成员遵循统一标准。
