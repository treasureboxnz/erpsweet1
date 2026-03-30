import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import { Link } from "wouter";

export default function PendingApprovals() {
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [comments, setComments] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: approvals, isLoading, refetch } = trpc.quotationApprovals.getPendingApprovals.useQuery();
  const processApproval = trpc.quotationApprovals.processApproval.useMutation({
    onSuccess: () => {
      toast.success(decision === "approved" ? "报价已批准" : "报价已拒绝");
      setDialogOpen(false);
      setSelectedApproval(null);
      setDecision(null);
      setComments("");
      refetch();
    },
    onError: (error) => {
      toast.error(`操作失败： ${error.message}`);
    },
  });

  const handleApprove = (approval: any) => {
    setSelectedApproval(approval);
    setDecision("approved");
    setDialogOpen(true);
  };

  const handleReject = (approval: any) => {
    setSelectedApproval(approval);
    setDecision("rejected");
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!selectedApproval || !decision) return;

    processApproval.mutate({
      approvalId: selectedApproval.id,
      decision,
      comments,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">待审批报价</h1>
        <p className="text-muted-foreground mt-2">审批高价值报价单</p>
      </div>

      {!approvals || approvals.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">暂无待审批报价</h3>
              <p className="text-muted-foreground">所有报价已处理完毕</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {approvals.map((approval) => (
            <Card key={approval.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      <Link href={`/quotations/${approval.quotationId}`} className="hover:underline">{approval.quotationNumber}</Link>
                    </CardTitle>
                    <CardDescription className="mt-2">
                      客户: {approval.customerName}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {approval.currency} {Number(approval.totalAmount).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {new Date(approval.createdAt).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => handleReject(approval)}
                    disabled={processApproval.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    拒绝
                  </Button>
                  <Button
                    onClick={() => handleApprove(approval)}
                    disabled={processApproval.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    批准
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision === "approved" ? "批准报价" : "拒绝报价"}
            </DialogTitle>
            <DialogDescription>
              报价单号: {selectedApproval?.quotationNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">审批意见 (可选)</label>
              <Textarea
                placeholder="请输入审批意见..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={processApproval.isPending}
            >
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={processApproval.isPending}
              variant={decision === "rejected" ? "destructive" : "default"}
            >
              {processApproval.isPending ? "处理中..." : "确认"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
