import { useState, useEffect } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Save, X, History } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PricingTabProps {
  variantId: number;
}

export default function PricingTab({ variantId }: PricingTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [pricingForm, setPricingForm] = useState({
    factoryCostRmbExTax: "",
    factoryCostRmbIncTax: "",
    factoryCostUsdFob: "",
    myCostRmb: "",
    myCostUsd: "",
    fobFeeRmb: "",
    sellingPriceRmbIncTax: "",
    sellingPriceFobL1: "",
    sellingPriceFobL2: "",
    sellingPriceFobL3: "",
    effectiveDate: "",
  });

  const { data: variantData, refetch } = trpc.productVariants.getById.useQuery({
    id: variantId,
  });

  const { data: pricingHistory } = trpc.productVariants.getPricingHistory.useQuery({
    variantId,
  });

  const updatePricingMutation = trpc.productVariants.updatePricing.useMutation({
    onSuccess: () => {
      toast.success("价格更新成功");
      setIsEditing(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const currentPricing = variantData?.currentPricing;

  // 初始化表单数据
  useEffect(() => {
    if (currentPricing) {
      setPricingForm({
        factoryCostRmbExTax: currentPricing.factoryCostRmbExTax || "",
        factoryCostRmbIncTax: currentPricing.factoryCostRmbIncTax || "",
        factoryCostUsdFob: currentPricing.factoryCostUsdFob || "",
        myCostRmb: currentPricing.myCostRmb || "",
        myCostUsd: currentPricing.myCostUsd || "",
        fobFeeRmb: currentPricing.fobFeeRmb || "",
        sellingPriceRmbIncTax: currentPricing.sellingPriceRmbIncTax || "",
        sellingPriceFobL1: currentPricing.sellingPriceFobL1 || "",
        sellingPriceFobL2: currentPricing.sellingPriceFobL2 || "",
        sellingPriceFobL3: currentPricing.sellingPriceFobL3 || "",
        effectiveDate: currentPricing.effectiveDate
          ? new Date(currentPricing.effectiveDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      });
    } else {
      // 如果没有当前价格，设置默认生效日期为今天
      setPricingForm((prev) => ({
        ...prev,
        effectiveDate: new Date().toISOString().split("T")[0],
      }));
    }
  }, [currentPricing]);

  const handleSave = async () => {
    try {
      await updatePricingMutation.mutateAsync({
        variantId,
        factoryCostRmbExTax: pricingForm.factoryCostRmbExTax
          ? parseFloat(pricingForm.factoryCostRmbExTax)
          : undefined,
        factoryCostRmbIncTax: pricingForm.factoryCostRmbIncTax
          ? parseFloat(pricingForm.factoryCostRmbIncTax)
          : undefined,
        factoryCostUsdFob: pricingForm.factoryCostUsdFob
          ? parseFloat(pricingForm.factoryCostUsdFob)
          : undefined,
        myCostRmb: pricingForm.myCostRmb ? parseFloat(pricingForm.myCostRmb) : undefined,
        myCostUsd: pricingForm.myCostUsd ? parseFloat(pricingForm.myCostUsd) : undefined,
        fobFeeRmb: pricingForm.fobFeeRmb ? parseFloat(pricingForm.fobFeeRmb) : undefined,
        sellingPriceRmbIncTax: pricingForm.sellingPriceRmbIncTax
          ? parseFloat(pricingForm.sellingPriceRmbIncTax)
          : undefined,
        sellingPriceFobL1: pricingForm.sellingPriceFobL1
          ? parseFloat(pricingForm.sellingPriceFobL1)
          : undefined,
        sellingPriceFobL2: pricingForm.sellingPriceFobL2
          ? parseFloat(pricingForm.sellingPriceFobL2)
          : undefined,
        sellingPriceFobL3: pricingForm.sellingPriceFobL3
          ? parseFloat(pricingForm.sellingPriceFobL3)
          : undefined,
        effectiveDate: pricingForm.effectiveDate ? new Date(pricingForm.effectiveDate) : undefined,
      });
    } catch (error) {
      // 错误已在mutation的onError中处理
    }
  };

  const handleCancel = () => {
    // 重置表单
    if (currentPricing) {
      setPricingForm({
        factoryCostRmbExTax: currentPricing.factoryCostRmbExTax || "",
        factoryCostRmbIncTax: currentPricing.factoryCostRmbIncTax || "",
        factoryCostUsdFob: currentPricing.factoryCostUsdFob || "",
        myCostRmb: currentPricing.myCostRmb || "",
        myCostUsd: currentPricing.myCostUsd || "",
        fobFeeRmb: currentPricing.fobFeeRmb || "",
        sellingPriceRmbIncTax: currentPricing.sellingPriceRmbIncTax || "",
        sellingPriceFobL1: currentPricing.sellingPriceFobL1 || "",
        sellingPriceFobL2: currentPricing.sellingPriceFobL2 || "",
        sellingPriceFobL3: currentPricing.sellingPriceFobL3 || "",
        effectiveDate: currentPricing.effectiveDate
          ? new Date(currentPricing.effectiveDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      });
    }
    setIsEditing(false);
  };

  // 格式化价格显示
  const formatPrice = (value: string | null, currency: "RMB" | "USD") => {
    if (!value) return "-";
    const num = parseFloat(value);
    const symbol = currency === "RMB" ? "¥" : "$";
    return `${symbol}${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* 当前价格 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>当前价格</CardTitle>
              <CardDescription>
                生效日期:{" "}
                {currentPricing?.effectiveDate
                  ? new Date(currentPricing.effectiveDate).toLocaleDateString("zh-CN")
                  : "未设置"}
              </CardDescription>
            </div>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} size="sm">
                <Edit className="h-4 w-4 mr-2" />
                编辑
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleSave} size="sm" disabled={updatePricingMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  保存
                </Button>
                <Button onClick={handleCancel} size="sm" variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  取消
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* 成本价 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">成本价</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="factoryCostRmbExTax">工厂RMB不含税</Label>
                  {isEditing ? (
                    <Input
                      id="factoryCostRmbExTax"
                      type="number"
                      step="0.01"
                      value={pricingForm.factoryCostRmbExTax}
                      onChange={(e) =>
                        setPricingForm({ ...pricingForm, factoryCostRmbExTax: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  ) : (
                    <p className="mt-1 text-lg font-semibold">
                      {formatPrice(currentPricing?.factoryCostRmbExTax || null, "RMB")}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="factoryCostRmbIncTax">工厂RMB含税</Label>
                  {isEditing ? (
                    <Input
                      id="factoryCostRmbIncTax"
                      type="number"
                      step="0.01"
                      value={pricingForm.factoryCostRmbIncTax}
                      onChange={(e) =>
                        setPricingForm({ ...pricingForm, factoryCostRmbIncTax: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  ) : (
                    <p className="mt-1 text-lg font-semibold">
                      {formatPrice(currentPricing?.factoryCostRmbIncTax || null, "RMB")}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="factoryCostUsdFob">工厂USD FOB</Label>
                  {isEditing ? (
                    <Input
                      id="factoryCostUsdFob"
                      type="number"
                      step="0.01"
                      value={pricingForm.factoryCostUsdFob}
                      onChange={(e) =>
                        setPricingForm({ ...pricingForm, factoryCostUsdFob: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  ) : (
                    <p className="mt-1 text-lg font-semibold">
                      {formatPrice(currentPricing?.factoryCostUsdFob || null, "USD")}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="myCostRmb">我的成本RMB</Label>
                  {isEditing ? (
                    <Input
                      id="myCostRmb"
                      type="number"
                      step="0.01"
                      value={pricingForm.myCostRmb}
                      onChange={(e) => setPricingForm({ ...pricingForm, myCostRmb: e.target.value })}
                      placeholder="0.00"
                    />
                  ) : (
                    <p className="mt-1 text-lg font-semibold">
                      {formatPrice(currentPricing?.myCostRmb || null, "RMB")}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="myCostUsd">我的成本USD</Label>
                  {isEditing ? (
                    <Input
                      id="myCostUsd"
                      type="number"
                      step="0.01"
                      value={pricingForm.myCostUsd}
                      onChange={(e) => setPricingForm({ ...pricingForm, myCostUsd: e.target.value })}
                      placeholder="0.00"
                    />
                  ) : (
                    <p className="mt-1 text-lg font-semibold">
                      {formatPrice(currentPricing?.myCostUsd || null, "USD")}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="fobFeeRmb">FOB费用RMB</Label>
                  {isEditing ? (
                    <Input
                      id="fobFeeRmb"
                      type="number"
                      step="0.01"
                      value={pricingForm.fobFeeRmb}
                      onChange={(e) => setPricingForm({ ...pricingForm, fobFeeRmb: e.target.value })}
                      placeholder="0.00"
                    />
                  ) : (
                    <p className="mt-1 text-lg font-semibold">
                      {formatPrice(currentPricing?.fobFeeRmb || null, "RMB")}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 销售价 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">销售价</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sellingPriceRmbIncTax">RMB含税价</Label>
                  {isEditing ? (
                    <Input
                      id="sellingPriceRmbIncTax"
                      type="number"
                      step="0.01"
                      value={pricingForm.sellingPriceRmbIncTax}
                      onChange={(e) =>
                        setPricingForm({ ...pricingForm, sellingPriceRmbIncTax: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  ) : (
                    <p className="mt-1 text-lg font-semibold">
                      {formatPrice(currentPricing?.sellingPriceRmbIncTax || null, "RMB")}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="sellingPriceFobL1">FOB Level1</Label>
                  {isEditing ? (
                    <Input
                      id="sellingPriceFobL1"
                      type="number"
                      step="0.01"
                      value={pricingForm.sellingPriceFobL1}
                      onChange={(e) =>
                        setPricingForm({ ...pricingForm, sellingPriceFobL1: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  ) : (
                    <p className="mt-1 text-lg font-semibold">
                      {formatPrice(currentPricing?.sellingPriceFobL1 || null, "USD")}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="sellingPriceFobL2">FOB Level2</Label>
                  {isEditing ? (
                    <Input
                      id="sellingPriceFobL2"
                      type="number"
                      step="0.01"
                      value={pricingForm.sellingPriceFobL2}
                      onChange={(e) =>
                        setPricingForm({ ...pricingForm, sellingPriceFobL2: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  ) : (
                    <p className="mt-1 text-lg font-semibold">
                      {formatPrice(currentPricing?.sellingPriceFobL2 || null, "USD")}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="sellingPriceFobL3">FOB Level3</Label>
                  {isEditing ? (
                    <Input
                      id="sellingPriceFobL3"
                      type="number"
                      step="0.01"
                      value={pricingForm.sellingPriceFobL3}
                      onChange={(e) =>
                        setPricingForm({ ...pricingForm, sellingPriceFobL3: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  ) : (
                    <p className="mt-1 text-lg font-semibold">
                      {formatPrice(currentPricing?.sellingPriceFobL3 || null, "USD")}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 生效日期 */}
            {isEditing && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">生效日期</h3>
                <div className="max-w-xs">
                  <Label htmlFor="effectiveDate">生效日期</Label>
                  <Input
                    id="effectiveDate"
                    type="date"
                    value={pricingForm.effectiveDate}
                    onChange={(e) =>
                      setPricingForm({ ...pricingForm, effectiveDate: e.target.value })
                    }
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    设置未来日期可以提前配置价格，到期自动生效
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 价格历史记录 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>价格历史记录</CardTitle>
              <CardDescription>查看所有价格变更历史</CardDescription>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <History className="h-4 w-4 mr-2" />
                  查看历史
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>价格变更历史</DialogTitle>
                  <DialogDescription>所有价格字段的变更记录</DialogDescription>
                </DialogHeader>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>修改时间</TableHead>
                      <TableHead>字段名称</TableHead>
                      <TableHead>旧值</TableHead>
                      <TableHead>新值</TableHead>
                      <TableHead>修改人</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricingHistory && pricingHistory.length > 0 ? (
                      pricingHistory.map((record) => (
                        <TableRow key={record.history.id}>
                          <TableCell>
                            {new Date(record.history.modifiedAt).toLocaleString("zh-CN")}
                          </TableCell>
                          <TableCell>{getFieldLabel(record.history.fieldName)}</TableCell>
                          <TableCell>{record.history.oldValue || "暂无"}</TableCell>
                          <TableCell>{record.history.newValue || "暂无"}</TableCell>
                          <TableCell>{record.modifier?.name || "未知"}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          暂无价格变更记录
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            最近更新:{" "}
            {pricingHistory && pricingHistory.length > 0
              ? new Date(pricingHistory[0].history.modifiedAt).toLocaleString("zh-CN")
              : "暂无记录"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// 字段名称映射
function getFieldLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    factoryCostRmbExTax: "工厂RMB不含税",
    factoryCostRmbIncTax: "工厂RMB含税",
    factoryCostUsdFob: "工厂USD FOB",
    myCostRmb: "我的成本RMB",
    myCostUsd: "我的成本USD",
    fobFeeRmb: "FOB费用RMB",
    sellingPriceRmbIncTax: "RMB含税价",
    sellingPriceFobL1: "FOB Level1",
    sellingPriceFobL2: "FOB Level2",
    sellingPriceFobL3: "FOB Level3",
  };
  return labels[fieldName] || fieldName;
}
