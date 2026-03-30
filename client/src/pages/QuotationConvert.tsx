import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function QuotationConvert() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const quotationId = parseInt(id || "0");

  const { data: quotation, isLoading } = trpc.quotations.getById.useQuery({ id: quotationId });
  
  const [formData, setFormData] = useState({
    contactPhone: "",
    contactEmail: "",
    shippingAddress: "",
    notes: "",
  });

  const convertToOrder = trpc.quotations.convertToOrder.useMutation({
    onSuccess: (data) => {
      toast.success("报价单已成功转换为订单");
      navigate(`/orders/${data.orderId}`);
    },
    onError: (error) => {
      toast.error(`转换失败: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    convertToOrder.mutate({
      quotationId,
      ...formData,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">加载中...</div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">报价单不存在</p>
          <Link href="/quotations">
            <Button className="mt-4">返回列表</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (quotation.status !== "accepted") {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">只有已接受的报价单才能转换为订单</p>
          <Link href={`/quotations/${quotationId}`}>
            <Button className="mt-4">返回报价单详情</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (quotation.convertedToOrderId) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">此报价单已转换为订单</p>
          <Link href={`/orders/${quotation.convertedToOrderId}`}>
            <Button className="mt-4">查看订单</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/quotations/${quotationId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">转换报价单为订单</h1>
          <p className="text-muted-foreground mt-1">
            报价单号: {quotation.quotationNumber}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>报价单信息</CardTitle>
          <CardDescription>
            将报价单转换为订单，请填写订单相关信息
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">客户</p>
              <p className="font-medium">{quotation.customer?.name || "暂无"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">报价金额</p>
              <p className="font-medium">
                {quotation.currency} {quotation.totalAmount?.toLocaleString() || "0"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">产品数量</p>
              <p className="font-medium">{quotation.items?.length || 0} 个产品</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">报价模式</p>
              <p className="font-medium">
                {quotation.pricingMode === "order" ? "订单模式" : "批次模式"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>订单信息</CardTitle>
            <CardDescription>
              填写订单的联系方式和配送信息
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPhone">联系电话</Label>
                <Input
                  id="contactPhone"
                  placeholder="请输入联系电话"
                  value={formData.contactPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPhone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">联系邮箱</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="请输入联系邮箱"
                  value={formData.contactEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, contactEmail: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shippingAddress">配送地址</Label>
              <Textarea
                id="shippingAddress"
                placeholder="请输入配送地址"
                value={formData.shippingAddress}
                onChange={(e) =>
                  setFormData({ ...formData, shippingAddress: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">订单备注</Label>
              <Textarea
                id="notes"
                placeholder="请输入订单备注（可选）"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/quotations/${quotationId}`}>
            <Button type="button" variant="outline">
              取消
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={convertToOrder.isPending}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {convertToOrder.isPending ? "转换中..." : "确认转换为订单"}
          </Button>
        </div>
      </form>
    </div>
  );
}
