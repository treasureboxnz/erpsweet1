import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, FileText, CheckCircle2, XCircle, Clock, Send, Trash2, Download, MoreHorizontal, Copy, Eye, Edit, BarChart3, PenLine } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast as showToast } from "sonner";

export default function QuotationList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"draft" | "sent" | "accepted" | "rejected" | "expired" | undefined>();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [fobPriceSortOrder, setFobPriceSortOrder] = useState<'asc' | 'desc' | null>(null);
  
  const { data: quotationsData, isLoading, refetch } = trpc.quotations.list.useQuery({
    page,
    pageSize: 20,
    status,
    search,
  });

  const { data: stats } = trpc.quotations.stats.useQuery({});

  // Sort quotations by FOB price
  const sortedQuotations = useMemo(() => {
    if (!quotationsData?.items) return [];
    
    const items = [...quotationsData.items];
    
    if (fobPriceSortOrder) {
      items.sort((a, b) => {
        const priceA = a.avgFobPrice ?? -Infinity;
        const priceB = b.avgFobPrice ?? -Infinity;
        
        if (fobPriceSortOrder === 'asc') {
          return priceA - priceB;
        } else {
          return priceB - priceA;
        }
      });
    }
    
    return items;
  }, [quotationsData?.items, fobPriceSortOrder]);

  const deleteMutation = trpc.quotations.delete.useMutation({
    onSuccess: () => {
      showToast.success("报价已删除");
      refetch();
    },
    onError: (error) => {
      showToast.error(`删除失败: ${error.message}`);
    },
  });

  const duplicateMutation = trpc.quotations.duplicate.useMutation({
    onSuccess: (data) => {
      showToast.success(`新报价单号: ${data.quotationNumber}`);
      refetch();
    },
    onError: (error) => {
      showToast.error(`复制失败: ${error.message}`);
    },
  });

  const batchDeleteMutation = trpc.quotations.batchDelete.useMutation({
    onSuccess: () => {
      showToast.success(`已删除 ${selectedIds.length} 个报价`);
      setSelectedIds([]);
      setIsSelectMode(false);
      refetch();
    },
    onError: (error: any) => {
      showToast.error(`批量删除失败: ${error.message}`);
    },
  });

  const handleSelectAll = () => {
    if (selectedIds.length === sortedQuotations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedQuotations.map((q: any) => q.id) || []);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) {
      showToast.error("请选择要删除的报价");
      return;
    }
    if (confirm(`确定要删除 ${selectedIds.length} 个报价吗？`)) {
      batchDeleteMutation.mutate({ ids: selectedIds });
    }
  };

  const batchExportMutation = trpc.batchPdfExport.exportBatch.useMutation({
    onSuccess: (data) => {
      // Convert base64 to blob and download
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/zip' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showToast.success(`已导出 ${data.count} 个报价`);
      setSelectedIds([]);
      setIsSelectMode(false);
    },
    onError: (error: any) => {
      showToast.error(`导出失败: ${error.message}`);
    },
  });

  const handleBatchExportPDF = () => {
    if (selectedIds.length === 0) {
      showToast.error("请选择要导出的报价");
      return;
    }
    showToast.info(`正在导出 ${selectedIds.length} 个报价PDF...`);
    batchExportMutation.mutate({ quotationIds: selectedIds });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "草稿", variant: "secondary" as const, icon: FileText },
      sent: { label: "已发送", variant: "default" as const, icon: Send },
      accepted: { label: "已接受", variant: "default" as const, icon: CheckCircle2 },
      rejected: { label: "已拒绝", variant: "destructive" as const, icon: XCircle },
      expired: { label: "已过期", variant: "outline" as const, icon: Clock },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;
    
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getModeBadge = (mode: string) => {
    return mode === "fob_only" ? (
      <Badge variant="outline">订单模式</Badge>
    ) : (
      <Badge variant="outline">批次模式</Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">报价管理</h1>
          <p className="text-gray-500 text-sm mt-1">管理客户报价和价格提案</p>
        </div>
        <div className="flex gap-2">
          {!isSelectMode ? (
            <>
              <Button variant="outline" onClick={() => setIsSelectMode(true)}>
                批量操作
              </Button>
              <Link href="/quotations/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  新建报价
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={handleBatchExportPDF}
                disabled={selectedIds.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                导出PDF ({selectedIds.length})
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleBatchDelete}
                disabled={selectedIds.length === 0 || batchDeleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                删除 ({selectedIds.length})
              </Button>
              <Button variant="outline" onClick={() => { setIsSelectMode(false); setSelectedIds([]); }}>
                取消
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">总报价数</div>
                <div className="text-2xl font-bold">{stats.totalQuotations}</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100">
                <PenLine className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">草稿</div>
                <div className="text-2xl font-bold">{stats.byStatus.draft}</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-50">
                <Send className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">已发送</div>
                <div className="text-2xl font-bold">{stats.byStatus.sent}</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">已接受</div>
                <div className="text-2xl font-bold text-green-600">{stats.byStatus.accepted}</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <BarChart3 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">转化率</div>
                <div className="text-2xl font-bold">{stats.conversionRate}%</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索报价单号或客户名称..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={status || "all"}
            onValueChange={(value) => setStatus(value === "all" ? undefined : value as any)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="sent">已发送</SelectItem>
              <SelectItem value="accepted">已接受</SelectItem>
              <SelectItem value="rejected">已拒绝</SelectItem>
              <SelectItem value="expired">已过期</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { setSearch(""); setStatus(undefined); }}>
            重置
          </Button>
        </div>
      </Card>

      {/* Quotations Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr className="text-left">
                {isSelectMode && (
                  <th className="p-4 font-medium w-12">
                    <Checkbox 
                      checked={selectedIds.length === sortedQuotations.length && sortedQuotations.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                )}
                <th className="p-4 font-medium">报价单号</th>
                <th className="p-4 font-medium">客户名称</th>
                <th className="p-4 font-medium">报价模式</th>
                <th className="p-4 font-medium">货币</th>
                <th className="p-4 font-medium">金额</th>

                <th className="p-4 font-medium text-right">总毛重(kg)</th>
                <th className="p-4 font-medium text-right">总CBM(m³)</th>
                <th className="p-4 font-medium">状态</th>
                <th className="p-4 font-medium">有效期</th>
                <th className="p-4 font-medium">创建时间</th>
                <th className="p-4 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted-foreground">
                    加载中...
                  </td>
                </tr>
              ) : sortedQuotations.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted-foreground">
                    暂无报价记录
                  </td>
                </tr>
              ) : (
                sortedQuotations.map((quotation) => (
                  <tr key={quotation.id} className="border-b hover:bg-muted/50">
                    {isSelectMode && (
                      <td className="p-4">
                        <Checkbox 
                          checked={selectedIds.includes(quotation.id)}
                          onCheckedChange={() => handleSelectOne(quotation.id)}
                        />
                      </td>
                    )}
                    <td className="p-4">
                      <Link href={`/quotations/${quotation.id}`}>
                        <span className="text-primary hover:underline font-medium">
                          {quotation.quotationNumber}
                        </span>
                      </Link>
                    </td>
                    <td className="p-4">{quotation.customerName}</td>
                    <td className="p-4">{getModeBadge(quotation.quotationMode)}</td>
                    <td className="p-4">
                      <Badge variant="outline" className="font-mono">
                        {quotation.currency || "USD"}
                      </Badge>
                    </td>
                    <td className="p-4 font-medium">
                      {parseFloat(quotation.totalAmount).toLocaleString()}
                    </td>

                    <td className="p-4 text-right">
                      {quotation.totalGrossWeight > 0 ? quotation.totalGrossWeight.toFixed(2) : '-'}
                    </td>
                    <td className="p-4 text-right">
                      {quotation.totalCBM > 0 ? quotation.totalCBM.toFixed(2) : '-'}
                    </td>
                    <td className="p-4">{getStatusBadge(quotation.status)}</td>
                    <td className="p-4">
                      {quotation.validUntil ? (
                        <span className={
                          new Date(quotation.validUntil) < new Date() 
                            ? "text-red-600" 
                            : ""
                        }>
                          {new Date(quotation.validUntil).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(quotation.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/quotations/${quotation.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              查看详情
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/quotations/${quotation.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              编辑
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/quotations/create?sourceId=${quotation.id}`}>
                              <Copy className="mr-2 h-4 w-4" />
                              复制报价
                            </Link>
                          </DropdownMenuItem>
                          {quotation.status === "draft" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  if (confirm("确定要删除这个报价吗？")) {
                                    deleteMutation.mutate({ id: quotation.id });
                                  }
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                删除
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {quotationsData && quotationsData.total > quotationsData.pageSize && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-muted-foreground">
              共 {quotationsData.total} 条记录，第 {page} / {Math.ceil(quotationsData.total / quotationsData.pageSize)} 页
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
                disabled={page >= Math.ceil(quotationsData.total / quotationsData.pageSize)}
                onClick={() => setPage(page + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
