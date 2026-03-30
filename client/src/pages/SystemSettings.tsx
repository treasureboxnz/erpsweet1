import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, DollarSign, TrendingUp, Save, RefreshCw, Info } from "lucide-react";
import { toast } from "sonner";
import RabbitLoader from "@/components/RabbitLoader";

export default function SystemSettings() {
  const { data: settings, isLoading } = trpc.companySettings.get.useQuery();
  const utils = trpc.useUtils();

  const updateSettings = trpc.companySettings.update.useMutation({
    onSuccess: () => {
      toast.success("设置已保存");
      utils.companySettings.get.invalidate();
    },
    onError: (err) => toast.error(`保存失败： ${err.message}`),
  });

  // Exchange rate form
  const [exchangeForm, setExchangeForm] = useState({
    exchangeRateUsdCny: 7.2,
    exchangeRateEurCny: 0,
    exchangeRateGbpCny: 0,
  });

  // Profit margin form
  const [marginForm, setMarginForm] = useState({
    defaultProfitMarginLevel1: 30,
    defaultProfitMarginLevel2: 25,
    defaultProfitMarginLevel3: 20,
    defaultRmbProfitMargin: 15,
    defaultTaxRate: 13,
  });

  useEffect(() => {
    if (settings) {
      setExchangeForm({
        exchangeRateUsdCny: settings.exchangeRateUsdCny ? Number(settings.exchangeRateUsdCny) : 7.2,
        exchangeRateEurCny: settings.exchangeRateEurCny ? Number(settings.exchangeRateEurCny) : 0,
        exchangeRateGbpCny: settings.exchangeRateGbpCny ? Number(settings.exchangeRateGbpCny) : 0,
      });
      setMarginForm({
        defaultProfitMarginLevel1: settings.defaultProfitMarginLevel1 ? Number(settings.defaultProfitMarginLevel1) : 30,
        defaultProfitMarginLevel2: settings.defaultProfitMarginLevel2 ? Number(settings.defaultProfitMarginLevel2) : 25,
        defaultProfitMarginLevel3: settings.defaultProfitMarginLevel3 ? Number(settings.defaultProfitMarginLevel3) : 20,
        defaultRmbProfitMargin: settings.defaultRmbProfitMargin ? Number(settings.defaultRmbProfitMargin) : 15,
        defaultTaxRate: settings.defaultTaxRate ? Number(settings.defaultTaxRate) : 13,
      });
    }
  }, [settings]);

  const handleSaveExchangeRates = async () => {
    await updateSettings.mutateAsync(exchangeForm);
  };

  const handleSaveMargins = async () => {
    await updateSettings.mutateAsync(marginForm);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RabbitLoader />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
          <Settings className="h-6 w-6 text-primary dark:text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">网站设置</h1>
          <p className="text-muted-foreground mt-1">配置系统全局参数和业务规则</p>
        </div>
      </div>

      {/* ═══ Exchange Rate Management ═══ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>汇率管理</CardTitle>
              <CardDescription>设置常用货币对人民币的汇率，用于产品定价和成本计算时自动引用</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* USD/CNY */}
            <div className="space-y-2">
              <Label htmlFor="exchangeRateUsdCny" className="text-sm font-medium">
                USD/CNY 汇率
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">1 USD =</span>
                <Input
                  id="exchangeRateUsdCny"
                  type="number"
                  step="0.0001"
                  value={exchangeForm.exchangeRateUsdCny || ""}
                  onChange={(e) => setExchangeForm({ ...exchangeForm, exchangeRateUsdCny: Number(e.target.value) })}
                  className="pl-16 pr-12"
                  placeholder="7.2000"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">CNY</span>
              </div>
            </div>
            {/* EUR/CNY */}
            <div className="space-y-2">
              <Label htmlFor="exchangeRateEurCny" className="text-sm font-medium">
                EUR/CNY 汇率
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">1 EUR =</span>
                <Input
                  id="exchangeRateEurCny"
                  type="number"
                  step="0.0001"
                  value={exchangeForm.exchangeRateEurCny || ""}
                  onChange={(e) => setExchangeForm({ ...exchangeForm, exchangeRateEurCny: Number(e.target.value) })}
                  className="pl-16 pr-12"
                  placeholder="7.8000"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">CNY</span>
              </div>
            </div>
            {/* GBP/CNY */}
            <div className="space-y-2">
              <Label htmlFor="exchangeRateGbpCny" className="text-sm font-medium">
                GBP/CNY 汇率
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">1 GBP =</span>
                <Input
                  id="exchangeRateGbpCny"
                  type="number"
                  step="0.0001"
                  value={exchangeForm.exchangeRateGbpCny || ""}
                  onChange={(e) => setExchangeForm({ ...exchangeForm, exchangeRateGbpCny: Number(e.target.value) })}
                  className="pl-16 pr-12"
                  placeholder="9.1000"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">CNY</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5" />
              <span>汇率将自动应用于产品定价页面的成本计算。保存成本时，当前汇率将被记录在历史快照中。</span>
            </div>
            <Button
              onClick={handleSaveExchangeRates}
              disabled={updateSettings.isPending}
              size="sm"
              className="gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {updateSettings.isPending ? "保存中…" : "保存汇率"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ═══ Profit Margin Management ═══ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <div>
              <CardTitle>利润率管理</CardTitle>
              <CardDescription>
                设置各级别FOB售价和RMB含税售价的默认利润率。新建产品时将自动使用这些默认值计算售价。
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* FOB Levels */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary/70" />
              FOB 三级定价默认利润率
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Level 1 利润率</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.5"
                    value={marginForm.defaultProfitMarginLevel1 || ""}
                    onChange={(e) => setMarginForm({ ...marginForm, defaultProfitMarginLevel1: Number(e.target.value) })}
                    className="pr-8"
                    placeholder="30"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
                <p className="text-[11px] text-muted-foreground">最高级别客户售价利润率</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Level 2 利润率</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.5"
                    value={marginForm.defaultProfitMarginLevel2 || ""}
                    onChange={(e) => setMarginForm({ ...marginForm, defaultProfitMarginLevel2: Number(e.target.value) })}
                    className="pr-8"
                    placeholder="25"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
                <p className="text-[11px] text-muted-foreground">中等级别客户售价利润率</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Level 3 利润率</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.5"
                    value={marginForm.defaultProfitMarginLevel3 || ""}
                    onChange={(e) => setMarginForm({ ...marginForm, defaultProfitMarginLevel3: Number(e.target.value) })}
                    className="pr-8"
                    placeholder="20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
                <p className="text-[11px] text-muted-foreground">最低级别客户售价利润率</p>
              </div>
            </div>
          </div>

          {/* RMB Margin & Tax Rate */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500/70" />
              RMB 含税售价设置
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">RMB 含税售价默认利润率</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.5"
                    value={marginForm.defaultRmbProfitMargin || ""}
                    onChange={(e) => setMarginForm({ ...marginForm, defaultRmbProfitMargin: Number(e.target.value) })}
                    className="pr-8"
                    placeholder="15"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
                <p className="text-[11px] text-muted-foreground">基于工厂含税价计算的默认加价比例</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">默认增值税税率</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="1"
                    value={marginForm.defaultTaxRate || ""}
                    onChange={(e) => setMarginForm({ ...marginForm, defaultTaxRate: Number(e.target.value) })}
                    className="pr-8"
                    placeholder="13"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
                <p className="text-[11px] text-muted-foreground">用于含税/不含税价格转换的默认税率</p>
              </div>
            </div>
          </div>

          {/* Preview calculation */}
          <div className="bg-muted/30 rounded-lg p-4 border border-border/40">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">预览：假设我的成本为 $10.00 USD</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "FOB Level 1", margin: marginForm.defaultProfitMarginLevel1, currency: "$" },
                { label: "FOB Level 2", margin: marginForm.defaultProfitMarginLevel2, currency: "$" },
                { label: "FOB Level 3", margin: marginForm.defaultProfitMarginLevel3, currency: "$" },
              ].map(({ label, margin, currency }) => {
                const cost = 10;
                const price = margin > 0 ? cost / (1 - margin / 100) : cost;
                return (
                  <div key={label} className="text-center">
                    <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
                    <p className="text-sm font-bold tabular-nums">{currency}{price.toFixed(2)}</p>
                    <p className="text-[10px] text-emerald-600">利润率 {margin}%</p>
                  </div>
                );
              })}
              <div className="text-center">
                <p className="text-[11px] text-muted-foreground mb-1">RMB 含税售价</p>
                <p className="text-sm font-bold tabular-nums">
                  ¥{((10 * exchangeForm.exchangeRateUsdCny) * (1 + marginForm.defaultRmbProfitMargin / 100)).toFixed(2)}
                </p>
                <p className="text-[10px] text-orange-600">利润率 {marginForm.defaultRmbProfitMargin}%</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5" />
              <span>利润率设置仅对新建产品生效，不会影响已有产品的售价。</span>
            </div>
            <Button
              onClick={handleSaveMargins}
              disabled={updateSettings.isPending}
              size="sm"
              className="gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {updateSettings.isPending ? "保存中…" : "保存利润率"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
