import { useState, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Upload, Trash2, FileText, FolderPlus, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { storagePut } from '@/lib/storage';
import FilePreviewDialog from './FilePreviewDialog';

interface AttachmentsSectionProps {
  companyId: number;
}

export default function AttachmentsSection({ companyId }: AttachmentsSectionProps) {
  const utils = trpc.useUtils();
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [uploadingCategory, setUploadingCategory] = useState<number | null>(null);
  const [deletingAttachment, setDeletingAttachment] = useState<number | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
  const [dragOverCategory, setDragOverCategory] = useState<number | null>(null);

  // Query attachment categories and files
  const { data: categories } = trpc.customerManagement.attachments.categories.useQuery({ companyId });
  const { data: attachments } = trpc.customerManagement.attachments.list.useQuery({ companyId });

  // Mutations
  const createCategory = trpc.customerManagement.attachments.createCategory.useMutation({
    onSuccess: () => {
      toast.success('分类创建成功');
      utils.customerManagement.attachments.categories.invalidate({ companyId });
      setIsAddCategoryOpen(false);
      setNewCategoryName('');
    },
    onError: (error: any) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const uploadAttachment = trpc.customerManagement.attachments.upload.useMutation({
    onSuccess: () => {
      toast.success('文件上传成功');
      utils.customerManagement.attachments.list.invalidate({ companyId });
      setUploadingCategory(null);
    },
    onError: (error: any) => {
      toast.error(`上传失败: ${error.message}`);
      setUploadingCategory(null);
    },
  });

  const deleteAttachment = trpc.customerManagement.attachments.delete.useMutation({
    onSuccess: () => {
      toast.success('文件已删除');
      utils.customerManagement.attachments.list.invalidate({ companyId });
      setDeletingAttachment(null);
    },
    onError: (error: any) => {
      toast.error(`删除失败: ${error.message}`);
      setDeletingAttachment(null);
    },
  });

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast.error('请输入分类名称');
      return;
    }
    createCategory.mutate({
      companyId,
      name: newCategoryName.trim(),
    });
  };

  const handleFilesUpload = async (categoryId: number, files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Check file types and sizes
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf'
    ];
    
    // Validate all files
    for (const file of fileArray) {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`文件 "${file.name}" 格式不支持，仅支持图片格式（JPG, PNG, GIF, WEBP）和PDF文件`);
        return;
      }
      
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`文件 "${file.name}" 大小超过50MB限制`);
        return;
      }
    }

    setUploadingCategory(categoryId);
    
    let successCount = 0;
    let failCount = 0;

    // Upload files sequentially
    for (const file of fileArray) {
      try {
        // Generate unique file key
        const fileKey = `company-${companyId}/attachments/${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;
        
        // Upload to S3 (parameter order: file, path)
        const fileUrl = await storagePut(file, fileKey);

        // Save to database
        await new Promise<void>((resolve, reject) => {
          uploadAttachment.mutate({
            categoryId,
            companyId,
            fileName: file.name,
            fileUrl: fileUrl,
            fileKey: fileKey,
            fileSize: file.size,
            mimeType: file.type,
          }, {
            onSuccess: () => {
              successCount++;
              resolve();
            },
            onError: (error) => {
              failCount++;
              reject(error);
            }
          });
        });
      } catch (error) {
        console.error('File upload error:', error);
        failCount++;
      }
    }
    
    setUploadingCategory(null);
    
    // Show summary toast
    if (successCount > 0 && failCount === 0) {
      toast.success(`成功上传 ${successCount} 个文件`);
    } else if (successCount > 0 && failCount > 0) {
      toast.warning(`成功上传 ${successCount} 个文件，${failCount} 个失败`);
    } else {
      toast.error('文件上传失败，请重试');
    }
    
    // Refresh the list
    utils.customerManagement.attachments.list.invalidate({ companyId });

    // Reset file input
    const fileInput = document.getElementById(`file-input-${categoryId}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleFileSelect = async (categoryId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await handleFilesUpload(categoryId, files);
  };

  const handleDragOver = (e: React.DragEvent, categoryId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCategory(categoryId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCategory(null);
  };

  const handleDrop = async (e: React.DragEvent, categoryId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCategory(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleFilesUpload(categoryId, files);
    }
  };

  const handleDeleteAttachment = (attachmentId: number) => {
    deleteAttachment.mutate({ attachmentId });
  };

  const toggleFileSelection = (fileId: number) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const toggleSelectAll = (categoryId: number) => {
    const categoryAttachments = attachments?.filter(
      (att) => att.categoryId === categoryId && !att.deletedAt
    ) || [];
    
    const categoryFileIds = categoryAttachments.map(att => att.id);
    const allSelected = categoryFileIds.every(id => selectedFiles.has(id));
    
    const newSelection = new Set(selectedFiles);
    if (allSelected) {
      // Deselect all
      categoryFileIds.forEach(id => newSelection.delete(id));
    } else {
      // Select all
      categoryFileIds.forEach(id => newSelection.add(id));
    }
    setSelectedFiles(newSelection);
  };

  const handleBatchDelete = async () => {
    if (selectedFiles.size === 0) return;
    
    const fileIds = Array.from(selectedFiles);
    let successCount = 0;
    let failCount = 0;

    for (const fileId of fileIds) {
      try {
        await new Promise<void>((resolve, reject) => {
          deleteAttachment.mutate({ attachmentId: fileId }, {
            onSuccess: () => {
              successCount++;
              resolve();
            },
            onError: (error) => {
              failCount++;
              reject(error);
            }
          });
        });
      } catch (error) {
        console.error('Delete error:', error);
      }
    }

    // Clear selection
    setSelectedFiles(new Set());

    // Show summary
    if (successCount > 0 && failCount === 0) {
      toast.success(`成功删除 ${successCount} 个文件`);
    } else if (successCount > 0 && failCount > 0) {
      toast.warning(`成功删除 ${successCount} 个文件，${failCount} 个失败`);
    } else {
      toast.error('删除失败，请重试');
    }

    // Refresh list
    utils.customerManagement.attachments.list.invalidate({ companyId });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      {/* Add Category Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setIsAddCategoryOpen(true)}
          className="gap-2"
          variant="outline"
        >
          <FolderPlus className="h-4 w-4" />
          添加分类
        </Button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories?.map((category: any) => {
          const categoryAttachments = attachments?.filter(
            (att) => att.categoryId === category.id && !att.deletedAt
          ) || [];

          return (
            <div
              key={category.id}
              className={`border rounded-lg p-4 space-y-4 transition-all ${
                dragOverCategory === category.id
                  ? 'border-blue-500 bg-blue-50 border-2'
                  : 'border-gray-200'
              }`}
              onDragOver={(e) => handleDragOver(e, category.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, category.id)}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-lg">{category.name}</h3>
                <span className="text-sm text-gray-500">
                  {categoryAttachments.length} 个文件
                </span>
              </div>

              {/* Upload Button */}
              <div>
                <input
                  id={`file-input-${category.id}`}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(category.id, e)}
                  disabled={uploadingCategory === category.id}
                />
                <Button
                  onClick={() => document.getElementById(`file-input-${category.id}`)?.click()}
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  disabled={uploadingCategory === category.id}
                >
                  <Upload className="h-4 w-4" />
                  {uploadingCategory === category.id ? '上传中...' : '上传文件'}
                </Button>
              </div>

              {/* Batch Actions */}
              {categoryAttachments.length > 0 && (
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleSelectAll(category.id)}
                    className="text-xs"
                  >
                    {categoryAttachments.every(att => selectedFiles.has(att.id)) ? '取消全选' : '全选'}
                  </Button>
                  {selectedFiles.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBatchDelete}
                      className="text-xs gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      批量删除 ({selectedFiles.size})
                    </Button>
                  )}
                </div>
              )}

              {/* Files List */}
              <div className="space-y-2">
                {categoryAttachments.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">暂无文件</p>
                ) : (
                  categoryAttachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(attachment.id)}
                          onChange={() => toggleFileSelection(attachment.id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => setPreviewFile({
                              url: attachment.fileUrl,
                              name: attachment.fileName,
                              type: attachment.mimeType || 'application/octet-stream'
                            })}
                            className="text-sm text-blue-600 hover:underline truncate block text-left"
                          >
                            {attachment.fileName}
                          </button>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(attachment.fileSize || 0)} · {new Date(attachment.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingAttachment(attachment.id)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}

        {categories?.length === 0 && (
          <div className="col-span-2 text-center py-12">
            <FolderPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">暂无分类</p>
            <p className="text-sm text-gray-400">点击"添加分类"按钮创建第一个分类</p>
          </div>
        )}
      </div>

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加附件分类</DialogTitle>
            <DialogDescription>
              创建新的附件分类，例如：水洗标、布标、唛头、吊卡等
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">分类名称 *</Label>
              <Input
                id="categoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="例如: 水洗标"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleAddCategory}
              disabled={createCategory.isPending || !newCategoryName.trim()}
            >
              {createCategory.isPending ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deletingAttachment !== null}
        onOpenChange={(open) => !open && setDeletingAttachment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个文件吗？删除后可以在"备份"标签页中恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingAttachment && handleDeleteAttachment(deletingAttachment)}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* File Preview Dialog */}
      {previewFile && (
        <FilePreviewDialog
          open={!!previewFile}
          onClose={() => setPreviewFile(null)}
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          fileType={previewFile.type}
        />
      )}
    </div>
  );
}
