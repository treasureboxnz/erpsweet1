import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, RotateCcw, Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

type TemplateType = "buyer" | "internal" | "factory";

interface FieldConfig {
  productFields: {
    showImage: boolean;
    showName: boolean;
    showSku: boolean;
    showCustomerSku: boolean;
    showDimensions: boolean;
    showDescription: boolean;
    showMaterial: boolean;
    showFabric: boolean;
    showColor: boolean;
    colorDisplayMode: 'code' | 'image'; // 颜色显示模式
    showPackaging: boolean;
    showPackageQty: boolean;
    showCbm: boolean;
    showGrossWeight: boolean;
    showNetWeight: boolean;
  };
  priceFields: {
    showUnitPrice: boolean;
    showQuantity: boolean;
    showSubtotal: boolean;
    showCostPrice: boolean;
    showProfit: boolean;
    showProfitMargin: boolean;
  };
  companyFields: {
    showLogo: boolean;
    showNameCn: boolean;
    showNameEn: boolean;
    showAddress: boolean;
    showPhone: boolean;
    showEmail: boolean;
    showWebsite: boolean;
  };
  partnerFields: {
    showCompanyName: boolean;
    showAddress: boolean;
    showContactPerson: boolean;
    showPhone: boolean;
    showEmail: boolean;
  };
  termsFields: {
    showLoadingPort: boolean;
    showShipmentTime: boolean;
    showPartialShipment: boolean;
    showPaymentTerms: boolean;
    showQuantityTolerance: boolean;
    showPackingRequirements: boolean;
    showShippingMark: boolean;
    showInsurance: boolean;
    showDocumentsRequired: boolean;
    showUsdBankInfo: boolean;
    showRmbBankInfo: boolean;
    showModificationClause: boolean;
    showPaymentGuarantee: boolean;
    showTerminationClause: boolean;
    showForceMajeure: boolean;
    showArbitration: boolean;
    showSignature: boolean;
  };
}

