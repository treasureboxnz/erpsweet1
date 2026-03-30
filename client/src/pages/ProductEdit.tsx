import { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, MoreHorizontal, Trash2, CalendarIcon, Sparkles, Loader2 } from "lucide-react";
import ERPLayout from "@/components/ERPLayout";
import ProductEditTabs from "@/components/ProductEditTabs";
import RichTextEditor from "@/components/RichTextEditor";
import MediaImagesTab from "@/components/MediaImagesTab";
import RabbitLoader from "@/components/RabbitLoader";
import Breadcrumb from "@/components/Breadcrumb";
import PricingTabContent from "@/components/PricingTabContent";
import ProductVariants from "@/components/ProductVariants";
import ProductSuppliers from "@/components/ProductSuppliers";
import ProductCategorySelector from "@/components/ProductCategorySelector";
import AttributeSelector from "@/components/AttributeSelector";
import { toast } from "sonner";
import { useSidebar } from "@/contexts/SidebarContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

export default function ProductEdit() {
  const [, params] = useRoute("/products/:id/edit");
  const [location, setLocation] = useLocation();
  const productId = params?.id ? parseInt(params.id) : 0;
  const { isCollapsed, isMobile } = useSidebar();

  // Tab state
  const [activeTab, setActiveTab] = useState("overview");
  const [activeSubTab, setActiveSubTab] = useState<string | undefined>();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [status, setStatus] = useState<"active" | "developing" | "discontinued">("active");
  const [images, setImages] = useState<Array<{ id: number; imageUrl: string; sortOrder: number }>>([]);
  
  // 包装体积 state
  const [packageLength, setPackageLength] = useState<number | null>(null);
  const [packageWidth, setPackageWidth] = useState<number | null>(null);
  const [packageHeight, setPackageHeight] = useState<number | null>(null);
  const [packageCbm, setPackageCbm] = useState<number | null>(null);
  const [showCalculation, setShowCalculation] = useState(false);
  const [volumeUnit, setVolumeUnit] = useState<"cm" | "m" | "mm">("cm");

  // 新增字段 state
  const [moq, setMoq] = useState<number | null>(null);
  const [shippingPort, setShippingPort] = useState<string[]>([]);
  const [packagingMethod, setPackagingMethod] = useState<string[]>([]);
  const [containerLoad, setContainerLoad] = useState("");
  const [supplyRegion, setSupplyRegion] = useState<string[]>([]);
  const [addedDate, setAddedDate] = useState<Date | null>(null);
  const [selectionLogic, setSelectionLogic] = useState<string[]>([]);
  const [styleSource, setStyleSource] = useState<string[]>([]);

  const utils = trpc.useUtils();
  const deleteMutation = trpc.products.delete.useMutation();
  const generateTitleMutation = trpc.products.generateTitle.useMutation();

  // Fetch product data
  const { data: products, isLoading } = trpc.products.list.useQuery();
  const product = products?.find((p) => p.product.id === productId);

  // Fetch product categories for AI title generation
  const { data: productCategoryIds = [] } = trpc.categories.getProductCategories.useQuery(
    { productId },
    { enabled: productId > 0 }
  );
  const { data: allCategories = [] } = trpc.categories.getAll.useQuery();

  // Fetch attributes for attribute ID mapping
  const { data: shippingPortAttrs } = trpc.attributes.getAll.useQuery({ category: "产品管理", subcategory: "产品信息", fieldName: "出货港口" });
  const { data: packagingMethodAttrs } = trpc.attributes.getAll.useQuery({ category: "产品管理", subcategory: "产品信息", fieldName: "包装方式" });
  const { data: supplyRegionAttrs } = trpc.attributes.getAll.useQuery({ category: "产品管理", subcategory: "产品信息", fieldName: "供货地区" });
  const { data: selectionLogicAttrs } = trpc.attributes.getAll.useQuery({ category: "产品管理", subcategory: "产品信息", fieldName: "选品逻辑" });
  const { data: styleSourceAttrs } = trpc.attributes.getAll.useQuery({ category: "产品管理", subcategory: "产品信息", fieldName: "款式来源" });

  // Helper: find attribute name by ID
  const findAttrName = (attrs: any[] | undefined, id: number | null | undefined) => {
    if (!attrs || !id) return [];
    const attr = attrs.find((a: any) => a.id === id);
    return attr ? [attr.name] : [];
  };

  // Helper: find attribute ID by name
  const findAttrId = (attrs: any[] | undefined, names: string[]) => {
    if (!attrs || names.length === 0) return null;
    const attr = attrs.find((a: any) => a.name === names[0]);
    return attr ? attr.id : null;
  };

  // Load product data into form
  useEffect(() => {
    if (product) {
      setTitle(product.product.name || '');
      setDescription(product.product.description || "");
      setSku(product.product.sku);
      setStatus(product.product.status as "active" | "developing" | "discontinued");
      setPackageLength(product.product.packageLength ? Number(product.product.packageLength) : null);
      setPackageWidth(product.product.packageWidth ? Number(product.product.packageWidth) : null);
      setPackageHeight(product.product.packageHeight ? Number(product.product.packageHeight) : null);
      setPackageCbm(product.product.packageCbm ? Number(product.product.packageCbm) : null);
      setVolumeUnit((product.product as any).volumeUnit || "cm");
      // 新增字段
      setMoq((product.product as any).moq || null);
      setContainerLoad((product.product as any).containerLoad || "");
      setAddedDate((product.product as any).addedDate ? new Date((product.product as any).addedDate) : null);
    }
  }, [product]);

  // Load attribute values when both product and attributes are ready
  useEffect(() => {
    if (product && shippingPortAttrs) {
      setShippingPort(findAttrName(shippingPortAttrs, (product.product as any).shippingPortId));
    }
  }, [product, shippingPortAttrs]);

  useEffect(() => {
    if (product && packagingMethodAttrs) {
      setPackagingMethod(findAttrName(packagingMethodAttrs, (product.product as any).packagingMethodId));
    }
  }, [product, packagingMethodAttrs]);

  useEffect(() => {
    if (product && supplyRegionAttrs) {
      setSupplyRegion(findAttrName(supplyRegionAttrs, (product.product as any).supplyRegionId));
    }
  }, [product, supplyRegionAttrs]);

  useEffect(() => {
    if (product && selectionLogicAttrs) {
      setSelectionLogic(findAttrName(selectionLogicAttrs, (product.product as any).selectionLogicId));
    }
  }, [product, selectionLogicAttrs]);

  useEffect(() => {
    if (product && styleSourceAttrs) {
      setStyleSource(findAttrName(styleSourceAttrs, (product.product as any).styleSourceId));
    }
  }, [product, styleSourceAttrs]);

  // Read URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const subtab = params.get('subtab');
    if (tab) {
      setActiveTab(tab);
      if (subtab) setActiveSubTab(subtab);
    }
  }, []);

  // Handle tab change
  const handleTabChange = (tab: string, subTab?: string) => {
    setActiveTab(tab);
    setActiveSubTab(subTab);
    const params = new URLSearchParams();
    params.set("tab", tab);
    if (subTab) params.set("subtab", subTab);
    setLocation(`/products/${productId}/edit?${params.toString()}`, { replace: true });
  };

  // Update product mutation
  const updateProduct = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("保存成功");
      utils.products.list.invalidate();
    },
    onError: (error) => {
      toast.error(`保存失败：${error.message}`);
    },
  });

  // Handle save
  const handleSave = async () => {
    await updateProduct.mutateAsync({
      id: productId,
      title,
      description,
      sku,
      status: status as "active" | "developing" | "discontinued",
      packageLength,
      packageWidth,
      packageHeight,
      packageCbm,
      volumeUnit,
      // 新增字段
      moq,
      shippingPortId: findAttrId(shippingPortAttrs, shippingPort),
      packagingMethodId: findAttrId(packagingMethodAttrs, packagingMethod),
      containerLoad: containerLoad || null,
      supplyRegionId: findAttrId(supplyRegionAttrs, supplyRegion),
      addedDate: addedDate ? addedDate.toISOString() : null,
      selectionLogicId: findAttrId(selectionLogicAttrs, selectionLogic),
      styleSourceId: findAttrId(styleSourceAttrs, styleSource),
    });
  };

  if (isLoading) {
    return (
      <ERPLayout>
        <div className="flex items-center justify-center h-screen">
          <RabbitLoader size="lg" />
        </div>
      </ERPLayout>
    );
  }

  if (!product) {
    return (
      <ERPLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-500">产品不存在</div>
        </div>
      </ERPLayout>
    );
  }

  return (
    <ERPLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <Breadcrumb items={[
            { label: "产品管理", href: "/products" },
            { label: title || "Loading..." }
          ]} />
        </div>
        {/* Header */}
        <div className="border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/products">
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                  <p className="text-sm text-gray-500">{sku}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    if (confirm('确定要删除这个产品吗？删除后可以在产品管理页面的"已删除产品"中恢复。')) {
                      try {
                        await deleteMutation.mutateAsync({ id: productId });
                        toast.success('产品已删除');
                        utils.products.list.invalidate();
                        setLocation('/products');
                      } catch (error) {
                        toast.error('删除失败');
                      }
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除产品
                </Button>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <ProductEditTabs
          activeTab={activeTab}
          activeSubTab={activeSubTab}
          onTabChange={handleTabChange}
        />

        {/* Main Content */}
        <div className={activeTab === "variants" ? `${isCollapsed && !isMobile ? "max-w-[1800px]" : "max-w-[1600px]"} mx-auto px-6 py-8` : "max-w-7xl mx-auto px-6 py-8"}>
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-3 gap-5">
              {/* Left Column - Main Content */}
              <div className="col-span-2 space-y-4">
                {/* #N+14: 产品详情卡片移到产品信息上方 */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>产品详情</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label htmlFor="sku" className="mb-2 block">SKU</Label>
                      <Input
                        id="sku"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="产品SKU"
                      />
                    </div>
                    {/* #N+17: 状态移到左侧SKU下方 */}
                    <div>
                      <Label className="mb-2 block">状态</Label>
                      <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">在售</SelectItem>
                          <SelectItem value="developing">开发中</SelectItem>
                          <SelectItem value="discontinued">停产</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* #N+17: MOQ */}
                    <div>
                      <Label htmlFor="moq" className="mb-2 block">MOQ（最小起订量）</Label>
                      <Input
                        id="moq"
                        type="number"
                        value={moq ?? ""}
                        onChange={(e) => setMoq(e.target.value === "" ? null : parseInt(e.target.value))}
                        placeholder="最小起订量"
                      />
                    </div>
                    {/* #N+17: 出货港口 */}
                    <div>
                      <Label className="mb-2 block">出货港口</Label>
                      <AttributeSelector
                        category="产品管理"
                        subcategory="产品信息"
                        fieldName="出货港口"
                        value={shippingPort}
                        onChange={setShippingPort}
                        multiple={false}
                        placeholder="选择出货港口"
                      />
                    </div>
                    {/* #N+18: 包装方式 */}
                    <div>
                      <Label className="mb-2 block">包装方式</Label>
                      <AttributeSelector
                        category="产品管理"
                        subcategory="产品信息"
                        fieldName="包装方式"
                        value={packagingMethod}
                        onChange={setPackagingMethod}
                        multiple={false}
                        placeholder="选择包装方式"
                      />
                    </div>
                    {/* #N+18: 装柜量 */}
                    <div>
                      <Label htmlFor="containerLoad" className="mb-2 block">装柜量</Label>
                      <Input
                        id="containerLoad"
                        value={containerLoad}
                        onChange={(e) => setContainerLoad(e.target.value)}
                        placeholder="例如：20GP/200pcs, 40HQ/500pcs"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 产品信息卡片 */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle>产品信息</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        disabled={generateTitleMutation.isPending}
                        onClick={async () => {
                          try {
                            // Get category names, separating parent and sub-categories
                            // productCategoryIds is actually an array of category objects, not IDs
                            const parentCategories: string[] = [];
                            const subCategories: string[] = [];
                            productCategoryIds.forEach((cat: any) => {
                              if (cat && cat.name) {
                                if (cat.parentId) {
                                  subCategories.push(cat.name);
                                } else {
                                  parentCategories.push(cat.name);
                                }
                              }
                            });
                            
                            const result = await generateTitleMutation.mutateAsync({
                              imageUrl: product?.firstImage?.imageUrl || undefined,
                              categories: parentCategories.length > 0 ? parentCategories : undefined,
                              subCategories: subCategories.length > 0 ? subCategories : undefined,
                              currentTitle: title || undefined,
                            });
                            if (result.title) {
                              setTitle(result.title);
                              toast.success("标题已生成", { description: result.title });
                            } else {
                              toast.error("生成失败", { description: "未能生成有效标题" });
                            }
                          } catch (err: any) {
                            toast.error("AI生成失败", { description: err.message || "请稍后重试" });
                          }
                        }}
                      >
                        {generateTitleMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        {generateTitleMutation.isPending ? "AI生成中..." : "AI生成标题"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label htmlFor="title" className="mb-2 block">标题</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="产品标题"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description" className="mb-2 block">描述</Label>
                      <RichTextEditor
                        content={description}
                        onChange={setDescription}
                        placeholder="产品描述..."
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* #N+20: 新增4个字段卡片 */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>扩展信息</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* 供货地区 */}
                    <div>
                      <Label className="mb-2 block">供货地区</Label>
                      <AttributeSelector
                        category="产品管理"
                        subcategory="产品信息"
                        fieldName="供货地区"
                        value={supplyRegion}
                        onChange={setSupplyRegion}
                        multiple={false}
                        placeholder="选择供货地区"
                      />
                    </div>
                    {/* 产品加入日期（系统自动记录） */}
                     <div>
                       <Label className="mb-2 block">产品加入日期</Label>
                       <div className="flex items-center h-10 px-3 rounded-md border border-input bg-muted/50 text-sm text-muted-foreground">
                         <CalendarIcon className="mr-2 h-4 w-4" />
                         {addedDate ? format(addedDate, "yyyy-MM-dd") : "创建时自动记录"}
                       </div>
                     </div>
                    {/* 选品逻辑 */}
                    <div>
                      <Label className="mb-2 block">选品逻辑</Label>
                      <AttributeSelector
                        category="产品管理"
                        subcategory="产品信息"
                        fieldName="选品逻辑"
                        value={selectionLogic}
                        onChange={setSelectionLogic}
                        multiple={false}
                        placeholder="选择选品逻辑"
                      />
                    </div>
                    {/* 款式来源 */}
                    <div>
                      <Label className="mb-2 block">款式来源</Label>
                      <AttributeSelector
                        category="产品管理"
                        subcategory="产品信息"
                        fieldName="款式来源"
                        value={styleSource}
                        onChange={setStyleSource}
                        multiple={false}
                        placeholder="选择款式来源"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Sidebar */}
              <div className="space-y-3">
                {/* Product Image Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">产品图片</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {product.firstImage ? (
                      <img
                        src={product.firstImage.imageUrl}
                        alt={title}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                        暂无图片
                      </div>
                    )}
                  </CardContent>
                </Card>

                <ProductCategorySelector productId={productId} />

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">产品包装体积</CardTitle>
                      <Select value={volumeUnit} onValueChange={(v: "cm" | "m" | "mm") => {
                        const conversionFactors: Record<string, number> = { mm: 1, cm: 10, m: 1000 };
                        const oldFactor = conversionFactors[volumeUnit];
                        const newFactor = conversionFactors[v];
                        const ratio = oldFactor / newFactor;
                        if (packageLength !== null) setPackageLength(parseFloat((packageLength * ratio).toPrecision(6)));
                        if (packageWidth !== null) setPackageWidth(parseFloat((packageWidth * ratio).toPrecision(6)));
                        if (packageHeight !== null) setPackageHeight(parseFloat((packageHeight * ratio).toPrecision(6)));
                        setVolumeUnit(v);
                        setShowCalculation(false);
                      }}>
                        <SelectTrigger className="w-[80px] h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cm">cm</SelectItem>
                          <SelectItem value="m">m</SelectItem>
                          <SelectItem value="mm">mm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label htmlFor="packageLength" className="mb-1 block text-xs text-gray-500">长 ({volumeUnit})</Label>
                        <Input
                          id="packageLength"
                          type="number"
                          step="0.001"
                          value={packageLength ?? ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : parseFloat(e.target.value);
                            setPackageLength(val);
                            setShowCalculation(false);
                          }}
                          placeholder="0"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="packageWidth" className="mb-1 block text-xs text-gray-500">宽 ({volumeUnit})</Label>
                        <Input
                          id="packageWidth"
                          type="number"
                          step="0.001"
                          value={packageWidth ?? ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : parseFloat(e.target.value);
                            setPackageWidth(val);
                            setShowCalculation(false);
                          }}
                          placeholder="0"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="packageHeight" className="mb-1 block text-xs text-gray-500">高 ({volumeUnit})</Label>
                        <Input
                          id="packageHeight"
                          type="number"
                          step="0.001"
                          value={packageHeight ?? ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : parseFloat(e.target.value);
                            setPackageHeight(val);
                            setShowCalculation(false);
                          }}
                          placeholder="0"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 text-xs"
                        onClick={() => {
                          if (packageLength && packageWidth && packageHeight) {
                            const factor = volumeUnit === "cm" ? 0.01 : volumeUnit === "mm" ? 0.001 : 1;
                            const cbm = (packageLength * factor) * (packageWidth * factor) * (packageHeight * factor);
                            setPackageCbm(parseFloat(cbm.toFixed(6)));
                            setShowCalculation(true);
                          }
                        }}
                        disabled={!packageLength || !packageWidth || !packageHeight}
                      >
                        计算 CBM
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 text-xs"
                        onClick={() => {
                          setPackageLength(null);
                          setPackageWidth(null);
                          setPackageHeight(null);
                          setPackageCbm(null);
                          setShowCalculation(false);
                        }}
                      >
                        清除
                      </Button>
                    </div>

                    {showCalculation && packageLength && packageWidth && packageHeight && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
                        <p className="text-xs text-blue-800">
                          {packageLength}{volumeUnit} × {packageWidth}{volumeUnit} × {packageHeight}{volumeUnit} = <strong>{packageCbm} m³</strong>
                        </p>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="packageCbm" className="mb-1 block text-xs text-gray-500">CBM（m³）</Label>
                      <Input
                        id="packageCbm"
                        type="number"
                        step="0.000001"
                        value={packageCbm ?? ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : parseFloat(e.target.value);
                          setPackageCbm(val);
                        }}
                        placeholder="自动计算或手动输入"
                        className="h-8 text-sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Variants Tab */}
          {activeTab === "variants" && (
            <ProductVariants productId={productId} productSku={sku} productImageUrl={product?.firstImage?.imageUrl} />
          )}

          {/* Pricing Tab */}
          {activeTab === "pricing" && (
            <PricingTabContent 
              productId={productId} 
              activeSubTab={activeSubTab || "cost"} 
            />
          )}

          {/* Suppliers Tab */}
          {activeTab === "suppliers" && (
            <ProductSuppliers productId={productId} />
          )}

          {/* Media Tab */}
          {activeTab === "media" && activeSubTab === "images" && (
            <MediaImagesTab
              productId={productId}
              sku={sku}
            />
          )}

          {activeTab === "media" && activeSubTab === "videos" && (
            <Card>
              <CardHeader>
                <CardTitle>产品视频</CardTitle>
                <CardDescription>管理产品视频素材</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  视频管理功能即将上线...
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "media" && activeSubTab === "3d" && (
            <Card>
              <CardHeader>
                <CardTitle>3D 模型</CardTitle>
                <CardDescription>管理产品3D模型文件</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  3D模型管理功能即将上线...
                </div>
              </CardContent>
            </Card>
          )}

          {/* Orders Tab */}
          {activeTab === "orders" && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeSubTab === "all" && "全部订单"}
                  {activeSubTab === "pending" && "待处理订单"}
                  {activeSubTab === "completed" && "已完成订单"}
                </CardTitle>
                <CardDescription>
                  {activeSubTab === "all" && "查看该产品的全部订单"}
                  {activeSubTab === "pending" && "查看待处理订单"}
                  {activeSubTab === "completed" && "查看已完成订单"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  订单关联功能即将上线...
                </div>
              </CardContent>
            </Card>
          )}

          {/* Files Tab */}
          {activeTab === "files" && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeSubTab === "documents" && "产品文档"}
                  {activeSubTab === "specifications" && "规格说明书"}
                </CardTitle>
                <CardDescription>
                  {activeSubTab === "documents" && "管理产品相关文档"}
                  {activeSubTab === "specifications" && "管理产品规格说明书"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  文件管理功能即将上线...
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ERPLayout>
  );
}
