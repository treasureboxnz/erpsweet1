import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Package,
  Clock,
  CheckCircle2,
  DollarSign,
  Trash2,
  RotateCcw,
  Archive,
} from "lucide-react";
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
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

const secondaryNavItems = [
  { id: "all", label: "所有订单", status: "" },
  { id: "pending", label: "待处理", status: "pending" },
  { id: "processing", label: "进行中", status: "processing" },
  { id: "completed", label: "已完成", status: "delivered" },
  { id: "archived", label: "已删除订单", status: "", adminOnly: true },
  { id: "statistics", label: "订单统计", status: "stats" },
];

const statusConfig = {
  pending: { label: "待确认", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "已确认", color: "bg-blue-100 text-blue-800" },
  processing: { label: "生产中", color: "bg-purple-100 text-purple-800" },
  shipped: { label: "已发货", color: "bg-indigo-100 text-indigo-800" },
  delivered: { label: "已完成", color: "bg-green-100 text-green-800" },
  cancelled: { label: "已取消", color: "bg-red-100 text-red-800" },
};

const paymentStatusConfig = {
  unpaid: { label: "未付款", color: "bg-red-100 text-red-800" },
  partial: { label: "部分付款", color: "bg-yellow-100 text-yellow-800" },
  paid: { label: "已付款", color: "bg-green-100 text-green-800" },
  refunded: { label: "已退款", color: "bg-gray-100 text-gray-800" },
};

