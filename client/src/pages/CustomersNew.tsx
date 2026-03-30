import { useAuth } from "@/_core/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AttributeSelector from '@/components/AttributeSelector';
import { StarRating } from '@/components/StarRating';
import { CustomerTableRow } from '@/components/CustomerTableRow';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { ArrowUpDown, Building2, ChevronDown, ChevronUp, Edit, Filter, Globe, MapPin, Plus, RotateCcw, Search, Star, TrendingUp, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { SmartCodeInput } from "@/components/SmartCodeInput";

export default function CustomersNew() {
  const { user } = useAuth();
  const { canWrite, canDelete, isAdmin } = usePermission();
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [cooperationStatusFilter, setCooperationStatusFilter] = useState<string>("all");
  const [customerNatureFilter, setCustomerNatureFilter] = useState<string>("all");
  const [customerCategoryFilter, setCustomerCategoryFilter] = useState<string[]>([]);
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [cooperationLevelFilter, setCooperationLevelFilter] = useState<string>("all");
  const [createdByFilter, setCreatedByFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [overdueFollowUpFilter, setOverdueFollowUpFilter] = useState<boolean>(false);

  // Read URL params on mount to auto-activate overdue filter from dashboard
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('overdueFollowUp') === '1') {
      setOverdueFollowUpFilter(true);
    }
  }, []);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBatchEditStatusOpen, setIsBatchEditStatusOpen] = useState(false);
  const [batchEditStatus, setBatchEditStatus] = useState<string>("developing");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const utils = trpc.useUtils();
  
  const { data: allUsers } = trpc.users.list.useQuery();

  const { data: companiesData, isLoading } = trpc.customerManagement.companies.list.useQuery({
    cooperationStatus: cooperationStatusFilter === "all" ? undefined : cooperationStatusFilter,
    customerNature: customerNatureFilter === "all" ? undefined : customerNatureFilter,
    customerCategory: customerCategoryFilter.length > 0 ? customerCategoryFilter : undefined,
    country: countryFilter === "all" ? undefined : countryFilter,
    cooperationLevel: cooperationLevelFilter === "all" ? undefined : cooperationLevelFilter,
    createdBy: createdByFilter === "all" ? undefined : parseInt(createdByFilter),
    assignedTo: assigneeFilter === "all" ? undefined : parseInt(assigneeFilter),
    overdueFollowUp: overdueFollowUpFilter || undefined,
    search: searchTerm || undefined,
    page,
    pageSize,
    sortBy,
    sortOrder,
  }, {
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
  });

  const companies = companiesData?.data || [];
  const totalCompanies = companiesData?.total || 0;
  const totalPages = Math.ceil(totalCompanies / pageSize);

  const { data: stats } = trpc.customerManagement.companies.stats.useQuery(undefined, {
    staleTime: 60000, // Cache for 60 seconds
    refetchOnWindowFocus: false,
  });

  const createCompany = trpc.customerManagement.companies.create.useMutation({
    onSuccess: () => {
      toast.success("客户公司创建成功");
      setIsAddDialogOpen(false);
      utils.customerManagement.companies.list.invalidate();
      utils.customerManagement.companies.stats.invalidate();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const deleteCompany = trpc.customerManagement.companies.delete.useMutation({
    onSuccess: () => {
      toast.success("客户删除成功");
      utils.customerManagement.companies.list.invalidate();
      utils.customerManagement.companies.stats.invalidate();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  const batchDeleteMutation = trpc.customerManagement.companies.batchDelete.useMutation({
    onSuccess: (result: { deletedCount: number }) => {
      toast.success(`成功删除 ${result.deletedCount} 个客户`);
      setSelectedIds(new Set());
      utils.customerManagement.companies.list.invalidate();
      utils.customerManagement.companies.stats.invalidate();
    },
    onError: (error: any) => {
      toast.error(`批量删除失败: ${error.message}`);
    },
  });

  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle sort order if clicking the same column
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to ascending
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const batchUpdateStatusMutation = trpc.customerManagement.companies.batchUpdateCooperationStatus.useMutation({
    onSuccess: (result: { updatedCount: number }) => {
      toast.success(`成功更新 ${result.updatedCount} 个客户的合作状态`);
      setSelectedIds(new Set());
      setIsBatchEditStatusOpen(false);
      utils.customerManagement.companies.list.invalidate();
      utils.customerManagement.companies.stats.invalidate();
    },
    onError: (error: any) => {
      toast.error(`批量更新失败: ${error.message}`);
    },
  });

  const [formData, setFormData] = useState<{
    companyName: string;
    customerCode: string;
    customerNature: string[];
    customerCategory: string[];
    source: string[];
    cooperationLevel: string[];
    cooperationStatus: "developing" | "cooperating" | "stopped";
    country: string;
    city: string;
    website: string;
    notes: string;
  }>({
    companyName: "",
    customerCode: "",
    customerNature: [] as string[],
    customerCategory: [] as string[],
    source: [] as string[],
    cooperationLevel: [] as string[],
    cooperationStatus: "developing" as const,
    country: "",
    city: "",
    website: "",
    notes: "",
  });

  const handleSubmit = () => {
    if (!formData.companyName.trim()) {     toast.error("请输入公司名称");
      return;
    }
    // Filter out empty strings to prevent SQL errors with default values
    const cleanData: any = {
      companyName: formData.companyName,
      createdBy: user?.id,
    };
    
    if (formData.customerCode) cleanData.customerCode = formData.customerCode;
    if (formData.customerNature && formData.customerNature.length > 0) cleanData.customerNature = formData.customerNature[0];
    if (formData.customerCategory && formData.customerCategory.length > 0) cleanData.customerCategory = formData.customerCategory;
    if (formData.source && formData.source.length > 0) cleanData.source = formData.source[0];
    if (formData.cooperationLevel && formData.cooperationLevel.length > 0) cleanData.cooperationLevel = formData.cooperationLevel[0];
    if (formData.cooperationStatus) cleanData.cooperationStatus = formData.cooperationStatus;
    if (formData.country) cleanData.country = formData.country;
    if (formData.city) cleanData.city = formData.city;
    if (formData.website) cleanData.website = formData.website;
    if (formData.notes) cleanData.notes = formData.notes;
    
    createCompany.mutate(cleanData);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.size === companies?.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(companies?.map((c) => c.id) || []));
    }
  };

  // 单选/取消单选
  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) {
      toast.error("请先选择要删除的客户");
      return;
    }

    if (!confirm(`确定要删除选中的 ${selectedIds.size} 个客户吗？此操作不可撤销。`)) {
      return;
    }

    batchDeleteMutation.mutate({ ids: Array.from(selectedIds) });
  };

  // 批量更新合作状态
  const handleBatchUpdateStatus = () => {
    if (selectedIds.size === 0) {
      toast.error("请先选择要更新的客户");
      return;
    }

    batchUpdateStatusMutation.mutate({
      ids: Array.from(selectedIds),
      cooperationStatus: batchEditStatus as "developing" | "cooperating" | "stopped",
    });
  };

  // isAdmin已从usePermission Hook中获取

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const getCooperationStatusBadge = (cooperationStatus: string) => {
    const badges = {
      developing: "bg-blue-50 text-blue-700 border border-blue-200",
      cooperating: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      stopped: "bg-gray-50 text-gray-600 border border-gray-200",
    };
    const labels = {
      developing: "开发中",
      cooperating: "合作中",
      stopped: "已停止",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[cooperationStatus as keyof typeof badges]}`}>
        {labels[cooperationStatus as keyof typeof labels]}
      </span>
    );
  };

  const getCooperationLevelBadge = (cooperationLevel: string) => {
    const badges = {
      vip: "bg-amber-50 text-amber-700 border border-amber-200",
      high: "bg-orange-50 text-orange-700 border border-orange-200",
      medium: "bg-sky-50 text-sky-700 border border-sky-200",
      low: "bg-gray-50 text-gray-600 border border-gray-200",
    };
    const labels = {
      vip: "VIP",
      high: "高",
      medium: "中",
      low: "低",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[cooperationLevel as keyof typeof badges]}`}>
        {labels[cooperationLevel as keyof typeof labels]}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">客户管理</h1>
          <p className="text-gray-500 text-sm mt-1">管理客户公司信息、联系人和跟进记录</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && selectedIds.size > 0 && (
            <>
              <Button
                variant="outline"
                onClick={() => setIsBatchEditStatusOpen(true)}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                批量编辑状态 ({selectedIds.size})
              </Button>
              <Button
                variant="destructive"
                onClick={handleBatchDelete}
                disabled={batchDeleteMutation.isPending}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                批量删除 ({selectedIds.size})
              </Button>
            </>
          )}
          {canWrite("customer_management") && (
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              添加客户
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">总客户数</p>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">合作中</p>
                  <div className="text-2xl font-bold text-green-600">{stats.cooperating}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-50">
                  <Star className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">开发中</p>
                  <div className="text-2xl font-bold text-orange-600">{stats.developing}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100">
                  <Building2 className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">已停止</p>
                  <div className="text-2xl font-bold text-gray-400">{stats.stopped}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-5 pb-5">
          {/* Search Row */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索公司名称或客户编号..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSearchTerm(searchInput);
                    setPage(1);
                  }
                }}
                className="pl-10 h-9"
              />
            </div>
            <Button 
              size="sm"
              onClick={() => {
                setSearchTerm(searchInput);
                setPage(1);
              }}
              className="gap-1.5"
            >
              <Search className="h-3.5 w-3.5" />
              搜索
            </Button>
            <div className="h-5 w-px bg-gray-200" />
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`gap-1.5 ${showAdvancedFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : ''}`}
            >
              <Filter className="h-3.5 w-3.5" />
              筛选
              {showAdvancedFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
            {(cooperationStatusFilter !== 'all' || customerNatureFilter !== 'all' || customerCategoryFilter.length > 0 || cooperationLevelFilter !== 'all' || countryFilter !== 'all' || createdByFilter !== 'all' || assigneeFilter !== 'all' || overdueFollowUpFilter) && (
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchInput("");
                  setSearchTerm("");
                  setCooperationStatusFilter("all");
                  setCustomerNatureFilter("all");
                  setCustomerCategoryFilter([]);
                  setCountryFilter("all");
                  setCooperationLevelFilter("all");
                  setCreatedByFilter("all");
                  setAssigneeFilter("all");
                  setOverdueFollowUpFilter(false);
                  setPage(1);
                }}
                className="gap-1.5 text-gray-500 hover:text-gray-700"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                重置筛选
              </Button>
            )}
          </div>

          {/* Advanced Filters - Collapsible */}
          {showAdvancedFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">合作状态</label>
                  <Select value={cooperationStatusFilter} onValueChange={(v) => { setCooperationStatusFilter(v); setPage(1); }}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="全部" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="developing">开发中</SelectItem>
                      <SelectItem value="cooperating">合作中</SelectItem>
                      <SelectItem value="stopped">已停止</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">客户性质</label>
                  <AttributeSelector
                    category="客户管理"
                    subcategory={undefined}
                    fieldName="客户性质"
                    value={customerNatureFilter === 'all' ? [] : [customerNatureFilter]}
                    onChange={(values: string[]) => { 
                      setCustomerNatureFilter(values.length > 0 ? values[0] : 'all'); 
                      setPage(1); 
                    }}
                    placeholder="全部"
                    multiple={false}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">客户分类</label>
                  <AttributeSelector
                    category="客户管理"
                    subcategory={undefined}
                    fieldName="客户分类"
                    value={customerCategoryFilter}
                    onChange={(values: string[]) => { setCustomerCategoryFilter(values); setPage(1); }}
                    placeholder="全部"
                    multiple={true}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">客户级别</label>
                  <Select value={cooperationLevelFilter} onValueChange={(v) => { setCooperationLevelFilter(v); setPage(1); }}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="全部" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="high">高</SelectItem>
                      <SelectItem value="medium">中</SelectItem>
                      <SelectItem value="low">低</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">国家/地区</label>
                  <Select value={countryFilter} onValueChange={(v) => { setCountryFilter(v); setPage(1); }}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="全部" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="United States">美国</SelectItem>
                      <SelectItem value="United Kingdom">英国</SelectItem>
                      <SelectItem value="Germany">德国</SelectItem>
                      <SelectItem value="Australia">澳大利亚</SelectItem>
                      <SelectItem value="Japan">日本</SelectItem>
                      <SelectItem value="China">中国</SelectItem>
                      <SelectItem value="Singapore">新加坡</SelectItem>
                      <SelectItem value="Canada">加拿大</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">创建人</label>
                  <Select value={createdByFilter} onValueChange={(v) => { setCreatedByFilter(v); setPage(1); }}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="全部" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value={user?.id.toString() || ""}>我创建的</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">负责人</label>
                  <Select value={assigneeFilter} onValueChange={(v) => { setAssigneeFilter(v); setPage(1); }}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="全部" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      {allUsers?.map((u) => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">跟进状态</label>
                  <button
                    onClick={() => { setOverdueFollowUpFilter(!overdueFollowUpFilter); setPage(1); }}
                    className={`w-full inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium border transition-colors ${
                      overdueFollowUpFilter
                        ? 'bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${overdueFollowUpFilter ? 'bg-orange-500' : 'bg-gray-300'}`} />
                    {overdueFollowUpFilter ? '仅显示需跟进' : '全部客户'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Companies Table */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">共 {totalCompanies} 家客户公司{selectedIds.size > 0 && ` · 已选择 ${selectedIds.size} 项`}</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                {isAdmin && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={companies && companies.length > 0 && selectedIds.size === companies.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2 hover:bg-gray-100"
                    onClick={() => handleSort("companyName")}
                  >
                    公司名称
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2 hover:bg-gray-100"
                    onClick={() => handleSort("customerCode")}
                  >
                    客户编号
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2 hover:bg-gray-100"
                    onClick={() => handleSort("customerNature")}
                  >
                    客户性质
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2 hover:bg-gray-100"
                    onClick={() => handleSort("country")}
                  >
                    国家/地区
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2 hover:bg-gray-100"
                    onClick={() => handleSort("cooperationLevel")}
                  >
                    客户级别
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2 hover:bg-gray-100"
                    onClick={() => handleSort("cooperationStatus")}
                  >
                    状态
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2 hover:bg-gray-100"
                    onClick={() => handleSort("createdAt")}
                  >
                    创建时间
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies?.map((company) => (
                <CustomerTableRow
                  key={company.id}
                  company={company}
                  isAdmin={isAdmin}
                  isSelected={selectedIds.has(company.id)}
                  onToggleSelect={toggleSelect}
                  onViewDetails={(id) => setLocation(`/customers/${id}`)}
                />
              ))}
              {companies?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 9 : 8} className="text-center text-gray-500 py-8">
                    暂无客户数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">每页显示</span>
              <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(parseInt(v)); setPage(1); }}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="40">40</SelectItem>
                  <SelectItem value="80">80</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">条</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                第 {page} / {totalPages} 页
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  首页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  下一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                >
                  末页
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Company Drawer */}
      <Sheet open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>添加新客户</SheetTitle>
            <SheetDescription>填写客户公司的基本信息</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4 space-y-6">
            {/* 基本信息 */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 border-b pb-2">基本信息</h4>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="companyName">公司名称 <span className="text-red-500">*</span></Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="输入客户公司全称"
                  />
                </div>
                <SmartCodeInput
                  label="客户编号"
                  ruleType="customer"
                  value={formData.customerCode}
                  onChange={(value) => setFormData({ ...formData, customerCode: value })}
                />
                <div className="space-y-1.5">
                  <Label>合作状态</Label>
                  <Select
                    value={formData.cooperationStatus}
                    onValueChange={(value: any) => setFormData({ ...formData, cooperationStatus: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="developing">开发中</SelectItem>
                      <SelectItem value="cooperating">合作中</SelectItem>
                      <SelectItem value="stopped">已停止</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 地理位置 */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 border-b pb-2">地理位置</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>国家/地区</Label>
                  <AttributeSelector
                    category="客户管理"
                    subcategory="客户信息"
                    fieldName="客户国家"
                    value={formData.country ? [formData.country] : []}
                    onChange={(values: string[]) => setFormData({ ...formData, country: values[0] || '' })}
                    placeholder="选择国家"
                    multiple={false}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">城市</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="例如：纽约"
                  />
                </div>
              </div>
            </div>

            {/* 联系方式 */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 border-b pb-2">联系方式</h4>
              <div className="space-y-1.5">
                <Label htmlFor="website">公司网站</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://example.com"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* 分类标签 */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 border-b pb-2">分类标签</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>客户性质</Label>
                  <AttributeSelector
                    category="客户管理"
                    subcategory={undefined}
                    fieldName="客户性质"
                    value={formData.customerNature}
                    onChange={(values: string[]) => setFormData({ ...formData, customerNature: values })}
                    placeholder="选择客户性质"
                    multiple={false}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>客户来源</Label>
                  <AttributeSelector
                    category="客户管理"
                    subcategory="客户信息"
                    fieldName="客户来源"
                    value={formData.source}
                    onChange={(values: string[]) => setFormData({ ...formData, source: values })}
                    placeholder="选择客户来源"
                    multiple={false}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>客户级别</Label>
                  <AttributeSelector
                    category="客户管理"
                    fieldName="cooperationLevel"
                    value={formData.cooperationLevel}
                    onChange={(values: string[]) => setFormData({ ...formData, cooperationLevel: values })}
                    placeholder="选择客户级别"
                    multiple={false}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>客户分类</Label>
                  <AttributeSelector
                    category="客户管理"
                    subcategory={undefined}
                    fieldName="客户分类"
                    value={formData.customerCategory}
                    onChange={(values: string[]) => setFormData({ ...formData, customerCategory: values })}
                    placeholder="选择客户分类"
                    multiple={true}
                  />
                </div>
              </div>
            </div>

            {/* 备注 */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 border-b pb-2">备注</h4>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="添加客户相关的备注信息..."
                rows={3}
              />
            </div>
          </div>
          <SheetFooter className="border-t px-4 py-3">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={createCompany.isPending}>
              {createCompany.isPending ? "创建中..." : "创建客户"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Batch Edit Status Dialog */}
      <Dialog open={isBatchEditStatusOpen} onOpenChange={setIsBatchEditStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量编辑合作状态</DialogTitle>
            <DialogDescription>将选中的 {selectedIds.size} 个客户的合作状态更改为：</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="batchStatus">选择合作状态</Label>
              <Select value={batchEditStatus} onValueChange={setBatchEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="developing">开发中</SelectItem>
                  <SelectItem value="cooperating">合作中</SelectItem>
                  <SelectItem value="stopped">已停止</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchEditStatusOpen(false)}>
              取消
            </Button>
            <Button onClick={handleBatchUpdateStatus} disabled={batchUpdateStatusMutation.isPending}>
              {batchUpdateStatusMutation.isPending ? "更新中..." : "确认更新"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
