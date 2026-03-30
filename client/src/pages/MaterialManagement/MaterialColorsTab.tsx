import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ColorIcon } from "@/components/ColorIcon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Upload, Edit, Trash2, Lock } from "lucide-react";
import { toast } from "sonner";

export function MaterialColorsTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [selectedBoard, setSelectedBoard] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 40;
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewColorId, setPreviewColorId] = useState<number | null>(null);
  const [editingColor, setEditingColor] = useState<any>(null);
  const [deletingColorId, setDeletingColorId] = useState<number | null>(null);
  const [selectedColorIds, setSelectedColorIds] = useState<number[]>([]);
  const [batchStatusDialogOpen, setBatchStatusDialogOpen] = useState(false);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [batchCreateData, setBatchCreateData] = useState({
    boardId: "",
    colors: [{ colorCode: "" }], // 初始1行
  });

  // 查询所有颜色
  const queryParams: any = {};
  if (selectedSupplier !== "all") {
    queryParams.supplierId = Number(selectedSupplier);
  }
  if (selectedBoard !== "all") {
    queryParams.boardId = Number(selectedBoard);
  }
  if (searchQuery) {
    queryParams.search = searchQuery;
  }
  if (statusFilter !== "all") {
    queryParams.status = statusFilter;
  }
  
  const { data: colors = [], isLoading, refetch } = trpc.materials.colors.list.useQuery(queryParams);

  // 查询供应商列表（用于筛选）
  const { data: suppliers = [] } = trpc.materials.suppliers.list.useQuery({});

  // 查询布板列表（用于筛选）
  const boardsQueryParams: any = {};
  if (selectedSupplier !== "all") {
    boardsQueryParams.supplierId = Number(selectedSupplier);
  }
  const { data: boards = [] } = trpc.materials.boards.list.useQuery(boardsQueryParams);

  // Mutations
  const updateColorMutation = trpc.materials.colors.update.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("颜色更新成功");
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const deleteColorMutation = trpc.materials.colors.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("颜色删除成功");
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  const batchDeleteMutation = trpc.materials.colors.batchDelete.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedColorIds([]);
      toast.success("批量删除成功");
    },
    onError: (error) => {
      toast.error(`批量删除失败: ${error.message}`);
    },
  });

  const batchUpdateStatusMutation = trpc.materials.colors.batchUpdateStatus.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedColorIds([]);
      toast.success("批量修改状态成功");
    },
    onError: (error) => {
      toast.error(`批量修改状态失败: ${error.message}`);
    },
  });

  const batchCreateMutation = trpc.materials.colors.batchCreate.useMutation({
    onSuccess: (data) => {
      refetch();
      setCreateDialogOpen(false);
      setBatchCreateData({
        boardId: "",
        colors: [{ colorCode: "" }],
      });
      toast.success(`成功创建 ${data.count} 个颜色`);
      toast.success("颜色创建成功");
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const handleSearch = () => {
    refetch();
  };

  const handleReset = () => {
    setSearchQuery("");
    setSelectedSupplier("all");
    setSelectedBoard("all");
  };

  // Pagination logic
  const totalPages = Math.ceil(colors.length / itemsPerPage);
  const paginatedColors = colors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSupplier, selectedBoard]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedColorIds(colors.map((item: any) => item.color.id));
    } else {
      setSelectedColorIds([]);
    }
  };

  const handleSelectColor = (colorId: number, checked: boolean) => {
    if (checked) {
      setSelectedColorIds([...selectedColorIds, colorId]);
    } else {
      setSelectedColorIds(selectedColorIds.filter((id) => id !== colorId));
    }
  };

  const handleEdit = (item: any) => {
    setEditingColor({
      id: item.color.id,
      colorCode: item.color.colorCode,
      colorName: item.color.colorName || "",
      hexColor: item.color.hexColor || "",
      notes: item.color.notes || "",
      status: item.color.status,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingColor) return;
    
    try {
      await updateColorMutation.mutateAsync({
        id: editingColor.id,
        colorCode: editingColor.colorCode,
        colorName: editingColor.colorName || undefined,
        hexColor: editingColor.hexColor || undefined,
        notes: editingColor.notes || undefined,
        status: editingColor.status,
      });
      setEditingColor(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async () => {
    if (!deletingColorId) return;
    
    try {
      await deleteColorMutation.mutateAsync({ id: deletingColorId });
      setDeletingColorId(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleBatchDelete = async () => {
    if (selectedColorIds.length === 0) return;
    
    try {
      await batchDeleteMutation.mutateAsync({ ids: selectedColorIds });
      setBatchDeleteDialogOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleBatchUpdateStatus = async (status: "active" | "inactive") => {
    if (selectedColorIds.length === 0) return;
    
    try {
      await batchUpdateStatusMutation.mutateAsync({ ids: selectedColorIds, status });
      setBatchStatusDialogOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleBatchCreate = async () => {
    if (!batchCreateData.boardId) {
      toast.error("请选择布板");
      return;
    }
    
    // 验证所有颜色编号都已填写
    const emptyColors = batchCreateData.colors.filter(c => !c.colorCode.trim());
    if (emptyColors.length > 0) {
      toast.error("请填写所有颜色编号");
      return;
    }
    
    try {
      await batchCreateMutation.mutateAsync({
        boardId: Number(batchCreateData.boardId),
        colors: batchCreateData.colors,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const handleAddColorRow = () => {
    setBatchCreateData({
      ...batchCreateData,
      colors: [...batchCreateData.colors, { colorCode: "" }],
    });
  };
  
  const handleRemoveColorRow = (index: number) => {
    if (batchCreateData.colors.length === 1) {
      toast.error("至少需要保疙1行");
      return;
    }
    const newColors = batchCreateData.colors.filter((_, i) => i !== index);
    setBatchCreateData({
      ...batchCreateData,
      colors: newColors,
    });
  };
  
  const handleColorCodeChange = (index: number, value: string) => {
    const newColors = [...batchCreateData.colors];
    newColors[index] = { colorCode: value };
    setBatchCreateData({
      ...batchCreateData,
      colors: newColors,
    });
  };

  const handleImageUpload = async (colorId: number, file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("上传失败");
      }

      const data = await response.json();
      
      await updateColorMutation.mutateAsync({
        id: colorId,
        imageUrl: data.url,
      });
      
      toast.success("图片上传成功");
    } catch (error: any) {
      toast.error(`上传失败: ${error.message}`);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">加载中...</div>;
  }

  const allSelected = colors.length > 0 && selectedColorIds.length === colors.length;
  const someSelected = selectedColorIds.length > 0 && selectedColorIds.length < colors.length;

  return (
    <div className="space-y-4">
      {/* 搜索和筛选区域 */}
      <div className="flex items-center gap-4">
        <div className="flex-1 flex items-center gap-2">
          <Input
            placeholder="搜索颜色编号或名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="max-w-sm"
          />
          <Button onClick={handleSearch} variant="secondary">
            <Search className="h-4 w-4 mr-2" />
            搜索
          </Button>
          <Button onClick={handleReset} variant="outline">
            重置
          </Button>
        </div>

        <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="全部供应商" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部供应商</SelectItem>
            {suppliers.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id.toString()}>
                {supplier.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedBoard} onValueChange={setSelectedBoard}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="全部布板" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部布板</SelectItem>
            {boards.map((item: any) => (
              <SelectItem key={item.board.id} value={item.board.id.toString()}>
                {item.board.boardNumber}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="状态筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="active">仅启用</SelectItem>
            <SelectItem value="inactive">仅停用</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新建颜色
        </Button>
      </div>

      {/* 批量操作按钮 */}
      {selectedColorIds.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">
            已选择 {selectedColorIds.length} 个颜色
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBatchUpdateStatus("active")}
            disabled={batchUpdateStatusMutation.isPending}
          >
            批量启用
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBatchUpdateStatus("inactive")}
            disabled={batchUpdateStatusMutation.isPending}
          >
            批量停用
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setBatchDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            批量删除
          </Button>
        </div>
      )}

      {/* 颜色列表表格 */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="全选"
                />
              </TableHead>
              <TableHead className="w-[100px]">缩略图</TableHead>
              <TableHead>完整编号</TableHead>
              <TableHead>供应商</TableHead>
              <TableHead>布板编号</TableHead>
              <TableHead>颜色编号</TableHead>
              <TableHead>颜色名称</TableHead>
              <TableHead>库存(米)</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {colors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  暂无颜色数据，点击“新建颜色”按钮添加
                </TableCell>
              </TableRow>
            ) : (
              paginatedColors.map((item: any) => (
                <TableRow key={item.color.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedColorIds.includes(item.color.id)}
                      onCheckedChange={(checked) => handleSelectColor(item.color.id, checked as boolean)}
                      aria-label={`选择 ${item.color.fullCode}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div
                      className="cursor-pointer"
                      onClick={() => {
                        if (item.color.imageUrl) {
                          setPreviewImage(item.color.imageUrl);
                          setPreviewColorId(item.color.id);
                        }
                      }}
                    >
                      <ColorIcon
                        imageUrl={item.color.imageUrl}
                        colorCode={item.color.colorCode}
                        size="md"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{item.color.fullCode}</TableCell>
                  <TableCell>{item.supplier?.name || "-"}</TableCell>
                  <TableCell>{item.board?.boardNumber || "-"}</TableCell>
                  <TableCell>{item.color.colorCode}</TableCell>
                  <TableCell>{item.color.colorName || "-"}</TableCell>
                  <TableCell>{item.color.stockQuantity || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={item.color.status === "active" ? "default" : "secondary"}>
                      {item.color.status === "active" ? "启用" : "停用"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = "image/*";
                          input.onchange = (e: any) => {
                            const file = e.target?.files?.[0];
                            if (file) {
                              handleImageUpload(item.color.id, file);
                            }
                          };
                          input.click();
                        }}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {item.color.isLocked ? (
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-gray-400" />
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled
                            title="系统默认颜色，不可删除"
                          >
                            <Trash2 className="h-4 w-4 text-gray-300" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingColorId(item.color.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            显示 {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, colors.length)} / 共 {colors.length} 条
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              上一页
            </Button>
            <div className="text-sm">
              {currentPage} / {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              下一页
            </Button>
          </div>
        </div>
      )}

      {/* 创建颜色对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>批量创建颜色</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>布板 *</Label>
              <Select
                value={batchCreateData.boardId}
                onValueChange={(value) => setBatchCreateData({ ...batchCreateData, boardId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择布板" />
                </SelectTrigger>
                <SelectContent>
                  {boards.map((item: any) => (
                    <SelectItem key={item.board.id} value={item.board.id.toString()}>
                      {item.supplier?.name} - {item.board.boardNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>颜色编号 *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddColorRow}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  添加颜色
                </Button>
              </div>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {batchCreateData.colors.map((color, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-8">{index + 1}.</span>
                    <Input
                      value={color.colorCode}
                      onChange={(e) => handleColorCodeChange(index, e.target.value)}
                      placeholder="如：01"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveColorRow(index)}
                      disabled={batchCreateData.colors.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-muted-foreground">
                将创建 {batchCreateData.colors.length} 个颜色，创建后可在列表中逐个编辑详细信息
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleBatchCreate} disabled={batchCreateMutation.isPending}>
              批量创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑颜色对话框 */}
      <Dialog open={!!editingColor} onOpenChange={() => setEditingColor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑颜色</DialogTitle>
          </DialogHeader>
          {editingColor && (
            <div className="space-y-4">
              <div>
                <Label>颜色编号 *</Label>
                <Input
                  value={editingColor.colorCode}
                  onChange={(e) => setEditingColor({ ...editingColor, colorCode: e.target.value })}
                  placeholder="如：01"
                />
              </div>
              <div>
                <Label>颜色名称</Label>
                <Input
                  value={editingColor.colorName}
                  onChange={(e) => setEditingColor({ ...editingColor, colorName: e.target.value })}
                  placeholder="如：白色"
                />
              </div>
              <div>
                <Label>十六进制颜色值</Label>
                <Input
                  value={editingColor.hexColor}
                  onChange={(e) => setEditingColor({ ...editingColor, hexColor: e.target.value })}
                  placeholder="如：#FFFFFF"
                />
              </div>
              <div>
                <Label>备注</Label>
                <Input
                  value={editingColor.notes}
                  onChange={(e) => setEditingColor({ ...editingColor, notes: e.target.value })}
                  placeholder="备注信息"
                />
              </div>
              <div>
                <Label>状态</Label>
                <Select
                  value={editingColor.status}
                  onValueChange={(value) => setEditingColor({ ...editingColor, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">启用</SelectItem>
                    <SelectItem value="inactive">停用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingColor(null)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateColorMutation.isPending}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deletingColorId} onOpenChange={() => setDeletingColorId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个颜色吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteColorMutation.isPending}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量删除确认对话框 */}
      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除选中的 {selectedColorIds.length} 个颜色吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchDelete} disabled={batchDeleteMutation.isPending}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量修改状态对话框 */}
      <Dialog open={batchStatusDialogOpen} onOpenChange={setBatchStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量修改状态</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              将 {selectedColorIds.length} 个颜色的状态修改为：
            </p>
            <div className="flex gap-4">
              <Button
                className="flex-1"
                onClick={() => handleBatchUpdateStatus("active")}
                disabled={batchUpdateStatusMutation.isPending}
              >
                启用
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => handleBatchUpdateStatus("inactive")}
                disabled={batchUpdateStatusMutation.isPending}
              >
                停用
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchStatusDialogOpen(false)}>
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 图片预览对话框 */}
      <Dialog open={!!previewImage} onOpenChange={() => { setPreviewImage(null); setPreviewColorId(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>布料图片预览</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="flex justify-center">
              <img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-[600px] object-contain rounded"
              />
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={async () => {
                if (!previewColorId) return;
                try {
                  await updateColorMutation.mutateAsync({
                    id: previewColorId,
                    imageUrl: "",
                  });
                  toast.success("图片删除成功");
                  setPreviewImage(null);
                  setPreviewColorId(null);
                } catch (error: any) {
                  toast.error(`删除失败: ${error.message}`);
                }
              }}
              disabled={updateColorMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              删除图片
            </Button>
            <Button variant="outline" onClick={() => { setPreviewImage(null); setPreviewColorId(null); }}>
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
