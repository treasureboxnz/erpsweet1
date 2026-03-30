import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import ProductEditTabs from "@/components/ProductEditTabs";
import RichTextEditor from "@/components/RichTextEditor";
import Breadcrumb from "@/components/Breadcrumb";
import { SmartCodeInput } from "@/components/SmartCodeInput";

export default function ProductCreate() {
  const [, setLocation] = useLocation();
  const navigate = (path: string) => setLocation(path);

  // Form state - 仅SKU必填
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "developing" | "discontinued">("active");
  const [productionMode, setProductionMode] = useState<"make_to_order" | "ready_stock">("make_to_order");

  // Active tab state
  const [activeTab, setActiveTab] = useState("overview");
  const [activeSubTab, setActiveSubTab] = useState<string | undefined>();

  // Create product mutation
  const createProduct = trpc.products.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("产品创建成功", {
        description: `产品 "${data.name || data.sku}" 已创建`,
      });
      // Navigate to edit page after creation
      navigate(`/products/${data.id}/edit`);
    },
    onError: (error: any) => {
      toast.error("创建失败", {
        description: error.message,
      });
    },
  });

  const handleSave = () => {
    if (!sku.trim()) {
      toast.error("验证失败", {
        description: "产品SKU编号不能为空",
      });
      return;
    }

    createProduct.mutate({
      sku: sku.trim(),
      name: name.trim() || undefined,
      description: description.trim() || undefined,
      status,
      productionMode,
    });
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="grid grid-cols-3 gap-6">
            {/* 左侧 - 主要内容 */}
            <div className="col-span-2 space-y-6">
              {/* 产品信息 */}
              <Card>
                <CardHeader>
                  <CardTitle>产品信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SmartCodeInput
                    label="产品SKU *"
                    ruleType="product"
                    value={sku}
                    onChange={setSku}
                  />

                  <div>
                    <Label htmlFor="name" className="mb-2 block">产品名称</Label>
                    <Input
                      id="name"
                      placeholder="输入产品名称（可后期补充）"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block">产品描述</Label>
                    <RichTextEditor
                      content={description}
                      onChange={setDescription}
                      placeholder="输入产品描述（可后期补充）..."
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 右侧 - 状态与设置 */}
            <div className="space-y-6">
              {/* 产品状态 */}
              <Card>
                <CardHeader>
                  <CardTitle>产品状态</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="mb-2 block">状态</Label>
                    <Select value={status} onValueChange={(value: any) => setStatus(value)}>
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

                  <div>
                    <Label className="mb-2 block">生产模式</Label>
                    <Select value={productionMode} onValueChange={(value: any) => setProductionMode(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="make_to_order">接单生产</SelectItem>
                        <SelectItem value="ready_stock">现货销售</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* 提示信息 */}
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    必填项：SKU编号。其他产品信息（名称、描述、价格、图片、变体等）可在创建后完善。
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "media":
        return (
          <Card>
            <CardHeader>
              <CardTitle>媒体文件</CardTitle>
              <CardDescription>创建产品后可上传图片</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                请先保存产品，然后再上传图片和视频。
              </p>
            </CardContent>
          </Card>
        );

      case "variants":
      case "pricing":
      case "suppliers":
      case "orders":
      case "files":
        const tabNames: Record<string, string> = {
          variants: "批次管理",
          pricing: "价格管理",
          suppliers: "供应商",
          orders: "关联订单",
          files: "文件管理",
        };
        return (
          <Card>
            <CardHeader>
              <CardTitle>{tabNames[activeTab] || activeTab}</CardTitle>
              <CardDescription>创建产品后可使用此功能</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                请先保存产品，然后再使用此功能。
              </p>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: "产品管理", href: "/products" },
        { label: "新增产品" }
      ]} />
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/products")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {name || sku || "新增产品"}
            </h1>
            <p className="text-sm text-muted-foreground">创建新产品（仅SKU必填）</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/products")}
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={createProduct.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {createProduct.isPending ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white border-b border-gray-200 -mx-6 px-6">
        <ProductEditTabs
          activeTab={activeTab}
          activeSubTab={activeSubTab}
          onTabChange={(tab, subTab) => {
            setActiveTab(tab);
            setActiveSubTab(subTab);
          }}
        />
      </div>

      {/* Content */}
      <div>
        {renderContent()}
      </div>
    </div>
  );
}
