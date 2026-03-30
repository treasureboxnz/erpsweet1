import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Star, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

interface SupplierVersionsProps {
  variantId: number;
}

type SortField = "factoryQuote" | "moq" | "leadTimeDays";
type SortOrder = "asc" | "desc";

export function SupplierVersions({ variantId }: SupplierVersionsProps) {
  const [activeTab, setActiveTab] = useState("list");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [formData, setFormData] = useState({
    supplierId: "",
    factoryItemCode: "",
    factoryQuote: "",
    moq: "",
    leadTimeDays: "",
    isDefault: false,
  });

  const utils = trpc.useUtils();
  const { data: supplierVersions = [], isLoading } = trpc.variantSuppliers.list.useQuery({ variantId });
  const { data: suppliers = [] } = trpc.suppliers.list.useQuery();

  const createMutation = trpc.variantSuppliers.create.useMutation({
    onSuccess: () => {
      toast.success("供应商版本创建成功");
      utils.variantSuppliers.list.invalidate({ variantId });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const updateMutation = trpc.variantSuppliers.update.useMutation({
    onSuccess: () => {
      toast.success("供应商版本更新成功");
      utils.variantSuppliers.list.invalidate({ variantId });
      setEditingId(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const deleteMutation = trpc.variantSuppliers.delete.useMutation({
    onSuccess: () => {
      toast.success("供应商版本删除成功");
      utils.variantSuppliers.list.invalidate({ variantId });
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  const setDefaultMutation = trpc.variantSuppliers.setDefault.useMutation({
    onSuccess: () => {
      toast.success("默认供应商设置成功");
      utils.variantSuppliers.list.invalidate({ variantId });
    },
    onError: (error) => {
      toast.error(`设置失败: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      supplierId: "",
      factoryItemCode: "",
      factoryQuote: "",
      moq: "",
      leadTimeDays: "",
      isDefault: false,
    });
  };

  const handleSubmit = () => {
    if (!formData.supplierId) {
      toast.error("请选择供应商");
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        factoryItemCode: formData.factoryItemCode || undefined,
        factoryQuote: formData.factoryQuote ? parseFloat(formData.factoryQuote) : undefined,
        moq: formData.moq ? parseInt(formData.moq) : undefined,
        leadTimeDays: formData.leadTimeDays ? parseInt(formData.leadTimeDays) : undefined,
      });
    } else {
      createMutation.mutate({
        variantId,
        supplierId: parseInt(formData.supplierId),
        factoryItemCode: formData.factoryItemCode || undefined,
        factoryQuote: formData.factoryQuote ? parseFloat(formData.factoryQuote) : undefined,
        moq: formData.moq ? parseInt(formData.moq) : undefined,
        leadTimeDays: formData.leadTimeDays ? parseInt(formData.leadTimeDays) : undefined,
        isDefault: formData.isDefault,
      });
    }
  };

  const handleEdit = (version: any) => {
    setEditingId(version.id);
    setFormData({
      supplierId: version.supplierId.toString(),
      factoryItemCode: version.factoryItemCode || "",
      factoryQuote: version.factoryQuote || "",
      moq: version.moq?.toString() || "",
      leadTimeDays: version.leadTimeDays?.toString() || "",
      isDefault: version.isDefault,
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id });
  };

  const handleSetDefault = (id: number) => {
    setDefaultMutation.mutate({ id, variantId });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle sort order
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      // New field, default to descending
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const sortedVersions = useMemo(() => {
    if (!sortField) return supplierVersions;

    return [...supplierVersions].sort((a: any, b: any) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Convert to numbers for comparison
      const aNum = sortField === "factoryQuote" ? parseFloat(aValue) : parseInt(aValue);
      const bNum = sortField === "factoryQuote" ? parseFloat(bValue) : parseInt(bValue);

      if (sortOrder === "desc") {
        return bNum - aNum;
      } else {
        return aNum - bNum;
      }
    });
  }, [supplierVersions, sortField, sortOrder]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 inline text-gray-400" />;
    }
    return sortOrder === "desc" ? (
      <ArrowDown className="w-4 h-4 ml-1 inline text-blue-500" />
    ) : (
      <ArrowUp className="w-4 h-4 ml-1 inline text-blue-500" />
    );
  };

  const getBestValue = (field: SortField) => {
    const validVersions = supplierVersions.filter((v: any) => v[field] != null);
    if (validVersions.length === 0) return null;

    if (field === "factoryQuote") {
      // Lowest price is best
      return Math.min(...validVersions.map((v: any) => parseFloat(v[field])));
    } else if (field === "moq") {
      // Lowest MOQ is best
      return Math.min(...validVersions.map((v: any) => parseInt(v[field])));
    } else if (field === "leadTimeDays") {
      // Shortest lead time is best
      return Math.min(...validVersions.map((v: any) => parseInt(v[field])));
    }
    return null;
  };

  const isBestValue = (value: any, field: SortField) => {
    if (value == null) return false;
    const bestValue = getBestValue(field);
    if (bestValue == null) return false;

    if (field === "factoryQuote") {
      return parseFloat(value) === bestValue;
    } else {
      return parseInt(value) === bestValue;
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">加载中...</div>;
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="list">Supplier List</TabsTrigger>
        <TabsTrigger value="comparison">Quotes Comparison</TabsTrigger>
      </TabsList>

      {/* Supplier List Tab */}
      <TabsContent value="list" className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Supplier List</h3>
            <p className="text-sm text-muted-foreground">Manage suppliers for this product</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingId(null); }}>
                <Plus className="w-4 h-4 mr-2" />
                添加供应商版本
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingId ? "编辑供应商版本" : "添加供应商版本"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>供应商 *</Label>
                  <Select
                    value={formData.supplierId}
                    onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
                    disabled={!!editingId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择供应商" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier: any) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.supplierName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>工厂货号</Label>
                  <Input
                    value={formData.factoryItemCode}
                    onChange={(e) => setFormData({ ...formData, factoryItemCode: e.target.value })}
                    placeholder="输入工厂货号"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>工厂报价 (RMB)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.factoryQuote}
                      onChange={(e) => setFormData({ ...formData, factoryQuote: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>最小起订量 (MOQ)</Label>
                    <Input
                      type="number"
                      value={formData.moq}
                      onChange={(e) => setFormData({ ...formData, moq: e.target.value })}
                      placeholder="100"
                    />
                  </div>
                </div>

                <div>
                  <Label>交货期 (天)</Label>
                  <Input
                    type="number"
                    value={formData.leadTimeDays}
                    onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })}
                    placeholder="30"
                  />
                </div>

                {!editingId && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="isDefault" className="cursor-pointer">
                      设为默认供应商
                    </Label>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleSubmit}>
                    {editingId ? "更新" : "创建"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {supplierVersions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            <p>暂无供应商版本</p>
            <p className="text-sm mt-2">点击上方按钮添加第一个供应商版本</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>供应商名称</TableHead>
                <TableHead>工厂货号</TableHead>
                <TableHead>工厂报价</TableHead>
                <TableHead>MOQ</TableHead>
                <TableHead>交货期</TableHead>
                <TableHead>默认</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplierVersions.map((version: any) => (
                <TableRow key={version.id}>
                  <TableCell className="font-medium">{version.supplierName}</TableCell>
                  <TableCell>{version.factoryItemCode || "暂无"}</TableCell>
                  <TableCell>
                    {version.factoryQuote ? `￥${parseFloat(version.factoryQuote).toLocaleString()}` : "-"}
                  </TableCell>
                  <TableCell>{version.moq ? version.moq.toLocaleString() : "-"}</TableCell>
                  <TableCell>{version.leadTimeDays ? `${version.leadTimeDays}天` : "-"}</TableCell>
                  <TableCell>
                    {version.isDefault ? (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(version.id)}
                      >
                        <Star className="w-4 h-4 text-gray-400" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(version)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(version.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TabsContent>

      {/* Quotes Comparison Tab */}
      <TabsContent value="comparison" className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Quotes Comparison</h3>
          <p className="text-sm text-muted-foreground">Compare quotes from different suppliers</p>
        </div>

        {supplierVersions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            <p>暂无供应商版本可供比较</p>
            <p className="text-sm mt-2">请先在 Supplier List 中添加供应商版本</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>供应商名称</TableHead>
                  <TableHead>工厂货号</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("factoryQuote")}
                  >
                    工厂报价 {getSortIcon("factoryQuote")}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("moq")}
                  >
                    MOQ {getSortIcon("moq")}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("leadTimeDays")}
                  >
                    交货期 {getSortIcon("leadTimeDays")}
                  </TableHead>
                  <TableHead>默认</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedVersions.map((version: any) => (
                  <TableRow key={version.id}>
                    <TableCell className="font-medium">{version.supplierName}</TableCell>
                    <TableCell>{version.factoryItemCode || "暂无"}</TableCell>
                    <TableCell className={isBestValue(version.factoryQuote, "factoryQuote") ? "bg-green-50 font-semibold text-green-700" : ""}>
                      {version.factoryQuote ? `￥${parseFloat(version.factoryQuote).toLocaleString()}` : "-"}
                    </TableCell>
                    <TableCell className={isBestValue(version.moq, "moq") ? "bg-green-50 font-semibold text-green-700" : ""}>
                      {version.moq ? version.moq.toLocaleString() : "-"}
                    </TableCell>
                    <TableCell className={isBestValue(version.leadTimeDays, "leadTimeDays") ? "bg-green-50 font-semibold text-green-700" : ""}>
                      {version.leadTimeDays ? `${version.leadTimeDays}天` : "-"}
                    </TableCell>
                    <TableCell>
                      {version.isDefault && (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {supplierVersions.length > 0 && (
          <div className="text-sm text-muted-foreground mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="font-medium text-blue-900 mb-2">💡 提示：</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>点击表头可按该列排序（价格、MOQ、交货期）</li>
              <li>绿色高亮显示最优值（最低价格、最低MOQ、最短交货期）</li>
              <li>星标表示默认供应商</li>
            </ul>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
