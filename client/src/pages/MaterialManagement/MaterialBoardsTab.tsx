import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Search, Upload, Image as ImageIcon, ChevronRight, ChevronDown, X, Lock } from "lucide-react";
import { toast } from "sonner";
import { OptimizedImage } from "@/components/OptimizedImage";

interface BoardFormData {
  supplierId: number | null;
  boardNumber: string;
  pricePerMeter: string;
  currency: string;
  description: string;
  imageUrl?: string;
}

interface ColorFormData {
  boardId: number | null;
  colorNumber: string;
  colorName: string;
  hexCode: string;
  imageUrl?: string;
}

export function MaterialBoardsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 40;
  const [expandedBoardIds, setExpandedBoardIds] = useState<Set<number>>(new Set());
  const [selectedBoardIds, setSelectedBoardIds] = useState<number[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBoardId, setEditingBoardId] = useState<number | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadingBoardId, setUploadingBoardId] = useState<number | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewImageBoardId, setPreviewImageBoardId] = useState<number | null>(null);
  const [isColorDialogOpen, setIsColorDialogOpen] = useState(false);
  const [colorFormData, setColorFormData] = useState<ColorFormData>({
    boardId: null,
    colorNumber: "",
    colorName: "",
    hexCode: "#000000",
  });
  const [formData, setFormData] = useState<BoardFormData>({
    supplierId: null,
    boardNumber: "",
    pricePerMeter: "",
    currency: "RMB",
    description: "",
    imageUrl: "",
  });

  const utils = trpc.useUtils();
  
  // Query suppliers for dropdown
  const { data: suppliers } = trpc.materials.suppliers.list.useQuery({});

  // Query boards
  const { data: boards, isLoading } = trpc.materials.boards.list.useQuery({
    supplierId: selectedSupplierId || undefined,
    search: searchTerm || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  // Create board mutation
  const createBoard = trpc.materials.boards.create.useMutation({
    onSuccess: () => {
      toast.success("布板创建成功");
      setIsCreateDialogOpen(false);
      resetForm();
      utils.materials.boards.list.invalidate();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  // Update board mutation
  const updateBoard = trpc.materials.boards.update.useMutation({
    onSuccess: () => {
      toast.success("布板更新成功");
      setIsEditDialogOpen(false);
      setEditingBoardId(null);
      resetForm();
      utils.materials.boards.list.invalidate();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  // Delete board mutation
  const deleteBoard = trpc.materials.boards.delete.useMutation({
    onSuccess: () => {
      toast.success("布板删除成功");
      utils.materials.boards.list.invalidate();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  // Delete board image mutation
  const deleteBoardImage = trpc.materials.boards.update.useMutation({
    onSuccess: () => {
      toast.success("图片删除成功");
      setPreviewImageUrl(null);
      setPreviewImageBoardId(null);
      utils.materials.boards.list.invalidate();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  // Batch update status mutation
  const batchUpdateStatus = trpc.materials.boards.batchUpdateStatus.useMutation({
    onSuccess: () => {
      toast.success("批量修改状态成功");
      setSelectedBoardIds([]);
      utils.materials.boards.list.invalidate();
    },
    onError: (error) => {
      toast.error(`批量修改失败: ${error.message}`);
    },
  });

  // Create color mutation
  const createColor = trpc.materials.colors.create.useMutation({
    onSuccess: () => {
      toast.success("颜色创建成功");
      setIsColorDialogOpen(false);
      resetColorForm();
      utils.materials.boards.list.invalidate();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      supplierId: null,
      boardNumber: "",
      pricePerMeter: "",
      currency: "RMB",
      description: "",
    });
  };

  const resetColorForm = () => {
    setColorFormData({
      boardId: null,
      colorNumber: "",
      colorName: "",
      hexCode: "#000000",
    });
  };

  const handleCreateColor = () => {
    if (!colorFormData.boardId) {
      toast.error("请选择布板");
      return;
    }
    if (!colorFormData.colorNumber.trim()) {
      toast.error("请输入颜色编号");
      return;
    }
    if (!colorFormData.colorName.trim()) {
      toast.error("请输入颜色名称");
      return;
    }

    createColor.mutate({
      boardId: colorFormData.boardId,
      colorCode: colorFormData.colorNumber,
      colorName: colorFormData.colorName,
      hexColor: colorFormData.hexCode,
    });
  };

  const toggleBoardExpansion = (boardId: number) => {
    const newExpanded = new Set(expandedBoardIds);
    if (newExpanded.has(boardId)) {
      newExpanded.delete(boardId);
    } else {
      newExpanded.add(boardId);
    }
    setExpandedBoardIds(newExpanded);
  };

  // Batch selection handlers
  const handleSelectBoard = (boardId: number, checked: boolean) => {
    if (checked) {
      setSelectedBoardIds(prev => [...prev, boardId]);
    } else {
      setSelectedBoardIds(prev => prev.filter(id => id !== boardId));
    }
  };

  const handleSelectAllBoards = (checked: boolean) => {
    if (checked) {
      const allBoardIds = paginatedBoards.map((board: any) => board.id);
      setSelectedBoardIds(allBoardIds);
    } else {
      setSelectedBoardIds([]);
    }
  };

  const handleBatchSetActive = () => {
    if (selectedBoardIds.length === 0) {
      toast.error("请选择至少一个布板");
      return;
    }
    batchUpdateStatus.mutate({ ids: selectedBoardIds, status: "active" });
  };

  const handleBatchSetInactive = () => {
    if (selectedBoardIds.length === 0) {
      toast.error("请选择至少一个布板");
      return;
    }
    batchUpdateStatus.mutate({ ids: selectedBoardIds, status: "inactive" });
  };

  const handleCreate = () => {
    if (!formData.supplierId) {
      toast.error("请选择供应商");
      return;
    }
    if (!formData.boardNumber.trim()) {
      toast.error("请输入材料编号");
      return;
    }
    if (!formData.pricePerMeter || parseFloat(formData.pricePerMeter) <= 0) {
      toast.error("请输入有效的价格");
      return;
    }

    createBoard.mutate({
      supplierId: formData.supplierId,
      boardNumber: formData.boardNumber,
      pricePerMeter: formData.pricePerMeter, // 保持为字符串类型
      currency: formData.currency,
      description: formData.description || undefined,
    });
  };

  const handleEdit = (board: any) => {
    setEditingBoardId(board.id);
    setFormData({
      supplierId: board.supplierId,
      boardNumber: board.boardNumber,
      pricePerMeter: board.pricePerMeter.toString(),
      currency: board.currency,
      description: board.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingBoardId) return;
    if (!formData.supplierId) {
      toast.error("请选择供应商");
      return;
    }
    if (!formData.boardNumber.trim()) {
      toast.error("请输入材料编号");
      return;
    }
    if (!formData.pricePerMeter || parseFloat(formData.pricePerMeter) <= 0) {
      toast.error("请输入有效的价格");
      return;
    }

    updateBoard.mutate({
      id: editingBoardId,
      supplierId: formData.supplierId,
      boardNumber: formData.boardNumber,
      pricePerMeter: formData.pricePerMeter,
      currency: formData.currency,
      description: formData.description || undefined,
    });
  };

  const handleDelete = (id: number, boardNumber: string) => {
    if (confirm(`确定要删除布板"${boardNumber}"吗？`)) {
      deleteBoard.mutate({ id });
    }
  };

  const handleUploadImage = (boardId: number) => {
    setUploadingBoardId(boardId);
    setIsUploadDialogOpen(true);
  };

  const handleDeleteImage = (boardId: number) => {
    deleteBoardImage.mutate({
      id: boardId,
      imageUrl: null as any, // 设置为null以清空图片
    });
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    // 验证文件大小（最大5MB）
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过5MB');
      return;
    }

    setUploadingImage(true);

    try {
      // 上传到S3
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('上传失败');
      }

      const { url } = await response.json();

      // 更新布板图片URL
      await updateBoard.mutateAsync({
        id: uploadingBoardId!,
        imageUrl: url,
      });

      toast.success('图片上传成功');
      setIsUploadDialogOpen(false);
      setUploadingBoardId(null);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('图片上传失败');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddColor = (boardId: number) => {
    setColorFormData({
      ...colorFormData,
      boardId,
    });
    setIsColorDialogOpen(true);
  };

  const getSupplierName = (supplierId: number) => {
    const supplier = suppliers?.find((s: any) => s.id === supplierId);
    return supplier?.name || "-";
  };

  // Transform boards data to flat structure
  const flatBoards = boards?.map((item: any) => ({
    ...item.board,
    supplierName: item.supplier?.name || "-",
    colors: item.colors || [],
  })) || [];

  // Pagination logic
  const totalPages = Math.ceil(flatBoards.length / itemsPerPage);
  const paginatedBoards = flatBoards.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSupplierId]);

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索材料编号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Select
          value={selectedSupplierId?.toString() || "all"}
          onValueChange={(value) => setSelectedSupplierId(value === "all" ? null : parseInt(value))}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="筛选供应商" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部供应商</SelectItem>
            {suppliers?.map((supplier: any) => (
              <SelectItem key={supplier.id} value={supplier.id.toString()}>
                {supplier.name}
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
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新建材料
        </Button>
      </div>

      {/* Batch Actions */}
      {selectedBoardIds.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">
            已选择 {selectedBoardIds.length} 个布板
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBatchSetActive}
          >
            批量启用
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBatchSetInactive}
          >
            批量停用
          </Button>
        </div>
      )}

      {/* Boards Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedBoardIds.length === paginatedBoards.length && paginatedBoards.length > 0}
                  onCheckedChange={handleSelectAllBoards}
                  aria-label="全选"
                />
              </TableHead>
              <TableHead className="w-12"></TableHead>
              <TableHead>缩略图</TableHead>
              <TableHead>供应商</TableHead>
              <TableHead>材料编号</TableHead>
              <TableHead>价格/米</TableHead>
              <TableHead>描述</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  加载中...
                </TableCell>
              </TableRow>
            ) : !flatBoards?.length ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  暂无布板数据
                </TableCell>
              </TableRow>
            ) : (
              paginatedBoards.map((board: any) => (
                <>
                  {/* Board Row */}
                  <TableRow key={board.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Checkbox
                        checked={selectedBoardIds.includes(board.id)}
                        onCheckedChange={(checked) => handleSelectBoard(board.id, checked as boolean)}
                        aria-label={`选择 ${board.boardNumber}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleBoardExpansion(board.id)}
                        className="h-6 w-6 p-0"
                      >
                        {expandedBoardIds.has(board.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      {board.imageUrl ? (
                        <OptimizedImage 
                          src={board.imageUrl} 
                          alt={board.boardNumber}
                          className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            setPreviewImageUrl(board.imageUrl);
                            setPreviewImageBoardId(board.id);
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
                          无图片
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{board.supplierName}</TableCell>
                    <TableCell className="font-medium">{board.boardNumber}</TableCell>
                    <TableCell>
                      {board.currency === "RMB" ? "¥" : "$"}
                      {typeof board.pricePerMeter === 'number' ? board.pricePerMeter.toFixed(2) : parseFloat(board.pricePerMeter || '0').toFixed(2)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{board.description || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={board.status === "active" ? "default" : "secondary"}>
                        {board.status === "active" ? "启用" : "停用"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUploadImage(board.id)}
                          title="上传图片"
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(board)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {board.isLocked ? (
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4 text-gray-400" />
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled
                              title="系统默认材料，不可删除"
                            >
                              <Trash2 className="h-4 w-4 text-gray-300" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(board.id, board.boardNumber)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Colors Section */}
                  {expandedBoardIds.has(board.id) && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-muted/30 p-0">
                        <div className="p-4 pl-16">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-muted-foreground">
                                布料颜色 ({board.colors?.length || 0})
                              </h4>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddColor(board.id)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                添加颜色
                              </Button>
                            </div>
                            
                            {board.colors && board.colors.length > 0 ? (
                              <div className="grid grid-cols-1 gap-2">
                                {board.colors.map((color: any) => (
                                  <div
                                    key={color.id}
                                    className="flex items-center gap-4 p-3 bg-background rounded-lg border"
                                  >
                                    {color.imageUrl ? (
                                      <OptimizedImage
                                        src={color.imageUrl}
                                        alt={color.colorName}
                                        className="w-12 h-12 object-cover rounded"
                                      />
                                    ) : (
                                      <div
                                        className="w-12 h-12 rounded border"
                                        style={{ backgroundColor: color.hexCode }}
                                      />
                                    )}
                                    <div className="flex-1">
                                      <div className="font-medium text-sm">{color.colorNumber}</div>
                                      <div className="text-sm text-muted-foreground">{color.colorName}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button variant="ghost" size="sm">
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="sm">
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6 text-sm text-muted-foreground">
                                暂无颜色数据，点击上方按钮添加
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            显示 {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, flatBoards.length)} / 共 {flatBoards.length} 条
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

      {/* Create Board Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>新建材料</DialogTitle>
            <DialogDescription>
              添加新的材料信息
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">供应商 *</Label>
              <Select
                value={formData.supplierId?.toString() || ""}
                onValueChange={(value) => setFormData({ ...formData, supplierId: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择供应商" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers?.map((supplier: any) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="boardNumber">布板序号 *</Label>
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground px-3 py-2 bg-muted rounded-md min-w-[60px]">
                  {formData.supplierId ? suppliers?.find((s: any) => s.id === formData.supplierId)?.code || "-" : "-"}
                </div>
                <span className="text-muted-foreground">-</span>
                <Input
                  id="boardNumber"
                  value={formData.boardNumber}
                  onChange={(e) => setFormData({ ...formData, boardNumber: e.target.value })}
                  placeholder="例如：008"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                完整编号：{formData.supplierId && formData.boardNumber ? `${suppliers?.find((s: any) => s.id === formData.supplierId)?.code}-${formData.boardNumber}` : "请先选择供应商并输入布板序号"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pricePerMeter">价格/米 *</Label>
                <Input
                  id="pricePerMeter"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.pricePerMeter}
                  onChange={(e) => setFormData({ ...formData, pricePerMeter: e.target.value })}
                  placeholder="15.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">货币 *</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RMB">RMB (¥)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="布板描述信息"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false);
              resetForm();
            }}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={createBoard.isPending}>
              {createBoard.isPending ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Board Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>编辑布板</DialogTitle>
            <DialogDescription>
              修改布板信息
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-supplier">供应商 *</Label>
              <Select
                value={formData.supplierId?.toString() || ""}
                onValueChange={(value) => setFormData({ ...formData, supplierId: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择供应商" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers?.map((supplier: any) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-boardNumber">布板序号 *</Label>
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground px-3 py-2 bg-muted rounded-md min-w-[60px]">
                  {formData.supplierId ? suppliers?.find((s: any) => s.id === formData.supplierId)?.code || "-" : "-"}
                </div>
                <span className="text-muted-foreground">-</span>
                <Input
                  id="edit-boardNumber"
                  value={formData.boardNumber}
                  onChange={(e) => setFormData({ ...formData, boardNumber: e.target.value })}
                  placeholder="例如：008"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                完整编号：{formData.supplierId && formData.boardNumber ? `${suppliers?.find((s: any) => s.id === formData.supplierId)?.code}-${formData.boardNumber}` : "请先选择供应商并输入布板序号"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-pricePerMeter">价格/米 *</Label>
                <Input
                  id="edit-pricePerMeter"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.pricePerMeter}
                  onChange={(e) => setFormData({ ...formData, pricePerMeter: e.target.value })}
                  placeholder="15.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-currency">货币 *</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RMB">RMB (¥)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">描述</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="布板描述信息"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              setEditingBoardId(null);
              resetForm();
            }}>
              取消
            </Button>
            <Button onClick={handleUpdate} disabled={updateBoard.isPending}>
              {updateBoard.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Image Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>上传布板图片</DialogTitle>
            <DialogDescription>
              选择一张图片上传作为布板的缩略图（最大5MB）
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
                id="image-upload"
                disabled={uploadingImage}
              />
              <label
                htmlFor="image-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                {uploadingImage ? (
                  <>
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-600">上传中...</p>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                    <p className="text-sm text-gray-600">点击选择图片</p>
                    <p className="text-xs text-gray-400">或拖拽图片到此处</p>
                  </>
                )}
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUploadDialogOpen(false);
                setUploadingBoardId(null);
              }}
              disabled={uploadingImage}
            >
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImageUrl} onOpenChange={() => {
        setPreviewImageUrl(null);
        setPreviewImageBoardId(null);
      }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>布板图片预览</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {previewImageUrl && (
              <OptimizedImage
                src={previewImageUrl}
                alt="布板图片"
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (previewImageBoardId) {
                  handleDeleteImage(previewImageBoardId);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              删除图片
            </Button>
            <Button onClick={() => {
              setPreviewImageUrl(null);
              setPreviewImageBoardId(null);
            }}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Color Dialog */}
      <Dialog open={isColorDialogOpen} onOpenChange={setIsColorDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>添加布料颜色</DialogTitle>
            <DialogDescription>
              为布板添加新的颜色选项
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="colorNumber">颜色编号 *</Label>
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground px-3 py-2 bg-muted rounded-md min-w-[100px]">
                  {(() => {
                    const board = flatBoards.find((b: any) => b.id === colorFormData.boardId);
                    if (!board) return "-";
                    const supplier = suppliers?.find((s: any) => s.id === board.supplierId);
                    return supplier ? `${supplier.code}-${board.boardNumber}` : "-";
                  })()}
                </div>
                <span className="text-muted-foreground">-</span>
                <Input
                  id="colorNumber"
                  value={colorFormData.colorNumber}
                  onChange={(e) => setColorFormData({ ...colorFormData, colorNumber: e.target.value })}
                  placeholder="例如：01"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                完整编号：{(() => {
                  const board = flatBoards.find((b: any) => b.id === colorFormData.boardId);
                  if (!board || !colorFormData.colorNumber) return "请输入颜色编号";
                  const supplier = suppliers?.find((s: any) => s.id === board.supplierId);
                  return supplier ? `${supplier.code}-${board.boardNumber}-${colorFormData.colorNumber}` : "请输入颜色编号";
                })()}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="colorName">颜色名称 *</Label>
              <Input
                id="colorName"
                value={colorFormData.colorName}
                onChange={(e) => setColorFormData({ ...colorFormData, colorName: e.target.value })}
                placeholder="例如：深蓝色"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hexCode">颜色代码</Label>
              <div className="flex gap-2">
                <Input
                  id="hexCode"
                  type="color"
                  value={colorFormData.hexCode}
                  onChange={(e) => setColorFormData({ ...colorFormData, hexCode: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={colorFormData.hexCode}
                  onChange={(e) => setColorFormData({ ...colorFormData, hexCode: e.target.value })}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsColorDialogOpen(false);
              resetColorForm();
            }}>
              取消
            </Button>
            <Button onClick={handleCreateColor}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
