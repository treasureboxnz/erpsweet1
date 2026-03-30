import { useState } from "react";
import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, User, Calendar, DollarSign, Trash2, Edit, Image as ImageIcon, FileDown, ChevronDown } from "lucide-react";
import { OrderProgressBar } from "@/components/OrderProgressBar";
import RabbitLoader from "@/components/RabbitLoader";
import Breadcrumb from "@/components/Breadcrumb";
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
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusConfig = {
  pending: { label: "待确认", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "已确认", color: "bg-blue-100 text-blue-800" },
  processing: { label: "生产中", color: "bg-purple-100 text-purple-800" },
  shipped: { label: "已发货", color: "bg-indigo-100 text-indigo-800" },
  delivered: { label: "已送达", color: "bg-green-100 text-green-800" },
  cancelled: { label: "已取消", color: "bg-red-100 text-red-800" },
};

const paymentStatusConfig = {
  unpaid: { label: "未付款", color: "bg-red-100 text-red-800" },
  partial: { label: "部分付款", color: "bg-yellow-100 text-yellow-800" },
  paid: { label: "已付款", color: "bg-green-100 text-green-800" },
};

export default function OrderDetail() {
  const params = useParams();
  const orderId = params.id ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

  // Invoice generation mutations
  const generateCustomerInvoice = trpc.invoice.generateCustomerInvoice.useMutation();
  const generateInternalInvoice = trpc.invoice.generateInternalInvoice.useMutation();
  const generateFactoryInvoices = trpc.invoice.generateFactoryInvoices.useMutation();

  // Helper function to download file from base64
  const downloadFile = (base64Data: string, fileName: string, mimeType: string) => {
    try {
      // Decode base64 in chunks to handle large files
      const binaryStr = atob(base64Data);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      console.error('Download failed:', err);
      throw new Error('文件下载失败');
    }
  };

  // Handle invoice generation
  const handleGenerateInvoice = async (type: 'customer' | 'internal' | 'factory') => {
    setIsGeneratingInvoice(true);
    try {
      let result;
      if (type === 'customer') {
        result = await generateCustomerInvoice.mutateAsync({ orderId });
        toast.success('客户版Invoice生成成功');
      } else if (type === 'internal') {
        result = await generateInternalInvoice.mutateAsync({ orderId });
        toast.success('内部版Invoice生成成功');
      } else {
        result = await generateFactoryInvoices.mutateAsync({ orderId });
        toast.success('工厂版Invoice生成成功');
      }
      downloadFile(result.data, result.fileName, result.mimeType);
    } catch (error: any) {
      toast.error('Invoice生成失败', { description: error.message });
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const { data: order, isLoading, refetch } = trpc.orders.getById.useQuery({ id: orderId });
  
  // Debug logging
  console.log('[OrderDetail] Render:', { orderId, isLoading, hasOrder: !!order, order });
  
  if (order) {
    console.log('[OrderDetail] Order items:', (order as any).items);
    if ((order as any).items && (order as any).items.length > 0) {
      console.log('[OrderDetail] First item materials:', (order as any).items[0].materials);
    }
  }
  
  // Delete mutation
  const deleteMutation = trpc.orders.delete.useMutation({
    onSuccess: () => {
      toast.success("订单已删除", { description: "订单已移至已删除订单列表" });
      setLocation("/orders");
    },
    onError: (error) => {
      toast.error("删除失败", { description: error.message });
    },
  });

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    const d = new Date(date);
    return d.toLocaleDateString("zh-CN");
  };

  const formatCurrency = (amount: number | string, currency: string | null) => {
    const curr = currency || 'USD';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (curr === "USD") {
      return `$ ${numAmount.toFixed(2)}`;
    } else if (curr === "RMB") {
      return `¥ ${numAmount.toFixed(2)}`;
    }
    return `${numAmount.toFixed(2)} ${curr}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RabbitLoader size="lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">订单不存在</h2>
          <p className="mt-2 text-gray-600">找不到该订单信息</p>
          <Link href="/orders">
            <Button className="mt-4">返回订单列表</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "首页", href: "/" },
          { label: "订单管理", href: "/orders" },
          { label: `订单详情 - ${(order as any).orderNumber}` },
        ]}
      />

      <div className="mt-6 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">订单详情</h1>
            <p className="mt-2 text-gray-600">订单编号: {(order as any).orderNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Badge className={statusConfig[(order as any).status as keyof typeof statusConfig]?.color || ""}>
              {statusConfig[(order as any).status as keyof typeof statusConfig]?.label || (order as any).status}
            </Badge>
            <Badge className={paymentStatusConfig[(order as any).paymentStatus as keyof typeof paymentStatusConfig]?.color || ""}>
              {paymentStatusConfig[(order as any).paymentStatus as keyof typeof paymentStatusConfig]?.label || (order as any).paymentStatus}
            </Badge>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isGeneratingInvoice}>
                  <FileDown className="mr-2 h-4 w-4" />
                  {isGeneratingInvoice ? '生成中...' : '导出Invoice'}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleGenerateInvoice('customer')}>
                  客户版Invoice
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleGenerateInvoice('internal')}>
                  内部版Invoice
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleGenerateInvoice('factory')}>
                  工厂版Invoice
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href={`/orders/${orderId}/edit`}>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                编辑订单
              </Button>
            </Link>
            <Button 
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              删除订单
            </Button>
          </div>
        </div>
      </div>

      {/* Order Progress Bar */}
      <Card className="mb-2">
        <CardContent className="pt-6 pb-4">
          <OrderProgressBar
            status={(order as any).status}
            paymentStatus={(order as any).paymentStatus}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧主要内容 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 产品明细 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                产品明细
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>产品名称</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>供应商SKU</TableHead>
                    <TableHead>客户SKU</TableHead>
                    <TableHead>材料</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                    <TableHead className="text-right">毛重(kg)</TableHead>
                    <TableHead className="text-right">净重(kg)</TableHead>
                    <TableHead className="text-right">CBM(m³)</TableHead>
                    <TableHead className="text-right">单价</TableHead>
                    <TableHead className="text-right">小计</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-gray-600">{item.sku || "暂无"}</TableCell>
                      <TableCell className="text-gray-600">{item.supplierSku || "暂无"}</TableCell>
                      <TableCell className="text-gray-600">{item.customerSku || "暂无"}</TableCell>
                      <TableCell>
                        {/* 显示最多3个材料图片 */}
                        {item.materials && item.materials.length > 0 ? (
                          <div className="flex items-center gap-1">
                            {item.materials.slice(0, 3).map((material: any, idx: number) => (
                              <div key={idx} className="relative w-8 h-8 rounded border overflow-hidden flex-shrink-0" title={`${material.materialTypeName || material.materialType || ''} - ${material.colorName} (${material.colorCode})`}>
                                {material.imageUrl ? (
                                  <img
                                    src={material.imageUrl}
                                    alt={material.colorName}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                    <ImageIcon className="h-4 w-4 text-gray-400" />
                                  </div>
                                )}
                                {/* 材料类型图标叠加层 */}
                                {material.materialTypeIcon && (
                                  <div className="absolute bottom-0 right-0 bg-white/90 rounded-tl px-0.5 py-0.5 text-[10px] leading-none">
                                    {material.materialTypeIcon}
                                  </div>
                                )}
                              </div>
                            ))}
                            {item.materialCount > 3 && (
                              <span className="text-xs text-muted-foreground ml-1">+{item.materialCount - 3}</span>
                            )}
                          </div>
                        ) : item.materialColor ? (
                          /* Fallback: 旧的单材料显示 */
                          <div className="w-8 h-8 rounded border overflow-hidden" title={`${item.materialColor.colorName} (${item.materialColor.colorCode})`}>
                            {item.materialColor.imageUrl ? (
                              <img
                                src={item.materialColor.imageUrl}
                                alt={item.materialColor.colorName}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                <ImageIcon className="h-4 w-4 text-gray-400" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {item.totalGrossWeight > 0 ? item.totalGrossWeight.toFixed(2) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.totalNetWeight > 0 ? item.totalNetWeight.toFixed(2) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.totalCBM > 0 ? item.totalCBM.toFixed(2) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unitPrice, (order as any).currency)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.subtotal, (order as any).currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 flex justify-end">
                <div className="w-80 space-y-2">
                  {/* 总重量和CBM汇总 */}
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>总毛重</span>
                    <span className="font-medium">
                      {(order.items || []).reduce((sum: number, item: any) => sum + (item.totalGrossWeight || 0), 0).toFixed(2)} kg
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>总净重</span>
                    <span className="font-medium">
                      {(order.items || []).reduce((sum: number, item: any) => sum + (item.totalNetWeight || 0), 0).toFixed(2)} kg
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>总CBM</span>
                    <span className="font-medium">
                      {(order.items || []).reduce((sum: number, item: any) => sum + (item.totalCBM || 0), 0).toFixed(2)} m³
                    </span>
                  </div>
                  {/* 订单总额 */}
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>订单总额</span>
                    <span className="text-blue-600">
                      {formatCurrency((order as any).totalAmount, (order as any).currency)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 备注信息 */}
          {(order as any).notes && (
            <Card>
              <CardHeader>
                <CardTitle>订单备注</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{(order as any).notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧信息栏 */}
        <div className="space-y-6">
          {/* 客户信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                客户信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">客户名称</p>
                <p className="font-medium">{(order as any).customerName || "暂无"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">联系人</p>
                <p className="font-medium">{(order as any).contactPerson || "暂无"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">联系电话</p>
                <p className="font-medium">{(order as any).contactPhone || "暂无"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">联系邮箱</p>
                <p className="font-medium">{(order as any).contactEmail || "暂无"}</p>
              </div>
            </CardContent>
          </Card>

          {/* 订单信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                订单信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">订单日期</p>
                <p className="font-medium">{formatDate((order as any).orderDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">预计交货日期</p>
                <p className="font-medium">{formatDate((order as any).expectedDeliveryDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">实际交货日期</p>
                <p className="font-medium">{formatDate((order as any).actualDeliveryDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">创建时间</p>
                <p className="font-medium">{formatDate((order as any).createdAt)}</p>
              </div>
            </CardContent>
          </Card>

          {/* 金额信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                金额信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">币种</p>
                <p className="font-medium">{(order as any).currency}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">订单金额</p>
                <p className="font-medium text-lg text-blue-600">
                  {formatCurrency((order as any).totalAmount, (order as any).currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">付款状态</p>
                <Badge className={paymentStatusConfig[(order as any).paymentStatus as keyof typeof paymentStatusConfig]?.color || ""}>
                  {paymentStatusConfig[(order as any).paymentStatus as keyof typeof paymentStatusConfig]?.label || (order as any).paymentStatus}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
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
              onClick={() => deleteMutation.mutate({ id: orderId })}
              className="bg-red-600 hover:bg-red-700"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
