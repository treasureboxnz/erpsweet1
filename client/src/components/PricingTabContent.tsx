import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Save, ArrowRight, TrendingUp, Info, DollarSign, Calculator,
  History, X, Clock, ArrowUpDown, ChevronDown, ChevronUp, Copy,
} from "lucide-react";
import { toast } from "sonner";
import RabbitLoader from "./RabbitLoader";

interface PricingTabContentProps {
  productId: number;
  activeSubTab: string;
}

/* ─── Cost History Side Panel ─── */
function CostHistoryPanel({
  productId,
  isOpen,
  onClose,
  onApply,
}: {
  productId: number;
  isOpen: boolean;
  onClose: () => void;
  onApply?: (data: {
    factoryPriceRmbExcludingTax: number | null;
    factoryPriceRmbIncludingTax: number | null;
    factoryPriceUsdFob: number | null;
    fobFeeRmb: number | null;
    myCostRmb: number | null;
    myCostUsd: number | null;
    fobLevel1: number | null;
    fobLevel2: number | null;
    fobLevel3: number | null;
    rmbTaxRate?: number | null;
    sellingPriceRmbIncludingTax: number | null;
    exchangeRate: number;
  }) => void;
}) {
  const { data: snapshots, isLoading } = trpc.products.getCostSnapshots.useQuery(
    { productId },
    { enabled: isOpen && !!productId }
  );

  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (!isOpen) return null;

  const fmt = (v: string | null, currency: "RMB" | "USD") => {
    if (!v) return "–";
    const num = parseFloat(v);
    const sym = currency === "RMB" ? "¥" : "$";
    return `${sym}\u00A0${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getChange = (current: string | null, previous: string | null) => {
    if (!current || !previous) return null;
    const c = parseFloat(current);
    const p = parseFloat(previous);
    if (p === 0) return null;
    return ((c - p) / p) * 100;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
              <History className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">成本历史记录</h3>
              <p className="text-[11px] text-muted-foreground">每次保存时自动记录快照</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><RabbitLoader /></div>
          ) : !snapshots || snapshots.length === 0 ? (
            <div className="text-center py-16 px-6">
              <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">暂无历史记录</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">保存时将自动创建快照</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {snapshots.map((snap, idx) => {
                const prev = idx < snapshots.length - 1 ? snapshots[idx + 1] : null;
                const isExpanded = expandedId === snap.id;
                return (
                  <div key={snap.id} className="group">
                    <button
                      type="button"
                      className="w-full text-left px-5 py-3.5 hover:bg-muted/30 transition-colors duration-100"
                      onClick={() => setExpandedId(isExpanded ? null : snap.id)}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <time className="text-[12px] font-medium text-foreground tabular-nums">
                            {new Date(snap.createdAt).toLocaleString("zh-CN", {
                              year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
                            })}
                          </time>
                          {idx === 0 && (
                            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">最新</span>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>
                      <div className="flex items-center gap-4 text-[12px]">
                        <span className="text-muted-foreground">
                          汇率: <span className="font-medium text-foreground tabular-nums">{snap.exchangeRate}</span>
                        </span>
                        <span className="text-muted-foreground">
                          工厂FOB: <span className="font-medium text-foreground tabular-nums">{fmt(snap.factoryPriceUsdFob, "USD")}</span>
                        </span>
                        {snap.userName && <span className="text-muted-foreground/70 ml-auto">{snap.userName}</span>}
                      </div>
                      {snap.note && (
                        <div className="mt-1.5 text-[12px] text-muted-foreground bg-muted/40 rounded px-2 py-1">
                          <span className="text-muted-foreground/60">备注：</span> {snap.note}
                        </div>
                      )}
                    </button>
                    {isExpanded && (
                      <>
                        <div className="px-5 pb-4 pt-1 bg-muted/20 border-t border-border/30">
                          <div className="space-y-0">
                            {[
                              { label: "RMB 含税", val: snap.factoryPriceRmbIncludingTax, prev: prev?.factoryPriceRmbIncludingTax, cur: "RMB" as const },
                              { label: "USD FOB", val: snap.factoryPriceUsdFob, prev: prev?.factoryPriceUsdFob, cur: "USD" as const },
                              { label: "FOB 费用", val: snap.fobFeeRmb, prev: prev?.fobFeeRmb, cur: "RMB" as const },
                              { label: "我的成本 USD", val: snap.myCostUsd, prev: prev?.myCostUsd, cur: "USD" as const },
                              { label: "FOB Level 1", val: snap.fobLevel1, prev: prev?.fobLevel1, cur: "USD" as const },
                              { label: "FOB Level 2", val: snap.fobLevel2, prev: prev?.fobLevel2, cur: "USD" as const },
                              { label: "FOB Level 3", val: snap.fobLevel3, prev: prev?.fobLevel3, cur: "USD" as const },
                              { label: "RMB 含税售价", val: snap.sellingPriceRmbIncludingTax, prev: prev?.sellingPriceRmbIncludingTax, cur: "RMB" as const },
                            ].map(({ label, val, prev: prevVal, cur }) => {
                              const change = getChange(val, prevVal ?? null);
                              return (
                                <div key={label} className="flex items-center justify-between py-1.5 text-[12px]">
                                  <span className="text-muted-foreground">{label}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium tabular-nums text-foreground">{fmt(val, cur)}</span>
                                    {change !== null && (
                                      <span className={`text-[10px] font-semibold tabular-nums px-1 py-0.5 rounded ${change > 0 ? "text-red-600 bg-red-50" : change < 0 ? "text-emerald-600 bg-emerald-50" : "text-muted-foreground bg-muted/50"}`}>
                                        {change > 0 ? "+" : ""}{change.toFixed(1)}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="px-5 pb-3 pt-1 flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1.5 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              const toNum = (v: string | null) => v ? parseFloat(v) : null;
                              onApply?.({
                                factoryPriceRmbExcludingTax: toNum(snap.factoryPriceRmbExcludingTax),
                                factoryPriceRmbIncludingTax: toNum(snap.factoryPriceRmbIncludingTax),
                                factoryPriceUsdFob: toNum(snap.factoryPriceUsdFob),
                                fobFeeRmb: toNum(snap.fobFeeRmb),
                                myCostRmb: toNum(snap.myCostRmb),
                                myCostUsd: toNum(snap.myCostUsd),
                                fobLevel1: toNum(snap.fobLevel1),
                                fobLevel2: toNum(snap.fobLevel2),
                                fobLevel3: toNum(snap.fobLevel3),
                                rmbTaxRate: toNum(snap.rmbTaxRate),
                                sellingPriceRmbIncludingTax: toNum(snap.sellingPriceRmbIncludingTax),
                                exchangeRate: parseFloat(snap.exchangeRate) || 7.2,
                              });
                              toast.success("已复制历史成本数据到表单");
                              onClose();
                            }}
                          >
                            <Copy className="w-3 h-3" />
                            复制到表单
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */
export default function PricingTabContent({ productId, activeSubTab }: PricingTabContentProps) {
  const [pricing, setPricing] = useState({
    factoryPriceRmbExcludingTax: null as number | null,
    factoryPriceRmbIncludingTax: null as number | null,
    factoryPriceUsdFob: null as number | null,
    myCostRmb: null as number | null,
    myCostUsd: null as number | null,
    fobFeeRmb: null as number | null,
    sellingPriceRmbIncludingTax: null as number | null,
    fobLevel1: null as number | null,
    fobLevel2: null as number | null,
    fobLevel3: null as number | null,
    rmbTaxRate: 13 as number | null,
  });

  const [editingMargin, setEditingMargin] = useState<{ field: string; value: string } | null>(null);
  const [editingRmbMargin, setEditingRmbMargin] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState(7.2);
  const [showHistory, setShowHistory] = useState(false);
  const [saveNote, setSaveNote] = useState("");
  const [defaultsApplied, setDefaultsApplied] = useState(false);

  const utils = trpc.useUtils();

  const { data: pricingData, isLoading } = trpc.products.getPricing.useQuery(
    { productId },
    { enabled: !!productId }
  );

  const { data: priceHistory } = trpc.products.getPriceHistory.useQuery(
    { productId },
    { enabled: !!productId && activeSubTab === "history" }
  );

  const { data: companySettings } = trpc.companySettings.get.useQuery();

  // Always sync exchange rate from company settings
  useEffect(() => {
    if (companySettings?.exchangeRateUsdCny) {
      setExchangeRate(Number(companySettings.exchangeRateUsdCny));
    }
  }, [companySettings]);

  // For NEW products (never priced before): apply system default profit margins
  // "New product" = all FOB levels and RMB selling price are null (never saved)
  useEffect(() => {
    if (defaultsApplied) return;
    if (!pricingData || !companySettings) return;
    
    const isNewProduct = !pricingData.fobLevel1 && !pricingData.fobLevel2 && !pricingData.fobLevel3 && !pricingData.sellingPriceRmbIncludingTax;
    if (!isNewProduct) return;
    
    // Apply default tax rate for new products
    if (companySettings.defaultTaxRate) {
      setPricing(prev => ({ ...prev, rmbTaxRate: Number(companySettings.defaultTaxRate) }));
    }
    
    setDefaultsApplied(true);
  }, [pricingData, companySettings, defaultsApplied]);

  useEffect(() => {
    if (pricingData) {
      setPricing({
        factoryPriceRmbExcludingTax: pricingData.factoryPriceRmbExcludingTax ? Number(pricingData.factoryPriceRmbExcludingTax) : null,
        factoryPriceRmbIncludingTax: pricingData.factoryPriceRmbIncludingTax ? Number(pricingData.factoryPriceRmbIncludingTax) : null,
        factoryPriceUsdFob: pricingData.factoryPriceUsdFob ? Number(pricingData.factoryPriceUsdFob) : null,
        myCostRmb: pricingData.myCostRmb ? Number(pricingData.myCostRmb) : null,
        myCostUsd: pricingData.myCostUsd ? Number(pricingData.myCostUsd) : null,
        fobFeeRmb: pricingData.fobFeeRmb ? Number(pricingData.fobFeeRmb) : null,
        sellingPriceRmbIncludingTax: pricingData.sellingPriceRmbIncludingTax ? Number(pricingData.sellingPriceRmbIncludingTax) : null,
        fobLevel1: pricingData.fobLevel1 ? Number(pricingData.fobLevel1) : null,
        fobLevel2: pricingData.fobLevel2 ? Number(pricingData.fobLevel2) : null,
        fobLevel3: pricingData.fobLevel3 ? Number(pricingData.fobLevel3) : null,
        rmbTaxRate: pricingData.rmbTaxRate ? Number(pricingData.rmbTaxRate) : 13,
      });
    }
  }, [pricingData]);

  const updatePricing = trpc.products.updatePricing.useMutation({
    onSuccess: () => {
      toast.success("价格已保存");
      utils.products.getPricing.invalidate({ productId });
      utils.products.getPriceHistory.invalidate({ productId });
      utils.products.getCostSnapshots.invalidate({ productId });
    },
    onError: (error) => {
      toast.error(`保存失败: ${error.message}`);
    },
  });

  const handleSave = async () => {
    await updatePricing.mutateAsync({ productId, exchangeRate, note: saveNote.trim() || undefined, pricing });
    setSaveNote("");
  };

  const fmt = (value: number | null, currency: "RMB" | "USD") => {
    if (value === null || value === undefined) return "–";
    const sym = currency === "RMB" ? "¥" : "$";
    return `${sym}\u00A0${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleInputChange = (field: keyof typeof pricing, value: string) => {
    const numValue = value === "" ? null : parseFloat(value);
    setPricing((prev) => ({ ...prev, [field]: numValue }));
  };

  const fobTotalCost = useMemo(() => {
    return pricing.myCostUsd || 0;
  }, [pricing.myCostUsd]);

  const calculateMargin = (sellingPrice: number | null) => {
    if (!sellingPrice || fobTotalCost === 0) return null;
    return (sellingPrice - fobTotalCost) / fobTotalCost * 100;
  };

  const calculatePriceFromMargin = (marginPercent: number) => {
    if (fobTotalCost === 0) return null;
    return fobTotalCost * (1 + marginPercent / 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RabbitLoader />
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════
     成本与定价 Tab — Compact unified layout
     ════════════════════════════════════════════════════════════════ */
  if (activeSubTab === "cost") {
    const getMarginColor = (m: number | null) => {
      if (m === null) return "text-muted-foreground";
      if (m >= 30) return "text-emerald-600";
      if (m >= 15) return "text-amber-600";
      return "text-red-500";
    };

    const renderFobRow = (
      label: string,
      pricingField: "fobLevel1" | "fobLevel2" | "fobLevel3",
      marginField: "level1" | "level2" | "level3"
    ) => {
      const savedPrice = pricing[pricingField];
      const margin = calculateMargin(savedPrice);
      const profitAmount = savedPrice && fobTotalCost ? savedPrice - fobTotalCost : null;
      const isEditingThisMargin = editingMargin?.field === marginField;
      const marginDisplayValue = isEditingThisMargin
        ? editingMargin.value
        : (margin !== null ? parseFloat(margin.toFixed(1)).toString() : "");

      return (
        <div
          key={label}
          className="grid grid-cols-12 gap-x-3 items-center py-2 border-b border-border/30 last:border-0 group hover:bg-muted/20 -mx-3 px-3 rounded-sm transition-colors"
        >
          <div className="col-span-2">
            <span className="text-[13px] font-medium text-foreground">{label}</span>
          </div>
          <div className="col-span-3">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 text-xs font-medium">$</span>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0.00"
                autoComplete="off"
                name={`fob-price-${pricingField}`}
                className="pl-6 h-8 text-sm tabular-nums"
                value={savedPrice ?? ""}
                onChange={(e) => handleInputChange(pricingField, e.target.value)}
              />
            </div>
          </div>
          <div className="col-span-3">
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                step="0.5"
                autoComplete="off"
                name={`margin-${marginField}`}
                className="pr-7 h-8 text-sm tabular-nums"
                value={marginDisplayValue}
                onFocus={() => {
                  setEditingMargin({
                    field: marginField,
                    value: margin !== null ? parseFloat(margin.toFixed(1)).toString() : ""
                  });
                }}
                onChange={(e) => {
                  const raw = e.target.value;
                  setEditingMargin({ field: marginField, value: raw });
                  const val = parseFloat(raw);
                  if (!isNaN(val)) {
                    const cp = calculatePriceFromMargin(val);
                    if (cp) {
                      setPricing((prev) => ({ ...prev, [pricingField]: parseFloat(cp.toFixed(2)) }));
                    }
                  }
                }}
                onBlur={() => setEditingMargin(null)}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 text-xs">%</span>
            </div>
          </div>
          <div className="col-span-4 text-right">
            <span
              className={`text-sm tabular-nums font-medium ${
                profitAmount !== null && profitAmount > 0 ? "text-emerald-600" : profitAmount !== null && profitAmount < 0 ? "text-red-500" : "text-muted-foreground"
              }`}
            >
              {profitAmount !== null ? `$\u00A0${profitAmount.toFixed(2)}` : "\u2013"}
            </span>
          </div>
        </div>
      );
    };

    // RMB calculations
    const taxRate = (pricing.rmbTaxRate || 13) / 100;
    const costIncTax = pricing.factoryPriceRmbIncludingTax || 0;
    const costExTax = costIncTax / (1 + taxRate);
    const sellingPrice = pricing.sellingPriceRmbIncludingTax || 0;
    const sellingExTax = sellingPrice / (1 + taxRate);
    const rmbMargin = costExTax > 0 ? ((sellingExTax - costExTax) / costExTax * 100) : 0;
    const rmbProfit = sellingPrice - costIncTax;

    return (
      <>
        <div className="max-w-4xl">
          {/* ── Unified container ── */}
          <div className="rounded-xl border border-border/60 bg-background shadow-sm overflow-hidden">

            {/* ── Header bar with history button ── */}
            <div className="flex items-center justify-between px-5 py-3 bg-muted/30 border-b border-border/40">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">成本与定价</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => setShowHistory(true)}
              >
                <History className="w-3.5 h-3.5" />
                历史记录
              </Button>
            </div>

            {/* ── Section 1: Cost inputs — compact 2x2 grid ── */}
            <div className="px-5 py-4 border-b border-border/30">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
                {/* Factory RMB */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground/80 uppercase tracking-wider">工厂 RMB 含税</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 text-xs">¥</span>
                    <Input
                      type="number" inputMode="decimal" step="0.01" placeholder="0.00" autoComplete="off"
                      className="pl-6 h-8 text-sm tabular-nums"
                      value={pricing.factoryPriceRmbIncludingTax ?? ""}
                      onChange={(e) => handleInputChange("factoryPriceRmbIncludingTax", e.target.value)}
                    />
                  </div>
                </div>
                {/* Factory USD FOB */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground/80 uppercase tracking-wider">工厂 USD FOB</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 text-xs">$</span>
                    <Input
                      type="number" inputMode="decimal" step="0.01" placeholder="0.00" autoComplete="off"
                      className="pl-6 h-8 text-sm tabular-nums"
                      value={pricing.factoryPriceUsdFob ?? ""}
                      onChange={(e) => handleInputChange("factoryPriceUsdFob", e.target.value)}
                    />
                  </div>
                </div>
                {/* FOB Fee */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground/80 uppercase tracking-wider">FOB 费用 (RMB)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 text-xs">¥</span>
                    <Input
                      type="number" inputMode="decimal" step="0.01" placeholder="0.00" autoComplete="off"
                      className="pl-6 h-8 text-sm tabular-nums"
                      value={pricing.fobFeeRmb ?? ""}
                      onChange={(e) => handleInputChange("fobFeeRmb", e.target.value)}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground/50 leading-tight">运输、报关、港杂等</p>
                </div>
                {/* My Cost USD */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground/80 uppercase tracking-wider">我的成本 (USD)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 text-xs">$</span>
                    <Input
                      type="number" inputMode="decimal" step="0.01" placeholder="0.00" autoComplete="off"
                      className="pl-6 h-8 text-sm tabular-nums"
                      value={pricing.myCostUsd ?? ""}
                      onChange={(e) => handleInputChange("myCostUsd", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Cost summary strip ── */}
            <div className="px-5 py-2.5 bg-muted/20 border-b border-border/30 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground/70">FOB 总成本:</span>
                  <span className="text-sm font-bold tabular-nums text-primary">{fmt(fobTotalCost || null, "USD")}</span>
                </div>
                <div className="w-px h-4 bg-border/50" />
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground/70">工厂 RMB:</span>
                  <span className="text-sm font-semibold tabular-nums text-orange-600">{fmt(pricing.factoryPriceRmbIncludingTax, "RMB")}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground/60">参考汇率</span>
                <Input
                  type="number" inputMode="decimal" step="0.01" autoComplete="off"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 7.2)}
                  className="w-16 h-7 text-xs tabular-nums text-center"
                />
                {companySettings?.exchangeRateUsdCny && (
                  <span className="text-[10px] text-muted-foreground/50">系统: {Number(companySettings.exchangeRateUsdCny).toFixed(4)}</span>
                )}
              </div>
            </div>

            {/* ── FOB 3-Level Pricing ── */}
            <div className="px-5 py-3 border-b border-border/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-primary/70" />
                  <span className="text-[13px] font-semibold text-foreground">FOB 三级定价</span>
                  <span className="text-[11px] text-muted-foreground/60 ml-1">改价格 ↔ 利润率自动联动</span>
                </div>
                {fobTotalCost > 0 && companySettings?.defaultProfitMarginLevel1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] gap-1 text-primary hover:text-primary hover:bg-primary/5"
                    onClick={() => {
                      const m1 = Number(companySettings.defaultProfitMarginLevel1);
                      const m2 = Number(companySettings.defaultProfitMarginLevel2);
                      const m3 = Number(companySettings.defaultProfitMarginLevel3);
                      const p1 = fobTotalCost * (1 + m1 / 100);
                      const p2 = fobTotalCost * (1 + m2 / 100);
                      const p3 = fobTotalCost * (1 + m3 / 100);
                      setPricing(prev => ({
                        ...prev,
                        fobLevel1: parseFloat(p1.toFixed(2)),
                        fobLevel2: parseFloat(p2.toFixed(2)),
                        fobLevel3: parseFloat(p3.toFixed(2)),
                      }));
                      toast.success(`已按系统默认利润率 (${m1}%/${m2}%/${m3}%) 自动计算FOB价格`);
                    }}
                  >
                    <Calculator className="w-3 h-3" />
                    按系统利润率自动计算
                  </Button>
                )}
              </div>
              {/* Table header */}
              <div className="grid grid-cols-12 gap-x-3 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider pb-1.5 border-b border-border/30 -mx-3 px-3">
                <div className="col-span-2">级别</div>
                <div className="col-span-3">FOB 价格 (USD)</div>
                <div className="col-span-3">利润率</div>
                <div className="col-span-4 text-right">利润额 (USD)</div>
              </div>
              {renderFobRow("Level 1", "fobLevel1", "level1")}
              {renderFobRow("Level 2", "fobLevel2", "level2")}
              {renderFobRow("Level 3", "fobLevel3", "level3")}
            </div>

            {/* ── RMB 含税售价 ── */}
            <div className="px-5 py-3 border-b border-border/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-orange-500/70" />
                  <span className="text-[13px] font-semibold text-foreground">RMB 含税售价</span>
                  <span className="text-[11px] text-muted-foreground/60 ml-1">改售价 ↔ 毛利率自动联动</span>
                </div>
                <div className="flex items-center gap-2">
                  {pricing.factoryPriceRmbExcludingTax && companySettings?.defaultRmbProfitMargin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] gap-1 text-orange-600 hover:text-orange-600 hover:bg-orange-50"
                      onClick={() => {
                        const costExTax = pricing.factoryPriceRmbExcludingTax || 0;
                        const margin = Number(companySettings.defaultRmbProfitMargin);
                        const taxRate = (pricing.rmbTaxRate ?? 13) / 100;
                        const sellingPrice = costExTax * (1 + margin / 100) * (1 + taxRate);
                        handleInputChange("sellingPriceRmbIncludingTax", sellingPrice.toFixed(2));
                        toast.success(`已按系统默认毛利率 ${margin}% 自动计算RMB售价`);
                      }}
                    >
                      <Calculator className="w-3 h-3" />
                      按系统利润率
                    </Button>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground/50">税率</span>
                    <Input
                      type="number"
                      value={pricing.rmbTaxRate ?? 13}
                      onChange={(e) => handleInputChange("rmbTaxRate", e.target.value || "")}
                      className="w-14 h-6 text-[11px] text-center px-1"
                    />
                    <span className="text-[10px] text-muted-foreground/50">%</span>
                  </div>
                </div>
              </div>
              {/* Table header */}
              <div className="grid grid-cols-12 gap-x-3 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider pb-1.5 border-b border-border/30 -mx-3 px-3">
                <div className="col-span-3">RMB 含税售价</div>
                <div className="col-span-3">毛利率</div>
                <div className="col-span-3 text-right">利润额 (RMB)</div>
                <div className="col-span-3 text-right">不含税售价</div>
              </div>
              {/* Single row */}
              <div className="grid grid-cols-12 gap-x-3 items-center py-2 -mx-3 px-3">
                <div className="col-span-3">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 text-xs">¥</span>
                    <Input
                      type="number" step="0.01" placeholder="0.00"
                      value={pricing.sellingPriceRmbIncludingTax ?? ""}
                      onChange={(e) => handleInputChange("sellingPriceRmbIncludingTax", e.target.value)}
                      className="pl-6 h-8 text-sm tabular-nums"
                    />
                  </div>
                </div>
                <div className="col-span-3">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number" step="0.1" placeholder="0"
                      value={editingRmbMargin !== null ? editingRmbMargin : (rmbMargin ? parseFloat(rmbMargin.toFixed(1)).toString() : "")}
                      onFocus={() => setEditingRmbMargin(rmbMargin ? parseFloat(rmbMargin.toFixed(1)).toString() : "")}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setEditingRmbMargin(raw);
                        const newMargin = parseFloat(raw);
                        if (!isNaN(newMargin)) {
                          const newPrice = costExTax * (1 + newMargin / 100) * (1 + taxRate);
                          handleInputChange("sellingPriceRmbIncludingTax", newPrice.toFixed(2));
                        }
                      }}
                      onBlur={() => setEditingRmbMargin(null)}
                      className="h-8 text-sm tabular-nums"
                    />
                    <span className="text-muted-foreground/50 text-xs">%</span>
                  </div>
                </div>
                <div className="col-span-3 text-right">
                  <span className={`text-sm font-semibold tabular-nums ${rmbProfit > 0 ? "text-emerald-600" : rmbProfit < 0 ? "text-red-500" : "text-muted-foreground/50"}`}>
                    {rmbProfit !== 0 ? `¥ ${rmbProfit.toFixed(2)}` : "—"}
                  </span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-sm text-muted-foreground/60 tabular-nums">
                    {sellingPrice > 0 ? `¥ ${sellingExTax.toFixed(2)}` : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Save footer ── */}
            <div className="px-5 py-3 bg-muted/10 flex items-center gap-3">
              <Input
                placeholder="调价备注（可选）：原材料涨价、汇率波动、工厂调价…"
                value={saveNote}
                onChange={(e) => setSaveNote(e.target.value)}
                className="h-8 text-sm flex-1"
              />
              <Button
                onClick={handleSave}
                disabled={updatePricing.isPending}
                size="sm"
                className="min-w-[120px] h-8 text-xs"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {updatePricing.isPending ? "保存中…" : "保存成本与定价"}
              </Button>
            </div>
          </div>
        </div>

        {/* Cost History Side Panel */}
        <CostHistoryPanel
          productId={productId}
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          onApply={(data) => {
            setPricing({
              factoryPriceRmbExcludingTax: data.factoryPriceRmbExcludingTax,
              factoryPriceRmbIncludingTax: data.factoryPriceRmbIncludingTax,
              factoryPriceUsdFob: data.factoryPriceUsdFob,
              fobFeeRmb: data.fobFeeRmb,
              myCostRmb: data.myCostRmb,
              myCostUsd: data.myCostUsd,
              fobLevel1: data.fobLevel1,
              fobLevel2: data.fobLevel2,
              fobLevel3: data.fobLevel3,
              sellingPriceRmbIncludingTax: data.sellingPriceRmbIncludingTax,
              rmbTaxRate: data.rmbTaxRate ?? 13,
            });
            setExchangeRate(data.exchangeRate);
          }}
        />
      </>
    );
  }

  /* ════════════════════════════════════════════════════════════════
     售价 Tab（给普通员工看，不含成本/利润率）
     ════════════════════════════════════════════════════════════════ */
  if (activeSubTab === "fob") {
    return (
      <div className="max-w-3xl">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-2 mb-5">
              <DollarSign className="w-4 h-4 text-primary" />
              <h3 className="text-[15px] font-semibold">产品售价</h3>
            </div>
            <div className="space-y-0">
              {[
                { label: "FOB Level 1", value: fmt(pricing.fobLevel1, "USD") },
                { label: "FOB Level 2", value: fmt(pricing.fobLevel2, "USD") },
                { label: "FOB Level 3", value: fmt(pricing.fobLevel3, "USD") },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-3 border-b border-border/40">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-semibold tabular-nums">{value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-muted-foreground">RMB 含税售价</span>
                <span className="text-sm font-semibold tabular-nums">{fmt(pricing.sellingPriceRmbIncludingTax, "RMB")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════
     价格历史 Tab
     ════════════════════════════════════════════════════════════════ */
  if (activeSubTab === "history") {
    return (
      <div className="max-w-3xl">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-primary" />
              <h3 className="text-[15px] font-semibold">价格变更记录</h3>
              <span className="text-[12px] text-muted-foreground ml-1">追踪所有价格字段的历史修改</span>
            </div>

            {!priceHistory || priceHistory.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">
                暂无价格变更记录
              </div>
            ) : (
              <div className="space-y-0">
                {priceHistory.map((record) => (
                  <div key={record.id} className="py-3 border-b border-border/40 last:border-0">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{record.fieldLabel}</span>
                        <span className="text-[11px] text-muted-foreground">{record.userName || "系统"}</span>
                      </div>
                      <time className="text-[11px] text-muted-foreground tabular-nums">
                        {new Date(record.changedAt).toLocaleString("zh-CN")}
                      </time>
                    </div>
                    <div className="flex items-center gap-2 text-sm tabular-nums">
                      <span className="text-red-500 text-xs font-medium">
                        {record.oldValue
                          ? record.fieldName.includes("Usd") || record.fieldName.includes("fob")
                            ? `$\u00A0${parseFloat(record.oldValue).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : `¥\u00A0${parseFloat(record.oldValue).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : "未设置"}
                      </span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
                      <span className="text-emerald-600 text-xs font-medium">
                        {record.newValue
                          ? record.fieldName.includes("Usd") || record.fieldName.includes("fob")
                            ? `$\u00A0${parseFloat(record.newValue).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : `¥\u00A0${parseFloat(record.newValue).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : "未设置"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
