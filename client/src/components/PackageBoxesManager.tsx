import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Package, Boxes, PackageOpen } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
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

interface PackageBox {
  id?: number;
  boxNumber: number;
  length: string;
  width: string;
  height: string;
  cbm: string;
  manualCBM: boolean; // 是否手动输入CBM
  grossWeight: string; // 毛重（kg）
  netWeight: string; // 净重（kg）
}

interface PackageBoxesManagerProps {
  variantId: number | null; // null表示新建批次，还没有variantId
  mode: "create" | "edit" | "view";
  onDirtyChange?: (isDirty: boolean) => void; // 通知父组件是否有未保存的修改
}

export function PackageBoxesManager({ variantId, mode, onDirtyChange }: PackageBoxesManagerProps) {
  const [dimensionUnit, setDimensionUnit] = useState<"cm" | "m">("cm");
  const [boxes, setBoxes] = useState<PackageBox[]>([
    { boxNumber: 1, length: "", width: "", height: "", cbm: "0.000000", manualCBM: false, grossWeight: "0", netWeight: "0" },
  ]);
  const [totalCBM, setTotalCBM] = useState(0);
  const [totalGrossWeight, setTotalGrossWeight] = useState(0);
  const [totalNetWeight, setTotalNetWeight] = useState(0);
  const [isDirty, setIsDirty] = useState(false); // 是否有未保存的修改
  // 确认弹窗：从手动CBM切换回自动计算时
  const [confirmAutoCalcDialog, setConfirmAutoCalcDialog] = useState<{
    open: boolean;
    boxIndex: number;
    manualCbmValue: string; // 当前手动CBM值，用于弹窗提示
  }>({ open: false, boxIndex: -1, manualCbmValue: "0" });

  // 包装方式相关state
  type PackagingType = 'single' | 'multiple' | 'bulk';
  const [packagingType, setPackagingType] = useState<PackagingType>('single');
  const [piecesPerBox, setPiecesPerBox] = useState<number>(1);
  const addBoxButtonRef = useRef<HTMLButtonElement>(null);

  const utils = trpc.useUtils();

  // 查询外箱列表（仅在编辑或查看模式下）
  const { data: boxesData } = trpc.packageBoxes.list.useQuery(
    { variantId: variantId! },
    { enabled: !!variantId && mode !== "create" }
  );

  // 添加外箱（仅用于edit模式下手动点击"添加外箱"时持久化）
  const addBoxMutation = trpc.packageBoxes.add.useMutation({
    onSuccess: () => {
      utils.packageBoxes.list.invalidate();
    },
    onError: (error) => {
      toast.error(`添加失败：${error.message}`);
    },
  });

  // 更新外箱（仅在手动保存时调用）
  const updateBoxMutation = trpc.packageBoxes.update.useMutation({
    onSuccess: () => {
      utils.packageBoxes.list.invalidate();
    },
    onError: (error) => {
      toast.error(`更新失败：${error.message}`);
    },
  });

  // 删除外箱
  const deleteBoxMutation = trpc.packageBoxes.delete.useMutation({
    onSuccess: () => {
      utils.packageBoxes.list.invalidate();
      toast.success("外箱删除成功");
    },
    onError: (error) => {
      toast.error(`删除失败：${error.message}`);
    },
  });

  // isDirty 变化时通知父组件
  useEffect(() => {
    onDirtyChange?.(isDirty);
    // 同时更新 window 对象上的 isDirty
    if ((window as any).__packageBoxesManager) {
      (window as any).__packageBoxesManager.isDirty = isDirty;
    }
  }, [isDirty, onDirtyChange]);

  // 加载外箱数据
  useEffect(() => {
    if (boxesData && boxesData.length > 0) {
      // DB存储的是米，转换为当前显示单位
      const factor = dimensionUnit === "cm" ? 100 : 1;
      setBoxes(
        boxesData.map((box: any) => ({
          id: box.id,
          boxNumber: box.boxNumber,
          length: box.length ? String(parseFloat((parseFloat(box.length) * factor).toPrecision(6))) : "",
          width: box.width ? String(parseFloat((parseFloat(box.width) * factor).toPrecision(6))) : "",
          height: box.height ? String(parseFloat((parseFloat(box.height) * factor).toPrecision(6))) : "",
          cbm: box.cbm,
          manualCBM: false, // 默认不是手动输入
          grossWeight: box.grossWeight || "0",
          netWeight: box.netWeight || "0",
        }))
      );
      // 恢复包装方式和每箱件数（从第一个外箱读取）
      const firstBox = boxesData[0] as any;
      if (firstBox.packagingType) {
        setPackagingType(firstBox.packagingType as PackagingType);
      }
      if (firstBox.piecesPerBox) {
        setPiecesPerBox(Number(firstBox.piecesPerBox) || 1);
      }
      // 数据加载完成同时重置 dirty 状态
      setIsDirty(false);
    }
  }, [boxesData]);

  // 计算总CBM和总重量
  useEffect(() => {
    const totalCbm = boxes.reduce((sum, box) => {
      return sum + parseFloat(box.cbm || "0");
    }, 0);
    setTotalCBM(totalCbm);

    const totalGross = boxes.reduce((sum, box) => {
      return sum + parseFloat(box.grossWeight || "0");
    }, 0);
    setTotalGrossWeight(totalGross);

    const totalNet = boxes.reduce((sum, box) => {
      return sum + parseFloat(box.netWeight || "0");
    }, 0);
    setTotalNetWeight(totalNet);
  }, [boxes]);

  // 计算单箱CBM（根据当前单位转换为米后计算，输出单位：立方米）
  const calculateCBM = (length: string, width: string, height: string) => {
    const l = parseFloat(length) || 0;
    const w = parseFloat(width) || 0;
    const h = parseFloat(height) || 0;
    const factor = dimensionUnit === "cm" ? 0.01 : 1;
    return ((l * factor) * (w * factor) * (h * factor)).toFixed(6);
  };

  // 更新外箱尺寸和重量（仅更新本地state，不触发数据库保存）
  const handleBoxChange = (index: number, field: "length" | "width" | "height" | "grossWeight" | "netWeight", value: string) => {
    const newBoxes = [...boxes];
    newBoxes[index][field] = value;

    // 如果修改的是尺寸字段，重新计算CBM
    if (field === "length" || field === "width" || field === "height") {
      const cbm = calculateCBM(newBoxes[index].length, newBoxes[index].width, newBoxes[index].height);
      newBoxes[index].cbm = cbm;
    }

    setBoxes(newBoxes);
    setIsDirty(true); // 标记有未保存修改
    // 注意：不在此处触发数据库保存，改为手动点击"保存"按鈕时统一保存
  };

  // 添加新外箱
  const handleAddBox = useCallback(() => {
    if (mode === "create") {
      // 新建模式：只在本地添加
      setBoxes((prevBoxes) => [
        ...prevBoxes,
        {
          boxNumber: prevBoxes.length + 1,
          length: "",
          width: "",
          height: "",
          cbm: "0.000000",
          manualCBM: false,
          grossWeight: "0",
          netWeight: "0",
        },
      ]);
    } else if (mode === "edit" && variantId) {
      // 编辑模式：在本地添加，等待手动保存时持久化
      setBoxes((prevBoxes) => [
        ...prevBoxes,
        {
          boxNumber: prevBoxes.length + 1,
          length: "",
          width: "",
          height: "",
          cbm: "0.000000",
          manualCBM: false,
          grossWeight: "0",
          netWeight: "0",
        },
      ]);
      setIsDirty(true);
    }
  }, [mode, variantId]);

  // 删除外箱
  const handleDeleteBox = (index: number) => {
    if (boxes.length <= 1) {
      toast.error("至少需要保留一个外箱");
      return;
    }

    const box = boxes[index];

    if (mode === "edit" && box.id) {
      // 编辑模式：从数据库删除
      deleteBoxMutation.mutate({ boxId: box.id });
    } else {
      // 新建模式或未保存的外箱：只从本地删除
      const newBoxes = boxes.filter((_, i) => i !== index);
      // 重新编号
      newBoxes.forEach((b, i) => {
        b.boxNumber = i + 1;
      });
      setBoxes(newBoxes);
    }
  };

  // 获取外箱数据（供父组件使用）
  // 将当前单位的值转换为米
  const toMeters = useCallback((val: string) => {
    const n = parseFloat(val) || 0;
    return dimensionUnit === "cm" ? n * 0.01 : n;
  }, [dimensionUnit]);

  const getBoxesData = useCallback(() => {
    return boxes.filter(box => {
      if (box.manualCBM) {
        const cbm = parseFloat(box.cbm) || 0;
        return cbm > 0;
      } else {
        const l = parseFloat(box.length) || 0;
        const w = parseFloat(box.width) || 0;
        const h = parseFloat(box.height) || 0;
        return l > 0 && w > 0 && h > 0;
      }
    });
  }, [boxes]);

  // 手动保存所有外箱数据到数据库（供父组件调用）
  const saveAllBoxes = useCallback(async () => {
    if (!variantId || mode !== "edit") return;

    const validBoxes = boxes.filter(box => {
      if (box.manualCBM) {
        return parseFloat(box.cbm) > 0;
      } else {
        const l = parseFloat(box.length) || 0;
        const w = parseFloat(box.width) || 0;
        const h = parseFloat(box.height) || 0;
        return l > 0 && w > 0 && h > 0;
      }
    });

    for (const box of validBoxes) {
      if (box.id) {
        // 更新已有外箱
        // 手动CBM模式：传入cbm参数，服务端直接写入，不重新计算
        // 自动模式：传入length/width/height，服务端自动计算cbm
        await updateBoxMutation.mutateAsync({
          boxId: box.id,
          ...(box.manualCBM
            ? {
                cbm: parseFloat(box.cbm) || 0,
                length: toMeters(box.length),
                width: toMeters(box.width),
                height: toMeters(box.height),
              }
            : {
                length: toMeters(box.length),
                width: toMeters(box.width),
                height: toMeters(box.height),
              }),
          grossWeight: parseFloat(box.grossWeight) || 0,
          netWeight: parseFloat(box.netWeight) || 0,
          packagingType,
          piecesPerBox: piecesPerBox || 1,
        });
      } else {
        // 新增外箱（edit模式下添加的未保存外箱）
        await addBoxMutation.mutateAsync({
          variantId,
          ...(box.manualCBM
            ? {
                cbm: parseFloat(box.cbm) || 0,
                length: toMeters(box.length),
                width: toMeters(box.width),
                height: toMeters(box.height),
              }
            : {
                length: toMeters(box.length),
                width: toMeters(box.width),
                height: toMeters(box.height),
              }),
          grossWeight: parseFloat(box.grossWeight) || 0,
          netWeight: parseFloat(box.netWeight) || 0,
          packagingType,
          piecesPerBox: piecesPerBox || 1,
        });
      }
    }
    // 保存完成同时重置 dirty 状态
    setIsDirty(false);
  }, [boxes, variantId, mode, packagingType, piecesPerBox, updateBoxMutation, addBoxMutation]);

  // 暴露给父组件的方法（创建和编辑模式都需要）
  useEffect(() => {
    if (mode !== "view") {
      (window as any).__packageBoxesManager = {
        getBoxesData,
        getTotalCBM: () => totalCBM,
        getPackagingType: () => packagingType,
        getPiecesPerBox: () => piecesPerBox || 1,
        saveAllBoxes,
      };
    }
  }, [getBoxesData, totalCBM, packagingType, piecesPerBox, mode, saveAllBoxes]);

  // 为"添加外箱"按钮添加原生事件监听器
  useEffect(() => {
    const button = addBoxButtonRef.current;
    if (button && mode !== "view") {
      const handleClick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleAddBox();
      };
      button.addEventListener('click', handleClick);
      return () => {
        button.removeEventListener('click', handleClick);
      };
    }
  }, [mode, handleAddBox]);

  return (
    <div className="space-y-6">
      {/* 包装方式选择 */}
      {(mode === "create" || mode === "edit") && (
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <div>
            <Label className="text-base font-semibold">包装方式</Label>
            <p className="text-sm text-muted-foreground mt-1">选择产品的包装方式，系统会根据外箱数量自动识别</p>
          </div>
          
          {/* 包装方式切换：仅更新本地state，不触发数据库保存 */}
          <RadioGroup value={packagingType} onValueChange={(value) => {
            setPackagingType(value as PackagingType);
            setIsDirty(true);
          }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: 单箱包装 */}
              <label
                htmlFor="packaging-single"
                className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  packagingType === 'single'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <RadioGroupItem value="single" id="packaging-single" />
                  <Package className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Option 1: 单箱包装</span>
                </div>
                <div className="text-sm text-muted-foreground ml-8">
                  <div className="font-medium mb-1">1箱 = 1件产品</div>
                  <div>适用：小型产品，1个框架装1件产品</div>
                </div>
              </label>
              {/* Option 2: 多箱组合 */}
              <label
                htmlFor="packaging-multiple"
                className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  packagingType === 'multiple'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <RadioGroupItem value="multiple" id="packaging-multiple" />
                  <Boxes className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Option 2: 多箱组合</span>
                </div>
                <div className="text-sm text-muted-foreground ml-8">
                  <div className="font-medium mb-1">N箱 = 1件产品</div>
                  <div>适用：大型产品拆分，如座垫+靠背+配件</div>
                </div>
              </label>
              {/* Option 3: 一箱多件 */}
              <label
                htmlFor="packaging-bulk"
                className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  packagingType === 'bulk'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <RadioGroupItem value="bulk" id="packaging-bulk" />
                  <PackageOpen className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Option 3: 一箱多件</span>
                </div>
                <div className="text-sm text-muted-foreground ml-8">
                  <div className="font-medium mb-1">1箱 = N件产品</div>
                  <div>适用：超小型产品，多件装一箱</div>
                </div>
              </label>
            </div>
          </RadioGroup>

          {/* CBM 计算逻辑说明（根据选中的包装方式显示） */}
          <div className="mt-3 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm">
            {packagingType === 'single' && (
              <div className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">&#9432;</span>
                <div className="text-blue-700 dark:text-blue-300">
                  <span className="font-semibold">单箱1件：</span>
                  <span>总 CBM = 外箱 CBM（1件产品对应 1 个外箱）</span>
                </div>
              </div>
            )}
            {packagingType === 'multiple' && (
              <div className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">&#9432;</span>
                <div className="text-blue-700 dark:text-blue-300">
                  <span className="font-semibold">多箱组合：</span>
                  <span>总 CBM = 各外箱 CBM 之和（1件产品拆分为 N 个外箱）</span>
                </div>
              </div>
            )}
            {packagingType === 'bulk' && (
              <div className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">&#9432;</span>
                <div className="text-blue-700 dark:text-blue-300">
                  <span className="font-semibold">一箱多件：</span>
                  <span>单件 CBM = 外箱 CBM ÷ 每箱件数（{piecesPerBox}件），即 {totalCBM > 0 ? (totalCBM / piecesPerBox).toFixed(6) : '0.000000'} m³ / 件</span>
                </div>
              </div>
            )}
          </div>

          {/* Option 3 的每箱件数选择 */}
          {packagingType === 'bulk' && (
            <div className="mt-4 p-4 bg-background rounded-lg border">
              <Label className="text-sm font-semibold mb-2 block">每箱件数</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={piecesPerBox}
                  onChange={(e) => {
                    // 仅更新本地state，不触发数据库保存
                    setPiecesPerBox(Math.max(1, parseInt(e.target.value) || 1));
                    setIsDirty(true);
                  }}
                  className="w-[100px]"
                />
                <span className="text-sm text-muted-foreground">件/箱</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 外箱尺寸 */}
      <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">外箱尺寸</h3>
          <Select value={dimensionUnit} onValueChange={(v: "cm" | "m") => {
            // 转换现有数值
            const ratio = v === "cm" && dimensionUnit === "m" ? 100 : v === "m" && dimensionUnit === "cm" ? 0.01 : 1;
            if (ratio !== 1) {
              const newBoxes = boxes.map(box => {
                const newLength = box.length ? String(parseFloat((parseFloat(box.length) * ratio).toPrecision(6))) : "";
                const newWidth = box.width ? String(parseFloat((parseFloat(box.width) * ratio).toPrecision(6))) : "";
                const newHeight = box.height ? String(parseFloat((parseFloat(box.height) * ratio).toPrecision(6))) : "";
                return { ...box, length: newLength, width: newWidth, height: newHeight };
              });
              setBoxes(newBoxes);
              setIsDirty(true);
            }
            setDimensionUnit(v);
          }}>
            <SelectTrigger className="w-[80px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cm">cm</SelectItem>
              <SelectItem value="m">m</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {mode !== "view" && packagingType === 'multiple' && (
          <button
            ref={addBoxButtonRef}
            type="button"
            className="inline-flex items-center justify-center gap-2 h-8 rounded-md px-3 text-sm font-medium border bg-transparent shadow-xs hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
            disabled={mode === "edit" && !variantId}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAddBox();
            }}
          >
            <Plus className="w-4 h-4" />
            添加外箱
          </button>
        )}
      </div>

      <div className="space-y-3">
        {boxes.map((box, index) => (
          <Card key={index}>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-20">
                      <Label className="text-sm font-medium">外箱 {box.boxNumber}</Label>
                    </div>
                    {mode !== "view" && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`manual-cbm-${index}`}
                          checked={box.manualCBM}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              // 切换到手动输入时：保留当前CBM计算值，不清空尺寸
                              const newBoxes = [...boxes];
                              newBoxes[index].manualCBM = true;
                              setBoxes(newBoxes);
                              setIsDirty(true);
                            } else {
                              // 切换回自动计算时：弹出确认框
                              setConfirmAutoCalcDialog({
                                open: true,
                                boxIndex: index,
                                manualCbmValue: box.cbm,
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`manual-cbm-${index}`} className="text-xs text-muted-foreground cursor-pointer">
                          手动输入CBM
                        </Label>
                      </div>
                    )}
                  </div>
                  {mode !== "view" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBox(index)}
                      disabled={boxes.length <= 1}
                      className="flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  {/* 尺寸和CBM */}
                  <div className="flex items-center gap-4">
                    {!box.manualCBM ? (
                      <div className="flex-1 grid grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">长度 ({dimensionUnit})</Label>
                          <Input
                            type="number"
                            step={dimensionUnit === "cm" ? "1" : "0.01"}
                            value={box.length}
                            onChange={(e) => handleBoxChange(index, "length", e.target.value)}
                            placeholder="0.00"
                            disabled={mode === "view"}
                            className="h-9"
                          />
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">宽度 ({dimensionUnit})</Label>
                          <Input
                            type="number"
                            step={dimensionUnit === "cm" ? "1" : "0.01"}
                            value={box.width}
                            onChange={(e) => handleBoxChange(index, "width", e.target.value)}
                            placeholder="0.00"
                            disabled={mode === "view"}
                            className="h-9"
                          />
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">高度 ({dimensionUnit})</Label>
                          <Input
                            type="number"
                            step={dimensionUnit === "cm" ? "1" : "0.01"}
                            value={box.height}
                            onChange={(e) => handleBoxChange(index, "height", e.target.value)}
                            placeholder="0.00"
                            disabled={mode === "view"}
                            className="h-9"
                          />
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">CBM (m³)</Label>
                          <Input
                            type="text"
                            value={box.cbm}
                            disabled
                            className="h-9 bg-muted"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 grid grid-cols-4 gap-3">
                        {/* 手动输入CBM模式：显示灰色的长宽高（只读），以及可编辑的CBM */}
                        <div>
                          <Label className="text-xs text-muted-foreground">长度 ({dimensionUnit})</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={box.length}
                            disabled
                            placeholder="0.00"
                            className="h-9 bg-muted"
                          />
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">宽度 ({dimensionUnit})</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={box.width}
                            disabled
                            placeholder="0.00"
                            className="h-9 bg-muted"
                          />
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">高度 ({dimensionUnit})</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={box.height}
                            disabled
                            placeholder="0.00"
                            className="h-9 bg-muted"
                          />
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">手动CBM (m³)</Label>
                          <Input
                            type="number"
                            step="0.000001"
                            value={box.cbm}
                            onChange={(e) => {
                              const newBoxes = [...boxes];
                              newBoxes[index].cbm = e.target.value;
                              setBoxes(newBoxes);
                              setIsDirty(true);
                              // 不触发数据库保存，等待手动保存
                            }}
                            placeholder="0.000000"
                            disabled={mode === "view"}
                            className="h-9"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 重量信息 */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">毛重 (kg)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={box.grossWeight}
                          onChange={(e) => handleBoxChange(index, "grossWeight", e.target.value)}
                          placeholder="0.00"
                          disabled={mode === "view"}
                          className="h-9"
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">净重 (kg)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={box.netWeight}
                          onChange={(e) => handleBoxChange(index, "netWeight", e.target.value)}
                          placeholder="0.00"
                          disabled={mode === "view"}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-end gap-6 pt-2 border-t">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold">总CBM：</Label>
          <div className="text-lg font-bold text-primary">{totalCBM.toFixed(6)} m³</div>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold">总毛重：</Label>
          <div className="text-lg font-bold text-primary">{totalGrossWeight.toFixed(2)} kg</div>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold">总净重：</Label>
          <div className="text-lg font-bold text-primary">{totalNetWeight.toFixed(2)} kg</div>
        </div>
      </div>
      </div>

      {/* 手动CBM → 自动计算 确认弹窗 */}
      <AlertDialog
        open={confirmAutoCalcDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            // 关闭弹窗时（点取消或按Esc）：保持手动CBM模式不变
            setConfirmAutoCalcDialog({ open: false, boxIndex: -1, manualCbmValue: "0" });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>切换为自动计算</AlertDialogTitle>
            <AlertDialogDescription>
              切换后将使用长宽高重新计算 CBM，当前手动输入的值{" "}
              <span className="font-semibold text-foreground">
                {parseFloat(confirmAutoCalcDialog.manualCbmValue).toFixed(6)} m³
              </span>{" "}
              将被覆盖。确认继续？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                // 点取消：保持手动CBM模式不变
                setConfirmAutoCalcDialog({ open: false, boxIndex: -1, manualCbmValue: "0" });
              }}
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                // 点确认：切换回自动计算，用当前长宽高重新计算CBM
                const idx = confirmAutoCalcDialog.boxIndex;
                if (idx >= 0) {
                  const newBoxes = [...boxes];
                  newBoxes[idx].manualCBM = false;
                  const cbm = calculateCBM(
                    newBoxes[idx].length,
                    newBoxes[idx].width,
                    newBoxes[idx].height
                  );
                  newBoxes[idx].cbm = cbm;
                  setBoxes(newBoxes);
                  setIsDirty(true);
                }
                setConfirmAutoCalcDialog({ open: false, boxIndex: -1, manualCbmValue: "0" });
              }}
            >
              确认切换
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
