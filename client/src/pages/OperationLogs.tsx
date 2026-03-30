import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FileText, Filter, Search } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

const operationTypeLabels = {
  create: "创建",
  update: "更新",
  delete: "删除",
  suspend: "暂停",
  activate: "激活",
};

const operationTypeColors = {
  create: "bg-green-100 text-green-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-red-100 text-red-800",
  suspend: "bg-yellow-100 text-yellow-800",
  activate: "bg-emerald-100 text-emerald-800",
};

const moduleLabels = {
  customer: "客户",
  product: "产品",
  order: "订单",
  user: "用户",
  price: "价格",
};

export default function OperationLogs() {
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: logs, isLoading } = trpc.operationLogs.list.useQuery({
    module: moduleFilter !== "all" ? (moduleFilter as any) : undefined,
    operationType: typeFilter !== "all" ? (typeFilter as any) : undefined,
    limit: 50, // 减少默认加载数量以提高性能
  });

  const filteredLogs = logs?.filter((item) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      item.log.userName.toLowerCase().includes(searchLower) ||
      item.log.targetName?.toLowerCase().includes(searchLower) ||
      item.log.details?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">操作日志</h1>
        <p className="mt-2 text-gray-600">查看系统所有操作记录</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            筛选条件
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">模块</label>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部模块</SelectItem>
                  <SelectItem value="customer">客户</SelectItem>
                  <SelectItem value="product">产品</SelectItem>
                  <SelectItem value="order">订单</SelectItem>
                  <SelectItem value="user">用户</SelectItem>
                  <SelectItem value="price">价格</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">操作类型</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="create">创建</SelectItem>
                  <SelectItem value="update">更新</SelectItem>
                  <SelectItem value="delete">删除</SelectItem>
                  <SelectItem value="suspend">暂停</SelectItem>
                  <SelectItem value="activate">激活</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">搜索</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索操作人、对象或详情..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>操作记录</CardTitle>
          <CardDescription>共 {filteredLogs?.length || 0} 条记录</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <div className="space-y-3">
              {filteredLogs.map((item) => (
                <div
                  key={item.log.id}
                  className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <FileText className="h-5 w-5 text-gray-400 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">
                        {item.log.userName}
                      </span>
                      <Badge className={operationTypeColors[item.log.operationType]}>
                        {operationTypeLabels[item.log.operationType]}
                      </Badge>
                      <Badge variant="outline">
                        {moduleLabels[item.log.module]}
                      </Badge>
                      {item.log.targetName && (
                        <span className="text-sm text-gray-600">
                          → {item.log.targetName}
                        </span>
                      )}
                    </div>
                    {item.log.details && (
                      <p className="text-sm text-gray-600 mt-1">{item.log.details}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>
                        {format(new Date(item.log.createdAt), "yyyy年MM月dd日 HH:mm", {
                          locale: zhCN,
                        })}
                      </span>
                      {item.log.ipAddress && item.log.ipAddress !== "unknown" && (
                        <span>IP: {item.log.ipAddress}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>暂无操作记录</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
