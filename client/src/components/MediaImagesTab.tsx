import { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface MediaImagesTabProps {
  productId: number;
  sku: string;
}

export default function MediaImagesTab({ productId, sku }: MediaImagesTabProps) {
  const [images, setImages] = useState<Array<{ id: number; imageUrl: string; sortOrder: number }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Fetch product images
  const { data: productImages } = trpc.productImages.getByProductId.useQuery({ productId });

  useEffect(() => {
    if (productImages) {
      setImages(productImages);
    }
  }, [productImages]);

  // Upload images mutation
  const uploadImagesMutation = trpc.productImages.addImages.useMutation({
    onSuccess: () => {
      utils.productImages.getByProductId.invalidate({ productId });
      toast.success("Images uploaded successfully");
      setIsUploading(false);
    },
    onError: (error: any) => {
      toast.error(`Upload failed: ${error.message}`);
      setIsUploading(false);
    },
  });

  // Delete image mutation
  const deleteImageMutation = trpc.productImages.deleteImage.useMutation({
    onSuccess: () => {
      utils.productImages.getByProductId.invalidate({ productId });
      toast.success("Image deleted");
    },
    onError: (error: any) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  // Update sort order mutation
  const updateSortOrderMutation = trpc.productImages.updateOrder.useMutation({
    onSuccess: () => {
      utils.productImages.getByProductId.invalidate({ productId });
    },
    onError: (error: any) => {
      toast.error(`Sort update failed: ${error.message}`);
    },
  });

  // Upload image mutation (direct upload)
  const uploadImageMutation = trpc.productImages.uploadImage.useMutation({
    onSuccess: () => {
      utils.productImages.getByProductId.invalidate({ productId });
    },
    onError: (error: any) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"],
    },
    onDrop: async (acceptedFiles) => {
      setIsUploading(true);

      try {
        // Upload files one by one
        for (const file of acceptedFiles) {
          // Convert file to base64
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onload = () => {
              const base64 = reader.result as string;
              // Remove data URL prefix
              const base64Data = base64.split(',')[1];
              resolve(base64Data);
            };
            reader.readAsDataURL(file);
          });

          const fileData = await base64Promise;

          // Upload to server
          await uploadImageMutation.mutateAsync({
            productId,
            productSku: sku,
            fileName: file.name,
            fileData,
            mimeType: file.type,
          });
        }

        toast.success("Images uploaded successfully");
        setIsUploading(false);
      } catch (error) {
        toast.error("Failed to upload images");
        setIsUploading(false);
      }
    },
  });

  // Handle drag start
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);

    setImages(newImages);
    setDraggedIndex(index);
  };

  // Handle drag end
  const handleDragEnd = () => {
    if (draggedIndex !== null) {
      // Update sort order in database
      const imageOrders = images.map((img, idx) => ({
        id: img.id,
        sortOrder: idx,
        isPrimary: idx === 0,
      }));

      updateSortOrderMutation.mutate({
        productId,
        imageOrders,
      });
    }
    setDraggedIndex(null);
  };

  // Handle delete image
  const handleDeleteImage = (imageId: number) => {
    if (confirm("Are you sure you want to delete this image?")) {
      deleteImageMutation.mutate({ productId, imageId });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Images</CardTitle>
        <CardDescription>Upload and manage product images</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
            ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
            ${isUploading ? "opacity-50 pointer-events-none" : ""}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          {isUploading ? (
            <p className="text-gray-600">Uploading...</p>
          ) : isDragActive ? (
            <p className="text-blue-600">Drop the images here...</p>
          ) : (
            <>
              <p className="text-gray-600 mb-2">Drag and drop images here, or click to select</p>
              <p className="text-sm text-gray-400">Supports: PNG, JPG, WEBP, GIF</p>
            </>
          )}
        </div>

        {/* Images Grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div
                key={image.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  relative group rounded-lg overflow-hidden border-2 cursor-move
                  ${draggedIndex === index ? "opacity-50" : ""}
                  ${index === 0 ? "border-blue-500" : "border-gray-200"}
                `}
              >
                <img
                  src={image.imageUrl}
                  alt={`Product image ${index + 1}`}
                  className="w-full h-48 object-cover"
                />
                
                {/* Primary Image Badge */}
                {index === 0 && (
                  <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                    Primary
                  </div>
                )}

                {/* Drag Handle */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="w-5 h-5 text-white drop-shadow-lg" />
                </div>

                {/* Delete Button */}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDeleteImage(image.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {images.length === 0 && !isUploading && (
          <div className="text-center py-8 text-gray-400">
            No images uploaded yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
