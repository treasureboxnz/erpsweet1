import { useState } from "react";
import { matchesPinyin } from "@/lib/pinyin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import RabbitLoader from "@/components/RabbitLoader";
import Breadcrumb from "@/components/Breadcrumb";
import { Plus, Search, Edit, Trash2, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// 预设颜色选项
const colorOptions = [
  { name: "蓝色", value: "#3b82f6" },
  { name: "绿色", value: "#10b981" },
  { name: "红色", value: "#ef4444" },
  { name: "黄色", value: "#f59e0b" },
  { name: "紫色", value: "#8b5cf6" },
  { name: "粉色", value: "#ec4899" },
  { name: "青色", value: "#06b6d4" },
  { name: "橙色", value: "#f97316" },
  { name: "灰色", value: "#6b7280" },
];

export default function TagManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [editingTag, setEditingTag] = useState<any>(null);

  // 表单状态
  const [formData, setFormData] = useState({
    name: "",
    color: "#3b82f6",
    description: "",
  });

  const { data: tags, isLoading } = trpc.tags.getAll.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.tags.create.useMutation({
    onSuccess: () => {
      toast.success("标签创建成功");
      utils.tags.getAll.invalidate();
      setAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`创建失败：${error.message}`);
    },
  });

  const updateMutation = trpc.tags.update.useMutation({
    onSuccess: () => {
      toast.success("标签更新成功");
      utils.tags.getAll.invalidate();
      setEditDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`更新失败：${error.message}`);
    },
  });

  const deleteMutation = trpc.tags.delete.useMutation({
    onSuccess: () => {
      toast.success("标签删除成功");
      utils.tags.getAll.invalidate();
      setDeleteConfirmId(null);
    },
    onError: (error) => {
      toast.error(`删除失败：${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      color: "#3b82f6",
      description: "",
    });
    setEditingTag(null);
  };

  const handleAdd = () => {
    resetForm();
    setAddDialogOpen(true);
  };

  const handleEdit = (tag: any) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color || "#3b82f6",
      description: tag.description || "",
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteMutation.mutate({ id: deleteConfirmId });
    }
  };

  const handleSubmitAdd = () => {
    if (!formData.name.trim()) {
      toast.error("标签名称不能为空");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleSubmitEdit = () => {
    if (!formData.name.trim()) {
      toast.error("标签名称不能为空");
      return;
    }
    updateMutation.mutate({
      id: editingTag.id,
      ...formData,
    });
  };

  // 筛选标签
  const filteredTags = tags?.filter((tag) => {
    if (searchQuery) {
      return matchesPinyin(tag.name, searchQuery);
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <RabbitLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "实用工具", href: "/utilities/tags" },
          { label: "Tag管理" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tag管理</h1>
          <p className="text-gray-500 mt-1">管理系统中的所有标签</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          新建标签
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">
              标签总数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tags?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="搜索标签名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tags Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTags?.map((tag) => (
          <Card key={tag.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="font-medium">{tag.name}</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(tag)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(tag.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {tag.description && (
                <p className="text-sm text-gray-500 line-clamp-2">
                  {tag.description}
                </p>
              )}
              <div className="mt-3 pt-3 border-t text-xs text-gray-400">
                创建于 {new Date(tag.createdAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTags?.length === 0 && (
        <div className="text-center py-12">
          <TagIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">暂无标签</p>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建标签</DialogTitle>
            <DialogDescription>创建一个新的标签</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">标签名称 *</Label>
              <Input
                id="name"
                placeholder="输入标签名称"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>标签颜色</Label>
              <div className="grid grid-cols-5 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`h-10 rounded-md border-2 transition-all ${
                      formData.color === color.value
                        ? "border-gray-900 scale-110"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() =>
                      setFormData({ ...formData, color: color.value })
                    }
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                placeholder="输入标签描述（可选）"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
            >
              取消
            </Button>
            <Button onClick={handleSubmitAdd}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑标签</DialogTitle>
            <DialogDescription>修改标签信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">标签名称 *</Label>
              <Input
                id="edit-name"
                placeholder="输入标签名称"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>标签颜色</Label>
              <div className="grid grid-cols-5 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`h-10 rounded-md border-2 transition-all ${
                      formData.color === color.value
                        ? "border-gray-900 scale-110"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() =>
                      setFormData({ ...formData, color: color.value })
                    }
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">描述</Label>
              <Textarea
                id="edit-description"
                placeholder="输入标签描述（可选）"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              取消
            </Button>
            <Button onClick={handleSubmitEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirmId !== null}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个标签吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
