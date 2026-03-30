import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Unlock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

interface SmartCodeInputProps {
  label: string;
  ruleType: "supplier" | "product" | "variant" | "customer" | "order" | "quotation" | "inspection";
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}

export function SmartCodeInput({
  label,
  ruleType,
  value,
  onChange,
  required = false,
  disabled = false,
}: SmartCodeInputProps) {
  const [isLocked, setIsLocked] = useState(true);
  
  // 获取下一个编号预览
  const { data: nextCode, isLoading: isLoadingNext } = trpc.skuRules.getNextCode.useQuery(
    { ruleType },
    { enabled: isLocked }
  );
  
  // 获取编号规则示例
  const { data: ruleExample } = trpc.skuRules.getRuleExample.useQuery({ ruleType });

  // 当锁定状态改变时，更新value
  useEffect(() => {
    if (isLocked && nextCode) {
      onChange(nextCode);
    } else if (!isLocked && value === nextCode) {
      // 解锁时清空自动生成的值，让用户输入
      onChange("");
    }
  }, [isLocked, nextCode]);

  const handleToggleLock = () => {
    setIsLocked(!isLocked);
  };

  const displayValue = isLocked ? (nextCode || "加载中...") : value;
  // 解锁后不显示占位符，让输入框保持空白
  const placeholderText = isLocked ? (ruleExample || "请输入编号") : "";

  return (
    <div className="space-y-2">
      <Label htmlFor={`code-input-${ruleType}`}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            id={`code-input-${ruleType}`}
            value={displayValue}
            onChange={(e) => onChange(e.target.value)}
            disabled={isLocked || disabled || isLoadingNext}
            placeholder={placeholderText}
            className={isLocked ? "bg-muted" : ""}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleToggleLock}
          disabled={disabled}
          title={isLocked ? "解锁以手动输入" : "锁定以自动生成"}
        >
          {isLocked ? (
            <Lock className="h-4 w-4" />
          ) : (
            <Unlock className="h-4 w-4" />
          )}
        </Button>
      </div>
      {ruleExample && (
        <p className="text-sm text-muted-foreground">
          {isLocked ? "自动生成" : "手动输入"}或{isLocked ? "解锁手动输入" : "锁定自动生成"}。格式示例：{ruleExample}
        </p>
      )}
    </div>
  );
}
