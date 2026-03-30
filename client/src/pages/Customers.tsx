import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Plus, Search, Mail, Phone, MapPin } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Customers() {
  const { data: customers, isLoading } = trpc.customers.list.useQuery();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline", label: string }> = {
      active: { variant: "default", label: "活跃" },
      inactive: { variant: "secondary", label: "不活跃" },
      potential: { variant: "outline", label: "潜在" },
    };
    const config = variants[status] || variants.potential;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">客户管理</h1>
          <p className="text-gray-500 mt-1">管理您的客户信息和联系记录</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          新增客户
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索客户名称、联系人、邮箱..."
                className="pl-10"
              />
            </div>
            <Button variant="outline">筛选</Button>
            <Button variant="outline">导出</Button>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>客户列表</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : customers && customers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16"></TableHead>
                  <TableHead>公司名称</TableHead>
                  <TableHead>客户类型</TableHead>
                  <TableHead>地区</TableHead>
                  <TableHead>合作状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      {customer.logoUrl ? (
                        <img
                          src={customer.logoUrl}
                          alt={customer.companyName}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                          {customer.companyName
                            ?.split(' ')
                            .filter(word => word.length > 0)
                            .slice(0, 2)
                            .map(word => word.charAt(0).toUpperCase())
                            .join('') || '?'}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{customer.companyName}</TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-500">
                        {customer.customerNature || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.country && (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          {customer.country}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(customer.cooperationStatus)}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(customer.createdAt).toLocaleDateString("zh-CN")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">查看</Button>
                      <Button variant="ghost" size="sm">编辑</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">暂无客户数据</p>
              <Button className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                添加第一个客户
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
