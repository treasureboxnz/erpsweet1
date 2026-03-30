import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { matchesPinyin } from "@/lib/pinyin";
import RabbitLoader from "@/components/RabbitLoader";
import { Plus, Search, RotateCcw, Edit, Trash2, Star, Truck, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

// 二级导航配置
const subTabs = [
  { id: "list", label: "供应商列表", href: "/suppliers" },
  { id: "categories", label: "供应商分类", href: "/suppliers/categories" },
  { id: "ratings", label: "供应商评级", href: "/suppliers/ratings" },
  { id: "purchase-history", label: "采购记录", href: "/suppliers/purchase-history" },
];

export default function Suppliers() {
  const [activeSubTab, setActiveSubTab] = useState("list");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { data: suppliers, isLoading } = trpc.suppliers.list.useQuery();
  const { data: stats } = trpc.suppliers.stats.useQuery();
  const utils = trpc.useUtils();

  const deleteMutation = trpc.suppliers.delete.useMutation({
    onSuccess: () => {
      toast.success("供应商删除成功");
      utils.suppliers.list.invalidate();
      utils.suppliers.stats.invalidate();
      setDeleteConfirmId(null);
    },
    onError: (error) => {
      toast.error(`删除失败：${error.message}`);
    },
  });

  const handleSearch = () => {
    setSearchQuery(searchInput);
  };

  const handleReset = () => {
    setSearchInput("");
    setSearchQuery("");
    setStatusFilter("");
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteMutation.mutate({ id: deleteConfirmId });
    }
  };

  // 筛选供应商
  const filteredSuppliers = suppliers?.filter((supplier) => {
    // 搜索筛选
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = matchesPinyin(supplier.supplierName, query);
      const matchesCode = supplier.supplierCode ? matchesPinyin(supplier.supplierCode, query) : false;
      const matchesContact = supplier.contactPerson ? matchesPinyin(supplier.contactPerson, query) : false;
      if (!matchesName && !matchesCode && !matchesContact) {
        return false;
      }
    }
    // 状态筛选
    if (statusFilter && supplier.status !== statusFilter) {
      return false;
    }
    return true;
  }) || [];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive", label: string }> = {
      active: { variant: "default", label: "活跃" },
      inactive: { variant: "secondary", label: "停用" },
      suspended: { variant: "destructive", label: "暂停" },
    };
    const config = variants[status] || variants.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const renderRating = (rating: number | null) => {
    if (!rating) return <span className="text-gray-400">未评级</span>;
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">供应商管理</h1>
          <p className="text-gray-500 text-sm mt-1">管理您的供应商信息和关系</p>
        </div>
        <Link href="/suppliers/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            新增供应商
          </Button>
        </Link>
      </div>

      {/* 双层导航 */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
          <div className="flex gap-2">
            {subTabs.map((subTab) => (
              <button
                key={subTab.id}
                onClick={() => setActiveSubTab(subTab.id)}
                className={`
                  px-4 py-1.5 rounded-full text-sm font-medium transition-all
                  ${
                    activeSubTab === subTab.id
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }
                `}
              >
                {subTab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">总供应商数</p>
                  <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">活跃供应商</p>
                  <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100">
                  <XCircle className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">停用供应商</p>
                  <div className="text-2xl font-bold text-gray-400">{stats.inactive}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3 items-center mb-4">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索供应商名称、编号、联系人..."
                className="pl-10"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch}>搜索</Button>
            <Button variant="outline" onClick={handleReset} className="gap-1">
              <RotateCcw className="h-4 w-4" />
              重置
            </Button>
          </div>

          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 whitespace-nowrap">供应商状态:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">活跃</SelectItem>
                  <SelectItem value="inactive">停用</SelectItem>
                  <SelectItem value="suspended">暂停</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1" />
            <Button variant="outline">导出</Button>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RabbitLoader size="lg" />
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>供应商名称</TableHead>
                <TableHead>供应商编号</TableHead>
                <TableHead>联系人</TableHead>
                <TableHead>联系方式</TableHead>
                <TableHead>地区</TableHead>
                <TableHead>评级</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                    暂无供应商数据
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">
                      <Link href={`/suppliers/${supplier.id}`} className="hover:text-primary">{supplier.supplierName}</Link>
                    </TableCell>
                    <TableCell>{supplier.supplierCode || "暂无"}</TableCell>
                    <TableCell>{supplier.contactPerson || "暂无"}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {supplier.email && <div>{supplier.email}</div>}
                        {supplier.phone && <div className="text-gray-500">{supplier.phone}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {supplier.city && supplier.country
                        ? `${supplier.city}, ${supplier.country}`
                        : supplier.country || "暂无"}
                    </TableCell>
                    <TableCell>{renderRating(supplier.rating)}</TableCell>
                    <TableCell>{getStatusBadge(supplier.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/suppliers/${supplier.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(supplier.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除这个供应商吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
