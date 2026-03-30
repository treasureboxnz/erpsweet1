import React, { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, Plus, X, Search, FolderTree } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: number;
  name: string;
  parentId: number | null;
  sortOrder: number;
  isEnabled: boolean;
}

interface TreeNode extends Category {
  children: TreeNode[];
  level: number;
}

interface ProductCategorySelectorProps {
  productId: number;
}

export default function ProductCategorySelector({ productId }: ProductCategorySelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [createParentId, setCreateParentId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // 获取所有类目
  const { data: allCategories = [] } = trpc.categories.getAll.useQuery();

  // 获取产品已关联的类目
  const { data: productCategories = [] } = trpc.categories.getProductCategories.useQuery(
    { productId },
    { enabled: !!productId }
  );

  // 设置产品类目
  const setProductCategories = trpc.categories.setProductCategories.useMutation({
    onSuccess: () => {
      utils.categories.getProductCategories.invalidate({ productId });
      toast.success("类目已更新");
    },
    onError: (err) => toast.error(err.message),
  });

  // 创建新类目
  const createCategory = trpc.categories.create.useMutation({
    onSuccess: () => {
      utils.categories.getAll.invalidate();
      setNewCategoryName("");
      setShowCreateInput(false);
      setCreateParentId(null);
      toast.success("类目创建成功");
    },
    onError: (err) => toast.error(err.message),
  });

  // 构建树形结构
  const tree = useMemo(() => {
    const buildTree = (parentId: number | null, level: number): TreeNode[] => {
      return allCategories
        .filter((c: Category) => c.parentId === parentId)
        .sort((a: Category, b: Category) => a.sortOrder - b.sortOrder)
        .map((c: Category) => ({
          ...c,
          level,
          children: level < 3 ? buildTree(c.id, level + 1) : [],
        }));
    };
    return buildTree(null, 1);
  }, [allCategories]);

  // 已选类目ID集合
  const selectedIds = useMemo(
    () => new Set(productCategories.map((c: Category) => c.id)),
    [productCategories]
  );

  // 获取所有祖先ID
  const getAncestorIds = useCallback(
    (categoryId: number): number[] => {
      const ancestors: number[] = [];
      let current = allCategories.find((c: Category) => c.id === categoryId);
      while (current && current.parentId !== null) {
        ancestors.push(current.parentId);
        current = allCategories.find((c: Category) => c.id === current!.parentId);
      }
      return ancestors;
    },
    [allCategories]
  );

  // 获取所有后代ID
  const getDescendantIds = useCallback(
    (categoryId: number): number[] => {
      const descendants: number[] = [];
      const children = allCategories.filter((c: Category) => c.parentId === categoryId);
      for (const child of children) {
        descendants.push(child.id);
        descendants.push(...getDescendantIds(child.id));
      }
      return descendants;
    },
    [allCategories]
  );

  // 切换类目选择（自动继承逻辑）
  const toggleCategory = (categoryId: number) => {
    const currentIds = new Set(selectedIds);

    if (currentIds.has(categoryId)) {
      // 取消选择：同时取消所有后代
      currentIds.delete(categoryId);
      const descendants = getDescendantIds(categoryId);
      descendants.forEach((id) => currentIds.delete(id));
      // 如果取消了某个子类目，检查父类目是否还有其他子类目被选中
      // 如果没有，也取消父类目
      const ancestors = getAncestorIds(categoryId);
      for (const ancestorId of ancestors) {
        const siblingChildren = allCategories.filter((c: Category) => c.parentId === ancestorId);
        const hasSelectedChild = siblingChildren.some((c: Category) => currentIds.has(c.id));
        if (!hasSelectedChild) {
          currentIds.delete(ancestorId);
        }
      }
    } else {
      // 选择：自动添加所有祖先
      currentIds.add(categoryId);
      const ancestors = getAncestorIds(categoryId);
      ancestors.forEach((id) => currentIds.add(id));
    }

    setProductCategories.mutate({
      productId,
      categoryIds: Array.from(currentIds),
    });
  };

  // 搜索过滤
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return tree;

    const matchIds = new Set<number>();
    const query = searchQuery.toLowerCase();

    // 找到所有匹配的类目及其祖先
    allCategories.forEach((c: Category) => {
      if (c.name.toLowerCase().includes(query)) {
        matchIds.add(c.id);
        // 添加所有祖先
        let current = c;
        while (current.parentId !== null) {
          matchIds.add(current.parentId);
          current = allCategories.find((p: Category) => p.id === current.parentId)!;
          if (!current) break;
        }
      }
    });

    const filterTree = (nodes: TreeNode[]): TreeNode[] => {
      return nodes
        .filter((n) => matchIds.has(n.id))
        .map((n) => ({ ...n, children: filterTree(n.children) }));
    };

    return filterTree(tree);
  }, [tree, searchQuery, allCategories]);

  // 切换展开/折叠
  const toggleExpand = (id: number) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 渲染树节点
  const renderNode = (node: TreeNode) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id) || searchQuery.trim().length > 0;
    const isSelected = selectedIds.has(node.id);

    const levelColors = [
      "", // unused
      "text-gray-900 font-medium",
      "text-gray-700",
      "text-gray-600 text-sm",
    ];

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1.5 py-1.5 px-2 rounded-md hover:bg-gray-50 cursor-pointer group transition-colors ${
            isSelected ? "bg-blue-50" : ""
          }`}
          style={{ paddingLeft: `${(node.level - 1) * 20 + 8}px` }}
        >
          {/* 展开/折叠按钮 */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}

          {/* 复选框 */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleCategory(node.id)}
            className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />

          {/* 类目名称 */}
          <span
            className={`flex-1 ${levelColors[node.level] || "text-gray-600"}`}
            onClick={() => toggleCategory(node.id)}
          >
            {node.name}
          </span>

          {/* 添加子类目按钮 */}
          {node.level < 3 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCreateParentId(node.id);
                setShowCreateInput(true);
                setExpandedNodes((prev) => {
                const next = new Set(prev);
                next.add(node.id);
                return next;
              });
              }}
              className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-opacity"
              title="添加子类目"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 子节点 */}
        {hasChildren && isExpanded && (
          <div>{node.children.map(renderNode)}</div>
        )}
      </div>
    );
  };

  // 获取已选的叶子类目（最深层级）用于显示标签
  const selectedLeafCategories = useMemo(() => {
    return productCategories.filter((c: Category) => {
      const hasSelectedChild = productCategories.some(
        (other: Category) => other.parentId === c.id
      );
      return !hasSelectedChild;
    });
  }, [productCategories]);

  // 获取类目完整路径
  const getCategoryPath = useCallback(
    (categoryId: number): string => {
      const parts: string[] = [];
      let current = allCategories.find((c: Category) => c.id === categoryId);
      while (current) {
        parts.unshift(current.name);
        if (current.parentId === null) break;
        current = allCategories.find((c: Category) => c.id === current!.parentId);
      }
      return parts.join(" > ");
    },
    [allCategories]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-1.5">
            <FolderTree className="w-4 h-4 text-gray-500" />
            产品类目
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* 已选类目标签 */}
        {selectedLeafCategories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {selectedLeafCategories.map((cat: Category) => (
              <Badge
                key={cat.id}
                variant="secondary"
                className="text-xs py-0.5 px-2 flex items-center gap-1"
              >
                <span className="max-w-[120px] truncate" title={getCategoryPath(cat.id)}>
                  {cat.name}
                </span>
                <X
                  className="w-3 h-3 cursor-pointer hover:text-red-500"
                  onClick={() => toggleCategory(cat.id)}
                />
              </Badge>
            ))}
          </div>
        )}

        {/* 搜索框 */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索类目..."
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* 类目树 */}
        <div className="max-h-[240px] overflow-y-auto border rounded-md p-1">
          {filteredTree.length > 0 ? (
            filteredTree.map(renderNode)
          ) : (
            <div className="text-center py-4 text-sm text-gray-400">
              {searchQuery ? "未找到匹配类目" : "暂无类目"}
            </div>
          )}
        </div>

        {/* 创建新类目 */}
        {showCreateInput ? (
          <div className="mt-2 flex gap-2">
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder={createParentId ? "子类目名称..." : "新类目名称..."}
              className="h-8 text-sm flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && newCategoryName.trim()) {
                  createCategory.mutate({
                    name: newCategoryName.trim(),
                    parentId: createParentId,
                  });
                }
                if (e.key === "Escape") {
                  setShowCreateInput(false);
                  setNewCategoryName("");
                  setCreateParentId(null);
                }
              }}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => {
                if (newCategoryName.trim()) {
                  createCategory.mutate({
                    name: newCategoryName.trim(),
                    parentId: createParentId,
                  });
                }
              }}
              disabled={!newCategoryName.trim() || createCategory.isPending}
            >
              确定
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => {
                setShowCreateInput(false);
                setNewCategoryName("");
                setCreateParentId(null);
              }}
            >
              取消
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full h-7 text-xs text-gray-500 hover:text-blue-600"
            onClick={() => {
              setShowCreateInput(true);
              setCreateParentId(null);
            }}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            新建类目
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
