import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TermForm {
  id?: number;
  termNumber: number;
  titleCn: string;
  titleEn: string;
  contentCn: string;
  contentEn: string;
  isEnabled: boolean;
  sortOrder: number;
}

export default function InvoiceTermsManagement() {
  const utils = trpc.useUtils();
  const [termForms, setTermForms] = useState<TermForm[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Query invoice terms templates
  const { data: terms = [], isLoading } = trpc.invoiceTerms.list.useQuery();

  // Initialize defaults mutation
  const initializeDefaults = trpc.invoiceTerms.initializeDefaults.useMutation({
    onSuccess: () => {
      toast.success("默认条款模板初始化成功");
      utils.invoiceTerms.list.invalidate();
    },
    onError: (error) => {
      toast.error(`初始化失败: ${error.message}`);
    },
  });

  // Update term mutation
  const updateTerm = trpc.invoiceTerms.update.useMutation({
    onSuccess: () => {
      toast.success("条款更新成功");
      utils.invoiceTerms.list.invalidate();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  // Load terms into form
  useEffect(() => {
    if (terms && terms.length > 0) {
      setTermForms(
        terms.map((term) => ({
          id: term.id,
          termNumber: term.termNumber,
          titleCn: term.titleCn || "",
          titleEn: term.titleEn || "",
          contentCn: term.contentCn || "",
          contentEn: term.contentEn || "",
          isEnabled: term.isEnabled || false,
          sortOrder: term.sortOrder || 0,
        }))
      );
      setHasInitialized(true);
    }
  }, [terms]);

  // Handle initialize defaults
  const handleInitializeDefaults = () => {
    initializeDefaults.mutate();
  };

  // Handle save term
  const handleSaveTerm = (index: number) => {
    const term = termForms[index];

    if (!term.titleCn || !term.titleEn) {
      toast.error("请填写条款标题（中英文）");
      return;
    }

    if (term.id) {
      updateTerm.mutate({
        id: term.id,
        data: {
          titleCn: term.titleCn,
          titleEn: term.titleEn,
          contentCn: term.contentCn,
          contentEn: term.contentEn,
          isEnabled: term.isEnabled,
          sortOrder: term.sortOrder,
        },
      });
    }
  };

  // Handle save all
  const handleSaveAll = () => {
    termForms.forEach((term, index) => {
      if (term.id) {
        handleSaveTerm(index);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Invoice条款模板管理</h1>
            <p className="text-muted-foreground mt-2">
              配置17条交易条款模板，支持变量替换（如 {'{{'}companyName{'}}'}、{'{{'}customerName{'}}'}、{'{{'}orderNumber{'}}'} 等）            </p>
          </div>
          <div className="flex gap-2">
            {!hasInitialized && (
              <Button onClick={handleInitializeDefaults} disabled={initializeDefaults.isPending}>
                <RotateCcw className="h-4 w-4 mr-2" />
                初始化默认条款
              </Button>
            )}
            <Button onClick={handleSaveAll} disabled={updateTerm.isPending}>
              <Save className="h-4 w-4 mr-2" />
              保存全部
            </Button>
          </div>
        </div>
      </div>

      {!hasInitialized ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                您还没有创建条款模板。点击"初始化默认条款"按钮创建标准的17条交易条款模板。
              </p>
              <Button onClick={handleInitializeDefaults} disabled={initializeDefaults.isPending}>
                <RotateCcw className="h-4 w-4 mr-2" />
                初始化默认条款
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* 变量说明 */}
          <Card>
            <CardHeader>
              <CardTitle>可用变量</CardTitle>
              <CardDescription>在条款内容中使用以下变量，生成Invoice时会自动替换为实际值</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <code className="bg-muted px-2 py-1 rounded">{'{{'}companyName{'}}'}
                  </code> - 公司名称                </div>
                <div>
                  <code className="bg-muted px-2 py-1 rounded">{'{{'}customerName{'}}'}
                  </code> - 客户名称                </div>
                <div>                  <code className="bg-muted px-2 py-1 rounded">{'{{'}orderNumber{'}}'}
                  </code> - 订单号
                </div>
                <div>                  <code className="bg-muted px-2 py-1 rounded">{'{{'}shipmentPort{'}}'}
                  </code> - 装运港口
                </div>
                <div>                  <code className="bg-muted px-2 py-1 rounded">{'{{'}destinationPort{'}}'}
                  </code> - 目的港
                </div>
                <div>                  <code className="bg-muted px-2 py-1 rounded">{'{{'}shipmentDate{'}}'}
                  </code> - 装运日期
                </div>
                <div>                  <code className="bg-muted px-2 py-1 rounded">{'{{'}paymentTerms{'}}'}
                  </code> - 付款条件
                </div>
                <div>                  <code className="bg-muted px-2 py-1 rounded">{'{{'}bankName{'}}'}
                  </code> - 银行名称
                </div>
                <div>                  <code className="bg-muted px-2 py-1 rounded">{'{{'}accountNumber{'}}'}
                  </code> - 账户号码
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 条款列表 */}
          {termForms.map((term, index) => (
            <Card key={term.id || index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <CardTitle>条款 {term.termNumber}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`enabled-${index}`}
                        checked={term.isEnabled}
                        onCheckedChange={(checked) => {
                          const newForms = [...termForms];
                          newForms[index].isEnabled = checked as boolean;
                          setTermForms(newForms);
                        }}
                      />
                      <Label htmlFor={`enabled-${index}`} className="cursor-pointer text-sm">
                        启用此条款
                      </Label>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSaveTerm(index)}
                    disabled={updateTerm.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    保存
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="cn">
                  <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="cn">中文</TabsTrigger>
                    <TabsTrigger value="en">English</TabsTrigger>
                  </TabsList>

                  <TabsContent value="cn" className="space-y-4">
                    <div className="space-y-2">
                      <Label>条款标题（中文）*</Label>
                      <Input
                        value={term.titleCn}
                        onChange={(e) => {
                          const newForms = [...termForms];
                          newForms[index].titleCn = e.target.value;
                          setTermForms(newForms);
                        }}
                        placeholder="例如：装运港口"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>条款内容（中文）</Label>
                      <Textarea
                        value={term.contentCn}
                        onChange={(e) => {
                          const newForms = [...termForms];
                          newForms[index].contentCn = e.target.value;
                          setTermForms(newForms);
                        }}
                        placeholder="输入条款内容，可使用变量如 {{companyName}}"
                        rows={4}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="en" className="space-y-4">
                    <div className="space-y-2">
                      <Label>条款标题（English）*</Label>
                      <Input
                        value={term.titleEn}
                        onChange={(e) => {
                          const newForms = [...termForms];
                          newForms[index].titleEn = e.target.value;
                          setTermForms(newForms);
                        }}
                        placeholder="e.g., Port of Shipment"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>条款内容（English）</Label>
                      <Textarea
                        value={term.contentEn}
                        onChange={(e) => {
                          const newForms = [...termForms];
                          newForms[index].contentEn = e.target.value;
                          setTermForms(newForms);
                        }}
                        placeholder="Enter term content, use variables like {{companyName}}"
                        rows={4}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
