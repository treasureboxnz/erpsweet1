import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { DollarSign, Package, Ruler } from "lucide-react";

interface OrderFinanceTabProps {
  orderId: number;
  currency: string;
}

export function OrderFinanceTab({ orderId, currency }: OrderFinanceTabProps) {
  // 财务信息状态
  const [customerAdvancePaymentDate, setCustomerAdvancePaymentDate] = useState("");
  const [customerAdvancePaymentAmount, setCustomerAdvancePaymentAmount] = useState("");
  const [customerFinalPaymentDate, setCustomerFinalPaymentDate] = useState("");
  const [customerFinalPaymentAmount, setCustomerFinalPaymentAmount] = useState("");
  const [supplierAdvancePaymentDate, setSupplierAdvancePaymentDate] = useState("");
  const [supplierAdvancePaymentAmount, setSupplierAdvancePaymentAmount] = useState("");
  const [supplierFinalPaymentDate, setSupplierFinalPaymentDate] = useState("");
  const [supplierFinalPaymentAmount, setSupplierFinalPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"30TT_70TT" | "LC_AT_SIGHT">("30TT_70TT");
  const [supplierCurrency, setSupplierCurrency] = useState<"USD" | "RMB" | "EUR" | "GBP">("RMB");
  const [documentsRequired, setDocumentsRequired] = useState("");

  // 查询订单财务信息
  const { data: finance, refetch } = trpc.orderFinance.getByOrderId.useQuery({ orderId });
  
  // 创建或更新订单财务信息
  const createOrUpdateMutation = trpc.orderFinance.createOrUpdate.useMutation({
    onSuccess: () => {
      toast.success("财务信息已保存");
      refetch();
    },
    onError: (error) => {
      toast.error(`保存失败: ${error.message}`);
    },
  });

  // 加载现有数据
  useEffect(() => {
    if (finance) {
      setCustomerAdvancePaymentDate(finance.customerAdvancePaymentDate ? new Date(finance.customerAdvancePaymentDate).toISOString().split('T')[0] : "");
      setCustomerAdvancePaymentAmount(finance.customerAdvancePaymentAmount || "");
      setCustomerFinalPaymentDate(finance.customerFinalPaymentDate ? new Date(finance.customerFinalPaymentDate).toISOString().split('T')[0] : "");
      setCustomerFinalPaymentAmount(finance.customerFinalPaymentAmount || "");
      setSupplierAdvancePaymentDate(finance.supplierAdvancePaymentDate ? new Date(finance.supplierAdvancePaymentDate).toISOString().split('T')[0] : "");
      setSupplierAdvancePaymentAmount(finance.supplierAdvancePaymentAmount || "");
      setSupplierFinalPaymentDate(finance.supplierFinalPaymentDate ? new Date(finance.supplierFinalPaymentDate).toISOString().split('T')[0] : "");
      setSupplierFinalPaymentAmount(finance.supplierFinalPaymentAmount || "");
      setPaymentMethod((finance.paymentMethod as "30TT_70TT" | "LC_AT_SIGHT") || "30TT_70TT");
      setSupplierCurrency((finance.supplierCurrency as "USD" | "RMB" | "EUR" | "GBP") || "RMB");
      setDocumentsRequired((finance as any).documentsRequired || "");
    }
  }, [finance]);

  const handleSave = () => {
    createOrUpdateMutation.mutate({
      orderId,
      customerAdvancePaymentDate: customerAdvancePaymentDate || null,
      customerAdvancePaymentAmount: customerAdvancePaymentAmount || null,
      customerFinalPaymentDate: customerFinalPaymentDate || null,
      customerFinalPaymentAmount: customerFinalPaymentAmount || null,
      supplierAdvancePaymentDate: supplierAdvancePaymentDate || null,
      supplierAdvancePaymentAmount: supplierAdvancePaymentAmount || null,
      supplierFinalPaymentDate: supplierFinalPaymentDate || null,
      supplierFinalPaymentAmount: supplierFinalPaymentAmount || null,
      paymentMethod,
      supplierCurrency,
      documentsRequired: documentsRequired || null,
    });
  };

  // 查询财务汇总数据
  const { data: summary } = trpc.orderFinance.getFinanceSummary.useQuery({ orderId });

  return (
    <div className="space-y-6">
      {/* 财务汇总卡片（只读） */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            财务汇总
          </CardTitle>
          <CardDescription>订单的财务概览数据</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Package className="h-4 w-4" />
                订单数量
              </p>
              <p className="text-2xl font-bold">{summary?.orderQuantity || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Ruler className="h-4 w-4" />
                单个产品体积
              </p>
              <p className="text-2xl font-bold">{summary?.singleProductVolume ? summary.singleProductVolume.toFixed(3) : '-'} m³</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Ruler className="h-4 w-4" />
                总体积
              </p>
              <p className="text-2xl font-bold">{summary?.totalVolume ? summary.totalVolume.toFixed(3) : '-'} m³</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">FOB总价</p>
              <p className="text-2xl font-bold text-green-600">{currency} {summary?.fobTotalPrice ? summary.fobTotalPrice.toFixed(2) : '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">采购单价</p>
              <p className="text-2xl font-bold">RMB {summary?.purchaseUnitPrice ? summary.purchaseUnitPrice.toFixed(2) : '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">采购总价</p>
              <p className="text-2xl font-bold text-orange-600">RMB {summary?.purchaseTotalPrice ? summary.purchaseTotalPrice.toFixed(2) : '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 付款信息表单（可编辑） */}
      <Card>
        <CardHeader>
          <CardTitle>付款信息</CardTitle>
          <CardDescription>管理客户和供应商的付款信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 付款方式 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">付款方式</h3>
            <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as "30TT_70TT" | "LC_AT_SIGHT")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="30TT_70TT" id="30TT_70TT" />
                <Label htmlFor="30TT_70TT" className="font-normal cursor-pointer">
                  30% TT, 70% TT
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="100LC" id="100LC" />
                <Label htmlFor="100LC" className="font-normal cursor-pointer">
                  100% LC AT SIGHT
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* 客户付款信息 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">客户付款</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerAdvancePaymentDate">客户预付款日期</Label>
                <Input
                  id="customerAdvancePaymentDate"
                  type="date"
                  value={customerAdvancePaymentDate}
                  onChange={(e) => setCustomerAdvancePaymentDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerAdvancePaymentAmount">客户预付款金额</Label>
                <div className="flex gap-2">
                  <span className="inline-flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-sm">
                    {currency}
                  </span>
                  <Input
                    id="customerAdvancePaymentAmount"
                    type="number"
                    step="0.01"
                    value={customerAdvancePaymentAmount}
                    onChange={(e) => setCustomerAdvancePaymentAmount(e.target.value)}
                    className="rounded-l-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerFinalPaymentDate">客户尾款付款日期</Label>
                <Input
                  id="customerFinalPaymentDate"
                  type="date"
                  value={customerFinalPaymentDate}
                  onChange={(e) => setCustomerFinalPaymentDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerFinalPaymentAmount">客户尾款付款金额</Label>
                <div className="flex gap-2">
                  <span className="inline-flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-sm">
                    {currency}
                  </span>
                  <Input
                    id="customerFinalPaymentAmount"
                    type="number"
                    step="0.01"
                    value={customerFinalPaymentAmount}
                    onChange={(e) => setCustomerFinalPaymentAmount(e.target.value)}
                    className="rounded-l-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 供应商付款信息 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-semibold text-gray-700">供应商付款</h3>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-gray-600">币种</Label>
                <Select value={supplierCurrency} onValueChange={(value: "USD" | "RMB" | "EUR" | "GBP") => setSupplierCurrency(value)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RMB">RMB</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplierAdvancePaymentDate">供应商预付款日期</Label>
                <Input
                  id="supplierAdvancePaymentDate"
                  type="date"
                  value={supplierAdvancePaymentDate}
                  onChange={(e) => setSupplierAdvancePaymentDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplierAdvancePaymentAmount">供应商预付款金额</Label>
                <div className="flex gap-2">
                  <span className="inline-flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-sm">
                    {supplierCurrency}
                  </span>
                  <Input
                    id="supplierAdvancePaymentAmount"
                    type="number"
                    step="0.01"
                    value={supplierAdvancePaymentAmount}
                    onChange={(e) => setSupplierAdvancePaymentAmount(e.target.value)}
                    className="rounded-l-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplierFinalPaymentDate">供应商尾款日期</Label>
                <Input
                  id="supplierFinalPaymentDate"
                  type="date"
                  value={supplierFinalPaymentDate}
                  onChange={(e) => setSupplierFinalPaymentDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplierFinalPaymentAmount">供应商尾款金额</Label>
                <div className="flex gap-2">
                  <span className="inline-flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-sm">
                    {supplierCurrency}
                  </span>
                  <Input
                    id="supplierFinalPaymentAmount"
                    type="number"
                    step="0.01"
                    value={supplierFinalPaymentAmount}
                    onChange={(e) => setSupplierFinalPaymentAmount(e.target.value)}
                    className="rounded-l-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 单据要求 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">单据要求 Documents Required</h3>
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
              placeholder="例如：CI, PL, BL, CO, Form E ..."
              value={documentsRequired}
              onChange={(e) => setDocumentsRequired(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">此内容将显示在导出合同的第(10)条单据要求中</p>
          </div>

          {/* 保存按钮 */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={createOrUpdateMutation.isPending}>
              {createOrUpdateMutation.isPending ? "保存中..." : "保存财务信息"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