export default function Orders() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // Fetch orders
  const { data: ordersData, isLoading, refetch } = trpc.orders.list.useQuery({
    page,
    pageSize: 20,
    status: (statusFilter === "all" || activeTab === "archived") ? undefined : statusFilter,
    paymentStatus: paymentStatusFilter === "all" ? undefined : paymentStatusFilter,
    searchTerm: searchTerm || undefined,
    showDeleted: activeTab === "archived",
  });
  
  // Delete mutation
  const deleteMutation = trpc.orders.delete.useMutation({
    onSuccess: () => {
      toast.success("订单已删除", { description: "订单已移至已删除订单列表" });
      refetch();
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error("删除失败", { description: error.message });
    },
  });
  
  // Recover mutation
  const recoverMutation = trpc.orders.recover.useMutation({
    onSuccess: () => {
      toast.success("订单已恢复", { description: "订单已恢复到订单列表" });
      refetch();
      setRestoreDialogOpen(false);
    },
    onError: (error) => {
      toast.error("恢复失败", { description: error.message });
    },
  });

  // Fetch statistics
  const { data: stats } = trpc.orders.stats.useQuery();

  const formatCurrency = (amount: string | number, currency = "USD") => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    const symbol = currency === "USD" ? "$ " : "¥ ";
    return symbol + num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("zh-CN");
  };

  const handleSearch = () => {
    refetch();
  };

  const handleReset = () => {
    setSearchTerm("");
    setStatusFilter("");
    setPage(1);
    setTimeout(() => refetch(), 100);
  };

  const handleTabChange = (tabId: string, status: string) => {
    setActiveTab(tabId);
    if (status === "stats") {
      // Show statistics view
    } else {
      setStatusFilter(status);
      setPage(1);
    }
  };

  // Show statistics view
  if (activeTab === "statistics") {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">订单管理</h1>
          <p className="text-gray-500 text-sm mt-1">查看和管理所有订单信息</p>
        </div>

        {/* Secondary Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-8">
            {secondaryNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id, item.status)}
                className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === item.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">总订单数</p>
                  <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">总销售额</p>
                  <div className="text-2xl font-bold">{formatCurrency(stats?.totalAmount || 0)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">待处理</p>
                  <div className="text-2xl font-bold">{stats?.pendingCount || 0}</div>
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
                  <p className="text-sm font-medium text-muted-foreground">已完成</p>
                  <div className="text-2xl font-bold">{stats?.deliveredCount || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>订单状态分布</CardTitle>
            <CardDescription>各状态订单数量统计</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <span className="text-sm font-medium">待确认</span>
                <span className="text-2xl font-bold text-yellow-600">
                  {stats?.pendingCount || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <span className="text-sm font-medium">已确认</span>
                <span className="text-2xl font-bold text-blue-600">
                  {stats?.confirmedCount || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <span className="text-sm font-medium">生产中</span>
                <span className="text-2xl font-bold text-purple-600">
                  {stats?.processingCount || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <span className="text-sm font-medium">已发货</span>
                <span className="text-2xl font-bold text-indigo-600">
                  {stats?.shippedCount || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <span className="text-sm font-medium">已完成</span>
                <span className="text-2xl font-bold text-green-600">
                  {stats?.deliveredCount || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <span className="text-sm font-medium">已取消</span>
                <span className="text-2xl font-bold text-red-600">
                  {stats?.cancelledCount || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show orders list view
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">订单管理</h1>
          <p className="text-gray-500 text-sm mt-1">查看和管理所有订单信息</p>
        </div>
        <Link href="/orders/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新建订单
          </Button>
        </Link>
      </div>

      {/* Secondary Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {secondaryNavItems
            .filter(item => !item.adminOnly || isAdmin)
            .map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id, item.status)}
              className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === item.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {item.label}
              {item.adminOnly && <Archive className="inline-block ml-1 h-3 w-3" />}
            </button>
          ))}
        </nav>
      </div>

         {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">总订单数</p>
                <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">总销售额</p>
                <div className="text-2xl font-bold">{formatCurrency(stats?.totalAmount || 0)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">待处理</p>
                <div className="text-2xl font-bold">{stats?.pendingCount || 0}</div>
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
                <p className="text-sm font-medium text-muted-foreground">已完成</p>
                <div className="text-2xl font-bold">{stats?.deliveredCount || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Input
                placeholder="搜索订单号、客户名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 whitespace-nowrap">订单状态:</span>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending">待确认</SelectItem>
                  <SelectItem value="confirmed">已确认</SelectItem>
                  <SelectItem value="processing">生产中</SelectItem>
                  <SelectItem value="shipped">已发货</SelectItem>
                  <SelectItem value="delivered">已完成</SelectItem>
                  <SelectItem value="cancelled">已取消</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 whitespace-nowrap">付款状态:</span>
              <Select value={paymentStatusFilter} onValueChange={(v) => { setPaymentStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="全部付款" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="unpaid">未付款</SelectItem>
                  <SelectItem value="partial">部分付款</SelectItem>
                  <SelectItem value="paid">已付款</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" />
              搜索
            </Button>
            <Button variant="outline" onClick={() => {
              handleReset();
              setPaymentStatusFilter("all");
            }}>
              重置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-4 text-gray-600">加载中...</p>
            </div>
          ) : ordersData?.orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">暂无订单</h3>
              <p className="text-gray-500 text-sm mt-1">开始创建您的第一个订单</p>
              <Link href="/orders/new">
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  新建订单
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>订单号</TableHead>
                    <TableHead>客户名称</TableHead>
                    <TableHead>订单金额</TableHead>
                    <TableHead className="text-right">总毛重(kg)</TableHead>
                    <TableHead className="text-right">总CBM(m³)</TableHead>
                    <TableHead>订单状态</TableHead>
                    <TableHead>付款状态</TableHead>
                    <TableHead>下单日期</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersData?.orders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        <Link href={`/orders/${order.id}`}>
                          <span className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">{order.orderNumber}</span>
                        </Link>
                      </TableCell>
                      <TableCell>{order.customerName || "暂无"}</TableCell>
                      <TableCell>{formatCurrency(order.totalAmount, order.currency || "USD")}</TableCell>
                      <TableCell className="text-right">
                        {order.totalGrossWeight > 0 ? order.totalGrossWeight.toFixed(2) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {order.totalCBM > 0 ? order.totalCBM.toFixed(2) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[order.status as keyof typeof statusConfig]?.color}>
                          {statusConfig[order.status as keyof typeof statusConfig]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {order.paymentStatus && (
                          <Badge className={paymentStatusConfig[order.paymentStatus as keyof typeof paymentStatusConfig]?.color}>
                            {paymentStatusConfig[order.paymentStatus as keyof typeof paymentStatusConfig]?.label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(order.orderDate)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {activeTab === "archived" ? (
                            // 已删除订单：显示恢复按钮（仅管理员）
                            isAdmin && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setSelectedOrderId(order.id);
                                  setRestoreDialogOpen(true);
                                }}
                              >
                                <RotateCcw className="mr-1 h-3 w-3" />
                                恢复
                              </Button>
                            )
                          ) : (
                            // 正常订单：显示编辑和删除按钮
                            <>
                              <Link href={`/orders/${order.id}/edit`}>
                                <Button variant="ghost" size="sm">
                                  编辑
                                </Button>
                              </Link>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setSelectedOrderId(order.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="mr-1 h-3 w-3" />
                                删除
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {ordersData && ordersData.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    共 {ordersData.total} 条记录，第 {page} / {ordersData.totalPages} 页
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === ordersData.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除订单？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将将订单移至“已删除订单”列表。管理员可以在后续恢复该订单。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedOrderId && deleteMutation.mutate({ id: selectedOrderId })}
              className="bg-red-600 hover:bg-red-700"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认恢复订单？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将恢复该订单到正常订单列表。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedOrderId && recoverMutation.mutate({ id: selectedOrderId })}
            >
              确认恢复
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