export default function InvoiceTemplateConfig() {
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<TemplateType>("buyer");
  const [configs, setConfigs] = useState<Record<TemplateType, FieldConfig | null>>({
    buyer: null,
    internal: null,
    factory: null,
  });

  // Query all configs
  const { data: allConfigs, isLoading } = trpc.invoiceTemplateConfig.getAll.useQuery();

  // Initialize defaults mutation
  const initializeDefaults = trpc.invoiceTemplateConfig.initializeDefaults.useMutation({
    onSuccess: () => {
      toast.success("默认配置初始化成功");
      utils.invoiceTemplateConfig.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`初始化失败: ${error.message}`);
    },
  });

  // Upsert config mutation
  const upsertConfig = trpc.invoiceTemplateConfig.upsert.useMutation({
    onSuccess: () => {
      toast.success("配置保存成功");
      utils.invoiceTemplateConfig.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`保存失败: ${error.message}`);
    },
  });

  // Load configs
  useEffect(() => {
    if (allConfigs && allConfigs.length > 0) {
      const newConfigs: Record<TemplateType, FieldConfig | null> = {
        buyer: null,
        internal: null,
        factory: null,
      };

      allConfigs.forEach((config) => {
        newConfigs[config.templateType] = config.fieldConfig as FieldConfig;
      });

      setConfigs(newConfigs);
    }
  }, [allConfigs]);

  // Handle save
  const handleSave = () => {
    const currentConfig = configs[activeTab];
    if (!currentConfig) {
      toast.error("配置数据不存在");
      return;
    }

    upsertConfig.mutate({
      templateType: activeTab,
      fieldConfig: currentConfig,
    });
  };

  // Handle initialize defaults
  const handleInitializeDefaults = () => {
    if (confirm("确定要初始化默认配置吗？这将创建三种Invoice模板的标准字段配置。")) {
      initializeDefaults.mutate();
    }
  };

  // Update field value
  const updateField = (
    category: keyof FieldConfig,
    field: string,
    value: boolean
  ) => {
    setConfigs((prev) => {
      const currentConfig = prev[activeTab];
      if (!currentConfig) return prev;

      return {
        ...prev,
        [activeTab]: {
          ...currentConfig,
          [category]: {
            ...currentConfig[category],
            [field]: value,
          },
        },
      };
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasConfigs = allConfigs && allConfigs.length > 0;
  const currentConfig = configs[activeTab];

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Invoice模板配置</h1>
            <p className="text-muted-foreground mt-2">
              自定义三种Invoice类型的字段显示配置（客户版、内部版、工厂版）
            </p>
          </div>
          <div className="flex gap-2">
            {!hasConfigs && (
              <Button onClick={handleInitializeDefaults} disabled={initializeDefaults.isPending}>
                <RotateCcw className="h-4 w-4 mr-2" />
                初始化默认配置
              </Button>
            )}
            {hasConfigs && (
              <Button onClick={handleSave} disabled={upsertConfig.isPending}>
                <Save className="h-4 w-4 mr-2" />
                保存配置
              </Button>
            )}
          </div>
        </div>
      </div>

      {!hasConfigs ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                您还没有创建Invoice模板配置。点击"初始化默认配置"按钮创建标准的字段配置。
              </p>
              <Button onClick={handleInitializeDefaults} disabled={initializeDefaults.isPending}>
                <RotateCcw className="h-4 w-4 mr-2" />
                初始化默认配置
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TemplateType)}>
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="buyer">客户版Invoice</TabsTrigger>
            <TabsTrigger value="internal">内部版Invoice</TabsTrigger>
            <TabsTrigger value="factory">工厂版Invoice</TabsTrigger>
          </TabsList>

          {["buyer", "internal", "factory"].map((type) => (
            <TabsContent key={type} value={type} className="space-y-6">
              {currentConfig && (
                <>
                  {/* 产品信息字段 */}
                  <Card>
                    <CardHeader>
                      <CardTitle>产品信息字段</CardTitle>
                      <CardDescription>选择在Invoice中显示的产品信息</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        {Object.entries(currentConfig.productFields)
                          .filter(([key]) => key !== 'colorDisplayMode')
                          .map(([key, value]) => (
                          <div key={key} className="flex items-center space-x-2">
                            <Checkbox
                              id={`product-${key}`}
                              checked={value as boolean}
                              onCheckedChange={(checked) =>
                                updateField("productFields", key, checked as boolean)
                              }
                            />
                            <Label htmlFor={`product-${key}`} className="cursor-pointer text-sm">
                              {getFieldLabel("product", key)}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {/* 颜色显示模式（仅当showColor开启时显示） */}
                      {currentConfig.productFields.showColor && (
                        <div className="border rounded-lg p-4 bg-muted/30">
                          <Label className="text-sm font-medium mb-3 block">颜色显示方式</Label>
                          <RadioGroup
                            value={currentConfig.productFields.colorDisplayMode || 'code'}
                            onValueChange={(val) => {
                              setConfigs((prev) => ({
                                ...prev,
                                [activeTab]: {
                                  ...prev[activeTab]!,
                                  productFields: {
                                    ...prev[activeTab]!.productFields,
                                    colorDisplayMode: val as 'code' | 'image',
                                  },
                                },
                              }));
                            }}
                            className="flex gap-6"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="code" id="color-code" />
                              <Label htmlFor="color-code" className="cursor-pointer text-sm">
                                仅颜色编号（全字段，如：dav-A87-08）
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="image" id="color-image" />
                              <Label htmlFor="color-image" className="cursor-pointer text-sm">
                                颜色图片 + 编号（嵌入面料图片）
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* 价格信息字段 */}
                  <Card>
                    <CardHeader>
                      <CardTitle>价格信息字段</CardTitle>
                      <CardDescription>选择在Invoice中显示的价格信息</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        {Object.entries(currentConfig.priceFields).map(([key, value]) => (
                          <div key={key} className="flex items-center space-x-2">
                            <Checkbox
                              id={`price-${key}`}
                              checked={value}
                              onCheckedChange={(checked) =>
                                updateField("priceFields", key, checked as boolean)
                              }
                            />
                            <Label htmlFor={`price-${key}`} className="cursor-pointer text-sm">
                              {getFieldLabel("price", key)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 公司信息字段 */}
                  <Card>
                    <CardHeader>
                      <CardTitle>公司信息字段</CardTitle>
                      <CardDescription>选择在Invoice中显示的公司信息</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        {Object.entries(currentConfig.companyFields).map(([key, value]) => (
                          <div key={key} className="flex items-center space-x-2">
                            <Checkbox
                              id={`company-${key}`}
                              checked={value}
                              onCheckedChange={(checked) =>
                                updateField("companyFields", key, checked as boolean)
                              }
                            />
                            <Label htmlFor={`company-${key}`} className="cursor-pointer text-sm">
                              {getFieldLabel("company", key)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 客户/供应商信息字段 */}
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {type === "factory" ? "供应商信息字段" : "客户信息字段"}
                      </CardTitle>
                      <CardDescription>
                        选择在Invoice中显示的{type === "factory" ? "供应商" : "客户"}信息
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        {Object.entries(currentConfig.partnerFields).map(([key, value]) => (
                          <div key={key} className="flex items-center space-x-2">
                            <Checkbox
                              id={`partner-${key}`}
                              checked={value}
                              onCheckedChange={(checked) =>
                                updateField("partnerFields", key, checked as boolean)
                              }
                            />
                            <Label htmlFor={`partner-${key}`} className="cursor-pointer text-sm">
                              {getFieldLabel("partner", key)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 交易条款字段 */}
                  <Card>
                    <CardHeader>
                      <CardTitle>交易条款字段</CardTitle>
                      <CardDescription>选择在Invoice中显示的交易条款</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        {Object.entries(currentConfig.termsFields).map(([key, value]) => (
                          <div key={key} className="flex items-center space-x-2">
                            <Checkbox
                              id={`terms-${key}`}
                              checked={value}
                              onCheckedChange={(checked) =>
                                updateField("termsFields", key, checked as boolean)
                              }
                            />
                            <Label htmlFor={`terms-${key}`} className="cursor-pointer text-sm">
                              {getFieldLabel("terms", key)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

// Helper function to get field labels
function getFieldLabel(category: string, field: string): string {
  const labels: Record<string, Record<string, string>> = {
    product: {
      showImage: "产品图片",
      showName: "产品名称",
      showSku: "SKU",
      showCustomerSku: "客户SKU",
      showDimensions: "尺寸",
      showDescription: "描述",
      showMaterial: "材质",
      showFabric: "面料",
      showColor: "颜色",
      showPackaging: "包装",
      showPackageQty: "装箱数量",
      showCbm: "体积(CBM)",
      showGrossWeight: "毛重",
      showNetWeight: "净重",
    },
    price: {
      showUnitPrice: "单价",
      showQuantity: "数量",
      showSubtotal: "小计",
      showCostPrice: "成本价",
      showProfit: "利润",
      showProfitMargin: "利润率",
    },
    company: {
      showLogo: "公司Logo",
      showNameCn: "公司名称(中文)",
      showNameEn: "公司名称(英文)",
      showAddress: "地址",
      showPhone: "电话",
      showEmail: "邮箱",
      showWebsite: "网站",
    },
    partner: {
      showCompanyName: "公司名称",
      showAddress: "地址",
      showContactPerson: "联系人",
      showPhone: "电话",
      showEmail: "邮箱",
    },
    terms: {
      showLoadingPort: "装运港",
      showShipmentTime: "装运时间",
      showPartialShipment: "分批装运",
      showPaymentTerms: "付款条件",
      showQuantityTolerance: "数量容差",
      showPackingRequirements: "包装要求",
      showShippingMark: "唛头",
      showInsurance: "保险",
      showDocumentsRequired: "所需文件",
      showUsdBankInfo: "美元银行信息",
      showRmbBankInfo: "人民币银行信息",
      showModificationClause: "修改条款",
      showPaymentGuarantee: "付款保证",
      showTerminationClause: "终止条款",
      showForceMajeure: "不可抗力",
      showArbitration: "仲裁",
      showSignature: "签署",
    },
  };

  return labels[category]?.[field] || field;
}
