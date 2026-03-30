import React, { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronUp, ChevronDown, Trash2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { ColorIcon } from "@/components/ColorIcon";
import { SmartSearchSelect } from "@/components/SmartSearchSelect";

interface Material {
  id?: number;
  materialType: string | null;
  materialColorId: number;
  sortOrder: number;
  createdAt?: Date;
  color?: {
    id: number;
    erpCompanyId: number | null;
    boardId: number;
    colorCode: string;
    colorName: string | null;
    fullCode: string | null;
    hexColor: string | null;
    imageUrl: string | null;
    thumbnailUrl: string | null;
    stockQuantity: number | null;
    notes: string | null;
    status: string;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  supplier?: {
    id: number;
    erpCompanyId: number | null;
    categoryId: number | null;
    code: string;
    name: string;
    contactPerson: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    address: string | null;
    notes: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  board?: {
    id: number;
    erpCompanyId: number | null;
    supplierId: number;
    categoryId: number | null;
    boardNumber: string;
    boardName: string | null;
    materialType: string | null;
    pricePerMeter: string;
    currency: string;
    minOrderQuantity: number | null;
    leadTime: number | null;
    description: string | null;
    notes: string | null;
    imageUrl: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}

type ColorItem = {
  color: {
    id: number;
    colorCode: string;
    colorName: string | null;
    imageUrl: string | null;
    usageCount?: number;
  };
  board: { boardNumber: string } | null;
  supplier: { code: string; name: string } | null;
};

interface VariantMaterialsManagerProps {
  variantId: number;
  onChange?: (materials: Material[]) => void;
}

export function VariantMaterialsManager({
  variantId,
  onChange,
}: VariantMaterialsManagerProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null);

  // 编辑/新增共用的表单状态
  const [formMaterialType, setFormMaterialType] = useState("");
  const [formMaterialColorId, setFormMaterialColorId] = useState<number | null>(null);
  const [formColorDisplayValue, setFormColorDisplayValue] = useState("");

  // 查询材料类型列表（从属性管理读取）
  const { data: attributesData } = trpc.attributes.getAll.useQuery({
    category: '材料管理',
    fieldName: '材料类型',
  });

  const materialTypesData = attributesData?.map((attr) => ({
    id: attr.id,
    name: attr.name,
  }));

  // 当材料类型列表加载完成后，如果还没有选中类型，默认选第一个（颜色）
  useEffect(() => {
    if (materialTypesData && materialTypesData.length > 0 && !formMaterialType) {
      setFormMaterialType(materialTypesData[0].name);
    }
  }, [materialTypesData]);

  // 查询批次的材料列表
  const { data: materialsData, refetch: refetchMaterials } =
    trpc.variantMaterials.list.useQuery({ variantId });

  // tRPC utils for calling colors.list
  const utils = trpc.useUtils();

  // SmartSearchSelect 的 fetchItems 函数（按材料类型过滤，支持搜索）
  const fetchColorItems = useCallback(
    async (query: string): Promise<ColorItem[]> => {
      try {
        const results = await utils.materials.colors.list.fetch({
          search: query || undefined,
          materialTypeName: !query ? formMaterialType : undefined,
          limit: query ? undefined : 20, // 默认列表最多20条
        });
        return results as ColorItem[];
      } catch {
        return [];
      }
    },
    [utils, formMaterialType]
  );

  // 添加材料
  const addMaterialMutation = trpc.variantMaterials.add.useMutation({
    onSuccess: () => {
      toast.success("材料添加成功");
      refetchMaterials();
      setIsAddingMaterial(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`添加失败：${error.message}`);
    },
  });

  // 更新材料
  const updateMaterialMutation = trpc.variantMaterials.update.useMutation({
    onSuccess: () => {
      toast.success("材料更新成功");
      refetchMaterials();
      setEditingMaterialId(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(`更新失败：${error.message}`);
    },
  });

  // 删除材料
  const deleteMaterialMutation = trpc.variantMaterials.delete.useMutation({
    onSuccess: () => {
      toast.success("材料删除成功");
      refetchMaterials();
    },
    onError: (error) => {
      toast.error(`删除失败：${error.message}`);
    },
  });

  // 调整材料顺序
  const reorderMutation = trpc.variantMaterials.reorder.useMutation({
    onSuccess: () => {
      refetchMaterials();
    },
    onError: (error: any) => {
      toast.error(`排序失败：${error.message}`);
    },
  });

  // 同步材料数据
  useEffect(() => {
    if (materialsData) {
      setMaterials(materialsData);
      onChange?.(materialsData);
    }
  }, [materialsData, onChange]);

  const resetForm = () => {
    setFormMaterialColorId(null);
    setFormColorDisplayValue("");
    // 重置类型为第一个（颜色）
    if (materialTypesData && materialTypesData.length > 0) {
      setFormMaterialType(materialTypesData[0].name);
    }
  };

  // 处理编辑材料
  const handleEditMaterial = (material: Material) => {
    setEditingMaterialId(material.id!);
    setFormMaterialType(material.materialType || (materialTypesData?.[0]?.name ?? ""));
    setFormMaterialColorId(material.materialColorId);
    if (material.color && material.supplier && material.board) {
      setFormColorDisplayValue(
        `${material.supplier.code} - ${material.board.boardNumber} - ${material.color.colorCode}`
      );
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingMaterialId(null);
    resetForm();
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (!editingMaterialId || !formMaterialColorId) return;
    updateMaterialMutation.mutate({
      id: editingMaterialId,
      materialType: formMaterialType,
      materialColorId: formMaterialColorId,
    });
  };

  // 添加材料
  const handleAddMaterial = () => {
    if (!formMaterialColorId) return;
    addMaterialMutation.mutate({
      variantId,
      materialType: formMaterialType,
      materialColorId: formMaterialColorId,
    });
  };

  // 删除材料
  const handleDeleteMaterial = (materialId: number) => {
    if (!confirm("确定要删除这个材料吗？")) return;
    deleteMaterialMutation.mutate({ id: materialId });
  };

  // 上移材料
  const handleMoveUp = (materialId: number, index: number) => {
    if (index === 0) return;
    reorderMutation.mutate({ id: materialId, direction: "up" });
  };

  // 下移材料
  const handleMoveDown = (materialId: number, index: number) => {
    if (index === materials.length - 1) return;
    reorderMutation.mutate({ id: materialId, direction: "down" });
  };

  // 渲染颜色搜索表单（编辑和新增共用）
  const renderColorForm = (mode: "edit" | "add") => (
    <div className="space-y-4 w-full">
      {/* 材料类型选择 */}
      <div>
        <Label>材料类型</Label>
        <Select
          value={formMaterialType}
          onValueChange={(value) => {
            setFormMaterialType(value);
            // 切换材料类型时清除当前选择
            setFormMaterialColorId(null);
            setFormColorDisplayValue("");
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="请选择材料类型" />
          </SelectTrigger>
          <SelectContent>
            {materialTypesData?.map((type) => (
              <SelectItem key={type.id} value={type.name}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 材料颜色选择 - 使用 SmartSearchSelect */}
      <div>
        <Label>材料颜色</Label>
        <SmartSearchSelect<ColorItem>
          value={formMaterialColorId}
          displayValue={formColorDisplayValue}
          onSelect={(item) => {
            setFormMaterialColorId(item.color.id);
            setFormColorDisplayValue(
              `${item.supplier?.code ?? ""} - ${item.board?.boardNumber ?? ""} - ${item.color.colorCode}`
            );
          }}
          onClear={() => {
            setFormMaterialColorId(null);
            setFormColorDisplayValue("");
          }}
          fetchItems={fetchColorItems}
          getItemKey={(item) => item.color.id}
          isItemSelected={(item) => item.color.id === formMaterialColorId}
          renderItem={(item, selected) => (
            <div className="flex items-center gap-3">
              <ColorIcon
                imageUrl={item.color.imageUrl}
                colorCode={item.color.colorCode}
                colorName={item.color.colorName ?? ""}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block">
                  {item.supplier?.code} - {item.board?.boardNumber} - {item.color.colorCode}
                </span>
                {item.color.colorName && (
                  <span className="text-xs text-gray-500 truncate block">{item.color.colorName}</span>
                )}
              </div>
              {(item.color as any).usageCount > 0 && (
                <span className="text-xs text-orange-500 flex-shrink-0">
                  🔥 {(item.color as any).usageCount}
                </span>
              )}
            </div>
          )}
          placeholder="搜索供应商、布板或颜色编号..."
          emptyText="暂无匹配的颜色"
          defaultListTitle={`常用${formMaterialType || "颜色"}`}
          searchListTitle="搜索结果"
        />
      </div>

      <Button
        type="button"
        onClick={mode === "edit" ? handleSaveEdit : handleAddMaterial}
        disabled={
          !formMaterialColorId ||
          (mode === "edit" ? updateMaterialMutation.isPending : addMaterialMutation.isPending)
        }
        className="w-full"
      >
        {mode === "edit"
          ? updateMaterialMutation.isPending ? "保存中..." : "保存"
          : addMaterialMutation.isPending ? "添加中..." : "添加"}
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">批次材料清单</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            resetForm();
            setIsAddingMaterial(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" />
          添加更多材料
        </Button>
      </div>

      {/* 材料列表 */}
      <div className="space-y-3">
        {materials.map((material, index) => (
          <Card key={material.id} className="p-4">
            <div className="flex items-center gap-4">
              {/* 材料图片 */}
              <ColorIcon
                imageUrl={material.color?.imageUrl || null}
                colorCode={material.color?.colorCode || ""}
                colorName={material.color?.colorName || ""}
                size="lg"
              />

              {/* 材料信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {index === 0 && (
                    <span className="text-yellow-600 text-sm font-medium">⭐ 主材料</span>
                  )}
                  <span className="text-sm text-gray-600">
                    {material.materialType || "布料"}
                  </span>
                </div>
                <div className="text-sm font-medium truncate">
                  {material.supplier?.code} - {material.board?.boardNumber} -{" "}
                  {material.color?.colorCode} · {material.color?.colorName}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditMaterial(material)}
                  title="编辑材料"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMoveUp(material.id!, index)}
                  disabled={index === 0}
                  title="上移"
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMoveDown(material.id!, index)}
                  disabled={index === materials.length - 1}
                  title="下移"
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteMaterial(material.id!)}
                  disabled={index === 0}
                  title={index === 0 ? "主材料不可删除" : "删除材料"}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* 内联编辑表单 */}
            {editingMaterialId === material.id && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold">编辑材料</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={handleCancelEdit}>
                    取消
                  </Button>
                </div>
                {renderColorForm("edit")}
              </div>
            )}
          </Card>
        ))}

        {materials.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            暂无材料，请点击"添加更多材料"按钮添加
          </div>
        )}
      </div>

      {/* 添加材料弹窗 */}
      <Dialog
        open={isAddingMaterial}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddingMaterial(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="!w-[520px] !max-w-[520px]">
          <DialogHeader>
            <DialogTitle>添加新材料</DialogTitle>
          </DialogHeader>
          {renderColorForm("add")}
        </DialogContent>
      </Dialog>

      {/* 提示信息 */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>💡 提示：</p>
        <p>• 主材料（带⭐标记）不可删除，但可以修改类型和颜色</p>
        <p>• 使用上移/下移按钮调整材料顺序，排在最前的材料将显示在订单中</p>
        <p>• 订单中最多显示前3个材料图片</p>
      </div>
    </div>
  );
}
