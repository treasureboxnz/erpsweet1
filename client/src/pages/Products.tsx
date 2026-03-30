import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { matchesPinyin } from "@/lib/pinyin";
import RabbitLoader from "@/components/RabbitLoader";
import { Plus, Search, Package, LayoutGrid, List, RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Products() {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [showBatchStatusDialog, setShowBatchStatusDialog] = useState(false);
  const [batchStatus, setBatchStatus] = useState<string>('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [showBatchSupplierDialog, setShowBatchSupplierDialog] = useState(false);
  const [batchSupplierId, setBatchSupplierId] = useState<string>('');
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');

  const { data: products, isLoading } = trpc.products.list.useQuery();
  const { data: allSuppliers } = trpc.suppliers.list.useQuery();
  const { data: deletedProducts, isLoading: isLoadingDeleted } = trpc.products.getDeleted.useQuery(undefined, {
    enabled: showDeleted,
  });
  const utils = trpc.useUtils();
  const batchDeleteMutation = trpc.products.batchDelete.useMutation();
  const batchUpdateStatusMutation = trpc.products.batchUpdateStatus.useMutation();
  const deleteMutation = trpc.products.delete.useMutation();
  const restoreMutation = trpc.products.restore.useMutation();
  const setPrimarySupplierMutation = trpc.products.setPrimarySupplier.useMutation();

  // 提取所有分类
  const categories = useMemo(() => products?.reduce((acc: { id: number; name: string }[], item) => {
    if (item.category && !acc.find(c => c.id === item.category!.id)) {
      acc.push(item.category);
    }
    return acc;
  }, []) || [], [products]);

  const handleSearch = () => setSearchQuery(searchInput);
  const handleReset = () => {
    setSearchInput('');
    setSearchQuery('');
    setCategoryFilter('');
    setStatusFilter('');
    setSupplierFilter('');
    utils.products.list.invalidate();
  };

  const currentProducts = showDeleted ? deletedProducts : products;

  // 供应商统计
  const suppliersWithCount = useMemo(() => {
    const map = new Map<string, { id: number; name: string; count: number }>();
    currentProducts?.forEach(item => {
      const ps = (item as any).primarySupplier;
      if (ps?.supplierId && ps?.supplierName) {
        const key = ps.supplierId.toString();
        if (map.has(key)) map.get(key)!.count++;
        else map.set(key, { id: ps.supplierId, name: ps.supplierName, count: 1 });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [currentProducts]);

  // 筛选
  const filteredProducts = useMemo(() => currentProducts?.filter(item => {
    if (searchQuery && !(item.product.name || '').toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.product.sku.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !matchesPinyin(item.product.name || '', searchQuery) &&
        !matchesPinyin(item.product.sku, searchQuery)) return false;
    if (categoryFilter && categoryFilter !== 'all' && item.product.categoryId?.toString() !== categoryFilter) return false;
    if (statusFilter && statusFilter !== 'all' && item.product.status !== statusFilter) return false;
    if (supplierFilter && supplierFilter !== 'all') {
      const ps = (item as any).primarySupplier;
      if (!ps || ps.supplierId?.toString() !== supplierFilter) return false;
    }
    return true;
  }) || [], [currentProducts, searchQuery, categoryFilter, statusFilter, supplierFilter]);

  // 批量操作
  const handleBatchSetSupplier = async () => {
    if (!batchSupplierId || selectedProducts.length === 0) return;
    try {
      await Promise.all(selectedProducts.map(productId =>
        setPrimarySupplierMutation.mutateAsync({ productId, supplierId: parseInt(batchSupplierId) })
      ));
      utils.products.list.invalidate();
      setShowBatchSupplierDialog(false);
      setBatchSupplierId('');
      setSelectedProducts([]);
    } catch (error) {
      console.error('Batch set supplier error:', error);
      toast.error('批量设置主供应商失败');
    }
  };

  const handleBatchRestore = async () => {
    if (selectedProducts.length === 0) return;
    if (!confirm(`确定要恢复选中的 ${selectedProducts.length} 个产品吗？`)) return;
    try {
      for (const productId of selectedProducts) await restoreMutation.mutateAsync({ id: productId });
      toast.success(`已成功恢复 ${selectedProducts.length} 个产品`);
      setSelectedProducts([]);
      utils.products.list.invalidate();
      utils.products.getDeleted.invalidate();
    } catch (error) {
      console.error('Batch restore error:', error);
      toast.error("恢复失败");
    }
  };

  const handleBatchDelete = async () => {
    if (selectedProducts.length === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedProducts.length} 个产品吗？`)) return;
    try {
      await batchDeleteMutation.mutateAsync({ productIds: selectedProducts });
      toast.success(`已将 ${selectedProducts.length} 个产品移入回收站`);
      setSelectedProducts([]);
      utils.products.list.invalidate();
      if (showDeleted) utils.products.getDeleted.invalidate();
    } catch (error) {
      console.error('Batch delete error:', error);
      toast.error("删除失败");
    }
  };

  const confirmBatchUpdateStatus = async () => {
    if (!batchStatus) { toast.error("请选择状态"); return; }
    try {
      await batchUpdateStatusMutation.mutateAsync({ productIds: selectedProducts, status: batchStatus });
      toast.success(`已成功修改 ${selectedProducts.length} 个产品的状态`);
      setSelectedProducts([]);
      setShowBatchStatusDialog(false);
      setBatchStatus('');
      utils.products.list.invalidate();
    } catch (error) {
      console.error('Batch update status error:', error);
      toast.error("修改失败");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string, className: string }> = {
      active: { label: "在售", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
      discontinued: { label: "停产", className: "bg-gray-100 text-gray-600 border border-gray-200" },
      developing: { label: "开发中", className: "bg-blue-50 text-blue-700 border border-blue-200" },
    };
    const config = variants[status] || variants.active;
    return <Badge variant="outline" className={`text-xs px-2 py-0.5 font-medium ${config.className}`}>{config.label}</Badge>;
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedProducts(checked ? filteredProducts.map(item => item.product.id) : []);
  };
  const handleSelectProduct = (productId: number, checked: boolean) => {
    setSelectedProducts(checked ? [...selectedProducts, productId] : selectedProducts.filter(id => id !== productId));
  };

  const isAllSelected = filteredProducts.length > 0 && selectedProducts.length === filteredProducts.length;
  const isSomeSelected = selectedProducts.length > 0 && selectedProducts.length < filteredProducts.length;

  // 去除HTML标签，只保留纯文本（块级标签之间加空格分隔）
  const stripHtml = (html: string | null | undefined): string => {
    if (!html) return '';
    return html
      .replace(/<\/(p|div|br|li|h[1-6])>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // 价格格式化 - 紧凑显示
  const fmtPrice = (val: string | number | null | undefined, prefix = '$') => {
    if (!val || val === '0' || val === '0.00') return <span className="text-gray-300">-</span>;
    return <span>{prefix}{Number(val).toFixed(2)}</span>;
  };

  // 亏损检测
  const isLoss = (fobVal: string | number | null | undefined, costUsd: string | number | null | undefined) => {
    if (!fobVal || !costUsd) return false;
    return Number(fobVal) < Number(costUsd) && Number(costUsd) > 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">产品管理</h1>
          <p className="text-gray-500 text-sm mt-0.5">管理您的产品信息和库存</p>
        </div>
        <Link href="/products/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            新增产品
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex gap-2 items-center mb-3">
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="搜索产品名称、SKU..."
                className="pl-8 h-8 text-sm"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button size="sm" onClick={handleSearch} className="h-8">搜索</Button>
            <Button variant="outline" size="sm" onClick={handleReset} className="h-8 gap-1">
              <RotateCcw className="h-3 w-3" />
              重置
            </Button>
          </div>

          <div className="flex gap-3 items-center flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">分类:</span>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-7 w-28 text-xs">
                  <SelectValue placeholder="全部分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分类</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">状态:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-7 w-24 text-xs">
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">在售</SelectItem>
                  <SelectItem value="developing">开发中</SelectItem>
                  <SelectItem value="discontinued">停产</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">供应商:</span>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="h-7 w-32 text-xs">
                  <SelectValue placeholder="全部供应商" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部供应商</SelectItem>
                  {suppliersWithCount.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.count})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5 ml-1">
              <Checkbox
                id="showDeleted"
                checked={showDeleted}
                onCheckedChange={(checked) => { setShowDeleted(!!checked); setSelectedProducts([]); }}
              />
              <label htmlFor="showDeleted" className="text-xs text-gray-500 cursor-pointer">回收站</label>
            </div>

            <div className="flex-1" />

            {selectedProducts.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">已选 {selectedProducts.length}</span>
                {!showDeleted ? (
                  <>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowBatchSupplierDialog(true)}>设置供应商</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowBatchStatusDialog(true)}>修改状态</Button>
                    <Button variant="destructive" size="sm" className="h-7 text-xs gap-1" onClick={handleBatchDelete}>
                      <Trash2 className="h-3 w-3" />删除
                    </Button>
                  </>
                ) : (
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={handleBatchRestore}>
                    <RotateCcw className="h-3 w-3" />恢复
                  </Button>
                )}
              </div>
            )}

            <div className="flex gap-0.5 border rounded">
              <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="h-7 px-2">
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="h-7 px-2">
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Display */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RabbitLoader size="lg" />
        </div>
      ) : filteredProducts.length > 0 ? (
        viewMode === 'grid' ? (
          /* Grid View - 保持原有卡片样式 */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((item) => (
              <Card key={item.product.id} className="hover:shadow-lg transition-shadow">
                <div className="p-0 relative">
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                      checked={selectedProducts.includes(item.product.id)}
                      onCheckedChange={(checked) => handleSelectProduct(item.product.id, checked as boolean)}
                    />
                  </div>
                  <div className="aspect-square bg-gray-100 rounded-t-lg flex items-center justify-center overflow-hidden">
                    {item.firstImage?.imageUrl ? (
                      <img src={item.firstImage.imageUrl} alt={item.product.name || item.product.sku} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <Package className="h-12 w-12 text-gray-300" />
                    )}
                  </div>
                </div>
                <CardContent className="p-3">
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="font-medium text-sm text-gray-900 line-clamp-1">{item.product.name || item.product.sku}</h3>
                      {getStatusBadge(item.product.status)}
                    </div>
                    <p className="text-xs text-gray-400">SKU: {item.product.sku}</p>
                    <div className="flex items-center justify-between pt-1.5 border-t">
                      <span className="text-sm font-semibold text-primary">${item.product.sellingPrice || '0.00'}</span>
                      <Link href={`/products/${item.product.id}/edit`}>
                        <Button variant="outline" size="sm" className="h-6 text-xs">编辑</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* List View - 紧凑表格，一屏显示所有关键信息 */
          <TooltipProvider>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-sm">
                        <TableHead className="w-8 px-2">
                          <Checkbox checked={isAllSelected || isSomeSelected} onCheckedChange={handleSelectAll} />
                        </TableHead>
                        <TableHead className="w-12 px-1">图片</TableHead>
                        <TableHead className="px-2 min-w-[80px]">SKU</TableHead>
                        <TableHead className="px-2 min-w-[100px]">名称</TableHead>
                        <TableHead className="px-2 min-w-[80px] max-w-[120px]">描述</TableHead>
                        <TableHead className="px-2 text-center w-14">CBM</TableHead>
                        <TableHead className="px-2 text-center w-16">包装</TableHead>
                        <TableHead className="px-2 text-center w-14">装柜量</TableHead>
                        <TableHead className="px-2 text-center w-12">MOQ</TableHead>
                        <TableHead className="px-2 text-right w-16">RMB售价</TableHead>
                        <TableHead className="px-2 text-right w-16">FOB 1</TableHead>
                        <TableHead className="px-2 text-right w-16">FOB 2</TableHead>
                        <TableHead className="px-2 text-right w-16">FOB 3</TableHead>
                        <TableHead className="px-2 text-center w-16">港口</TableHead>
                        <TableHead className="px-2 text-right w-14">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((item) => {
                        const p = item.product;
                        const dv = (item as any).defaultVariant;
                        const totalCbm = dv?.totalCbm ? Number(dv.totalCbm).toFixed(2) : null;
                        const costUsd = p.myCostUsd;

                        return (
                          <TableRow key={p.id} className="text-sm hover:bg-gray-50/50">
                            <TableCell className="px-2 py-2">
                              <Checkbox
                                checked={selectedProducts.includes(p.id)}
                                onCheckedChange={(checked) => handleSelectProduct(p.id, checked as boolean)}
                              />
                            </TableCell>
                            {/* 图片 */}
                            <TableCell className="px-1 py-2">
                              <Link href={`/products/${p.id}/edit`}>
                                <div className="w-10 h-10 bg-gray-50 rounded flex items-center justify-center overflow-hidden cursor-pointer">
                                  {item.firstImage?.imageUrl ? (
                                    <img src={item.firstImage.imageUrl} alt={p.name || p.sku} className="w-full h-full object-cover" loading="lazy" />
                                  ) : (
                                    <Package className="h-5 w-5 text-gray-300" />
                                  )}
                                </div>
                              </Link>
                            </TableCell>
                            {/* SKU */}
                            <TableCell className="px-2 py-2">
                              <Link href={`/products/${p.id}/edit`}>
                                <span className="text-blue-600 hover:underline cursor-pointer font-medium">{p.sku}</span>
                              </Link>
                              <div className="mt-0.5">{getStatusBadge(p.status)}</div>
                            </TableCell>
                            {/* 名称 */}
                            <TableCell className="px-2 py-2">
                              <span className="font-medium text-gray-800 line-clamp-2">{p.name || '-'}</span>
                            </TableCell>
                            {/* 描述 */}
                            <TableCell className="px-2 py-2 max-w-[200px]">
                              {p.description ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-gray-500 line-clamp-2 cursor-default">{stripHtml(p.description)}</span>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-sm">
                                    <p className="text-sm">{stripHtml(p.description)}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </TableCell>
                            {/* CBM */}
                            <TableCell className="px-2 py-2 text-center text-gray-600">
                              {totalCbm || <span className="text-gray-300">-</span>}
                            </TableCell>
                            {/* 包装方式 */}
                            <TableCell className="px-2 py-2 text-center text-gray-600">
                              {(item as any).packagingMethodName || <span className="text-gray-300">-</span>}
                            </TableCell>
                            {/* 装柜量 */}
                            <TableCell className="px-2 py-2 text-center text-gray-600">
                              {p.containerLoad || <span className="text-gray-300">-</span>}
                            </TableCell>
                            {/* MOQ */}
                            <TableCell className="px-2 py-2 text-center text-gray-600">
                              {p.moq || <span className="text-gray-300">-</span>}
                            </TableCell>
                            {/* RMB含税售价 */}
                            <TableCell className="px-2 py-2 text-right font-medium">
                              {fmtPrice(p.sellingPriceRmbIncludingTax, '¥')}
                            </TableCell>
                            {/* FOB 1 */}
                            <TableCell className="px-2 py-2 text-right font-medium">
                              <span className={isLoss(p.fobLevel1, costUsd) ? 'text-red-500' : ''}>
                                {isLoss(p.fobLevel1, costUsd) && <AlertTriangle className="h-3 w-3 inline mr-0.5" />}
                                {fmtPrice(p.fobLevel1)}
                              </span>
                            </TableCell>
                            {/* FOB 2 */}
                            <TableCell className="px-2 py-2 text-right font-medium">
                              <span className={isLoss(p.fobLevel2, costUsd) ? 'text-red-500' : ''}>
                                {isLoss(p.fobLevel2, costUsd) && <AlertTriangle className="h-3 w-3 inline mr-0.5" />}
                                {fmtPrice(p.fobLevel2)}
                              </span>
                            </TableCell>
                            {/* FOB 3 */}
                            <TableCell className="px-2 py-2 text-right font-medium">
                              <span className={isLoss(p.fobLevel3, costUsd) ? 'text-red-500' : ''}>
                                {isLoss(p.fobLevel3, costUsd) && <AlertTriangle className="h-3 w-3 inline mr-0.5" />}
                                {fmtPrice(p.fobLevel3)}
                              </span>
                            </TableCell>
                            {/* 出货港口 */}
                            <TableCell className="px-2 py-2 text-center text-gray-600">
                              {(item as any).shippingPortName || <span className="text-gray-300">-</span>}
                            </TableCell>
                            {/* 操作 */}
                            <TableCell className="px-2 py-2 text-right">
                              {!showDeleted ? (
                                <div className="flex gap-1 justify-end">
                                  <Link href={`/products/${p.id}/edit`}>
                                    <Button variant="outline" size="sm" className="h-6 text-xs px-2">编辑</Button>
                                  </Link>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-1.5 text-gray-400 hover:text-red-500"
                                    onClick={async () => {
                                      if (confirm('确定要删除这个产品吗？')) {
                                        try {
                                          await deleteMutation.mutateAsync({ id: p.id });
                                          utils.products.list.invalidate();
                                        } catch (error) {
                                          console.error('Delete error:', error);
                                          toast.error('删除失败');
                                        }
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  className="h-6 text-xs px-2"
                                  onClick={async () => {
                                    if (confirm('确定要恢复这个产品吗？')) {
                                      try {
                                        await restoreMutation.mutateAsync({ id: p.id });
                                        utils.products.list.invalidate();
                                        utils.products.getDeleted.invalidate();
                                      } catch (error) {
                                        console.error('Restore error:', error);
                                        toast.error('恢复失败');
                                      }
                                    }
                                  }}
                                >
                                  恢复
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TooltipProvider>
        )
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">暂无产品数据</p>
            <Link href="/products/new">
              <Button className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                添加第一个产品
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* 统计信息 */}
      {filteredProducts.length > 0 && (
        <div className="text-xs text-gray-400 text-right">
          共 {filteredProducts.length} 个产品
          {searchQuery || categoryFilter || statusFilter || supplierFilter ? ` (筛选自 ${currentProducts?.length || 0} 个)` : ''}
        </div>
      )}

      {/* 批量设置默认供应商对话框 */}
      <Dialog open={showBatchSupplierDialog} onOpenChange={(open) => { setShowBatchSupplierDialog(open); if (!open) { setBatchSupplierId(''); setSupplierSearchQuery(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量设置默认供应商</DialogTitle>
            <DialogDescription>将选中的 {selectedProducts.length} 个产品的默认供应商设置为：</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="搜索供应商..." value={supplierSearchQuery} onChange={e => setSupplierSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <div className="border rounded-md max-h-60 overflow-y-auto">
              {(allSuppliers || []).filter(s => !supplierSearchQuery || matchesPinyin(s.supplierName, supplierSearchQuery)).length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">未找到匹配的供应商</div>
              ) : (
                (allSuppliers || []).filter(s => !supplierSearchQuery || matchesPinyin(s.supplierName, supplierSearchQuery)).map(s => (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${batchSupplierId === s.id.toString() ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
                    onClick={() => setBatchSupplierId(s.id.toString())}
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600 flex-shrink-0">
                      {s.supplierName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.supplierName}</p>
                    </div>
                    {batchSupplierId === s.id.toString() && (
                      <svg className="h-4 w-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowBatchSupplierDialog(false); setBatchSupplierId(''); setSupplierSearchQuery(''); }}>取消</Button>
            <Button onClick={handleBatchSetSupplier} disabled={!batchSupplierId || setPrimarySupplierMutation.isPending}>
              {setPrimarySupplierMutation.isPending ? '设置中...' : '确认设置'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量修改状态对话框 */}
      <Dialog open={showBatchStatusDialog} onOpenChange={setShowBatchStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量修改产品状态</DialogTitle>
            <DialogDescription>将选中的 {selectedProducts.length} 个产品的状态修改为：</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={batchStatus} onValueChange={setBatchStatus}>
              <SelectTrigger><SelectValue placeholder="请选择状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">在售</SelectItem>
                <SelectItem value="discontinued">停产</SelectItem>
                <SelectItem value="developing">开发中</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchStatusDialog(false)}>取消</Button>
            <Button onClick={confirmBatchUpdateStatus}>确认修改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
