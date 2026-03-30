import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { matchesPinyin } from "@/lib/pinyin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Plus, Trash2, Star, Search } from "lucide-react";
import { toast } from "sonner";

interface ProductSuppliersProps {
  productId: number;
}

export default function ProductSuppliers({ productId }: ProductSuppliersProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [isPrimary, setIsPrimary] = useState(false);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');

  const utils = trpc.useUtils();

  // 获取产品的供应商列表
  const { data: productSuppliers = [], isLoading } = trpc.products.getSuppliers.useQuery({
    productId,
  });

  // 获取所有供应商
  const { data: allSuppliers = [] } = trpc.suppliers.list.useQuery();

  // 添加供应商关联
  const addSupplierMutation = trpc.products.addSupplier.useMutation({
    onSuccess: () => {
      utils.products.getSuppliers.invalidate({ productId });
      setIsAddDialogOpen(false);
      setSelectedSupplierId(null);
      setIsPrimary(false);
      setSupplierSearchQuery('');
      toast.success("供应商添加成功");
    },
    onError: (error) => {
      toast.error(`添加失败：${error.message}`);
    },
  });

  // 移除供应商关联
  const removeSupplierMutation = trpc.products.removeSupplier.useMutation({
    onSuccess: () => {
      utils.products.getSuppliers.invalidate({ productId });
      toast.success("供应商移除成功");
    },
    onError: (error) => {
      toast.error(`移除失败：${error.message}`);
    },
  });

  // 设置主供应商
  const setPrimaryMutation = trpc.products.setPrimarySupplier.useMutation({
    onSuccess: () => {
      utils.products.getSuppliers.invalidate({ productId });
      toast.success("主供应商设置成功");
    },
    onError: (error) => {
      toast.error(`设置失败：${error.message}`);
    },
  });

  const handleAddSupplier = () => {
    if (!selectedSupplierId) {
      toast.error("请选择供应商");
      return;
    }

    addSupplierMutation.mutate({
      productId,
      supplierId: selectedSupplierId,
      isPrimary,
    });
  };

  const handleRemoveSupplier = (id: number) => {
    if (confirm("确定要移除此供应商吗？")) {
      removeSupplierMutation.mutate({ id });
    }
  };

  const handleSetPrimary = (supplierId: number) => {
    setPrimaryMutation.mutate({ productId, supplierId });
  };

  // 过滤掉已添加的供应商
  const availableSuppliers = allSuppliers.filter(
    (supplier) => !productSuppliers.some((ps) => ps.supplierId === supplier.id)
  );

  // 搜索过滤
  const filteredAvailableSuppliers = availableSuppliers.filter(s =>
    !supplierSearchQuery || matchesPinyin(s.supplierName, supplierSearchQuery)
  );

  if (isLoading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>供应商列表</CardTitle>
              <CardDescription>管理此产品的供应商</CardDescription>
            </div>
            <Button onClick={() => { setIsAddDialogOpen(true); setSupplierSearchQuery(''); setSelectedSupplierId(null); }}>
              <Plus className="mr-2 h-4 w-4" />
              添加供应商
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {productSuppliers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              暂无供应商，点击"添加供应商"按钮添加
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>供应商名称</TableHead>
                  <TableHead>联系人</TableHead>
                  <TableHead>电话</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productSuppliers.map((ps) => (
                  <TableRow key={ps.id}>
                    <TableCell className="font-medium">{ps.supplierName}</TableCell>
                    <TableCell>{ps.contactPerson || "暂无"}</TableCell>
                    <TableCell>{ps.phone || "暂无"}</TableCell>
                    <TableCell>{ps.email || "暂无"}</TableCell>
                    <TableCell>
                      {ps.isPrimary ? (
                        <Badge className="bg-yellow-500 hover:bg-yellow-600">
                          <Star className="mr-1 h-3 w-3" />
                          主供应商
                        </Badge>
                      ) : (
                        <Badge variant="outline">备选供应商</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!ps.isPrimary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetPrimary(ps.supplierId!)}
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSupplier(ps.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 添加供应商Dialog - Shopify风格可搜索 */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) { setSelectedSupplierId(null); setSupplierSearchQuery(''); setIsPrimary(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加供应商</DialogTitle>
            <DialogDescription>为此产品添加供应商关联</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-2 block">选择供应商</label>
              {/* Shopify风格可搜索供应商列表 */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="搜索供应商名称..."
                    value={supplierSearchQuery}
                    onChange={e => setSupplierSearchQuery(e.target.value)}
                    className="pl-9"
                    autoFocus
                  />
                </div>
                <div className="border rounded-md max-h-56 overflow-y-auto">
                  {filteredAvailableSuppliers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      {availableSuppliers.length === 0 ? "所有供应商已添加" : "未找到匹配的供应商"}
                    </div>
                  ) : (
                    filteredAvailableSuppliers.map(supplier => (
                      <div
                        key={supplier.id}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 transition-colors ${
                          selectedSupplierId === supplier.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                        }`}
                        onClick={() => setSelectedSupplierId(supplier.id)}
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600 flex-shrink-0">
                          {supplier.supplierName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{supplier.supplierName}</p>
                          {supplier.supplierCode && (
                            <p className="text-xs text-gray-500 truncate">{supplier.supplierCode}</p>
                          )}
                        </div>
                        {selectedSupplierId === supplier.id && (
                          <svg className="h-4 w-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    ))
                  )}
                </div>
                {selectedSupplierId && (
                  <p className="text-sm text-primary">
                    已选择：{allSuppliers.find(s => s.id === selectedSupplierId)?.supplierName}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPrimary"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="isPrimary" className="text-sm font-medium">
                设为主供应商
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddSupplier} disabled={addSupplierMutation.isPending || !selectedSupplierId}>
              {addSupplierMutation.isPending ? "添加中..." : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
