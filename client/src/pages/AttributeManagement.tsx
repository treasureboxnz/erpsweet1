import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Plus, ListOrdered, ClipboardList } from "lucide-react";
import { toast } from "sonner";

// 专属卡片：跟进阶段 / 工作计划
function FollowUpAttributeCard({
  title,
  description,
  icon: Icon,
  category,
  subcategory,
  fieldName,
  color,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  subcategory: string;
  fieldName: string;
  color: string;
}) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const { data: attrs, refetch } = trpc.attributes.getAll.useQuery({ category, subcategory, fieldName });

  const createMutation = trpc.attributes.create.useMutation({
    onSuccess: () => { toast.success("选项添加成功"); setNewName(""); refetch(); },
    onError: (e) => toast.error(`添加失败：${e.message}`),
  });
  const updateMutation = trpc.attributes.update.useMutation({
    onSuccess: () => { toast.success("选项更新成功"); setEditingId(null); refetch(); },
    onError: (e) => toast.error(`更新失败：${e.message}`),
  });
  const deleteMutation = trpc.attributes.delete.useMutation({
    onSuccess: () => { toast.success("选项删除成功"); refetch(); },
    onError: (e) => toast.error(`删除失败：${e.message}`),
  });

  const handleAdd = () => {
    if (!newName.trim()) return;
    createMutation.mutate({ name: newName.trim(), category, subcategory, fieldName });
  };

  return (
    <Card className={`border-l-4 ${color}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-primary/10`}>
            <Icon className={`h-5 w-5 text-primary`} />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 选项列表 */}
        <div className="flex flex-wrap gap-2 mb-4 min-h-[2rem]">
          {(!attrs || attrs.length === 0) ? (
            <p className="text-sm text-muted-foreground">暂无选项，请在下方添加</p>
          ) : (
            attrs.map((attr) => (
              <div key={attr.id} className="group relative">
                {editingId === attr.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7 w-32 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") updateMutation.mutate({ id: attr.id, name: editName.trim() });
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                    />
                    <Button size="icon" className="h-7 w-7" onClick={() => updateMutation.mutate({ id: attr.id, name: editName.trim() })}>✓</Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>✕</Button>
                  </div>
                ) : (
                  <Badge variant="outline" className="pr-16 py-1.5 text-sm">
                    {attr.name}
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => { setEditingId(attr.id); setEditName(attr.name); }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive"
                        onClick={() => {
                          if (window.confirm(`确定删除\"${attr.name}\"？`)) deleteMutation.mutate({ id: attr.id });                       }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </Badge>
                )}
              </div>
            ))
          )}
        </div>

        {/* 新增输入框 */}
        <div className="flex gap-2">
          <Input
            placeholder={`输入新${title}选项名称…`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            className="flex-1"
          />
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!newName.trim() || createMutation.isPending}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            添加
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AttributeManagement() {
  const [editingAttribute, setEditingAttribute] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");

  // 查询分组的属性
  const { data: groupedAttributes, refetch } = trpc.attributes.getGrouped.useQuery();

  // 更新属性
  const updateMutation = trpc.attributes.update.useMutation({
    onSuccess: () => {
      toast.success("属性更新成功");
      refetch();
      setEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`更新失败：${error.message}`);
    },
  });

  // 删除属性
  const deleteMutation = trpc.attributes.delete.useMutation({
    onSuccess: () => {
      toast.success("属性删除成功");
      refetch();
    },
    onError: (error) => {
      toast.error(`删除失败：${error.message}`);
    },
  });

  const handleEdit = (attribute: any) => {
    setEditingAttribute(attribute);
    setEditName(attribute.name);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingAttribute || !editName.trim()) return;

    updateMutation.mutate({
      id: editingAttribute.id,
      name: editName.trim(),
    });
  };

  const handleDelete = (id: number, name: string) => {
  if (window.confirm(`确定要删除属性\"${name}\"吗？`)) {
      deleteMutation.mutate({ id });
    }
  };

  if (!groupedAttributes) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  // 过滤掉跟进管理类别（由专属卡片管理）
  const categories = Object.keys(groupedAttributes).filter(
    (c) => !groupedAttributes[c].every((a) => a.subcategory === "跟进管理")
  );

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">属性管理</h1>
        <p className="text-muted-foreground mt-2">
          管理系统中所有可选属性，支持编辑和删除
        </p>
      </div>

      {/* 跟进管理专属卡片区 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ListOrdered className="h-5 w-5 text-primary" />
          跟进管理属性
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <FollowUpAttributeCard
            title="跟进阶段"
            description="客户跟进过程中的当前阶段选项，如：初步接触、意向确认、报价阶段等"
            icon={ListOrdered}
            category="客户管理"
            subcategory="跟进管理"
            fieldName="跟进阶段"
            color="border-primary"
          />
          <FollowUpAttributeCard
            title="工作计划"
            description="下一步工作计划的选项，如：发送样品、安排拜访、跟进报价等"
            icon={ClipboardList}
            category="客户管理"
            subcategory="跟进管理"
            fieldName="工作计划"
            color="border-purple-500"
          />
        </div>
      </div>

      {/* 其他属性分组 */}
      {categories.length === 0 && Object.keys(groupedAttributes).length > 0 && (
        <p className="text-sm text-muted-foreground mb-4">其他属性分组暂无数据</p>
      )}

      {categories.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">其他属性</h2>
          <div className="grid gap-6">
            {categories.map((category) => {
              const attrs = groupedAttributes[category].filter(
                (a) => a.subcategory !== "跟进管理"
              );
              if (attrs.length === 0) return null;

              // 按 fieldName 分组
              const fieldGroups: Record<string, typeof attrs> = {};
              attrs.forEach((attr) => {
                const key = `${attr.subcategory || ""} > ${attr.fieldName}`;
                if (!fieldGroups[key]) {
                  fieldGroups[key] = [];
                }
                fieldGroups[key].push(attr);
              });

              return (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="text-xl">{category}</CardTitle>
                    <CardDescription>
                      共 {attrs.length} 个属性
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {Object.entries(fieldGroups).map(([path, attributes]) => {
                        const firstAttr = attributes[0];
                        const fullPath = firstAttr.subcategory
                          ? `${category} > ${firstAttr.subcategory} > ${firstAttr.fieldName}`
                          : `${category} > ${firstAttr.fieldName}`;

                        return (
                          <div key={path} className="border-l-2 border-primary/20 pl-4">
                            <div className="mb-3">
                              <p className="text-sm font-medium text-muted-foreground">
                                {fullPath}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {attributes.map((attr) => (
                                <div
                                  key={attr.id}
                                  className="group relative"
                                >
                                  <Badge
                                    variant="outline"
                                    className="pr-16 py-1.5 text-sm"
                                  >
                                    {attr.name}
                                  </Badge>
                                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6"
                                      onClick={() => handleEdit(attr)}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 text-destructive"
                                      onClick={() => handleDelete(attr.id, attr.name)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑属性</DialogTitle>
            <DialogDescription>
              修改属性名称
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">属性名称</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="输入属性名称"
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
            <Button
              onClick={handleSaveEdit}
              disabled={!editName.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
