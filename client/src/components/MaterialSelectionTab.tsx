import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Image as ImageIcon, ChevronUp, ChevronDown, Star } from "lucide-react";
import { toast } from "sonner";
import { getMaterialTypeLabel, getMaterialTypeIcon } from "@/constants/materialTypes";

interface MaterialSelectionTabProps {
  variantId: number;
}

export function MaterialSelectionTab({ variantId }: MaterialSelectionTabProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedMaterialType, setSelectedMaterialType] = useState<string>("");
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Query variant materials (使用新的variantMaterials API)
  const { data: variantMaterials, isLoading } = trpc.variantMaterials.list.useQuery({
    variantId,
  });

  // Query all material colors
  const { data: colorsData } = trpc.materials.colors.list.useQuery({});

  // Query material types from attributes table
  const { data: materialTypesData } = trpc.attributes.getAll.useQuery({
    category: '材料管理',
    fieldName: '材料类型',
  });

  // Initialize selectedMaterialType with first material type
  useEffect(() => {
    if (materialTypesData && materialTypesData.length > 0 && !selectedMaterialType) {
      setSelectedMaterialType(materialTypesData[0].name);
    }
  }, [materialTypesData, selectedMaterialType]);

  // Add material mutation
  const addMaterial = trpc.variantMaterials.add.useMutation({
    onSuccess: () => {
      toast.success("材料添加成功");
      setIsAddDialogOpen(false);
      resetForm();
      utils.variantMaterials.list.invalidate({ variantId });
    },
    onError: (error) => {
      toast.error(`添加失败: ${error.message}`);
    },
  });

  // Delete material mutation
  const deleteMaterial = trpc.variantMaterials.delete.useMutation({
    onSuccess: () => {
      toast.success("材料删除成功");
      utils.variantMaterials.list.invalidate({ variantId });
    },
    onError: (error: any) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  // Reorder material mutation
  const reorderMaterial = trpc.variantMaterials.reorder.useMutation({
    onSuccess: () => {
      utils.variantMaterials.list.invalidate({ variantId });
    },
    onError: (error: any) => {
      toast.error(`排序失败: ${error.message}`);
    },
  });

  const resetForm = () => {
    if (materialTypesData && materialTypesData.length > 0) {
      setSelectedMaterialType(materialTypesData[0].name);
    }
    setSelectedColorId(null);
  };

  const handleAddMaterial = () => {
    if (!selectedColorId) {
      toast.error("请选择材料颜色");
      return;
    }

    addMaterial.mutate({
      variantId,
      materialColorId: selectedColorId,
      materialType: selectedMaterialType,
    });
  };

  const handleDeleteMaterial = (id: number, sortOrder: number) => {
    // 主材料（sortOrder=0）不可删除
    if (sortOrder === 0) {
      toast.error("主材料不可删除，但您可以更改其类型");
      return;
    }

    if (confirm("确定要删除这个材料吗？")) {
      deleteMaterial.mutate({ id });
    }
  };

  const handleReorder = (id: number, direction: "up" | "down") => {
    reorderMaterial.mutate({ id, direction });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>批次材料清单</CardTitle>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              添加更多材料
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              加载中...
            </div>
          ) : !variantMaterials || variantMaterials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无材料数据，点击"添加更多材料"开始添加
            </div>
          ) : (
            <div className="space-y-4">
              {variantMaterials.map((item: any, index: number) => {
                const material = item;
                const color = item.materialColor;
                const isPrimary = material.sortOrder === 0;
                
                return (
                  <Card key={material.id} className={`overflow-hidden ${isPrimary ? 'border-primary border-2' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* 材料图片 */}
                        <div className="w-24 h-24 flex-shrink-0 relative bg-gray-100 rounded overflow-hidden">
                          {color?.imageUrl ? (
                            <img
                              src={color.imageUrl}
                              alt={color.colorName}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <ImageIcon className="h-8 w-8" />
                            </div>
                          )}
                          {isPrimary && (
                            <div className="absolute top-1 left-1 bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              主材料
                            </div>
                          )}
                        </div>

                        {/* 材料信息 */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{getMaterialTypeIcon(material.materialType)}</span>
                                <h3 className="font-medium">{getMaterialTypeLabel(material.materialType)}</h3>
                              </div>
                              {color && (
                                <div className="mt-1">
                                  <p className="text-sm font-medium">{color.colorName}</p>
                                  <p className="text-xs text-muted-foreground">{color.colorCode}</p>
                                </div>
                              )}
                            </div>
                            <Badge variant="outline">
                              排序: {material.sortOrder}
                            </Badge>
                          </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReorder(material.id, "up")}
                            disabled={index === 0}
                            title="上移"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReorder(material.id, "down")}
                            disabled={index === variantMaterials.length - 1}
                            title="下移"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteMaterial(material.id, material.sortOrder)}
                            disabled={isPrimary}
                            title={isPrimary ? "主材料不可删除" : "删除"}
                          >
                            <Trash2 className={`h-4 w-4 ${isPrimary ? 'text-muted-foreground' : 'text-destructive'}`} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* 提示信息 */}
          {variantMaterials && variantMaterials.length > 0 && (
            <div className="mt-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
              <p>💡 提示：</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>主材料（带⭐标记）不可删除，但可以更改类型</li>
                <li>使用上移/下移按钮调整材料显示顺序</li>
                <li>订单中最多显示前3个材料图片</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Material Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>添加材料</DialogTitle>
            <DialogDescription>
              选择材料类型和颜色
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="materialType">材料类型 *</Label>
              <Select
                value={selectedMaterialType}
                onValueChange={(value) => setSelectedMaterialType(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择材料类型" />
                </SelectTrigger>
                <SelectContent>
                  {materialTypesData?.map((attr: any) => (
                    <SelectItem key={attr.id} value={attr.name}>
                      <div className="flex items-center gap-2">
                        <span>{getMaterialTypeIcon(attr.name)}</span>
                        <span>{attr.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">材料颜色 *</Label>
              <Select
                value={selectedColorId?.toString() || ""}
                onValueChange={(value) => setSelectedColorId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择材料颜色" />
                </SelectTrigger>
                <SelectContent>
                  {colorsData?.map((item: any) => {
                    const color = item.color;
                    return (
                      <SelectItem key={color.id} value={color.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{color.colorName} ({color.colorCode})</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedColorId && (
              <>
                {/* Show selected color image */}
                {colorsData?.find((item: any) => item.color.id === selectedColorId)?.color.imageUrl && (
                  <div className="space-y-2">
                    <Label>颜色预览</Label>
                    <div className="w-32 h-32 border rounded overflow-hidden">
                      <img
                        src={colorsData.find((item: any) => item.color.id === selectedColorId)?.color.imageUrl || ''}
                        alt="Color preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false);
              resetForm();
            }}>
              取消
            </Button>
            <Button onClick={handleAddMaterial} disabled={addMaterial.isPending}>
              {addMaterial.isPending ? "添加中..." : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
