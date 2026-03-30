import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, FileText, DollarSign, ShoppingCart, Users, TrendingUp } from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Reports() {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    new Date(new Date().setMonth(new Date().getMonth() - 1))
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());
  const [appliedRange, setAppliedRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date(),
  });

  // 使用稳定的查询参数
  const queryInput = useMemo(() => ({
    dateFrom: appliedRange.from,
    dateTo: appliedRange.to,
  }), [appliedRange.from?.getTime(), appliedRange.to?.getTime()]);

  const { data: reportStats, isLoading } = trpc.dashboard.getReportStats.useQuery(queryInput);

  const handleApplyFilter = () => {
    setAppliedRange({ from: dateFrom, to: dateTo });
    toast.success("已应用日期筛选");
  };

  const handleExport = (reportType: string) => {
    toast.info(`${reportType}导出功能即将上线`);
  };

  const reports = [
    {
      title: "销售报表",
      description: "查看销售额、订单量等销售数据统计",
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "客户报表",
      description: "分析客户分布、活跃度等客户数据",
      icon: FileText,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "产品报表",
      description: "统计产品销量、库存等产品数据",
      icon: FileText,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "利润报表",
      description: "计算成本、利润率等财务数据",
      icon: FileText,
      color: "text-violet-600",
      bgColor: "bg-violet-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">报表中心</h1>
        <p className="text-muted-foreground text-sm mt-1">数据分析与业务报表</p>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-sm font-medium text-foreground">报表日期范围</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {dateFrom ? format(dateFrom, "yyyy年MM月dd日", { locale: zhCN }) : "开始日期"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={(date) => setDateFrom(date)}
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground">至</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {dateTo ? format(dateTo, "yyyy年MM月dd日", { locale: zhCN }) : "结束日期"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={(date) => setDateTo(date)}
                />
              </PopoverContent>
            </Popover>
            <Button onClick={handleApplyFilter}>应用筛选</Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats - 真实数据 */}
      <Card>
        <CardHeader>
          <CardTitle>报表概览</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="text-center p-4 bg-muted/50 rounded-lg animate-pulse">
                  <div className="h-4 bg-muted rounded w-20 mx-auto mb-3"></div>
                  <div className="h-8 bg-muted rounded w-32 mx-auto mb-2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg">
                <div className="p-2 rounded-lg bg-primary/10">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">总销售额</p>
                  <p className="text-2xl font-bold text-primary">
                    ${(reportStats?.totalSales || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <ShoppingCart className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">总订单数</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {reportStats?.totalOrders || 0}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Users className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">活跃客户</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {reportStats?.activeCustomers || 0}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-violet-50 rounded-lg">
                <div className="p-2 rounded-lg bg-violet-100">
                  <TrendingUp className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">平均客单价</p>
                  <p className="text-2xl font-bold text-violet-600">
                    ${reportStats?.totalOrders && reportStats.totalOrders > 0
                      ? Math.round(reportStats.totalSales / reportStats.totalOrders).toLocaleString()
                      : 0}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <Card key={report.title} className="hover:shadow-md transition-all duration-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${report.bgColor}`}>
                    <report.icon className={`h-6 w-6 ${report.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => toast.info("详细报表功能即将上线")}>
                  <FileText className="h-4 w-4" />
                  查看报表
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => handleExport(report.title)}
                >
                  <Download className="h-4 w-4" />
                  导出Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
