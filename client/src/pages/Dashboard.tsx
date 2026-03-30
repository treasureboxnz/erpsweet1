import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import Breadcrumb from "@/components/Breadcrumb";
import { DollarSign, Package, ShoppingCart, Users, TrendingUp, TrendingDown, AlertTriangle, Calendar, User, ChevronRight, MessageSquare, ImagePlus, X, Loader2, FileText, ClipboardList, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = trpc.dashboard.getStats.useQuery();
  const { data: salesTrend } = trpc.dashboard.getSalesTrend.useQuery();
  const { data: orderStatus } = trpc.dashboard.getOrderStatus.useQuery();
  const { data: productCategories } = trpc.dashboard.getProductCategories.useQuery();
  const { data: recentActivities } = trpc.dashboard.getRecentActivities.useQuery();
  const { data: overdueCustomers, refetch: refetchOverdue } = trpc.customerManagement.followUpProgress.getOverdue.useQuery({ days: 30 });

  // 负责人筛选状态
  const [selectedOwner, setSelectedOwner] = useState<string>("all");

  // 一键跟进状态
  const [quickFollowUpTarget, setQuickFollowUpTarget] = useState<{ customerId: number; companyName: string } | null>(null);
  const [quickForm, setQuickForm] = useState({ content: "", followUpType: "email" as "call" | "email" | "meeting" | "visit" | "other", nextFollowUpDate: "" });
  const [quickImages, setQuickImages] = useState<string[]>([]);
  const [isUploadingQuickImage, setIsUploadingQuickImage] = useState(false);
  const quickImageInputRef = useRef<HTMLInputElement>(null);
  const uploadProgressImage = trpc.customerManagement.followUpProgress.uploadImage.useMutation();

  const createFollowUp = trpc.customerManagement.followUpProgress.create.useMutation({
    onSuccess: () => {
      toast.success(`已记录跟进：${quickFollowUpTarget?.companyName}`);
      setQuickFollowUpTarget(null);
      setQuickForm({ content: "", followUpType: "email", nextFollowUpDate: "" });
      setQuickImages([]);
      refetchOverdue();
    },
    onError: (err) => toast.error(`记录失败：${err.message}`),
  });

  // 图片上传处理函数
  const handleQuickImageUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    setIsUploadingQuickImage(true);
    try {
      for (const file of imageFiles) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const result = await uploadProgressImage.mutateAsync({
          fileBase64: base64.replace(/^data:image\/\w+;base64,/, ''),
          fileName: file.name,
          mimeType: file.type,
        });
        setQuickImages(prev => [...prev, result.url]);
      }
    } catch {
      toast.error('图片上传失败');
    } finally {
      setIsUploadingQuickImage(false);
    }
  }, [uploadProgressImage]);

  // Ctrl+V 粘贴图片监听
  useEffect(() => {
    if (!quickFollowUpTarget) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
      if (imageItems.length === 0) return;
      e.preventDefault();
      const files = imageItems.map(item => item.getAsFile()).filter(Boolean) as File[];
      handleQuickImageUpload(files);
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [quickFollowUpTarget, handleQuickImageUpload]);

  const handleQuickFollowUp = () => {
    if (!quickFollowUpTarget) return;
    if (!quickForm.content.trim()) { toast.error("请输入跟进内容"); return; }
    createFollowUp.mutate({
      customerId: quickFollowUpTarget.customerId,
      content: quickForm.content,
      followUpType: quickForm.followUpType,
      nextPlanDate: quickForm.nextFollowUpDate ? new Date(quickForm.nextFollowUpDate) : undefined,
      images: quickImages.length > 0 ? JSON.stringify(quickImages) : undefined,
    });
  };

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-gray-200"></CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // 第一行：可行动指标（本月数据 + 环比）
  const actionCards = [
    {
      title: "本月新增客户",
      value: stats?.monthNewCustomers || 0,
      icon: Users,
      change: stats?.customerChange || "0%",
      color: "text-primary",
      bgColor: "bg-primary/10",
      onClick: () => setLocation('/customers'),
    },
    {
      title: "本月新增订单",
      value: stats?.monthNewOrders || 0,
      icon: ShoppingCart,
      change: stats?.orderChange || "0%",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      onClick: () => setLocation('/orders'),
    },
    {
      title: "本月销售额",
      value: `$${(stats?.monthSales || 0).toLocaleString()}`,
      icon: DollarSign,
      change: stats?.salesChange || "0%",
      color: "text-violet-600",
      bgColor: "bg-violet-50",
      onClick: () => setLocation('/orders'),
    },
    {
      title: "报价转化率",
      value: `${stats?.quotationConversionRate || 0}%`,
      icon: BarChart3,
      change: `${stats?.totalQuotations || 0}份报价`,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      isStatic: true,
      onClick: () => setLocation('/quotations'),
    },
  ];

  // 第二行：状态概览
  const statusCards = [
    {
      title: "总客户数",
      value: stats?.totalCustomers || 0,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "总产品数",
      value: stats?.totalProducts || 0,
      icon: Package,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "待处理订单",
      value: stats?.pendingOrders || 0,
      icon: ClipboardList,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      highlight: (stats?.pendingOrders || 0) > 0,
    },
    {
      title: "处理中订单",
      value: stats?.processingOrders || 0,
      icon: FileText,
      color: "text-sky-600",
      bgColor: "bg-sky-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">工作台</h1>
        <p className="text-muted-foreground text-sm mt-1">数据概览与待办任务</p>
      </div>

      {/* Row 1: 可行动指标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {actionCards.map((stat) => (
          <Card
            key={stat.title}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={stat.onClick}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="flex items-center mt-2">
                {!(stat as any).isStatic && (
                  <>
                    {String(stat.change).startsWith('+') && String(stat.change) !== '+0%' ? (
                      <TrendingUp className="h-4 w-4 text-emerald-600 mr-1" />
                    ) : String(stat.change).startsWith('-') ? (
                      <TrendingDown className="h-4 w-4 text-destructive mr-1" />
                    ) : null}
                    <span className={`text-sm ${String(stat.change).startsWith('+') && String(stat.change) !== '+0%' ? "text-emerald-600" : String(stat.change).startsWith('-') ? "text-destructive" : "text-muted-foreground"}`}>
                      {stat.change}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">较上月</span>
                  </>
                )}
                {(stat as any).isStatic && (
                  <span className="text-sm text-muted-foreground">{stat.change}</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 2: 状态概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statusCards.map((stat) => (
          <Card key={stat.title} className={`${stat.highlight ? 'border-amber-300 bg-amber-50/30' : ''}`}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  <p className={`text-xl font-bold ${stat.highlight ? 'text-amber-700' : 'text-foreground'}`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 30天未跟进客户报警 */}
      {overdueCustomers && overdueCustomers.length > 0 && (() => {
        // 提取所有负责人列表（去重）
        const ownerOptions = Array.from(
          new Map(
            overdueCustomers
              .filter((c) => c.assignedToName)
              .map((c) => [c.assignedToName, c.assignedToName])
          ).entries()
        ).map(([name]) => name);

        // 根据筛选过滤客户
        const filteredCustomers = selectedOwner === "all"
          ? overdueCustomers
          : overdueCustomers.filter((c) => c.assignedToName === selectedOwner);

        return (
        <Card className="border-border bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-orange-100 flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-foreground">⚠️ 跟进提醒</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    共 <span className="font-bold text-amber-600">{overdueCustomers.length}</span> 位客户超过 30 天未跟进
                    {selectedOwner !== "all" && (
                      <span className="ml-1">· 当前显示 <span className="font-bold text-primary">{filteredCustomers.length}</span> 位</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {ownerOptions.length > 0 && (
                  <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                    <SelectTrigger className="w-36 h-8 text-sm">
                      <SelectValue placeholder="按负责人筛选" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部负责人</SelectItem>
                      {ownerOptions.map((name) => (
                        <SelectItem key={name!} value={name!}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border text-muted-foreground hover:bg-muted h-8"
                  onClick={() => setLocation('/customers?overdueFollowUp=1')}
                >
                  查看全部
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredCustomers.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">该负责人暂无待跟进客户</p>
              )}
              {filteredCustomers.slice(0, 10).map((c) => (
                <div
                  key={c.customerId}
                  className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-border hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => setLocation(`/customers/${c.customerId}`)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{c.companyName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {c.country && <span className="text-xs text-gray-500">{c.country}</span>}
                        {c.assignedToName && (
                          <span className="text-xs text-gray-500">· 负责人: {c.assignedToName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      {c.lastFollowUpAt ? (
                        <>
                          <Badge variant="destructive" className="text-xs">
                            {c.daysSinceLastFollowUp} 天未跟进
                          </Badge>
                          <p className="text-xs text-gray-400 mt-1">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {new Date(c.lastFollowUpAt).toLocaleDateString('zh-CN')}
                          </p>
                        </>
                      ) : (
                        <Badge variant="destructive" className="text-xs">从未跟进</Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 flex-shrink-0 gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickFollowUpTarget({ customerId: c.customerId, companyName: c.companyName });
                        setQuickForm({ content: "", followUpType: "email", nextFollowUpDate: "" });
                      }}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      标记跟进
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
              {filteredCustomers.length > 10 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  还有 {filteredCustomers.length - 10} 位客户未显示，请前往客户列表查看
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        );
      })()}

      {/* Quick Follow-up Dialog */}
      <Dialog open={!!quickFollowUpTarget} onOpenChange={(open) => !open && setQuickFollowUpTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              记录跟进
            </DialogTitle>
            {quickFollowUpTarget && (
              <p className="text-sm text-muted-foreground">{quickFollowUpTarget.companyName}</p>
            )}
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">跟进方式</Label>
              <Select
                value={quickForm.followUpType}
                onValueChange={(v) => setQuickForm(prev => ({ ...prev, followUpType: v as typeof prev.followUpType }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">邮件</SelectItem>
                  <SelectItem value="call">电话</SelectItem>
                  <SelectItem value="meeting">会议</SelectItem>
                  <SelectItem value="visit">拜访</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">跟进内容 <span className="text-destructive">*</span></Label>
              <Textarea
                className="mt-1 resize-none"
                rows={4}
                placeholder="请输入本次跟进的具体内容…"
                value={quickForm.content}
                onChange={(e) => setQuickForm(prev => ({ ...prev, content: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">下次跟进日期（可选）</Label>
              <Input
                type="date"
                className="mt-1"
                value={quickForm.nextFollowUpDate}
                onChange={(e) => setQuickForm(prev => ({ ...prev, nextFollowUpDate: e.target.value }))}
              />
            </div>
            {/* 图片上传区域 */}
            <div>
              <Label className="text-sm font-medium">跟进截图（可选）</Label>
              <div
                className="mt-1 border-2 border-dashed border-gray-200 rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 hover:bg-gray-50 transition-colors"
                onClick={() => quickImageInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-primary/5'); }}
                onDragLeave={(e) => { e.currentTarget.classList.remove('border-primary', 'bg-primary/5'); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
                  handleQuickImageUpload(e.dataTransfer.files);
                }}
              >
                {isUploadingQuickImage ? (
                  <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    上传中...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-400">
                    <ImagePlus className="h-4 w-4" />
                    <span>拖拽图片、Ctrl+V 粘贴或点击上传截图</span>
                  </div>
                )}
              </div>
              <input
                ref={quickImageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleQuickImageUpload(e.target.files)}
              />
              {quickImages.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {quickImages.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={url}
                        alt={`截图 ${idx + 1}`}
                        className="w-16 h-16 object-cover rounded-md border border-gray-200 cursor-pointer hover:opacity-90"
                        onClick={() => window.open(url, '_blank')}
                      />
                      <button
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); setQuickImages(prev => prev.filter((_, i) => i !== idx)); }}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickFollowUpTarget(null)}>取消</Button>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={handleQuickFollowUp}
              disabled={createFollowUp.isPending}
            >
              {createFollowUp.isPending ? "保存中…" : "确认记录"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>销售趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesTrend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="销售额(USD)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Order Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle>订单状态分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={orderStatus || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(orderStatus || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Categories Chart */}
        <Card>
          <CardHeader>
            <CardTitle>产品分类统计</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={productCategories || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="hsl(var(--primary))" name="产品数量" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activities - 真实数据 */}
        <Card>
          <CardHeader>
            <CardTitle>最近活动</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities && recentActivities.length > 0 ? (
                recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.type === "customer" ? "bg-primary" :
                        activity.type === "order" ? "bg-emerald-500" :
                        activity.type === "product" ? "bg-amber-500" :
                        activity.type === "price" ? "bg-violet-500" : "bg-muted-foreground"
                      }`}></div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{activity.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">{activity.time}</span>
                      {activity.userName && (
                        <p className="text-xs text-muted-foreground">{activity.userName}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">暂无操作记录</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
