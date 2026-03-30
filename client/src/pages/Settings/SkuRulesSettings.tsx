import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RuleConfig {
  ruleType: string;
  prefix: string;
  suffixLength: number;
  description: string;
  displayName: string;
}

const RULE_TYPES: RuleConfig[] = [
  {
    ruleType: "supplier",
    displayName: "供应商编号规则",
    description: "用于生成新供应商的编号，显示在供应商列表和详情页面",
    prefix: "SUP",
    suffixLength: 4,
  },
  {
    ruleType: "product",
    displayName: "产品编号规则",
    description: "用于生成新产品的编号，显示在产品列表和详情页面",
    prefix: "PRD",
    suffixLength: 4,
  },
  {
    ruleType: "variant",
    displayName: "批次编号规则",
    description: "用于生成新批次的编号，显示在批次列表和详情页面",
    prefix: "VAR",
    suffixLength: 4,
  },
  {
    ruleType: "customer",
    displayName: "客户编号规则",
    description: "用于生成新客户的编号，显示在客户列表和详情页面",
    prefix: "CUS",
    suffixLength: 4,
  },
  {
    ruleType: "order",
    displayName: "订单编号规则",
    description: "用于生成新订单的编号，显示在订单列表、详情页面和客户订单通知中",
    prefix: "ORD",
    suffixLength: 5,
  },
  {
    ruleType: "inspection",
    displayName: "报检单编号规则",
    description: "用于生成新报检单的编号，显示在报检单列表和详情页面",
    prefix: "INS",
    suffixLength: 4,
  },
];

export default function SkuRulesSettings() {
  const [rules, setRules] = useState<Record<string, { prefix: string; suffixLength: number }>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(true);
  const [showBatchInitDialog, setShowBatchInitDialog] = useState(false);

  const { data: existingRules } = trpc.skuRules.getAll.useQuery() as any;
  const saveRules = trpc.skuRules.saveAll.useMutation() as any;
  const batchInitialize = trpc.skuRules.batchInitializeAllCompanies.useMutation() as any;

  useEffect(() => {
    if (existingRules) {
      const rulesMap: Record<string, { prefix: string; suffixLength: number }> = {};
      existingRules.forEach((rule: any) => {
        rulesMap[rule.ruleType] = {
          prefix: rule.prefix,
          suffixLength: rule.suffixLength,
        };
      });
      setRules(rulesMap);
      setIsLoading(false);
    } else {
      // 初始化默认值
      const defaultRules: Record<string, { prefix: string; suffixLength: number }> = {};
      RULE_TYPES.forEach((config) => {
        defaultRules[config.ruleType] = {
          prefix: config.prefix,
          suffixLength: config.suffixLength,
        };
      });
      setRules(defaultRules);
      setIsLoading(false);
    }
  }, [existingRules]);

  const handlePrefixChange = (ruleType: string, value: string) => {
    setRules((prev) => ({
      ...prev,
      [ruleType]: {
        ...prev[ruleType],
        prefix: value.toUpperCase(),
      },
    }));
  };

  const handleSuffixLengthChange = (ruleType: string, value: string) => {
    const numValue = parseInt(value) || 1;
    setRules((prev) => ({
      ...prev,
      [ruleType]: {
        ...prev[ruleType],
        suffixLength: Math.max(1, Math.min(10, numValue)),
      },
    }));
  };

  const generatePreview = (ruleType: string) => {
    const rule = rules[ruleType];
    if (!rule) return "";
    const { prefix, suffixLength } = rule;
    const example = "1".padStart(suffixLength, "0");
    return `${prefix}${example}`;
  };

  const handleSave = async () => {
    try {
      const rulesToSave = RULE_TYPES.map((config) => ({
        ruleType: config.ruleType,
        prefix: rules[config.ruleType]?.prefix || config.prefix,
        suffixLength: rules[config.ruleType]?.suffixLength || config.suffixLength,
        description: config.description,
      }));

      await saveRules.mutateAsync({ rules: rulesToSave });

      toast.success("SKU规则已更新");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    }
  };

  const handleBatchInitialize = async () => {
    try {
      const result = await batchInitialize.mutateAsync();
      
      setShowBatchInitDialog(false);
      
      if (result.errors.length > 0) {
        toast.warning(
          `批量初始化完成：成功 ${result.successCount} 个公司，失败 ${result.failedCount} 个公司，创建了 ${result.totalRulesCreated} 条规则`,
          {
            description: result.errors.join("\n"),
            duration: 10000,
          }
        );
      } else {
        toast.success(
          `批量初始化成功！为 ${result.successCount} 个公司创建了 ${result.totalRulesCreated} 条SKU规则`
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "批量初始化失败");
      setShowBatchInitDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">SKU规则设置</h2>
          <p className="text-muted-foreground mt-1">
            配置各种实体的编号生成规则，自动应用到创建流程中
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowBatchInitDialog(true)}
            disabled={batchInitialize.isPending}
          >
            {batchInitialize.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!batchInitialize.isPending && <RefreshCw className="mr-2 h-4 w-4" />}
            批量初始化
          </Button>
          <Button onClick={handleSave} disabled={saveRules.isPending}>
            {saveRules.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存设置
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {RULE_TYPES.map((config) => {
          const rule = rules[config.ruleType] || {
            prefix: config.prefix,
            suffixLength: config.suffixLength,
          };

          return (
            <Card key={config.ruleType}>
              <CardHeader>
                <CardTitle>{config.displayName}</CardTitle>
                <CardDescription>{config.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${config.ruleType}-prefix`}>前缀 (Prefix)</Label>
                    <Input
                      id={`${config.ruleType}-prefix`}
                      value={rule.prefix}
                      onChange={(e) => handlePrefixChange(config.ruleType, e.target.value)}
                      placeholder="例如: CA, SUP, PRD"
                      maxLength={20}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${config.ruleType}-suffix`}>后缀位数 (Suffix Length)</Label>
                    <Input
                      id={`${config.ruleType}-suffix`}
                      type="number"
                      min="1"
                      max="10"
                      value={rule.suffixLength}
                      onChange={(e) => handleSuffixLengthChange(config.ruleType, e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    编号示例：
                    <span className="ml-2 font-mono font-semibold text-foreground">
                      {generatePreview(config.ruleType)}, {generatePreview(config.ruleType).replace(/\d+$/, (match) => String(parseInt(match) + 1).padStart(match.length, "0"))}, {generatePreview(config.ruleType).replace(/\d+$/, (match) => String(parseInt(match) + 2).padStart(match.length, "0"))} ...
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 批量初始化确认对话框 */}
      <AlertDialog open={showBatchInitDialog} onOpenChange={setShowBatchInitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>批量初始化SKU规则</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                此操作将为系统中所有ERP公司自动创建缺失的SKU规则（供应商、产品、批次、客户、订单、报价单、报关单）。
              </p>
              <p className="text-amber-600 dark:text-amber-400 font-medium">
                ⚠️ 已存在的规则不会被修改，只会补全缺失的规则。
              </p>
              <p>确定要继续吗？</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={batchInitialize.isPending}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchInitialize}
              disabled={batchInitialize.isPending}
            >
              {batchInitialize.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认初始化
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
