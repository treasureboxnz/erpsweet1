import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ColorIcon } from '@/components/ColorIcon';
import { Badge } from '@/components/ui/badge';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Edit, Save, X, Search } from "lucide-react";
import { PackageBoxesManager } from "@/components/PackageBoxesManager";
import { toast } from "sonner";
import PricingTab from "@/components/PricingTab";
import ImagesTab from "@/components/ImagesTab";
import { SupplierVersions } from "@/components/SupplierVersions";
import AttributeSelector from "@/components/AttributeSelector";
import { MaterialSelectionTab } from "@/components/MaterialSelectionTab";

interface VariantDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variantId: number;
  productId: number;
}

export default function VariantDetail({ open, onOpenChange, variantId, productId }: VariantDetailProps) {

  const [isEditing, setIsEditing] = useState(true);
  const [editForm, setEditForm] = useState({
    variantName: "",
    fabricChange: [] as string[],
    legTypeChange: [] as string[],
    heightChange: [] as string[],
    packagingChange: [] as string[],
    otherChanges: "",
    productLength: "",
    productWidth: "",
    productHeight: "",
    packageLength: "",
    packageWidth: "",
    packageHeight: "",
    variantType: "universal" as "universal" | "exclusive",
    selectedCustomerIds: [] as number[],
    materialColorId: null as number | null,
    supplierSku: "",
    customerSku: "",
  });
  
  // 颜色选择相关state
  const [colorSearch, setColorSearch] = useState("");
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [selectedColor, setSelectedColor] = useState<any>(null);
  
  // 二级Tab状态
  const [subTab, setSubTab] = useState("basic");
  // 产品尺寸单位
  const [productDimUnit, setProductDimUnit] = useState<"cm" | "m">("cm");
  
  // 点击外部关闭颜色下拉框
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showColorDropdown) {
        setShowColorDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showColorDropdown]);

  const { data: variantData, isLoading, refetch } = trpc.productVariants.getById.useQuery({
    id: variantId,
  });

  const { data: customersData } = trpc.customerManagement.companies.list.useQuery({
    page: 1,
    pageSize: 1000,
  });
  
  // 查询颜色列表
  const { data: colorsData } = trpc.materials.colors.list.useQuery({
    search: colorSearch || undefined,
  });

  const updateVariantMutation = trpc.productVariants.update.useMutation({
    onSuccess: () => {
      toast.success("批次信息更新成功");
      setIsEditing(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const updateCustomerLinksMutation = trpc.productVariants.updateCustomerLinks.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const variant = variantData?.variant;
  const linkedCustomers = variantData?.linkedCustomers || [];

  // 计算CBM（转换为米后计算）
  const calculatedCBM = useMemo(() => {
    const factor = productDimUnit === "cm" ? 0.01 : 1;
    const length = (parseFloat(editForm.packageLength) || 0) * factor;
    const width = (parseFloat(editForm.packageWidth) || 0) * factor;
    const height = (parseFloat(editForm.packageHeight) || 0) * factor;
    
    if (length && width && height) {
      return (length * width * height).toFixed(6);
    }
    return null;
  }, [editForm.packageLength, editForm.packageWidth, editForm.packageHeight, productDimUnit]);

  // 初始化表单数据和选中的颜色
  useEffect(() => {
    if (variant) {
      setEditForm({
        variantName: variant.variantName || "",
        fabricChange: variant.fabricChange ? [variant.fabricChange] : [],
        legTypeChange: variant.legTypeChange ? [variant.legTypeChange] : [],
        heightChange: variant.heightChange ? [variant.heightChange] : [],
        packagingChange: variant.packagingChange ? [variant.packagingChange] : [],
        otherChanges: variant.otherChanges || "",
        productLength: variant.productLength ? String(parseFloat((parseFloat(variant.productLength) * (productDimUnit === "cm" ? 100 : 1)).toPrecision(6))) : "",
        productWidth: variant.productWidth ? String(parseFloat((parseFloat(variant.productWidth) * (productDimUnit === "cm" ? 100 : 1)).toPrecision(6))) : "",
        productHeight: variant.productHeight ? String(parseFloat((parseFloat(variant.productHeight) * (productDimUnit === "cm" ? 100 : 1)).toPrecision(6))) : "",
        packageLength: variant.packageLength ? String(parseFloat((parseFloat(variant.packageLength) * (productDimUnit === "cm" ? 100 : 1)).toPrecision(6))) : "",
        packageWidth: variant.packageWidth ? String(parseFloat((parseFloat(variant.packageWidth) * (productDimUnit === "cm" ? 100 : 1)).toPrecision(6))) : "",
        packageHeight: variant.packageHeight ? String(parseFloat((parseFloat(variant.packageHeight) * (productDimUnit === "cm" ? 100 : 1)).toPrecision(6))) : "",
        variantType: variant.variantType as "universal" | "exclusive",
        selectedCustomerIds: linkedCustomers.map((c) => c?.id).filter(Boolean) as number[],
        materialColorId: (variant as any).materialColorId || null,
        supplierSku: (variant as any).supplierSku || "",
        customerSku: (variant as any).customerSku || "",
      });
      
      // 设置选中的颜色
      if ((variantData as any)?.materialColor) {
        setSelectedColor((variantData as any).materialColor);
      }
    }
  }, [variant, linkedCustomers, variantData]);

  const handleSave = async () => {
    try {
      // 更新批次信息
      await updateVariantMutation.mutateAsync({
        id: variantId,
        variantName: editForm.variantName,
        fabricChange: editForm.fabricChange[0] || undefined,
        legTypeChange: editForm.legTypeChange[0] || undefined,
        heightChange: editForm.heightChange[0] || undefined,
        packagingChange: editForm.packagingChange[0] || undefined,
        otherChanges: editForm.otherChanges || undefined,
        productLength: editForm.productLength ? parseFloat(editForm.productLength) * (productDimUnit === "cm" ? 0.01 : 1) : undefined,
        productWidth: editForm.productWidth ? parseFloat(editForm.productWidth) * (productDimUnit === "cm" ? 0.01 : 1) : undefined,
        productHeight: editForm.productHeight ? parseFloat(editForm.productHeight) * (productDimUnit === "cm" ? 0.01 : 1) : undefined,
        packageLength: editForm.packageLength ? parseFloat(editForm.packageLength) * (productDimUnit === "cm" ? 0.01 : 1) : undefined,
        packageWidth: editForm.packageWidth ? parseFloat(editForm.packageWidth) * (productDimUnit === "cm" ? 0.01 : 1) : undefined,
        packageHeight: editForm.packageHeight ? parseFloat(editForm.packageHeight) * (productDimUnit === "cm" ? 0.01 : 1) : undefined,
        variantType: editForm.variantType,
        materialColorId: editForm.materialColorId || undefined,
        supplierSku: editForm.supplierSku || undefined,
        customerSku: editForm.customerSku || undefined,
      } as any);

      // 更新客户关联
      if (editForm.variantType === "exclusive") {
        await updateCustomerLinksMutation.mutateAsync({
          variantId,
          customerIds: editForm.selectedCustomerIds,
        });
      }
    } catch (error) {
      // 错误已在mutation的onError中处理
    }
  };

  const handleCancel = () => {
    // 重置表单
    if (variant) {
      setEditForm({
        variantName: variant.variantName || "",
        fabricChange: variant.fabricChange ? [variant.fabricChange] : [],
        legTypeChange: variant.legTypeChange ? [variant.legTypeChange] : [],
        heightChange: variant.heightChange ? [variant.heightChange] : [],
        packagingChange: variant.packagingChange ? [variant.packagingChange] : [],
        otherChanges: variant.otherChanges || "",
        productLength: variant.productLength ? String(parseFloat((parseFloat(variant.productLength) * (productDimUnit === "cm" ? 100 : 1)).toPrecision(6))) : "",
        productWidth: variant.productWidth ? String(parseFloat((parseFloat(variant.productWidth) * (productDimUnit === "cm" ? 100 : 1)).toPrecision(6))) : "",
        productHeight: variant.productHeight ? String(parseFloat((parseFloat(variant.productHeight) * (productDimUnit === "cm" ? 100 : 1)).toPrecision(6))) : "",
        packageLength: variant.packageLength ? String(parseFloat((parseFloat(variant.packageLength) * (productDimUnit === "cm" ? 100 : 1)).toPrecision(6))) : "",
        packageWidth: variant.packageWidth ? String(parseFloat((parseFloat(variant.packageWidth) * (productDimUnit === "cm" ? 100 : 1)).toPrecision(6))) : "",
        packageHeight: variant.packageHeight ? String(parseFloat((parseFloat(variant.packageHeight) * (productDimUnit === "cm" ? 100 : 1)).toPrecision(6))) : "",
        variantType: variant.variantType as "universal" | "exclusive",
        selectedCustomerIds: linkedCustomers.map((c) => c?.id).filter(Boolean) as number[],
        materialColorId: (variant as any).materialColorId || null,
        supplierSku: (variant as any).supplierSku || "",
        customerSku: (variant as any).customerSku || "",
      });
    }
    setIsEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1728px] sm:max-w-[1728px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              批次详情
              <span className="text-sm font-normal text-muted-foreground ml-3">
                批次编号: <code className="bg-muted px-2 py-1 rounded text-xs">{variantData?.variant?.variantCode}</code>
              </span>
            </DialogTitle>
              <Button onClick={handleSave} size="sm" className="h-8 mr-8">
                保存
              </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !variantData || !variant ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">批次不存在</p>
          </div>
        ) : (
          <div className="space-y-6">

        {/* Tabs */}
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="inline-flex h-9 items-center justify-start rounded-none border-b border-border bg-transparent p-0 gap-1">
            <TabsTrigger value="info" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-background data-[state=inactive]:text-foreground rounded-md px-3 py-1.5 text-xs font-medium transition-all">批次信息</TabsTrigger>
            <TabsTrigger value="pricing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-background data-[state=inactive]:text-foreground rounded-md px-3 py-1.5 text-xs font-medium transition-all">价格管理</TabsTrigger>
            <TabsTrigger value="images" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-background data-[state=inactive]:text-foreground rounded-md px-3 py-1.5 text-xs font-medium transition-all">图片管理</TabsTrigger>
            <TabsTrigger value="materials" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-background data-[state=inactive]:text-foreground rounded-md px-3 py-1.5 text-xs font-medium transition-all">材料选择</TabsTrigger>
            <TabsTrigger value="suppliers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-background data-[state=inactive]:text-foreground rounded-md px-3 py-1.5 text-xs font-medium transition-all">供应商版本</TabsTrigger>
          </TabsList>

          {/* 批次信息 Tab - 重构为二级Tab结构 */}
          <TabsContent value="info" className="space-y-6">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>批次信息</CardTitle>
                  <CardDescription>查看和编辑批次的详细信息</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {/* 二级Tab导航 */}
                <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
                  <TabsList className="inline-flex h-8 items-center justify-start rounded-none bg-transparent p-0 gap-1 mb-6">
                    <TabsTrigger value="basic" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-foreground rounded-md px-3 py-1.5 text-xs font-medium transition-all">基本信息</TabsTrigger>
                    <TabsTrigger value="color" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-foreground rounded-md px-3 py-1.5 text-xs font-medium transition-all">布料颜色</TabsTrigger>
                    <TabsTrigger value="product-dimensions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-foreground rounded-md px-3 py-1.5 text-xs font-medium transition-all">产品尺寸</TabsTrigger>
                    <TabsTrigger value="packaging" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-foreground rounded-md px-3 py-1.5 text-xs font-medium transition-all">包装信息</TabsTrigger>
                    <TabsTrigger value="changes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-foreground rounded-md px-3 py-1.5 text-xs font-medium transition-all">变更说明</TabsTrigger>
                  </TabsList>

                  {/* 基本信息 Sub Tab */}
                  <TabsContent value="basic" className="space-y-4">
                    {/* 第一行:批次编号+创建时间(左),右边留空 */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* 批次编号和创建时间合并卡片 */}
                      <Card>
                        <CardContent className="p-4 space-y-3">
                          {/* 批次编号 */}
                          <div className="flex items-center justify-between">
                            <Label className="text-sm text-gray-600">批次编号</Label>
                            <div className="text-sm font-mono text-gray-900">{variant?.variantCode}</div>
                          </div>
                          {/* 创建时间 */}
                          <div className="flex items-center justify-between">
                            <Label className="text-sm text-gray-600">创建时间</Label>
                            <div className="text-sm text-gray-900">
                              {variant?.createdAt ? new Date(variant.createdAt).toLocaleString("zh-CN") : "未知"}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* 右边留空 */}
                      <div></div>
                    </div>

                    {/* 第二行:批次名称(左),批次类型(右) */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* 批次名称卡片 */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Label htmlFor="variantName" className="text-sm text-gray-600 whitespace-nowrap">
                              批次名称 <span className="text-destructive">*</span>
                            </Label>
                            {isEditing ? (
                              <Input
                                id="variantName"
                                value={editForm.variantName}
                                onChange={(e) => setEditForm({ ...editForm, variantName: e.target.value })}
                                placeholder="例如：高背版、加厚布料版"
                                className="h-7 flex-1"
                              />
                            ) : (
                              <div className="text-sm text-gray-900 flex-1">{variant?.variantName || "暂无说明"}</div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* 批次类型卡片 */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Label htmlFor="variantType" className="text-sm text-gray-600 whitespace-nowrap">批次类型</Label>
                            {isEditing ? (
                              <Select
                                value={editForm.variantType}
                                onValueChange={(value) =>
                                  setEditForm({ ...editForm, variantType: value as "universal" | "exclusive" })
                                }
                              >
                                <SelectTrigger className="h-7 flex-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="universal">通用批次</SelectItem>
                                  <SelectItem value="exclusive">客户专属</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="text-sm text-gray-900 flex-1">
                                {variant?.variantType === "universal" ? "通用批次" : "客户专属"}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* 第三行:SKU信息 */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* 供应商SKU卡片 */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Label htmlFor="supplierSku" className="text-sm text-gray-600 whitespace-nowrap">供应商SKU</Label>
                            {isEditing ? (
                              <Input
                                id="supplierSku"
                                value={editForm.supplierSku}
                                onChange={(e) => setEditForm({ ...editForm, supplierSku: e.target.value })}
                                placeholder="输入供应商SKU（工厂SKU编号）"
                                className="h-7 flex-1"
                              />
                            ) : (
                              <div className="text-sm text-gray-900 flex-1">{(variant as any)?.supplierSku || "暂无"}</div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* 客户SKU卡片 */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Label htmlFor="customerSku" className="text-sm text-gray-600 whitespace-nowrap">客户SKU</Label>
                            {isEditing ? (
                              <Input
                                id="customerSku"
                                value={editForm.customerSku}
                                onChange={(e) => setEditForm({ ...editForm, customerSku: e.target.value })}
                                placeholder="输入客户SKU（客户系统SKU编号）"
                                className="h-7 flex-1"
                              />
                            ) : (
                              <div className="text-sm text-gray-900 flex-1">{(variant as any)?.customerSku || "暂无"}</div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* 客户绑定卡片（仅客户专属批次） */}
                    {editForm.variantType === "exclusive" && (
                      <Card>
                        <CardHeader>
                          <CardTitle>客户绑定</CardTitle>
                          <CardDescription>选择可以访问此批次的客户</CardDescription>
                        </CardHeader>
                        <CardContent>
                        {isEditing ? (
                          <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-4">
                            {customersData?.data.map((customer: any) => (
                              <label key={customer.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                                <input
                                  type="checkbox"
                                  checked={editForm.selectedCustomerIds.includes(customer.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEditForm({
                                        ...editForm,
                                        selectedCustomerIds: [...editForm.selectedCustomerIds, customer.id],
                                      });
                                    } else {
                                      setEditForm({
                                        ...editForm,
                                        selectedCustomerIds: editForm.selectedCustomerIds.filter(
                                          (id) => id !== customer.id
                                        ),
                                      });
                                    }
                                  }}
                                  className="rounded-md w-4 h-4"
                                />
                                <span className="text-sm text-gray-900">{customer.companyName}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {linkedCustomers.length > 0 ? (
                              linkedCustomers.map((customer) => (
                                <Badge key={customer?.id} variant="outline" className="rounded-lg text-sm">
                                  {customer?.companyName}
                                </Badge>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500">未绑定客户</p>
                            )}
                          </div>
                        )}
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* 布料颜色 Sub Tab */}
                  <TabsContent value="color" className="space-y-4">
                    <div>
                      <Label>布料颜色</Label>
                      {isEditing ? (
                        <div className="mt-2 space-y-2">
                          <div className="relative">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                placeholder="搜索供应商、布板或颜色编号..."
                                value={colorSearch}
                                onChange={(e) => setColorSearch(e.target.value)}
                                onFocus={() => setShowColorDropdown(true)}
                                className="pl-10"
                              />
                            </div>
                            
                            {/* 选中的颜色显示 */}
                            {selectedColor && (
                              <div className="mt-2 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                {selectedColor.color.imageUrl && (
                                  <img
                                    src={selectedColor.color.imageUrl}
                                    alt={selectedColor.color.colorName || ''}
                                    className="w-12 h-12 rounded object-cover"
                                  />
                                )}
                                <div className="flex-1">
                                  <div className="font-medium">
                                    {selectedColor.supplier.supplierName} - {selectedColor.board.boardNumber} - {selectedColor.color.colorCode}
                                  </div>
                                  {selectedColor.color.colorName && (
                                    <div className="text-sm text-gray-500">{selectedColor.color.colorName}</div>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditForm({ ...editForm, materialColorId: null });
                                    setSelectedColor(null);
                                    setColorSearch("");
                                  }}
                                >
                                  清除
                                </Button>
                              </div>
                            )}

                            {/* 颜色下拉列表 */}
                            {showColorDropdown && colorSearch && (
                              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                {colorsData && colorsData.length > 0 ? (
                                  colorsData.map((item: any) => (
                                    <div
                                      key={item.color.id}
                                      className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                      onClick={() => {
                                        setEditForm({ ...editForm, materialColorId: item.color.id });
                                        setSelectedColor(item);
                                        setShowColorDropdown(false);
                                        setColorSearch("");
                                      }}
                                    >
                                      <ColorIcon
                                        imageUrl={item.color.imageUrl}
                                        colorCode={item.color.colorCode}
                                        colorName={item.color.colorName || ''}
                                        size="md"
                                      />
                                      <div className="flex-1">
                                        <div className="font-medium">
                                          {item.supplier?.name || ''} - {item.board.boardNumber} - {item.color.colorCode}
                                        </div>
                                        {item.color.colorName && (
                                          <div className="text-sm text-gray-500">{item.color.colorName}</div>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-4 text-center text-gray-500">
                                    没有找到匹配的颜色
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            选择布料颜色后，批次将自动引用该颜色的图片
                          </p>
                        </div>
                      ) : (
                        <div className="mt-2">
                          {(variantData as any)?.materialColor ? (
                            <div className="flex items-center gap-2">
                              <ColorIcon
                                imageUrl={(variantData as any).materialColor.color.imageUrl}
                                colorCode={(variantData as any).materialColor.color.colorCode}
                                colorName={(variantData as any).materialColor.color.colorName || ''}
                                size="md"
                              />
                              <div className="text-sm">
                                <div className="font-medium">{(variantData as any).materialColor.color.colorName}</div>
                                <div className="text-muted-foreground text-xs">
                                  {(variantData as any).materialColor.supplier?.name || ''} - {(variantData as any).materialColor.board?.boardNumber || ''} - {(variantData as any).materialColor.color.colorCode}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-muted-foreground">未选择</p>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* 产品尺寸 Sub Tab */}
                  <TabsContent value="product-dimensions" className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">产品尺寸</h3>
                        <select
                          value={productDimUnit}
                          onChange={(e) => setProductDimUnit(e.target.value as "cm" | "m")}
                          className="h-7 text-xs border rounded px-2 bg-background"
                        >
                          <option value="cm">cm</option>
                          <option value="m">m</option>
                        </select>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="productLength">产品长度</Label>
                          {isEditing ? (
                            <Input
                              id="productLength"
                              type="number"
                              step="0.01"
                              value={editForm.productLength}
                              onChange={(e) => setEditForm({ ...editForm, productLength: e.target.value })}
                              placeholder="0.00"
                            />
                          ) : (
                            <p className="mt-1">{variant?.productLength || "暂无"}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="productWidth">产品宽度</Label>
                          {isEditing ? (
                            <Input
                              id="productWidth"
                              type="number"
                              step="0.01"
                              value={editForm.productWidth}
                              onChange={(e) => setEditForm({ ...editForm, productWidth: e.target.value })}
                              placeholder="0.00"
                            />
                          ) : (
                            <p className="mt-1">{variant?.productWidth || "暂无"}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="productHeight">产品高度</Label>
                          {isEditing ? (
                            <Input
                              id="productHeight"
                              type="number"
                              step="0.01"
                              value={editForm.productHeight}
                              onChange={(e) => setEditForm({ ...editForm, productHeight: e.target.value })}
                              placeholder="0.00"
                            />
                          ) : (
                            <p className="mt-1">{variant?.productHeight || "暂无"}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* 包装信息 Sub Tab */}
                  <TabsContent value="packaging" className="space-y-4">
                    <PackageBoxesManager 
                      variantId={variant?.id || null} 
                      mode="view" 
                    />
                  </TabsContent>

                  {/* 变更说明 Sub Tab */}
                  <TabsContent value="changes" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fabricChange">布料变更</Label>
                        {isEditing ? (
                          <AttributeSelector
                            category="产品管理"
                            subcategory="批次管理"
                            fieldName="布料变更"
                            value={editForm.fabricChange}
                            onChange={(value) => setEditForm({ ...editForm, fabricChange: value })}
                            multiple={false}
                            placeholder="选择或创建布料变更"
                          />
                        ) : (
                          <p className="mt-1">{variant?.fabricChange || "暂无"}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="legTypeChange">脚型变更</Label>
                        {isEditing ? (
                          <AttributeSelector
                            category="产品管理"
                            subcategory="批次管理"
                            fieldName="脚型变更"
                            value={editForm.legTypeChange}
                            onChange={(value) => setEditForm({ ...editForm, legTypeChange: value })}
                            multiple={false}
                            placeholder="选择或创建脚型变更"
                          />
                        ) : (
                          <p className="mt-1">{variant?.legTypeChange || "暂无"}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="heightChange">高度变更</Label>
                        {isEditing ? (
                          <AttributeSelector
                            category="产品管理"
                            subcategory="批次管理"
                            fieldName="高度变更"
                            value={editForm.heightChange}
                            onChange={(value) => setEditForm({ ...editForm, heightChange: value })}
                            multiple={false}
                            placeholder="选择或创建高度变更"
                          />
                        ) : (
                          <p className="mt-1">{variant?.heightChange || "暂无"}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="packagingChange">包装变更</Label>
                        {isEditing ? (
                          <AttributeSelector
                            category="产品管理"
                            subcategory="批次管理"
                            fieldName="包装变更"
                            value={editForm.packagingChange}
                            onChange={(value) => setEditForm({ ...editForm, packagingChange: value })}
                            multiple={false}
                            placeholder="选择或创建包装变更"
                          />
                        ) : (
                          <p className="mt-1">{variant?.packagingChange || "暂无"}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="otherChanges">其他变更</Label>
                      {isEditing ? (
                        <Textarea
                          id="otherChanges"
                          value={editForm.otherChanges}
                          onChange={(e) => setEditForm({ ...editForm, otherChanges: e.target.value })}
                          placeholder="其他变更说明..."
                          rows={3}
                        />
                      ) : (
                        <p className="mt-1">{variant?.otherChanges || "暂无"}</p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 价格管理 Tab */}
          <TabsContent value="pricing" className="space-y-6">
            <PricingTab variantId={variantId} />
          </TabsContent>

          {/* 图片管理 Tab */}
          <TabsContent value="images" className="space-y-6">
            <ImagesTab variantId={variantId} />
          </TabsContent>

          {/* 材料选择 Tab */}
          <TabsContent value="materials" className="space-y-6">
            <MaterialSelectionTab variantId={variantId} />
          </TabsContent>

          {/* 供应商版本 Tab */}
          <TabsContent value="suppliers" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <SupplierVersions variantId={variantId} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
