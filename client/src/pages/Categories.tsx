import { useState } from "react";
import { trpc } from "@/lib/trpc";
import RabbitLoader from "@/components/RabbitLoader";
import Breadcrumb from "@/components/Breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import CategoryTree, { CategoryNode } from "@/components/CategoryTree";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Categories() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "createChild">("create");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formParentId, setFormParentId] = useState<number | null>(null);
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formIsEnabled, setFormIsEnabled] = useState(true);

  const utils = trpc.useUtils();

  // Fetch categories
  const { data: categoriesData, isLoading } = trpc.categories.list.useQuery();

  // Build tree structure
  const buildTree = (categories: any[]): CategoryNode[] => {
    const categoryMap = new Map<number, CategoryNode>();
    const rootCategories: CategoryNode[] = [];

    // First pass: create all nodes
    categories.forEach((cat) => {
      categoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        parentId: cat.parentId,
        productCount: cat.productCount || 0,
        children: [],
        sortOrder: cat.sortOrder,
        isEnabled: cat.isEnabled,
      });
    });

    // Second pass: build tree
    categories.forEach((cat) => {
      const node = categoryMap.get(cat.id)!;
      if (cat.parentId === null) {
        rootCategories.push(node);
      } else {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        }
      }
    });

    // Sort by sortOrder
    const sortNodes = (nodes: CategoryNode[]) => {
      nodes.sort((a, b) => a.sortOrder - b.sortOrder);
      nodes.forEach((node) => {
        if (node.children) {
          sortNodes(node.children);
        }
      });
    };
    sortNodes(rootCategories);

    return rootCategories;
  };

  const treeData = categoriesData ? buildTree(categoriesData) : [];

  // Get selected category
  const selectedCategory = categoriesData?.find((c: any) => c.id === selectedCategoryId);

  // Mutations
  const createCategory = trpc.categories.create.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
      toast.success("类目创建成功");
      resetForm();
      setDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "类目创建失败");
    },
  });

  const updateCategory = trpc.categories.update.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
      toast.success("类目更新成功");
      resetForm();
      setDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "类目更新失败");
    },
  });

  const deleteCategory = trpc.categories.delete.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
      toast.success("类目删除成功");
      setDeleteConfirmId(null);
      setSelectedCategoryId(null);
    },
    onError: (error) => {
      toast.error(error.message || "类目删除失败");
    },
  });

  const moveCategory = trpc.categories.move.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
      toast.success("类目移动成功");
    },
    onError: (error) => {
      toast.error(error.message || "类目移动失败");
    },
  });

  const handleMove = (categoryId: number, newParentId: number | null, newSortOrder: number) => {
    moveCategory.mutate({
      categoryId,
      newParentId,
      newSortOrder,
    });
  };

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormParentId(null);
    setFormSortOrder(0);
    setFormIsEnabled(true);
  };

  const handleAddRoot = () => {
    resetForm();
    setDialogMode("create");
    setDialogOpen(true);
  };

  const handleAddChild = (parentId: number) => {
    resetForm();
    setFormParentId(parentId);
    setDialogMode("createChild");
    setDialogOpen(true);
  };

  const handleEdit = (id: number) => {
    const category = categoriesData?.find((c: any) => c.id === id);
    if (category) {
      setSelectedCategoryId(id);
      setFormName(category.name);
      setFormDescription(category.description || "");
      setFormParentId(category.parentId);
      setFormSortOrder(category.sortOrder);
      setFormIsEnabled(category.isEnabled);
      setDialogMode("edit");
      setDialogOpen(true);
    }
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      toast.error("类目名称不能为空");
      return;
    }

    if (dialogMode === "edit" && selectedCategoryId) {
      updateCategory.mutate({
        id: selectedCategoryId,
        name: formName,
        description: formDescription,
        parentId: formParentId,
        sortOrder: formSortOrder,
        isEnabled: formIsEnabled,
      });
    } else {
      createCategory.mutate({
        name: formName,
        description: formDescription,
        parentId: formParentId,
        sortOrder: formSortOrder,
        isEnabled: formIsEnabled,
      });
    }
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteCategory.mutate({ id: deleteConfirmId });
    }
  };

  if (isLoading) {
    return <RabbitLoader />;
  }

  // Get parent category name
  const getParentName = (parentId: number | null) => {
    if (!parentId) return "无（根类目）";
    const parent = categoriesData?.find((c: any) => c.id === parentId);
    return parent?.name || "暂无";
  };

  return (
    <div className="h-screen flex flex-col">
      <Breadcrumb items={[
        { label: "产品管理", href: "/products" },
        { label: "类目管理" }
      ]} />
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Tree Navigation */}
        <div className="w-[420px] bg-white border-r flex flex-col shadow-sm">
          {/* Search */}
          <div className="p-4 border-b space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索类目..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={handleAddRoot} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              新建根类目
            </Button>
          </div>

          {/* Tree */}
          <div className="flex-1 overflow-y-auto p-4">
            <CategoryTree
              categories={treeData}
              selectedId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
              onAddChild={handleAddChild}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onMove={handleMove}
            />
          </div>
        </div>

        {/* Right: Detail Panel */}
        <div className="flex-1 overflow-y-auto bg-gray-50 flex items-start justify-center p-8">
          {selectedCategory ? (
            <Card className="w-full max-w-2xl">
              <CardHeader>
                <CardTitle>类目详情</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-sm text-gray-500">类目名称</Label>
                  <div className="text-lg font-medium mt-1">{selectedCategory.name}</div>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">上级类目</Label>
                  <div className="text-base mt-1">{getParentName(selectedCategory.parentId)}</div>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">产品数量</Label>
                  <div className="text-base mt-1">{selectedCategory.productCount}</div>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">描述</Label>
                  <div className="text-base mt-1">{selectedCategory.description || "暂无"}</div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={() => handleEdit(selectedCategory.id)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    编辑
                  </Button>
                  <Button variant="destructive" onClick={() => handleDelete(selectedCategory.id)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    删除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center text-gray-400">
              <p className="text-lg">请选择类目以查看详细信息</p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "edit" ? "编辑类目" : dialogMode === "createChild" ? "创建子类目" : "创建类目"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "edit" ? "修改类目信息" : "创建新的类目"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">类目名称 *</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="输入类目名称"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="description">描述</Label>
              <Input
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="输入描述（可选）"
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>
              {dialogMode === "edit" ? "保存" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除类目</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除此类目吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
