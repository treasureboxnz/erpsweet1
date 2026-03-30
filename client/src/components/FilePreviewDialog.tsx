import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface FilePreviewDialogProps {
  open: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  fileType: string;
}

export default function FilePreviewDialog({
  open,
  onClose,
  fileUrl,
  fileName,
  fileType,
}: FilePreviewDialogProps) {
  const isImage = fileType.startsWith('image/');
  const isPDF = fileType === 'application/pdf';

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="truncate pr-4">{fileName}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                下载
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isImage && (
            <div className="flex items-center justify-center p-4">
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}

          {isPDF && (
            <iframe
              src={fileUrl}
              className="w-full h-[70vh] border-0 rounded-lg"
              title={fileName}
            />
          )}

          {!isImage && !isPDF && (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="text-gray-500 mb-4">此文件类型不支持预览</p>
              <Button onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" />
                下载文件
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
