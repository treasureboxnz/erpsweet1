import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Card } from "@/components/ui/card";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

export default function MaterialTypes() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [deletingType, setDeletingType] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    icon: "",
    sortOrder: 0,
  });

  const utils = trpc.useUtils();

  // 查询材料类型列表
  const { data: materialTypes, isLoading } = trpc.materialTypes.list.useQuery();

  // 创建材料类型
  const createMutation = trpc.materialTypes.create.useMutation({
    onSuccess: () => {
      toast.success("材料类型创建成功");
      utils.materialTypes.list.invalidate();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`创建失败：${error.message}`);
    },
  });

  // 更新材料类型
  const updateMutation = trpc.materialTypes.update.useMutation({
    onSuccess: () => {
      toast.success("材料类型更新成功");
      utils.materialTypes.list.invalidate();
      setEditingType(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(`更新失败：${error.message}`);
    },
  });

  // 删除材料类型
  const deleteMutation = trpc.materialTypes.delete.useMutation({
    onSuccess: () => {
      toast.success("材料类型删除成功");
      utils.materialTypes.list.invalidate();
    },
    onError: (error) => {
      toast.error(`删除失败：${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({ name: "", icon: "", sortOrder: 0 });
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error("请输入材料类型名称");
      return;
    }
    createMutation.mutate({
      name: formData.name,
      icon: formData.icon || "📦",
      sortOrder: formData.sortOrder,
    });
  };

  const handleUpdate = () => {
    if (!editingType || !formData.name.trim()) {
      toast.error("请输入材料类型名称");
      return;
    }
    updateMutation.mutate({
      id: editingType.id,
      name: formData.name,
      icon: formData.icon,
      sortOrder: formData.sortOrder,
    });
  };

  const handleDelete = (type: any) => {
    setDeletingType(type);
  };

  const confirmDelete = () => {
    if (deletingType) {
      deleteMutation.mutate({ id: deletingType.id });
      setDeletingType(null);
    }
  };

  const handleEdit = (type: any) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      icon: type.icon,
      sortOrder: type.sortOrder,
    });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0 || !materialTypes) return;
    const currentType = materialTypes[index];
    const prevType = materialTypes[index - 1];
    
    // 交换sortOrder
    updateMutation.mutate({
      id: currentType.id,
      sortOrder: prevType.sortOrder,
    });
    updateMutation.mutate({
      id: prevType.id,
      sortOrder: currentType.sortOrder,
    });
  };

  const handleMoveDown = (index: number) => {
    if (!materialTypes || index === materialTypes.length - 1) return;
    const currentType = materialTypes[index];
    const nextType = materialTypes[index + 1];
    
    // 交换sortOrder
    updateMutation.mutate({
      id: currentType.id,
      sortOrder: nextType.sortOrder,
    });
    updateMutation.mutate({
      id: nextType.id,
      sortOrder: currentType.sortOrder,
    });
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="text-center text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">材料类型管理</h1>
          <p className="text-gray-500 mt-1">
            管理系统中的材料类型，包括名称、图标和排序
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsCreateDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          新建材料类型
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">排序</TableHead>
              <TableHead className="w-24">图标</TableHead>
              <TableHead>名称</TableHead>
              <TableHead className="w-32">排序值</TableHead>
              <TableHead className="w-32">关联供应商</TableHead>
              <TableHead className="w-48">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materialTypes && materialTypes.length > 0 ? (
              materialTypes.map((type, index) => (
                <TableRow key={type.id}>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === materialTypes.length - 1}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-2xl">{type.icon}</span>
                  </TableCell>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell>{type.sortOrder}</TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {type.supplierCount || 0} 个供应商
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(type)}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        编辑
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(type)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500">
                  暂无材料类型
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* 创建/编辑对话框 */}
      <Dialog
        open={isCreateDialogOpen || !!editingType}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingType(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? "编辑材料类型" : "新建材料类型"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">材料类型名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="例如：布料、木腿、扶手"
              />
            </div>
            <div>
              <Label htmlFor="icon">图标（Emoji）</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) =>
                  setFormData({ ...formData, icon: e.target.value })
                }
                placeholder="例如：🧵、🪑、🛋️"
              />
              <p className="text-xs text-gray-500 mt-1">
                可以使用Emoji作为图标，例如：🧵 🪑 🛋️ 🧶 💺 🔲 🔧 📦
              </p>
            </div>
            <div>
              <Label htmlFor="sortOrder">排序值</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sortOrder: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                数值越小越靠前，相同数值按创建时间排序
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setEditingType(null);
                  resetForm();
                }}
              >
                取消
              </Button>
              <Button
                onClick={editingType ? handleUpdate : handleCreate}
                disabled={
                  createMutation.isPending || updateMutation.isPending
                }
              >
                {editingType
                  ? updateMutation.isPending
                    ? "保存中..."
                    : "保存"
                  : createMutation.isPending
                  ? "创建中..."
                  : "创建"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deletingType} onOpenChange={(open) => !open && setDeletingType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除材料类型"{deletingType?.name}"吗？
              <br />
              <br />
              注意：如果有供应商使用此类型，删除将失败。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
