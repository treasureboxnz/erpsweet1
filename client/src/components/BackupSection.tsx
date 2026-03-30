import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
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
import { RotateCcw, FileText, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

interface BackupSectionProps {
  companyId: number;
}

export default function BackupSection({ companyId }: BackupSectionProps) {
  const utils = trpc.useUtils();
  const [restoringAttachment, setRestoringAttachment] = useState<number | null>(null);

  // Query deleted attachments
  const { data: deletedAttachments } = trpc.customerManagement.attachments.list.useQuery({
    companyId,
    includeDeleted: true,
  });

  // Restore mutation
  const restoreAttachment = trpc.customerManagement.attachments.restore.useMutation({
    onSuccess: () => {
      toast.success('附件已恢复');
      utils.customerManagement.attachments.list.invalidate({ companyId });
      setRestoringAttachment(null);
    },
    onError: (error: any) => {
      toast.error(`恢复失败: ${error.message}`);
      setRestoringAttachment(null);
    },
  });

  const handleRestoreAttachment = (attachmentId: number) => {
    restoreAttachment.mutate({ attachmentId });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Filter only deleted attachments
  const deleted = deletedAttachments?.filter(att => att.deletedAt) || [];

  return (
    <div className="space-y-6">
      {deleted.length === 0 ? (
        <div className="text-center py-12">
          <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">暂无已删除的附件</p>
          <p className="text-sm text-gray-400">删除的附件将在此处显示，可以恢复</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            共 {deleted.length} 个已删除的附件
          </p>
          <div className="space-y-2">
            {deleted.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">
                        {attachment.fileName}
                      </p>
                      {attachment.categoryName && (
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                          {attachment.categoryName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                      <span>{formatFileSize(attachment.fileSize || 0)}</span>
                      <span>·</span>
                      <span>上传于: {new Date(attachment.uploadedAt).toLocaleDateString()}</span>
                      {attachment.deletedAt && (
                        <>
                          <span>·</span>
                          <span className="text-red-600">
                            删除于: {new Date(attachment.deletedAt).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRestoringAttachment(attachment.id)}
                  className="gap-2 text-green-600 hover:text-green-800 hover:bg-green-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  恢复
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Restore Confirmation Dialog */}
      <AlertDialog
        open={restoringAttachment !== null}
        onOpenChange={(open) => !open && setRestoringAttachment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认恢复</AlertDialogTitle>
            <AlertDialogDescription>
              确定要恢复这个附件吗？恢复后将重新显示在附件列表中。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => restoringAttachment && handleRestoreAttachment(restoringAttachment)}
              className="bg-green-600 hover:bg-green-700"
            >
              恢复
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
