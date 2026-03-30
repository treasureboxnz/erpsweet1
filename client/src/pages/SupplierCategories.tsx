import { useState } from "react";
import { matchesPinyin } from "@/lib/pinyin";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Edit, Trash2, GripVertical } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Category {
  id: number;
  name: string;
  description: string | null;
  parentId: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

function SortableCategoryItem({
  category,
  onEdit,
  onDelete,
  level = 0,
}: {
  category: CategoryTreeNode;
  onEdit: (category: Category) => void;
  onDelete: (id: number) => void;
  level?: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id.toString(),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`flex items-center gap-3 p-3 border rounded-lg bg-white hover:bg-gray-50 ${
          isDragging ? "border-blue-500" : "border-gray-200"
        }`}
        style={{ marginLeft: `${level * 32}px` }}
      >
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>
        
        <div className="flex-1">
          <div className="font-medium">{category.name}</div>
          {category.description && (
            <div className="text-sm text-gray-500 mt-1">{category.description}</div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(category)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(category.id)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>

      {category.children.length > 0 && (
        <div className="mt-2">
          {category.children.map((child) => (
            <SortableCategoryItem
              key={child.id}
              category={child}
              onEdit={onEdit}
              onDelete={onDelete}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SupplierCategories() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    parentId: null as number | null,
  });

  const { data: categories = [], refetch } = trpc.supplierCategories.list.useQuery();
  const createMutation = trpc.supplierCategories.create.useMutation();
  const updateMutation = trpc.supplierCategories.update.useMutation();
  const deleteMutation = trpc.supplierCategories.delete.useMutation();
  const moveMutation = trpc.supplierCategories.move.useMutation();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Build tree structure
  const buildTree = (cats: Category[]): CategoryTreeNode[] => {
    const map = new Map<number, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

    cats.forEach((cat) => {
      map.set(cat.id, { ...cat, children: [] });
    });

    cats.forEach((cat) => {
      const node = map.get(cat.id)!;
      if (cat.parentId === null) {
        roots.push(node);
      } else {
        const parent = map.get(cat.parentId);
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    return roots;
  };

  const categoryTree = buildTree(categories);

  // Filter categories
  const filteredTree = searchQuery
    ? categoryTree.filter((cat) =>
        matchesPinyin(cat.name, searchQuery)
      )
    : categoryTree;

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        parentId: formData.parentId || undefined,
      });
      toast.success("分类创建成功");
      setIsCreateDialogOpen(false);
      setFormData({ name: "", description: "", parentId: null });
      refetch();
    } catch (error) {
      toast.error("创建失败：" + String(error));
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      parentId: category.parentId,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingCategory) return;
    try {
      await updateMutation.mutateAsync({
        id: editingCategory.id,
        name: formData.name,
        description: formData.description,
      });
      toast.success("分类更新成功");
      setIsEditDialogOpen(false);
      setEditingCategory(null);
      refetch();
    } catch (error) {
      toast.error("更新失败：" + String(error));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除此分类吗？")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("分类删除成功");
      refetch();
    } catch (error) {
      toast.error("删除失败：" + String(error));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    try {
      const activeId = Number(active.id);
      const overId = Number(over.id);
      
      const activeCategory = categories.find((c) => c.id === activeId);
      const overCategory = categories.find((c) => c.id === overId);
      
      if (!activeCategory || !overCategory) return;

      await moveMutation.mutateAsync({
        categoryId: activeId,
        newParentId: overCategory.parentId,
        newSortOrder: overCategory.sortOrder,
      });

      toast.success("分类移动成功");
      refetch();
    } catch (error) {
      toast.error("移动失败：" + String(error));
    }
  };

  const flattenTree = (nodes: CategoryTreeNode[]): string[] => {
    const result: string[] = [];
    nodes.forEach((node) => {
      result.push(node.id.toString());
      if (node.children.length > 0) {
        result.push(...flattenTree(node.children));
      }
    });
    return result;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">供应商分类管理</h1>
          <p className="text-gray-500 mt-1">管理供应商分类，支持拖拽排序</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新建分类
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建供应商分类</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">分类名称</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="输入分类名称"
                />
              </div>
              <div>
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="输入分类描述（可选）"
                />
              </div>
              <Button onClick={handleCreate} className="w-full">
                创建
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索分类名称..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories Tree */}
      <Card>
        <CardHeader>
          <CardTitle>分类列表（{categories.length}）</CardTitle>
        </CardHeader>
        <CardContent>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={flattenTree(filteredTree)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {filteredTree.map((category) => (
                  <SortableCategoryItem
                    key={category.id}
                    category={category}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {filteredTree.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              暂无分类数据
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑供应商分类</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">分类名称</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">描述</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <Button onClick={handleUpdate} className="w-full">
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
