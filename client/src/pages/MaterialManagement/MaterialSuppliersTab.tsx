import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, ExternalLink, Lock } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import AttributeSelector from "@/components/AttributeSelector";

interface SupplierFormData {
  name: string;
  code: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  notes: string;
  materialTypeName: string[];
}

export function MaterialSuppliersTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [materialTypeFilter, setMaterialTypeFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>({
    name: "",
    code: "",
    contactPerson: "",
    contactPhone: "",
    contactEmail: "",
    address: "",
    notes: "",
    materialTypeName: [],
  });

  const utils = trpc.useUtils();
  
  // Query suppliers
  const { data: suppliers, isLoading } = trpc.materials.suppliers.list.useQuery({
    search: searchTerm || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    materialTypeName: materialTypeFilter === "all" ? undefined : materialTypeFilter,
  });

  // Query material types from attribute management (real data source)
  const { data: materialTypeAttrs } = trpc.attributes.getAll.useQuery({
    category: "材料管理",
    subcategory: "材料供应商",
    fieldName: "材料类型",
  });

  // Create supplier mutation
  const createSupplier = trpc.materials.suppliers.create.useMutation({
    onSuccess: () => {
      toast.success("供应商创建成功");
      setIsCreateDialogOpen(false);
      resetForm();
      utils.materials.suppliers.list.invalidate();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  // Update supplier mutation
  const updateSupplier = trpc.materials.suppliers.update.useMutation({
    onSuccess: () => {
      toast.success("供应商更新成功");
      setIsEditDialogOpen(false);
      setEditingSupplierId(null);
      resetForm();
      utils.materials.suppliers.list.invalidate();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  // Delete supplier mutation
  const deleteSupplier = trpc.materials.suppliers.delete.useMutation({
    onSuccess: () => {
      toast.success("供应商删除成功");
      utils.materials.suppliers.list.invalidate();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      contactPerson: "",
      contactPhone: "",
      contactEmail: "",
      address: "",
      notes: "",
      materialTypeName: [],
    });
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error("请输入供应商名称");
      return;
    }
    // Remove empty email to avoid validation error
    const dataToSubmit = {
      ...formData,
      contactEmail: formData.contactEmail.trim() || undefined,
      materialTypeName: formData.materialTypeName[0] || undefined,
    };
    createSupplier.mutate(dataToSubmit);
  };

  const handleEdit = (supplier: any) => {
    setEditingSupplierId(supplier.id);
    setFormData({
      name: supplier.name || "",
      code: supplier.code || "",
      contactPerson: supplier.contactPerson || "",
      contactPhone: supplier.contactPhone || "",
      contactEmail: supplier.contactEmail || "",
      address: supplier.address || "",
      notes: supplier.notes || "",
      materialTypeName: supplier.materialTypeName ? [supplier.materialTypeName] : [],
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingSupplierId) return;
    if (!formData.name.trim()) {
      toast.error("请输入供应商名称");
      return;
    }
    // Remove empty email to avoid validation error
    const dataToSubmit = {
      ...formData,
      contactEmail: formData.contactEmail.trim() || undefined,
      materialTypeName: formData.materialTypeName[0] || undefined,
    };
    updateSupplier.mutate({ id: editingSupplierId, ...dataToSubmit });
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`确定要删除供应商"${name}"吗？`)) {
      deleteSupplier.mutate({ id });
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Create */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索供应商名称或编号..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Select value={materialTypeFilter} onValueChange={setMaterialTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="材料类型筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              {materialTypeAttrs?.map((attr) => (
                <SelectItem key={attr.id} value={attr.name}>
                  {attr.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="状态筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="active">仅启用</SelectItem>
              <SelectItem value="inactive">仅停用</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新建供应商
        </Button>
      </div>

      {/* Suppliers Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>供应商名称</TableHead>
              <TableHead>供应商编号</TableHead>
              <TableHead>材料类型</TableHead>
              <TableHead>联系人</TableHead>
              <TableHead>联系电话</TableHead>
              <TableHead>联系邮箱</TableHead>
              <TableHead>地址</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  加载中...
                </TableCell>
              </TableRow>
            ) : !suppliers?.length ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  暂无供应商数据
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier: any) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">
                    <Link href={`/materials/suppliers/${supplier.id}`} className="flex items-center gap-2 text-primary hover:underline">
                        {supplier.name}
                        <ExternalLink className="h-3 w-3" />
                    </Link>
                  </TableCell>
                  <TableCell>{supplier.code || "-"}</TableCell>
                  <TableCell>
                    {supplier.materialTypeName ? (
                      <span>{supplier.materialTypeName}</span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{supplier.contactPerson || "-"}</TableCell>
                  <TableCell>{supplier.contactPhone || "-"}</TableCell>
                  <TableCell>{supplier.contactEmail || "-"}</TableCell>
                  <TableCell>{supplier.address || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={supplier.status === "active" ? "default" : "secondary"}>
                      {supplier.status === "active" ? "启用" : "停用"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(supplier)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {supplier.isLocked ? (
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-gray-400" />
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled
                            title="系统默认材料，不可删除"
                          >
                            <Trash2 className="h-4 w-4 text-gray-300" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(supplier.id, supplier.name)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新建供应商</DialogTitle>
            <DialogDescription>
              添加新的材料供应商信息
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">供应商名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：顺德家具厂"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">供应商编号</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="例如：SUP-001"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="materialType">材料类型</Label>
              <AttributeSelector
                category="材料管理"
                subcategory="材料供应商"
                fieldName="材料类型"
                value={formData.materialTypeName}
                onChange={(value) => setFormData({ ...formData, materialTypeName: value })}
                multiple={false}
                placeholder="选择或创建材料类型"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">联系人</Label>
                <Input
                  id="contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="联系人姓名"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">联系电话</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="联系电话"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">联系邮箱</Label>
              <Input
                id="contactEmail"
                type="text"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">地址</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="供应商地址"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">备注</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="其他备注信息"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false);
              resetForm();
            }}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={createSupplier.isPending}>
              {createSupplier.isPending ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑供应商</DialogTitle>
            <DialogDescription>
              修改供应商信息
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">供应商名称 *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：顺德家具厂"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-code">供应商编号</Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="例如：SUP-001"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-materialType">材料类型</Label>
              <AttributeSelector
                category="材料管理"
                subcategory="材料供应商"
                fieldName="材料类型"
                value={formData.materialTypeName}
                onChange={(value) => setFormData({ ...formData, materialTypeName: value })}
                multiple={false}
                placeholder="选择或创建材料类型"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-contactPerson">联系人</Label>
                <Input
                  id="edit-contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="联系人姓名"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contactPhone">联系电话</Label>
                <Input
                  id="edit-contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="联系电话"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contactEmail">联系邮箱</Label>
              <Input
                id="edit-contactEmail"
                type="text"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">地址</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="供应商地址"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">备注</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="其他备注信息"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              setEditingSupplierId(null);
              resetForm();
            }}>
              取消
            </Button>
            <Button onClick={handleUpdate} disabled={updateSupplier.isPending}>
              {updateSupplier.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
