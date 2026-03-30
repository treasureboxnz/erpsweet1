import React, { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, X } from "lucide-react";
import { ColorIcon } from "@/components/ColorIcon";

interface VariantCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: number;
  productSku: string;
  defaultCustomerId?: number; // 默认客户ID
  onSuccess?: (variantId: number) => void; // 创建成功回调
}

export function VariantCreateDialog({
  open,
  onOpenChange,
  productId,
  productSku,
  defaultCustomerId,
  onSuccess,
}: VariantCreateDialogProps) {
  const utils = trpc.useUtils();

  // 颜色选择state
  const [colorSearchQuery, setColorSearchQuery] = useState("");
  const [showColorDropdown, setShowColorDropdown] = useState(false);

  const [formData, setFormData] = useState({
    variantName: "",
    fabricChange: "",
    legTypeChange: "",
    heightChange: "",
    packagingChange: "",
    otherChanges: "",
    productLength: "",
    productWidth: "",
    productHeight: "",
    packageLength: "",
    packageWidth: "",
    packageHeight: "",
    cbm: "",
    variantType: "universal" as "universal" | "exclusive",
    productionStatus: "designing" as "designing" | "sampling" | "production" | "completed",
    supplierId: "" as string,
    supplierSku: "",
    customerId: "" as string,
    customerSku: "",
    materialColorId: "" as string,
    sellingPriceRMB: "",
    sellingPriceFOB: "",
    costPriceRMB: "",
    linkedCustomerIds: [] as number[],
  });

  // 查询供应商列表
  const { data: suppliersData } = trpc.suppliers.list.useQuery();

  // 查询产品供应商关联
  const { data: productSuppliersData = [] } = trpc.products.getSuppliers.useQuery({ productId });

  // 查询客户列表
  const { data: customersData } = trpc.customerManagement.companies.list.useQuery({});

  // 查询材料颜色列表
  const { data: colorsData } = trpc.materials.colors.list.useQuery({
    search: colorSearchQuery || undefined,
  });

  // 获取选中的颜色详情
  const selectedColor = useMemo(() => {
    if (!formData.materialColorId || !colorsData) return null;
    return colorsData.find((item: any) => item.color.id === parseInt(formData.materialColorId));
  }, [formData.materialColorId, colorsData]);

  // 创建批次mutation
  const createVariant = trpc.productVariants.create.useMutation({
    onSuccess: (data) => {
      toast.success("批次创建成功");
      utils.productVariants.getAll.invalidate({ productId });
      onOpenChange(false);
      resetForm();
      // 调用成功回调,传递新创建的批次ID
      if (onSuccess && data.id) {
        onSuccess(data.id);
      }
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  // 当对话框打开时,设置默认值
  useEffect(() => {
    if (open) {
      // 自动填充产品的主供应商
      const primarySupplier = productSuppliersData.find((ps: any) => ps.isPrimary);
      if (primarySupplier) {
        setFormData(prev => ({
          ...prev,
          supplierId: primarySupplier.supplierId.toString(),
        }));
      }

      // 如果有默认客户ID,自动填充
      if (defaultCustomerId) {
        setFormData(prev => ({
          ...prev,
          customerId: defaultCustomerId.toString(),
        }));
      }
    }
  }, [open, defaultCustomerId]); // 移除productSuppliersData以避免无限循环

  // 默认选择ORIG颜色
  useEffect(() => {
    if (open && colorsData && !formData.materialColorId) {
      const defaultColor = colorsData.find(
        (c: any) => c.color.colorCode === 'ORIG'
      );
      if (defaultColor) {
        setFormData(prev => ({
          ...prev,
          materialColorId: defaultColor.color.id.toString(),
        }));
      }
    }
  }, [open, colorsData]);

  // 重置表单
  const resetForm = () => {
    setFormData({
      variantName: "",
      fabricChange: "",
      legTypeChange: "",
      heightChange: "",
      packagingChange: "",
      otherChanges: "",
      productLength: "",
      productWidth: "",
      productHeight: "",
      packageLength: "",
      packageWidth: "",
      packageHeight: "",
      cbm: "",
      variantType: "universal",
      productionStatus: "designing",
      supplierId: "",
      supplierSku: "",
      customerId: "",
      customerSku: "",
      materialColorId: "",
      sellingPriceRMB: "",
      sellingPriceFOB: "",
      costPriceRMB: "",
      linkedCustomerIds: [],
    });
  };

  // 计算CBM
  const calculateCBM = () => {
    const length = parseFloat(formData.packageLength);
    const width = parseFloat(formData.packageWidth);
    const height = parseFloat(formData.packageHeight);

    if (length && width && height) {
      return (length * width * height).toFixed(6);
    }
    return "-";
  };

  // 供应商排序逻辑
  const sortedSuppliers = React.useMemo(() => {
    if (!suppliersData) return { prioritySuppliers: [], otherSuppliers: [] };

    const productSupplierIds = new Set(productSuppliersData.map((ps: any) => ps.supplierId));
    const prioritySuppliers: any[] = [];
    const otherSuppliers: any[] = [];

    suppliersData.forEach((supplier: any) => {
      const isProductSupplier = productSupplierIds.has(supplier.id);
      const isPrimary = productSuppliersData.find((ps: any) => ps.supplierId === supplier.id && ps.isPrimary);

      if (isProductSupplier) {
        prioritySuppliers.push({ ...supplier, isPrimary: !!isPrimary });
      } else {
        otherSuppliers.push(supplier);
      }
    });

    // 主供应商排在最前
    prioritySuppliers.sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return 0;
    });

    return { prioritySuppliers, otherSuppliers };
  }, [suppliersData, productSuppliersData]);

  // 提交创建
  const handleSubmit = () => {
    if (!formData.variantName.trim()) {
      toast.error("请输入批次名称");
      return;
    }

    createVariant.mutate({
      productId,
      variantName: formData.variantName,
      fabricChange: formData.fabricChange || undefined,
      legTypeChange: formData.legTypeChange || undefined,
      heightChange: formData.heightChange || undefined,
      packagingChange: formData.packagingChange || undefined,
      otherChanges: formData.otherChanges || undefined,
      productLength: formData.productLength ? parseFloat(formData.productLength) : undefined,
      productWidth: formData.productWidth ? parseFloat(formData.productWidth) : undefined,
      productHeight: formData.productHeight ? parseFloat(formData.productHeight) : undefined,
      packageLength: formData.packageLength ? parseFloat(formData.packageLength) : undefined,
      packageWidth: formData.packageWidth ? parseFloat(formData.packageWidth) : undefined,
      packageHeight: formData.packageHeight ? parseFloat(formData.packageHeight) : undefined,
      cbm: formData.cbm ? parseFloat(formData.cbm) : undefined,
      variantType: formData.variantType,
      productionStatus: formData.productionStatus,
      supplierId: formData.supplierId && formData.supplierId !== "none" ? parseInt(formData.supplierId) : undefined,
      supplierSku: formData.supplierSku || undefined,
      customerId: formData.customerId && formData.customerId !== "none" ? parseInt(formData.customerId) : undefined,
      customerSku: formData.customerSku || undefined,
      materialColorId: formData.materialColorId && formData.materialColorId !== "none" ? parseInt(formData.materialColorId) : undefined,
      sellingPriceRMB: formData.sellingPriceRMB ? parseFloat(formData.sellingPriceRMB) : undefined,
      sellingPriceFOB: formData.sellingPriceFOB ? parseFloat(formData.sellingPriceFOB) : undefined,
      costPriceRMB: formData.costPriceRMB ? parseFloat(formData.costPriceRMB) : undefined,
      linkedCustomerIds: formData.linkedCustomerIds,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>新建产品变体</SheetTitle>
          <SheetDescription>
            为产品 {productSku} 创建新的产品变体
          </SheetDescription>
        </SheetHeader>
        <div className="px-4">

        <div className="grid grid-cols-1 gap-6">
          {/* 基本信息 */}
          <div className="space-y-4">
            <h3 className="font-semibold mb-4">基本信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="variantName">
                  批次名称 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="variantName"
                  value={formData.variantName}
                  onChange={(e) =>
                    setFormData({ ...formData, variantName: e.target.value })
                  }
                  placeholder="例如：高背版、加厚布料版"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="variantType">批次类型</Label>
                <Select
                  value={formData.variantType}
                  onValueChange={(value: "universal" | "exclusive") =>
                    setFormData({ ...formData, variantType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="universal">通用批次</SelectItem>
                    <SelectItem value="exclusive">客户专属</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="productionStatus">生产状态</Label>
                <Select
                  value={formData.productionStatus}
                  onValueChange={(value: "designing" | "sampling" | "production" | "completed") =>
                    setFormData({ ...formData, productionStatus: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="designing">设计中</SelectItem>
                    <SelectItem value="sampling">打样中</SelectItem>
                    <SelectItem value="production">量产中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="supplierId">供应商</Label>
                <Select
                  value={formData.supplierId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, supplierId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择供应商" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">无</SelectItem>
                    {/* 主供应商和备选供应商 */}
                    {sortedSuppliers.prioritySuppliers.map((supplier: any) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.isPrimary ? '⭐ ' : '🔹 '}{supplier.supplierName}
                      </SelectItem>
                    ))}
                    {/* 分隔线 */}
                    {sortedSuppliers.prioritySuppliers.length > 0 && sortedSuppliers.otherSuppliers.length > 0 && (
                      <SelectSeparator />
                    )}
                    {/* 其他供应商 */}
                    {sortedSuppliers.otherSuppliers.map((supplier: any) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.supplierName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="supplierSku">供应商SKU</Label>
                <Input
                  id="supplierSku"
                  placeholder="输入供应商SKU（工厂SKU编号）"
                  value={formData.supplierSku}
                  onChange={(e) =>
                    setFormData({ ...formData, supplierSku: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="customerId">客户</Label>
                <Select
                  value={formData.customerId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, customerId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择客户" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">无</SelectItem>
                    {customersData?.data?.map((customer: any) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="customerSku">客户SKU</Label>
                <Input
                  id="customerSku"
                  placeholder="输入客户SKU（客户系统SKU编号）"
                  value={formData.customerSku}
                  onChange={(e) =>
                    setFormData({ ...formData, customerSku: e.target.value })
                  }
                />
              </div>
              {/* 布料颜色选择 */}
              <div className="col-span-2">
                <Label className="mb-2 block">布料颜色</Label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="搜索供应商、布板或颜色编号..."
                      value={colorSearchQuery}
                      onChange={(e) => setColorSearchQuery(e.target.value)}
                      onFocus={() => setShowColorDropdown(true)}
                      className="pl-10"
                    />
                  </div>
                  
                  {/* 选中的颜色显示 */}
                  {selectedColor && (
                    <div className="mt-2 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <ColorIcon
                        imageUrl={selectedColor.color.imageUrl}
                        colorCode={selectedColor.color.colorCode}
                        colorName={selectedColor.color.colorName}
                        size="lg"
                      />
                      <div className="flex-1">
                        <div className="font-medium">
                          {selectedColor.supplier?.code || 'N/A'} - {selectedColor.board?.boardNumber || 'N/A'} - {selectedColor.color.colorCode}
                        </div>
                        {selectedColor.color.colorName && (
                          <div className="text-sm text-gray-500">{selectedColor.color.colorName}</div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFormData({ ...formData, materialColorId: "" });
                          setColorSearchQuery("");
                        }}
                      >
                        清除
                      </Button>
                    </div>
                  )}

                  {/* 颜色下拉列表 */}
                  {showColorDropdown && colorSearchQuery && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {colorsData && colorsData.length > 0 ? (
                        colorsData.map((item: any) => (
                          <div
                            key={item.color.id}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              setFormData({ ...formData, materialColorId: item.color.id.toString() });
                              setShowColorDropdown(false);
                              setColorSearchQuery("");
                            }}
                          >
                            <ColorIcon
                              imageUrl={item.color.imageUrl}
                              colorCode={item.color.colorCode}
                              colorName={item.color.colorName}
                              size="md"
                            />
                            <div className="flex-1">
                              <div className="font-medium">
                                {item.supplier.code} - {item.board.boardNumber} - {item.color.colorCode}
                              </div>
                              {item.color.colorName && (
                                <div className="text-sm text-gray-500">{item.color.colorName}</div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">没有找到匹配的颜色</div>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  选择布料颜色后，批次将自动引用该颜色的图片
                </p>
              </div>
            </div>
          </div>

          {/* 变更说明 */}
          <div className="space-y-4">
            <h3 className="font-semibold mb-4">变更说明</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fabricChange">布料变更</Label>
                <Input
                  id="fabricChange"
                  value={formData.fabricChange}
                  onChange={(e) =>
                    setFormData({ ...formData, fabricChange: e.target.value })
                  }
                  placeholder="例如：麻布改绒布"
                />
              </div>
              <div>
                <Label htmlFor="legTypeChange">脚型变更</Label>
                <Input
                  id="legTypeChange"
                  value={formData.legTypeChange}
                  onChange={(e) =>
                    setFormData({ ...formData, legTypeChange: e.target.value })
                  }
                  placeholder="例如：木脚改金属脚"
                />
              </div>
              <div>
                <Label htmlFor="heightChange">高度变更</Label>
                <Input
                  id="heightChange"
                  value={formData.heightChange}
                  onChange={(e) =>
                    setFormData({ ...formData, heightChange: e.target.value })
                  }
                  placeholder="例如：加高10cm"
                />
              </div>
              <div>
                <Label htmlFor="packagingChange">包装变更</Label>
                <Input
                  id="packagingChange"
                  value={formData.packagingChange}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      packagingChange: e.target.value,
                    })
                  }
                  placeholder="例如：纸箱改木箱"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="otherChanges">其他变更</Label>
                <Textarea
                  id="otherChanges"
                  value={formData.otherChanges}
                  onChange={(e) =>
                    setFormData({ ...formData, otherChanges: e.target.value })
                  }
                  placeholder="其他变更说明..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* 尺寸信息 */}
          <div className="space-y-4">
            <h3 className="font-semibold mb-4">尺寸信息</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="productLength">产品长度 (m)</Label>
                <Input
                  id="productLength"
                  type="number"
                  step="0.01"
                  value={formData.productLength}
                  onChange={(e) =>
                    setFormData({ ...formData, productLength: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="productWidth">产品宽度 (m)</Label>
                <Input
                  id="productWidth"
                  type="number"
                  step="0.01"
                  value={formData.productWidth}
                  onChange={(e) =>
                    setFormData({ ...formData, productWidth: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="productHeight">产品高度 (m)</Label>
                <Input
                  id="productHeight"
                  type="number"
                  step="0.01"
                  value={formData.productHeight}
                  onChange={(e) =>
                    setFormData({ ...formData, productHeight: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="packageLength">包装长度 (m)</Label>
                <Input
                  id="packageLength"
                  type="number"
                  step="0.01"
                  value={formData.packageLength}
                  onChange={(e) =>
                    setFormData({ ...formData, packageLength: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="packageWidth">包装宽度 (m)</Label>
                <Input
                  id="packageWidth"
                  type="number"
                  step="0.01"
                  value={formData.packageWidth}
                  onChange={(e) =>
                    setFormData({ ...formData, packageWidth: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="packageHeight">包装高度 (m)</Label>
                <Input
                  id="packageHeight"
                  type="number"
                  step="0.01"
                  value={formData.packageHeight}
                  onChange={(e) =>
                    setFormData({ ...formData, packageHeight: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="col-span-3">
                <Label>CBM (自动计算)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.000001"
                    value={formData.cbm}
                    onChange={(e) =>
                      setFormData({ ...formData, cbm: e.target.value })
                    }
                    placeholder="手动输入或自动计算"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    计算值: {calculateCBM()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  填写包装尺寸后自动计算,也可手动输入
                </p>
              </div>
            </div>
          </div>

          {/* 价格信息 */}
          <div className="space-y-4">
            <h3 className="font-semibold mb-4">价格信息(可选)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="costPriceRMB">成本价 (RMB)</Label>
                <Input
                  id="costPriceRMB"
                  type="number"
                  step="0.01"
                  value={formData.costPriceRMB}
                  onChange={(e) =>
                    setFormData({ ...formData, costPriceRMB: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="sellingPriceRMB">售价 (RMB)</Label>
                <Input
                  id="sellingPriceRMB"
                  type="number"
                  step="0.01"
                  value={formData.sellingPriceRMB}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sellingPriceRMB: e.target.value,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="sellingPriceFOB">FOB价 (USD)</Label>
                <Input
                  id="sellingPriceFOB"
                  type="number"
                  step="0.01"
                  value={formData.sellingPriceFOB}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sellingPriceFOB: e.target.value,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>

        </div>
        <SheetFooter className="border-t px-4 py-3">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetForm();
            }}
          >
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={createVariant.isPending}>
            {createVariant.isPending ? "创建中..." : "创建变体"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
