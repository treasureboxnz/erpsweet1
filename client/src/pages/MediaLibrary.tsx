import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Upload, Search, Copy, Edit, Trash2, Check, X } from "lucide-react";
import ERPLayout from "@/components/ERPLayout";
import { toast } from "sonner";
import { compressImage, formatFileSize, calculateCompressionRate } from "@/lib/imageCompression";

export default function MediaLibrary() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editingFile, setEditingFile] = useState<any>(null);
  const [deletingFile, setDeletingFile] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAltText, setEditAltText] = useState("");
  const [uploading, setUploading] = useState(false);

  const utils = trpc.useUtils();

  // 获取媒体文件列表
  const { data: mediaData, isLoading } = trpc.mediaLibrary.getAll.useQuery({
    page,
    pageSize: 20,
    search: search || undefined,
  });

  // 上传文件mutation
  const uploadMutation = trpc.mediaLibrary.upload.useMutation({
    onSuccess: () => {
      toast.success("文件上传成功");
      utils.mediaLibrary.getAll.invalidate();
      setUploading(false);
    },
    onError: (error) => {
      toast.error(`上传失败: ${error.message}`);
      setUploading(false);
    },
  });

  // 更新文件mutation
  const updateMutation = trpc.mediaLibrary.update.useMutation({
    onSuccess: () => {
      toast.success("文件信息已更新");
      utils.mediaLibrary.getAll.invalidate();
      setEditingFile(null);
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  // 删除文件mutation
  const deleteMutation = trpc.mediaLibrary.delete.useMutation({
    onSuccess: () => {
      toast.success("文件已删除");
      utils.mediaLibrary.getAll.invalidate();
      setDeletingFile(null);
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  // 处理文件上传
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setUploading(true);

      for (const file of acceptedFiles) {
        try {
          // 检查文件大小（16MB限制）
          if (file.size > 16 * 1024 * 1024) {
            toast.error(`文件 ${file.name} 超过16MB限制`);
            continue;
          }

          // 压缩图片（SVG/GIF会自动跳过）
          const originalSize = file.size;
          const compressedFile = await compressImage(file, {
            quality: 0.8,
            maxWidth: 1920,
            maxHeight: 1920,
          });
          const compressedSize = compressedFile.size;

          // 显示压缩结果
          if (compressedSize < originalSize) {
            const rate = calculateCompressionRate(originalSize, compressedSize);
            toast.success(
              `${file.name} 压缩成功：${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} (减少${rate}%)`
            );
          }

          // 读取压缩后的文件为base64
          const reader = new FileReader();
          reader.onload = () => {
            const base64Data = reader.result as string;
            uploadMutation.mutate({
              fileName: compressedFile.name,
              fileSize: compressedFile.size,
              imageData: base64Data,
              mimeType: compressedFile.type,
            });
          };
          reader.onerror = () => {
            toast.error(`读取文件 ${file.name} 失败`);
          };
          reader.readAsDataURL(compressedFile);
        } catch (error) {
          toast.error(`处理文件 ${file.name} 失败: ${error}`);
        }
      }

      setUploading(false);
    },
    [uploadMutation]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
    },
    multiple: true,
  });

  // 复制URL到剪贴板
  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL已复制到剪贴板");
  };

  // 打开编辑对话框
  const openEditDialog = (file: any) => {
    setEditingFile(file);
    setEditTitle(file.title || "");
    setEditAltText(file.altText || "");
  };

  // 保存编辑
  const saveEdit = () => {
    if (!editingFile) return;
    updateMutation.mutate({
      id: editingFile.id,
      title: editTitle,
      altText: editAltText,
    });
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  // 格式化日期
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString("zh-CN");
  };

  return (
    <ERPLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold">媒体库</h1>
          <p className="text-muted-foreground mt-2">管理您的图片和媒体文件</p>
        </div>

        {/* 上传区域 */}
        <Card>
          <CardHeader>
            <CardTitle>上传文件</CardTitle>
            <CardDescription>支持拖拽上传，或点击选择文件（最大16MB）</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              {uploading ? (
                <p className="text-lg font-medium">上传中...</p>
              ) : isDragActive ? (
                <p className="text-lg font-medium">松开鼠标上传文件</p>
              ) : (
                <>
                  <p className="text-lg font-medium mb-2">拖拽图片到这里，或点击选择文件</p>
                  <p className="text-sm text-muted-foreground">
                    支持 PNG、JPG、JPEG、GIF、WebP、SVG 格式
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 搜索栏 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索文件名或标题..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {search && (
                <Button variant="outline" onClick={() => setSearch("")}>
                  <X className="w-4 h-4 mr-2" />
                  清除
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 文件列表 */}
        <Card>
          <CardHeader>
            <CardTitle>媒体文件</CardTitle>
            <CardDescription>
              共 {mediaData?.total || 0} 个文件
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">加载中...</div>
            ) : mediaData?.files.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                暂无文件，请上传文件
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {mediaData?.files.map((file) => (
                  <div
                    key={file.id}
                    className="group relative border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {/* 图片预览 */}
                    <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                      <img
                        src={file.fileUrl}
                        alt={file.altText || file.fileName}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* 文件信息 */}
                    <div className="p-3 space-y-2">
                      <p className="text-sm font-medium truncate" title={file.title || file.fileName}>
                        {file.title || file.fileName}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatFileSize(file.fileSize)}</span>
                        <span>{formatDate(file.createdAt)}</span>
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 p-0"
                        onClick={() => copyToClipboard(file.fileUrl)}
                        title="复制URL"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 p-0"
                        onClick={() => openEditDialog(file)}
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 w-8 p-0"
                        onClick={() => setDeletingFile(file)}
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 分页 */}
            {mediaData && mediaData.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  上一页
                </Button>
                <span className="text-sm text-muted-foreground">
                  第 {page} / {mediaData.totalPages} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === mediaData.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  下一页
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 编辑对话框 */}
      <Dialog open={!!editingFile} onOpenChange={() => setEditingFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑文件信息</DialogTitle>
            <DialogDescription>修改文件的标题和描述信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">标题</Label>
              <Input
                id="title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="输入文件标题"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="altText">Alt文本（图片描述）</Label>
              <Textarea
                id="altText"
                value={editAltText}
                onChange={(e) => setEditAltText(e.target.value)}
                placeholder="输入图片描述，用于SEO和无障碍访问"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFile(null)}>
              取消
            </Button>
            <Button onClick={saveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deletingFile} onOpenChange={() => setDeletingFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除文件 "{deletingFile?.fileName}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingFile && deleteMutation.mutate({ id: deletingFile.id })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ERPLayout>
  );
}
