import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Loader2, Search, Mail, Sparkles, RefreshCw, Copy, Check, Maximize2, Code2, Eye } from "lucide-react";

export default function EmailGenerator() {
  // 搜索和产品选择
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  
  // 显示字段配置
  const [displayConfig, setDisplayConfig] = useState({
    showImage: true,
    showName: true,
    showSku: true,
    showPrice: true,
    priceTypes: ["fobLevel1"] as ("fobLevel1" | "fobLevel2" | "fobLevel3")[],
    showMoq: false,
    showDescription: false,
    showSpecs: false,
  });

  // 自定义内容
  const [customContent, setCustomContent] = useState("");
  
  // 生成的邮件
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  
  // AI优化
  const [optimizationRequest, setOptimizationRequest] = useState("");
  
  // HTML预览模式
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const [customHtml, setCustomHtml] = useState("");
  
  // 邮件预览区域的HTML代码视图切换
  const [showPreviewAsHtml, setShowPreviewAsHtml] = useState(false);

  // API调用
  const { data: productsData, isLoading: isSearching } = trpc.emailGenerator.searchProducts.useQuery(
    {
      keyword: searchKeyword,
      page: 1,
      pageSize: 50,
    },
    {
      enabled: searchKeyword.length > 0,
    }
  );

  const generateEmailMutation = trpc.emailGenerator.generateEmail.useMutation({
    onSuccess: (data) => {
      setGeneratedHtml(data.html);
      toast.success("邮件生成成功！");
    },
    onError: (error) => {
      toast.error(`生成失败：${error.message}`);
    },
  });

  const optimizeEmailMutation = trpc.emailGenerator.optimizeEmail.useMutation({
    onSuccess: (data) => {
      setGeneratedHtml(data.html);
      setOptimizationRequest("");
      toast.success("邮件优化成功！");
    },
    onError: (error) => {
      toast.error(`优化失败：${error.message}`);
    },
  });

  // 处理产品选择
  const toggleProductSelection = (productId: number) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  // 处理价格类型选择
  const togglePriceType = (type: "fobLevel1" | "fobLevel2" | "fobLevel3") => {
    setDisplayConfig((prev) => ({
      ...prev,
      priceTypes: prev.priceTypes.includes(type)
        ? prev.priceTypes.filter((t) => t !== type)
        : [...prev.priceTypes, type],
    }));
  };

  // 生成邮件
  const handleGenerateEmail = () => {
    if (selectedProductIds.length === 0) {
      toast.error("请至少选择一个产品");
      return;
    }

    generateEmailMutation.mutate({
      productIds: selectedProductIds,
      displayConfig,
      customContent,
    });
  };

  // AI优化邮件
  const handleOptimizeEmail = () => {
    if (!generatedHtml) {
      toast.error("请先生成邮件");
      return;
    }
    if (!optimizationRequest.trim()) {
      toast.error("请描述您想要的修改");
      return;
    }

    optimizeEmailMutation.mutate({
      currentHtml: generatedHtml,
      optimizationRequest,
    });
  };

  // 重新生成邮件（换风格）
  const handleRegenerateEmail = () => {
    if (selectedProductIds.length === 0) {
      toast.error("请至少选择一个产品");
      return;
    }

    generateEmailMutation.mutate({
      productIds: selectedProductIds,
      displayConfig,
      customContent: customContent + "\n\n请使用完全不同的设计风格和布局。",
    });
  };

  // 复制HTML代码
  const handleCopyHtml = () => {
    navigator.clipboard.writeText(generatedHtml);
    setIsCopied(true);
    toast.success("HTML代码已复制到剪贴板");
    setTimeout(() => setIsCopied(false), 2000);
  };

  // 全屏预览邮件
  const handleFullscreenPreview = () => {
    const previewWindow = window.open("", "_blank", "width=1200,height=800");
    if (previewWindow) {
      previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>邮件预览</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              background-color: #f5f5f5;
              font-family: Arial, sans-serif;
            }
            .email-container {
              max-width: 800px;
              margin: 0 auto;
              background-color: #ffffff;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            ${generatedHtml}
          </div>
        </body>
        </html>
      `);
      previewWindow.document.close();
    } else {
      toast.error("无法打开预览窗口，请检查浏览器弹窗设置");
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">开发邮件</h1>
          <p className="text-muted-foreground mt-1">AI驱动的产品推广邮件生成器</p>
        </div>
        <Mail className="h-8 w-8 text-primary" />
      </div>

      {/* 配置区域 - 横向卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. 产品选择 */}
        <Card>
          <CardHeader>
            <CardTitle>1. 选择产品</CardTitle>
            <CardDescription>搜索并选择要推广的产品</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="输入产品名称或SKU搜索..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {productsData && productsData.products.length > 0 && (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {productsData.products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => toggleProductSelection(product.id)}
                  >
                    <Checkbox
                      checked={selectedProductIds.includes(product.id)}
                      onCheckedChange={(checked) => {
                        if (checked !== selectedProductIds.includes(product.id)) {
                          toggleProductSelection(product.id);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.name || product.sku}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                      {product.fobLevel1 && (
                        <p className="text-sm text-primary font-medium">
                          ${product.fobLevel1}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedProductIds.length > 0 && (
              <div className="text-sm text-muted-foreground">
                已选择 {selectedProductIds.length} 个产品
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. 配置显示字段 */}
        <Card>
          <CardHeader>
            <CardTitle>2. 配置显示字段</CardTitle>
            <CardDescription>选择邮件中要显示的产品信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="showImage" checked={true} disabled />
                <Label htmlFor="showImage" className="text-muted-foreground">
                  显示产品图片（必选）
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showName"
                  checked={displayConfig.showName}
                  onCheckedChange={(checked) =>
                    setDisplayConfig((prev) => ({ ...prev, showName: !!checked }))
                  }
                />
                <Label htmlFor="showName">显示产品名称</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showSku"
                  checked={displayConfig.showSku}
                  onCheckedChange={(checked) =>
                    setDisplayConfig((prev) => ({ ...prev, showSku: !!checked }))
                  }
                />
                <Label htmlFor="showSku">显示SKU编号</Label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showPrice"
                    checked={displayConfig.showPrice}
                    onCheckedChange={(checked) =>
                      setDisplayConfig((prev) => ({ ...prev, showPrice: !!checked }))
                    }
                  />
                  <Label htmlFor="showPrice">显示价格（HOT PRICE）</Label>
                </div>

                {displayConfig.showPrice && (
                  <div className="ml-6 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="fob1"
                        checked={displayConfig.priceTypes.includes("fobLevel1")}
                        onCheckedChange={() => togglePriceType("fobLevel1")}
                      />
                      <Label htmlFor="fob1">FOB1价格</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="fob2"
                        checked={displayConfig.priceTypes.includes("fobLevel2")}
                        onCheckedChange={() => togglePriceType("fobLevel2")}
                      />
                      <Label htmlFor="fob2">FOB2价格</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="fob3"
                        checked={displayConfig.priceTypes.includes("fobLevel3")}
                        onCheckedChange={() => togglePriceType("fobLevel3")}
                      />
                      <Label htmlFor="fob3">FOB3价格</Label>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showMoq"
                  checked={displayConfig.showMoq}
                  onCheckedChange={(checked) =>
                    setDisplayConfig((prev) => ({ ...prev, showMoq: !!checked }))
                  }
                />
                <Label htmlFor="showMoq">显示MOQ（起订量）</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showDescription"
                  checked={displayConfig.showDescription}
                  onCheckedChange={(checked) =>
                    setDisplayConfig((prev) => ({ ...prev, showDescription: !!checked }))
                  }
                />
                <Label htmlFor="showDescription">显示产品描述</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showSpecs"
                  checked={displayConfig.showSpecs}
                  onCheckedChange={(checked) =>
                    setDisplayConfig((prev) => ({ ...prev, showSpecs: !!checked }))
                  }
                />
                <Label htmlFor="showSpecs">显示规格参数</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. 描述邮件内容 */}
        <Card>
          <CardHeader>
            <CardTitle>3. 描述邮件内容</CardTitle>
            <CardDescription>告诉AI您想要什么样的邮件</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder={`例如：
- 这是给老客户的新品推荐邮件
- 强调产品的质量和性价比
- 提到我们有现货，可以快速发货
- 语气要专业但友好
- 结尾要有明确的询价引导`}
              value={customContent}
              onChange={(e) => setCustomContent(e.target.value)}
              rows={12}
            />
          </CardContent>
        </Card>
      </div>

      {/* 生成按钮 */}
      <div className="flex justify-center">
        <Button
          onClick={handleGenerateEmail}
          disabled={generateEmailMutation.isPending || selectedProductIds.length === 0}
          size="lg"
          className="w-full max-w-md"
        >
          {generateEmailMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              AI正在生成邮件...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              生成邮件
            </>
          )}
        </Button>
      </div>

      {/* 模式切换按钮 */}
      {generatedHtml && (
        <div className="flex justify-center gap-2">
          <Button
            onClick={() => setShowHtmlPreview(false)}
            variant={!showHtmlPreview ? "default" : "outline"}
            size="sm"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            AI生成邮件
          </Button>
          <Button
            onClick={() => setShowHtmlPreview(true)}
            variant={showHtmlPreview ? "default" : "outline"}
            size="sm"
          >
            <Code2 className="mr-2 h-4 w-4" />
            HTML预览
          </Button>
        </div>
      )}

      {/* 预览区域 - 全宽显示 */}
      {generatedHtml && !showHtmlPreview && (
        <div className="space-y-6">
          {/* 邮件预览 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>邮件预览</CardTitle>
                  <CardDescription>查看生成的邮件效果</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowPreviewAsHtml(!showPreviewAsHtml)}
                    variant="outline"
                    size="sm"
                  >
                    {showPreviewAsHtml ? (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        查看预览
                      </>
                    ) : (
                      <>
                        <Code2 className="mr-2 h-4 w-4" />
                        Show HTML
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleFullscreenPreview}
                    variant="outline"
                    size="sm"
                  >
                    <Maximize2 className="mr-2 h-4 w-4" />
                    全屏预览
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-white max-h-[600px] overflow-y-auto">
                {showPreviewAsHtml ? (
                  /* HTML代码视图 */
                  <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                    <code>{generatedHtml}</code>
                  </pre>
                ) : (
                  /* 邮件预览容器 - 添加样式隔离和重置 */
                  <div 
                    className="email-preview-container"
                    style={{
                      all: 'initial',
                      display: 'block',
                      fontFamily: 'Arial, sans-serif',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      color: '#000000',
                      backgroundColor: '#ffffff',
                    }}
                    dangerouslySetInnerHTML={{ __html: generatedHtml }} 
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI优化和操作按钮 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI优化 */}
            <Card>
              <CardHeader>
                <CardTitle>💬 不满意？告诉AI如何改进</CardTitle>
                <CardDescription>描述您想要的修改，AI会帮您优化</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder={`例如：
- 把标题改得更吸引人
- 产品图片要更大一些
- 增加一个促销倒计时的感觉
- 文案要更简洁
- 把蓝色改成红色`}
                  value={optimizationRequest}
                  onChange={(e) => setOptimizationRequest(e.target.value)}
                  rows={5}
                />

                <Button
                  onClick={handleOptimizeEmail}
                  disabled={optimizeEmailMutation.isPending}
                  className="w-full"
                >
                  {optimizeEmailMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      优化中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      优化邮件
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* 操作按钮 */}
            <Card>
              <CardHeader>
                <CardTitle>📤 导出和操作</CardTitle>
                <CardDescription>复制代码或重新生成</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleCopyHtml}
                  variant="outline"
                  className="w-full"
                >
                  {isCopied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      复制HTML代码
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleRegenerateEmail}
                  disabled={generateEmailMutation.isPending}
                  variant="outline"
                  className="w-full"
                >
                  {generateEmailMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      重新生成（换风格）
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleFullscreenPreview}
                  variant="default"
                  className="w-full"
                >
                  <Maximize2 className="mr-2 h-4 w-4" />
                  全屏预览
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* HTML预览模式 */}
      {generatedHtml && showHtmlPreview && (
        <div className="space-y-6">
          {/* HTML代码编辑器 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>HTML代码</CardTitle>
                  <CardDescription>粘贴或编辑您的HTML邮件代码</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setCustomHtml(generatedHtml)}
                    variant="outline"
                    size="sm"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    加载AI生成的HTML
                  </Button>
                  <Button
                    onClick={() => setCustomHtml("")}
                    variant="outline"
                    size="sm"
                  >
                    清空
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={customHtml}
                onChange={(e) => setCustomHtml(e.target.value)}
                placeholder="在这里粘贴您的HTML邮件代码..."
                rows={15}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>

          {/* HTML预览 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>邮件预览</CardTitle>
                  <CardDescription>查看HTML渲染效果</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    const previewWindow = window.open("", "_blank", "width=1200,height=800");
                    if (previewWindow) {
                      previewWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <meta charset="UTF-8">
                          <meta name="viewport" content="width=device-width, initial-scale=1.0">
                          <title>邮件预览</title>
                          <style>
                            body {
                              margin: 0;
                              padding: 20px;
                              background-color: #f5f5f5;
                              font-family: Arial, sans-serif;
                            }
                            .email-container {
                              max-width: 800px;
                              margin: 0 auto;
                              background-color: #ffffff;
                              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                            }
                          </style>
                        </head>
                        <body>
                          <div class="email-container">
                            ${customHtml}
                          </div>
                        </body>
                        </html>
                      `);
                      previewWindow.document.close();
                    } else {
                      toast.error("无法打开预览窗口，请检查浏览器弹窗设置");
                    }
                  }}
                  variant="outline"
                  size="sm"
                >
                  <Maximize2 className="mr-2 h-4 w-4" />
                  全屏预览
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {customHtml ? (
                <div className="border rounded-lg p-4 bg-white max-h-[600px] overflow-y-auto">
                  <div 
                    className="email-preview-container"
                    style={{
                      all: 'initial',
                      display: 'block',
                      fontFamily: 'Arial, sans-serif',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      color: '#000000',
                      backgroundColor: '#ffffff',
                    }}
                    dangerouslySetInnerHTML={{ __html: customHtml }} 
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 border rounded-lg border-dashed">
                  <Eye className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">在上方粘贴HTML代码以预览效果</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <Card>
            <CardHeader>
              <CardTitle>📤 导出操作</CardTitle>
              <CardDescription>复制HTML代码</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => {
                  if (customHtml) {
                    navigator.clipboard.writeText(customHtml);
                    toast.success("HTML代码已复制到剪贴板");
                  } else {
                    toast.error("请先输入HTML代码");
                  }
                }}
                variant="outline"
                className="w-full"
              >
                <Copy className="mr-2 h-4 w-4" />
                复制HTML代码
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 空状态提示 */}
      {!generatedHtml && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-2">
              选择产品并配置后，点击"生成邮件"
            </p>
            <p className="text-sm text-muted-foreground">
              AI将为您生成专业的产品推广邮件
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
