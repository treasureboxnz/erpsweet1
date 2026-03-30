import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Shield, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Positions() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    description: "",
  });

  const { data: positions, isLoading, refetch } = trpc.permissionManagement.positions.list.useQuery();
  const createMutation = trpc.permissionManagement.positions.create.useMutation();
  const updateMutation = trpc.permissionManagement.positions.update.useMutation();
  const deleteMutation = trpc.permissionManagement.positions.delete.useMutation();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync(formData);
      toast.success("岗位创建成功");
      setIsCreateDialogOpen(false);
      setFormData({ name: "", displayName: "", description: "" });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "创建失败");
    }
  };

  const handleEdit = (position: any) => {
    setSelectedPosition(position);
    setFormData({
      name: position.name,
      displayName: position.displayName,
      description: position.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPosition) return;

    try {
      await updateMutation.mutateAsync({
        id: selectedPosition.id,
        displayName: formData.displayName,
        description: formData.description,
      });
      toast.success("岗位更新成功");
      setIsEditDialogOpen(false);
      setSelectedPosition(null);
      setFormData({ name: "", displayName: "", description: "" });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "更新失败");
    }
  };

  const handleDelete = async (position: any) => {
    if (!confirm(`确定要删除岗位"${position.displayName}"吗？`)) return;

    try {
      await deleteMutation.mutateAsync({ id: position.id });
      toast.success("岗位删除成功");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "删除失败");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">岗位管理</h1>
          <p className="text-muted-foreground mt-2">管理系统中的所有岗位和角色</p>
        </div>
        <Link href="/users/positions/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新增岗位
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {positions?.map((position) => (
          <Card key={position.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {position.isSystem ? (
                    <Shield className="h-5 w-5 text-primary" />
                  ) : (
                    <Users className="h-5 w-5 text-gray-500" />
                  )}
                  <CardTitle>{position.displayName}</CardTitle>
                </div>
                {position.isSystem && (
                  <Badge variant="secondary">系统岗位</Badge>
                )}
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                {position.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {position.description || "暂无描述"}
              </p>
              <div className="flex gap-2">
                {!position.isSystem && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(position)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      编辑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(position)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      删除
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 创建岗位对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增岗位</DialogTitle>
            <DialogDescription>创建一个新的岗位角色</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">岗位标识 *</Label>
                <Input
                  id="name"
                  placeholder="例如：sales_manager"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  英文标识，用于系统内部识别
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">岗位名称 *</Label>
                <Input
                  id="displayName"
                  placeholder="例如：销售经理"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">岗位描述</Label>
                <Textarea
                  id="description"
                  placeholder="描述该岗位的职责和权限范围"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "创建中..." : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 编辑岗位对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑岗位</DialogTitle>
            <DialogDescription>修改岗位信息</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-displayName">岗位名称 *</Label>
                <Input
                  id="edit-displayName"
                  placeholder="例如：销售经理"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">岗位描述</Label>
                <Textarea
                  id="edit-description"
                  placeholder="描述该岗位的职责和权限范围"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "更新中..." : "更新"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
