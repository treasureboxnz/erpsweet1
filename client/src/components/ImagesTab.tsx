import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDropzone } from "react-dropzone";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Upload, Star, Trash2, Eye, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

interface ImagesTabProps {
  variantId: number;
}

interface VariantImage {
  id: number;
  imageUrl: string;
  fileName: string;
  fileSize: number;
  sortOrder: number;
  isPrimary: boolean;
}

// 可排序的图片项组件
function SortableImageItem({
  image,
  onSetPrimary,
  onDelete,
  onPreview,
}: {
  image: VariantImage;
  onSetPrimary: (id: number) => void;
  onDelete: (id: number) => void;
  onPreview: (image: VariantImage) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group bg-card border rounded-lg overflow-hidden"
    >
      {/* 拖拽手柄 */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-sm p-1 rounded cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="5" r="1" />
          <circle cx="9" cy="12" r="1" />
          <circle cx="9" cy="19" r="1" />
          <circle cx="15" cy="5" r="1" />
          <circle cx="15" cy="12" r="1" />
          <circle cx="15" cy="19" r="1" />
        </svg>
      </div>

      {/* 主图标记 */}
      {image.isPrimary && (
        <div className="absolute top-2 right-2 z-10 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
          <Star className="h-3 w-3 fill-current" />
          主图
        </div>
      )}

      {/* 图片 */}
      <div className="aspect-square bg-muted">
        <img
          src={image.imageUrl}
          alt={image.fileName}
          className="w-full h-full object-cover"
        />
      </div>

      {/* 操作按钮 */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onPreview(image)}
          className="h-8 w-8 p-0"
        >
          <Eye className="h-4 w-4" />
        </Button>
        {!image.isPrimary && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onSetPrimary(image.id)}
            className="h-8 w-8 p-0"
          >
            <Star className="h-4 w-4" />
          </Button>
        )}
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onDelete(image.id)}
          className="h-8 w-8 p-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* 文件名 */}
      <div className="p-2 bg-background">
        <p className="text-xs text-muted-foreground truncate">{image.fileName}</p>
        <p className="text-xs text-muted-foreground">
          {(image.fileSize / 1024).toFixed(1)} KB
        </p>
      </div>
    </div>
  );
}

export default function ImagesTab({ variantId }: ImagesTabProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<VariantImage | null>(null);
  const [deleteImageId, setDeleteImageId] = useState<number | null>(null);

  const { data: imagesData, refetch } = trpc.productVariants.getImages.useQuery({
    variantId,
  });

  const uploadImageMutation = trpc.productVariants.uploadImage.useMutation({
    onSuccess: () => {
      toast.success("图片上传成功");
      refetch();
    },
    onError: (error) => {
      toast.error(`上传失败: ${error.message}`);
    },
  });

  const updateImageOrderMutation = trpc.productVariants.updateImageOrder.useMutation({
    onSuccess: () => {
      toast.success("排序已保存");
      refetch();
    },
    onError: (error) => {
      toast.error(`排序失败: ${error.message}`);
    },
  });

  const setPrimaryImageMutation = trpc.productVariants.setPrimaryImage.useMutation({
    onSuccess: () => {
      toast.success("主图设置成功");
      refetch();
    },
    onError: (error) => {
      toast.error(`设置失败: ${error.message}`);
    },
  });

  const deleteImageMutation = trpc.productVariants.deleteImage.useMutation({
    onSuccess: () => {
      toast.success("图片删除成功");
      refetch();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  const images = imagesData || [];
  const [localImages, setLocalImages] = useState<VariantImage[]>([]);

  // 当数据加载完成时，更新本地状态
  useState(() => {
    if (images.length > 0) {
      setLocalImages(images);
    }
  });

  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 文件拖拽上传
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setIsUploading(true);

      try {
        for (const file of acceptedFiles) {
          // 检查文件大小（限制16MB）
          if (file.size > 16 * 1024 * 1024) {
            toast.error(`${file.name} 文件大小超过16MB`);
            continue;
          }

          // 读取文件为base64
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const base64 = await base64Promise;

          // 上传图片
          await uploadImageMutation.mutateAsync({
            variantId,
            fileName: file.name,
            fileSize: file.size,
            imageData: base64,
          });
        }
      } catch (error) {
        console.error("Upload error:", error);
      } finally {
        setIsUploading(false);
      }
    },
    [variantId, uploadImageMutation]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    multiple: true,
  });

  // 处理拖拽排序
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localImages.findIndex((img) => img.id === active.id);
      const newIndex = localImages.findIndex((img) => img.id === over.id);

      const newImages = arrayMove(localImages, oldIndex, newIndex);
      setLocalImages(newImages);

      // 保存新的排序到后端
      const imageOrders = newImages.map((img, index) => ({
        id: img.id,
        sortOrder: index,
      }));

      updateImageOrderMutation.mutate({
        variantId,
        imageOrders,
      });
    }
  };

  // 设置主图
  const handleSetPrimary = (imageId: number) => {
    setPrimaryImageMutation.mutate({
      variantId,
      imageId,
    });
  };

  // 删除图片
  const handleDelete = (imageId: number) => {
    setDeleteImageId(imageId);
  };

  const confirmDelete = () => {
    if (deleteImageId) {
      deleteImageMutation.mutate({
        imageId: deleteImageId,
      });
      setDeleteImageId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 上传区域 */}
      <Card>
        <CardHeader>
          <CardTitle>上传图片</CardTitle>
          <CardDescription>支持拖拽上传，或点击选择文件（最大16MB）</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg font-medium">松开鼠标上传图片...</p>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">拖拽图片到这里，或点击选择文件</p>
                <p className="text-sm text-muted-foreground">
                  支持 PNG、JPG、JPEG、GIF、WebP 格式
                </p>
              </div>
            )}
          </div>
          {isUploading && (
            <p className="text-sm text-muted-foreground mt-4">正在上传图片...</p>
          )}
        </CardContent>
      </Card>

      {/* 图片列表 */}
      <Card>
        <CardHeader>
          <CardTitle>图片列表</CardTitle>
          <CardDescription>
            拖拽图片可调整排序，第一张图片为主图。点击星标可设置其他图片为主图。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {images.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">暂无图片，请上传图片</p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={images.map((img) => img.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {images.map((image) => (
                    <SortableImageItem
                      key={image.id}
                      image={image}
                      onSetPrimary={handleSetPrimary}
                      onDelete={handleDelete}
                      onPreview={setPreviewImage}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* 图片预览对话框 */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewImage?.fileName}</DialogTitle>
            <DialogDescription>
              文件大小: {previewImage ? (previewImage.fileSize / 1024).toFixed(1) : 0} KB
            </DialogDescription>
          </DialogHeader>
          <div className="relative w-full">
            <img
              src={previewImage?.imageUrl}
              alt={previewImage?.fileName}
              className="w-full h-auto max-h-[70vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deleteImageId} onOpenChange={() => setDeleteImageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这张图片吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
