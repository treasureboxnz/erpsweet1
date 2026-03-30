import { Link, useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Edit, FileText, CheckCircle, XCircle, Clock, User } from "lucide-react";
import { ApprovalBadge } from "@/components/ApprovalBadge";
import { QuotationVersionHistory } from "@/components/QuotationVersionHistory";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function QuotationDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const quotationId = parseInt(id || "0");

  const { data: quotation, isLoading } = trpc.quotations.getById.useQuery({ id: quotationId });
  const { data: approvalHistory } = trpc.quotationApprovals.getApprovalHistory.useQuery({ quotationId });
  const utils = trpc.useUtils();
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitComments, setSubmitComments] = useState("");

  const submitForApproval = trpc.quotationApprovals.submitForApproval.useMutation({
    onSuccess: () => {
      toast.success("已提交审批");
      setSubmitDialogOpen(false);
      setSubmitComments("");
      utils.quotations.getById.invalidate({ id: quotationId });
      utils.quotationApprovals.getApprovalHistory.invalidate({ quotationId });
    },
    onError: (error) => {
      toast.error(`提交失败: ${error.message}`);
    },
  });

  const saveAsTemplate = trpc.quotationTemplates.create.useMutation({
    onSuccess: () => {
      toast.success("已保存为模板");
    },
    onError: (error) => {
      toast.error(`保存失败: ${error.message}`);
    },
  });

  const handleSaveAsTemplate = () => {
    if (!quotation) return;
    
    const templateName = prompt("请输入模板名称:");
    if (!templateName) return;

    // Prepare product groups data
    const productGroups = quotation.items.map((item: any) => ({
      productId: item.productId,
      productName: item.productName,
      sku: item.productSku,
      batches: item.batches || [],
      isExpanded: true,
      fobQuantity: item.fobQuantity,
      fobUnitPrice: item.fobUnitPrice,
      fobSubtotal: item.fobSubtotal,
      fobNotes: item.fobNotes,
    }));

    saveAsTemplate.mutate({
      templateName,
      description: quotation.notes || "",
      quotationMode: quotation.quotationMode || "batch_selection",
      currency: quotation.currency,
      productsData: JSON.stringify({
        quotationMode: quotation.quotationMode,
        productGroups,
      }),
      notes: quotation.notes || "",
    });
  };

  const downloadPDF = trpc.quotations.downloadPDF.useMutation({
    onSuccess: (data) => {
      // Generate PDF using jsPDF
      import('jspdf').then(({ default: jsPDF }) => {
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(20);
        doc.text(`报价单: ${data.quotation.quotationNumber}`, 20, 20);
        
        // Add customer info
        doc.setFontSize(12);
        doc.text(`客户: ${data.customer?.companyName || '-'}`, 20, 35);
        doc.text(`联系人: ${data.quotation.contactPerson || '-'}`, 20, 45);
        doc.text(`联系电话: ${data.quotation.contactPhone || '-'}`, 20, 55);
        doc.text(`联系邮箱: ${data.quotation.contactEmail || '-'}`, 20, 65);
        
        // Add quotation info
        doc.text(`总金额: ${data.quotation.currency} ${parseFloat(data.quotation.totalAmount || '0').toLocaleString()}`, 20, 80);
        doc.text(`有效期: ${data.quotation.validUntil ? new Date(data.quotation.validUntil).toLocaleDateString() : '-'}`, 20, 90);
        
        // Add items table header
        let yPos = 110;
        doc.setFontSize(14);
        doc.text('产品明细', 20, yPos);
        yPos += 10;
        
        // Add items
        doc.setFontSize(10);
        data.items.forEach((item: any, index: number) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`${index + 1}. ${item.productName} (${item.productSku})`, 20, yPos);
          yPos += 7;
          
          if (item.fobQuantity && item.fobUnitPrice) {
            doc.text(`   数量: ${item.fobQuantity}, 单价: ${item.fobUnitPrice}, 小计: ${item.fobSubtotal}`, 25, yPos);
            yPos += 7;
          }
          
          if (item.batches && item.batches.length > 0) {
            item.batches.forEach((batch: any) => {
              doc.text(`   批次: ${batch.variantName || '-'}, 数量: ${batch.quantity}, 单价: ${batch.unitPrice}, 小计: ${batch.subtotal}`, 25, yPos);
              yPos += 7;
            });
          }
          yPos += 3;
        });
        
        // Save PDF
        doc.save(`quotation-${data.quotation.quotationNumber}.pdf`);
        toast.success('报价单PDF已下载');
      });
    },
    onError: (error) => {
      toast.error(`下载失败: ${error.message}`);
    },
  });

  const markAsAccepted = trpc.quotations.markAsAccepted.useMutation({
    onSuccess: () => {
      toast.success("报价单已标记为已接受");
      utils.quotations.getById.invalidate({ id: quotationId });
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  const markAsRejected = trpc.quotations.markAsRejected.useMutation({
    onSuccess: () => {
      toast.success("报价单已标记为已拒绝");
      utils.quotations.getById.invalidate({ id: quotationId });
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

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

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "草稿", variant: "secondary" },
      sent: { label: "已发送", variant: "default" },
      accepted: { label: "已接受", variant: "default" },
      rejected: { label: "已拒绝", variant: "destructive" },
      expired: { label: "已过期", variant: "outline" },
      pending_approval: { label: "待审批", variant: "secondary" },
      approval_rejected: { label: "审批拒绝", variant: "destructive" },
    };
    const config = statusMap[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const isExpired = quotation.validUntil && new Date(quotation.validUntil) < new Date();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/quotations">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{quotation.quotationNumber}</h1>
              {getStatusBadge(quotation.status)}
              {isExpired && quotation.status !== "accepted" && quotation.status !== "rejected" && (
                <Badge variant="outline">已过期</Badge>
              )}
            </div>
            <p className="text-muted-foreground">报价单详情</p>
          </div>
        </div>
        <div className="flex gap-2">
          <QuotationVersionHistory quotationId={quotationId} />
          <Button variant="outline" onClick={handleSaveAsTemplate}>
            <FileText className="h-4 w-4 mr-2" />
            保存为模板
          </Button>
          {quotation.status === "draft" && (
            <>
              <Link href={`/quotations/${quotation.id}/edit`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  编辑
                </Button>
              </Link>
              <Button onClick={() => downloadPDF.mutate({ id: quotation.id })}>
                <FileText className="h-4 w-4 mr-2" />
                下载报价单
              </Button>
            </>
          )}
          {quotation.status === "sent" && (
            <>
              <Button
                variant="outline"
                onClick={() => markAsRejected.mutate({ id: quotation.id })}
              >
                <XCircle className="h-4 w-4 mr-2" />
                标记为已拒绝
              </Button>
              <Button onClick={() => markAsAccepted.mutate({ id: quotation.id })}>
                <CheckCircle className="h-4 w-4 mr-2" />
                标记为已接受
              </Button>
            </>
          )}
          {quotation.status === "accepted" && !quotation.convertedToOrderId && (
            <Button onClick={() => navigate(`/quotations/${quotation.id}/convert`)}>
              转换为订单
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>客户信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">客户名称</p>
                  <p className="font-medium">{quotation.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">报价模式</p>
                  <p className="font-medium">
                    {quotation.quotationMode === "fob_only" ? "订单模式" : "批次模式"}
                  </p>
                </div>
              </div>
              {quotation.contactPerson && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">联系人</p>
                    <p className="font-medium">{quotation.contactPerson}</p>
                  </div>
                  {quotation.contactPhone && (
                    <div>
                      <p className="text-sm text-muted-foreground">联系电话</p>
                      <p className="font-medium">{quotation.contactPhone}</p>
                    </div>
                  )}
                  {quotation.contactEmail && (
                    <div>
                      <p className="text-sm text-muted-foreground">联系邮箱</p>
                      <p className="font-medium">{quotation.contactEmail}</p>
                    </div>
                  )}
                </div>
              )}
              {quotation.shippingAddress && (
                <div>
                  <p className="text-sm text-muted-foreground">收货地址</p>
                  <p className="font-medium">{quotation.shippingAddress}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>产品明细</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>产品</TableHead>
                    {quotation.quotationMode === "batch_selection" && (
                      <TableHead>批次</TableHead>
                    )}
                    <TableHead>供应商SKU</TableHead>
                    <TableHead>客户SKU</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                    {quotation.quotationMode === "batch_selection" && (
                      <>
                        <TableHead className="text-right">毛重(kg)</TableHead>
                        <TableHead className="text-right">净重(kg)</TableHead>
                        <TableHead className="text-right">CBM(m³)</TableHead>
                      </>
                    )}
                    <TableHead className="text-right">单价</TableHead>
                    <TableHead className="text-right">FOB参考价</TableHead>
                    <TableHead className="text-right">小计</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotation.items?.map((item: any) => (
                    <>
                      {quotation.quotationMode === "fob_only" ? (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.productName}</div>
                              <div className="text-sm text-muted-foreground">SKU: {item.sku}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600">{item.supplierSku || "暂无"}</TableCell>
                          <TableCell className="text-gray-600">{item.customerSku || "暂无"}</TableCell>
                          <TableCell className="text-right">{item.fobQuantity}</TableCell>
                          <TableCell className="text-right">
                            {quotation.currency === "USD" ? "$" : "¥"}
                            {parseFloat(item.fobUnitPrice || "0").toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {item.fobReferencePrice ? (
                              `${quotation.currency === "USD" ? "$" : "¥"}${parseFloat(item.fobReferencePrice).toFixed(2)}`
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {quotation.currency === "USD" ? "$" : "¥"}
                            {(parseFloat(item.fobQuantity || "0") * parseFloat(item.fobUnitPrice || "0")).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ) : (
                        item.batches?.map((batch: any, batchIndex: number) => (
                          <TableRow key={`${item.id}-${batchIndex}`}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.productName}</div>
                                <div className="text-sm text-muted-foreground">SKU: {item.sku}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{batch.variantCode}</div>
                                {batch.variantName && (
                                  <div className="text-sm text-muted-foreground">{batch.variantName}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-600">{item.supplierSku || "暂无"}</TableCell>
                            <TableCell className="text-gray-600">{item.customerSku || "暂无"}</TableCell>
                            <TableCell className="text-right">{batch.quantity}</TableCell>
                            <TableCell className="text-right">
                              {batch.grossWeight ? `${parseFloat(batch.grossWeight).toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {batch.netWeight ? `${parseFloat(batch.netWeight).toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {batch.cbm ? `${parseFloat(batch.cbm).toFixed(3)}` : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {quotation.currency === "USD" ? "$" : "¥"}
                              {parseFloat(batch.unitPrice).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {batch.fobReferencePrice ? (
                                `${quotation.currency === "USD" ? "$" : "¥"}${parseFloat(batch.fobReferencePrice).toFixed(2)}`
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {quotation.currency === "USD" ? "$" : "¥"}
                              {(batch.quantity * parseFloat(batch.unitPrice)).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {quotation.notes && (
            <Card>
              <CardHeader>
                <CardTitle>备注信息</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{quotation.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>报价摘要</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">报价单号</span>
                <span className="font-medium">{quotation.quotationNumber}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">货币</span>
                <span className="font-medium">{quotation.currency}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">创建日期</span>
                <span className="font-medium">
                  {new Date(quotation.createdAt).toLocaleDateString("zh-CN")}
                </span>
              </div>
              {quotation.validUntil && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">有效期至</span>
                  <span className={`font-medium ${isExpired ? "text-destructive" : ""}`}>
                    {new Date(quotation.validUntil).toLocaleDateString("zh-CN")}
                  </span>
                </div>
              )}
              <Separator />
              {/* 总重量和CBM汇总 */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">总毛重</span>
                <span className="font-medium">
                  {(quotation.items || []).reduce((sum: number, item: any) => sum + (item.totalGrossWeight || 0), 0).toFixed(2)} kg
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">总净重</span>
                <span className="font-medium">
                  {(quotation.items || []).reduce((sum: number, item: any) => sum + (item.totalNetWeight || 0), 0).toFixed(2)} kg
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">总CBM</span>
                <span className="font-medium">
                  {(quotation.items || []).reduce((sum: number, item: any) => sum + (item.totalCBM || 0), 0).toFixed(2)} m³
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">总金额</span>
                <span className="text-2xl font-bold text-primary">
                  {quotation?.currency === "USD" ? "$" : "¥"}
                  {quotation?.totalAmount ? parseFloat(quotation.totalAmount).toFixed(2) : "0.00"}
                </span>
              </div>
            </CardContent>
          </Card>

          {quotation.requiresApproval && (
            <Card>
              <CardHeader>
                <CardTitle>审批状态</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">审批状态</span>
                  <ApprovalBadge status={quotation.approvalStatus} />
                </div>
                {quotation.status === "draft" && !quotation.approvalStatus && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setSubmitDialogOpen(true)}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    提交审批
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {quotation.convertedToOrderId && (
            <Card>
              <CardHeader>
                <CardTitle>转换信息</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">此报价单已转换为订单</p>
                <Link href={`/orders/${quotation.convertedToOrderId}`}>
                  <Button variant="outline" className="w-full">
                    查看订单
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {approvalHistory && approvalHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>审批历史</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {approvalHistory.map((approval: any) => (
                    <div key={approval.id} className="flex gap-3 pb-4 border-b last:border-0 last:pb-0">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{approval.approverName}</span>
                          <ApprovalBadge status={approval.status} />
                        </div>
                        {approval.comments && (
                          <p className="text-sm text-muted-foreground">{approval.comments}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {approval.decidedAt 
                            ? new Date(approval.decidedAt).toLocaleString('zh-CN')
                            : new Date(approval.createdAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>提交审批</DialogTitle>
            <DialogDescription>
              报价单号: {quotation.quotationNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">备注 (可选)</label>
              <Textarea
                placeholder="请输入备注..."
                value={submitComments}
                onChange={(e) => setSubmitComments(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSubmitDialogOpen(false)}
              disabled={submitForApproval.isPending}
            >
              取消
            </Button>
            <Button
              onClick={() => submitForApproval.mutate({ quotationId, comments: submitComments })}
              disabled={submitForApproval.isPending}
            >
              {submitForApproval.isPending ? "提交中..." : "确认提交"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
