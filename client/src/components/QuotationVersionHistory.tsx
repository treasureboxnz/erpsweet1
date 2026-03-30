import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { History, RotateCcw } from "lucide-react";
import { toast as showToast } from "sonner";

interface QuotationVersionHistoryProps {
  quotationId: number;
}

export function QuotationVersionHistory({ quotationId }: QuotationVersionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  const { data: versions, refetch } = trpc.quotationVersions.getVersionHistory.useQuery(
    { quotationId },
    { enabled: isOpen }
  );

  const { data: versionDetail } = trpc.quotationVersions.getVersionDetail.useQuery(
    { versionId: selectedVersion! },
    { enabled: !!selectedVersion }
  );

  const rollbackMutation = trpc.quotationVersions.rollbackToVersion.useMutation({
    onSuccess: (data) => {
      showToast.success(data.message);
      setIsOpen(false);
      window.location.reload(); // Reload to show updated quotation
    },
    onError: (error: any) => {
      showToast.error(`回滚失败: ${error.message}`);
    },
  });

  const handleRollback = (versionId: number, versionNumber: number) => {
    if (confirm(`确定要回滚到版本 ${versionNumber} 吗？这将覆盖当前数据。`)) {
      rollbackMutation.mutate({ versionId });
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
      >
        <History className="w-4 h-4 mr-2" />
        查看历史版本
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>报价历史版本</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {versions && versions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                暂无历史版本
              </p>
            )}

            {versions && versions.map((version: any) => (
              <Card key={version.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">版本 {version.versionNumber}</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(version.createdAt).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    {version.changeDescription && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {version.changeDescription}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedVersion(
                        selectedVersion === version.id ? null : version.id
                      )}
                    >
                      {selectedVersion === version.id ? "收起" : "查看详情"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRollback(version.id, version.versionNumber)}
                      disabled={rollbackMutation.isPending}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      回滚
                    </Button>
                  </div>
                </div>

                {selectedVersion === version.id && versionDetail && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-semibold mb-2">版本快照</h4>
                    <div className="bg-muted p-4 rounded-md">
                      <pre className="text-xs overflow-x-auto">
                        {JSON.stringify(versionDetail.snapshotData, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
