import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Save, Calculator, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import Breadcrumb from "@/components/Breadcrumb";
import { SmartCodeInput } from "@/components/SmartCodeInput";

export default function VariantCreate() {
  const { productId } = useParams<{ productId: string }>();
  const [, setLocation] = useLocation();
  const navigate = (path: string) => setLocation(path);

  // Fetch product info
  const { data: productsData } = trpc.products.list.useQuery();
  const product = productsData?.find(p => p.product.id === parseInt(productId!))?.product;

  // Form state
  const [variantCode, setVariantCode] = useState("");
  const [changeDescription, setChangeDescription] = useState("");
  const [fabricChange, setFabricChange] = useState("");
  const [legChange, setLegChange] = useState("");
  const [heightChange, setHeightChange] = useState("");
  const [packagingChange, setPackagingChange] = useState("");
  
  // Dimensions
  const [dimUnit, setDimUnit] = useState<"cm" | "m">("cm");
  const [productLength, setProductLength] = useState("");
  const [productWidth, setProductWidth] = useState("");
  const [productHeight, setProductHeight] = useState("");
  const [packageLength, setPackageLength] = useState("");
  const [packageWidth, setPackageWidth] = useState("");
  const [packageHeight, setPackageHeight] = useState("");
  const [cbm, setCbm] = useState("");

  // Material color selection
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);
  const [colorSearchQuery, setColorSearchQuery] = useState("");
  const [showColorDropdown, setShowColorDropdown] = useState(false);

  // Customer binding
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const [isUniversal, setIsUniversal] = useState(true);

  // Fetch customers for selection
  const { data: customersData } = trpc.customers.list.useQuery();

  // Fetch material colors for selection
  const { data: colorsData } = trpc.materials.colors.list.useQuery({
    search: colorSearchQuery || undefined,
  });

  // Get selected color details
  const selectedColor = colorsData?.find((c: any) => c.color.id === selectedColorId);

  // Generate variant code automatically
  const { data: variantsData } = trpc.productVariants.getAll.useQuery({
    productId: parseInt(productId!),
    pageSize: 1000,
  });

  useEffect(() => {
    if (product && variantsData) {
      const variants = variantsData.variants;
      if (variants.length > 0) {
        // Find the last variant code
        const lastVariant = variants[variants.length - 1];
        const match = lastVariant.variant.variantCode.match(/V(\d+)$/);
        if (match) {
          const nextNum = parseInt(match[1]) + 1;
          const nextCode = `${product.sku}-V${nextNum.toString().padStart(3, '0')}`;
          setVariantCode(nextCode);
        }
      } else {
        // First variant
        setVariantCode(`${product.sku}-V001`);
      }
    }
  }, [product, variantsData]);

  // Initialize with default color (ORIG from SYS-COL-ORIG)
  useEffect(() => {
    if (colorsData && !selectedColorId) {
      const defaultColor = colorsData.find(
        (c: any) => c.color.colorCode === 'ORIG'
      );
      if (defaultColor) {
        setSelectedColorId(defaultColor.color.id);
      }
    }
  }, [colorsData, selectedColorId]);

  // Calculate CBM
  const handleCalculateCbm = () => {
    const factor = dimUnit === "cm" ? 0.01 : 1;
    const l = (parseFloat(packageLength) || 0) * factor;
    const w = (parseFloat(packageWidth) || 0) * factor;
    const h = (parseFloat(packageHeight) || 0) * factor;
    
    if (l && w && h) {
      const calculatedCbm = (l * w * h).toFixed(2);
      setCbm(calculatedCbm);
      toast.success("CBM计算完成", {
        description: `包装体积：${calculatedCbm} m³`,
      });
    } else {
      toast.error("计算失败", {
        description: "请先填写包装长、宽、高",
      });
    }
  };

  const handleClearDimensions = () => {
    setPackageLength("");
    setPackageWidth("");
    setPackageHeight("");
    setCbm("");
  };

  // Create variant mutation
  const createVariant = trpc.productVariants.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("批次创建成功", {
        description: `批次 "${data.variantCode}" 已创建`,
      });
      // Navigate back to product edit page
      navigate(`/products/${productId}/edit?tab=variants`);
    },
    onError: (error: any) => {
      toast.error("创建失败", {
        description: error.message,
      });
    },
  });

  const handleSave = () => {
    if (!variantCode.trim()) {
      toast.error("验证失败", {
        description: "批次编号不能为空",
      });
      return;
    }

    createVariant.mutate({
      productId: parseInt(productId!),
      variantCode: variantCode.trim(),
      variantName: changeDescription.trim() || variantCode.trim(),
      fabricChange: fabricChange.trim() || undefined,
      legTypeChange: legChange.trim() || undefined,
      heightChange: heightChange.trim() || undefined,
      packagingChange: packagingChange.trim() || undefined,
      productLength: productLength ? parseFloat(productLength) * (dimUnit === "cm" ? 0.01 : 1) : undefined,
      productWidth: productWidth ? parseFloat(productWidth) * (dimUnit === "cm" ? 0.01 : 1) : undefined,
      productHeight: productHeight ? parseFloat(productHeight) * (dimUnit === "cm" ? 0.01 : 1) : undefined,
      packageLength: packageLength ? parseFloat(packageLength) * (dimUnit === "cm" ? 0.01 : 1) : undefined,
      packageWidth: packageWidth ? parseFloat(packageWidth) * (dimUnit === "cm" ? 0.01 : 1) : undefined,
      packageHeight: packageHeight ? parseFloat(packageHeight) * (dimUnit === "cm" ? 0.01 : 1) : undefined,
      materialColorId: selectedColorId || undefined,
      variantType: isUniversal ? "universal" : "exclusive",
      linkedCustomerIds: isUniversal ? [] : selectedCustomers,
    });
  };

  const toggleCustomer = (customerId: number) => {
    setSelectedCustomers(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/products/${productId}/edit?tab=variants`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回
              </Button>
              <div>
                <h1 className="text-2xl font-bold">新建批次</h1>
                <Breadcrumb
                  items={[
                    { label: "产品管理", href: "/products" },
                    { label: product?.name || "产品详情", href: `/products/${productId}/edit` },
                    { label: "新建批次" },
                  ]}
                />
              </div>
            </div>
            <Button onClick={handleSave} disabled={createVariant.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {createVariant.isPending ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="col-span-2 space-y-6">
            {/* Variant Information */}
            <Card>
              <CardHeader>
                <CardTitle>批次信息</CardTitle>
                <CardDescription>基本的批次识别信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SmartCodeInput
                  label="批次编号"
                  ruleType="variant"
                  value={variantCode}
                  onChange={setVariantCode}
                  required
                />

                <div>
                  <Label htmlFor="changeDescription" className="mb-2 block">变更说明</Label>
                  <Textarea
                    id="changeDescription"
                    placeholder="描述此批次的变更内容..."
                    value={changeDescription}
                    onChange={(e) => setChangeDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Material Color Selection */}
                <div>
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
                    
                    {/* Selected Color Display */}
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
                          <div className="font-medium text-sm">
                            {selectedColor.supplier?.name} - {selectedColor.board?.boardNumber} - {selectedColor.color.colorCode}
                          </div>
                          <div className="text-xs text-gray-500">
                            {selectedColor.color.colorName}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedColorId(null);
                            setColorSearchQuery('');
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {/* Color Dropdown */}
                    {showColorDropdown && colorSearchQuery && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {colorsData && colorsData.length > 0 ? (
                          colorsData.map((item: any) => (
                            <button
                              key={item.color.id}
                              type="button"
                              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left border-b last:border-b-0"
                              onClick={() => {
                                setSelectedColorId(item.color.id);
                                setShowColorDropdown(false);
                                setColorSearchQuery('');
                              }}
                            >
                              {item.color.imageUrl && (
                                <img
                                  src={item.color.imageUrl}
                                  alt={item.color.colorName || ''}
                                  className="w-10 h-10 rounded object-cover"
                                />
                              )}
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  {item.supplier?.name} - {item.board?.boardNumber} - {item.color.colorCode}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {item.color.colorName}
                                </div>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            未找到匹配的颜色
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    选择布料颜色后，批次将自动引用该颜色的图片
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Change Details */}
            <Card>
              <CardHeader>
                <CardTitle>变更字段</CardTitle>
                <CardDescription>记录具体的变更项目</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fabricChange" className="mb-2 block">布料变更</Label>
                    <Input
                      id="fabricChange"
                      placeholder="例如：从棉布改为亚麻布"
                      value={fabricChange}
                      onChange={(e) => setFabricChange(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="legChange" className="mb-2 block">脚型变更</Label>
                    <Input
                      id="legChange"
                      placeholder="例如：从木脚改为金属脚"
                      value={legChange}
                      onChange={(e) => setLegChange(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="heightChange" className="mb-2 block">高度变更</Label>
                    <Input
                      id="heightChange"
                      placeholder="例如：从45cm改为50cm"
                      value={heightChange}
                      onChange={(e) => setHeightChange(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="packagingChange" className="mb-2 block">包装方式变更</Label>
                    <Input
                      id="packagingChange"
                      placeholder="例如：从纸箱改为木箱"
                      value={packagingChange}
                      onChange={(e) => setPackagingChange(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dimensions */}
            <Card>
              <CardHeader>
                <CardTitle>尺寸信息</CardTitle>
                <CardDescription>产品和包装的尺寸（单位：米）</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Product Dimensions */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-medium">产品尺寸</h4>
                    <select
                      value={dimUnit}
                      onChange={(e) => setDimUnit(e.target.value as "cm" | "m")}
                      className="h-7 text-xs border rounded px-2 bg-background"
                    >
                      <option value="cm">cm</option>
                      <option value="m">m</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="productLength" className="mb-2 block">长 ({dimUnit})</Label>
                      <Input
                        id="productLength"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={productLength}
                        onChange={(e) => setProductLength(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="productWidth" className="mb-2 block">宽 ({dimUnit})</Label>
                      <Input
                        id="productWidth"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={productWidth}
                        onChange={(e) => setProductWidth(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="productHeight" className="mb-2 block">高 ({dimUnit})</Label>
                      <Input
                        id="productHeight"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={productHeight}
                        onChange={(e) => setProductHeight(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Package Dimensions */}
                <div>
                  <h4 className="font-medium mb-3">包装尺寸（{dimUnit}）</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="packageLength" className="mb-2 block">长 ({dimUnit})</Label>
                      <Input
                        id="packageLength"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={packageLength}
                        onChange={(e) => setPackageLength(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="packageWidth" className="mb-2 block">宽 ({dimUnit})</Label>
                      <Input
                        id="packageWidth"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={packageWidth}
                        onChange={(e) => setPackageWidth(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="packageHeight" className="mb-2 block">高 ({dimUnit})</Label>
                      <Input
                        id="packageHeight"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={packageHeight}
                        onChange={(e) => setPackageHeight(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* CBM */}
                <div>
                  <Label htmlFor="cbm" className="mb-2 block">CBM (m³)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cbm"
                      type="number"
                      step="0.01"
                      placeholder="可手动输入或自动计算"
                      value={cbm}
                      onChange={(e) => setCbm(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCalculateCbm}
                    >
                      <Calculator className="h-4 w-4 mr-2" />
                      计算
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClearDimensions}
                    >
                      <X className="h-4 w-4 mr-2" />
                      清除
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    自动计算：包装长 × 包装宽 × 包装高
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Customer Binding */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>客户绑定</CardTitle>
                <CardDescription>选择此批次适用的客户</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isUniversal"
                    checked={isUniversal}
                    onCheckedChange={(checked) => {
                      setIsUniversal(checked as boolean);
                      if (checked) {
                        setSelectedCustomers([]);
                      }
                    }}
                  />
                  <label
                    htmlFor="isUniversal"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    通用批次（适用所有客户）
                  </label>
                </div>

                {!isUniversal && (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    <Label className="mb-2 block">选择客户</Label>
                    {customersData?.map((customer: any) => (
                      <div key={customer.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`customer-${customer.id}`}
                          checked={selectedCustomers.includes(customer.id)}
                          onCheckedChange={() => toggleCustomer(customer.id)}
                        />
                        <label
                          htmlFor={`customer-${customer.id}`}
                          className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {customer.companyName}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
