import { Badge } from "@/components/ui/badge";

interface ApprovalBadgeProps {
  status: "pending" | "approved" | "rejected" | null;
  className?: string;
}

export function ApprovalBadge({ status, className }: ApprovalBadgeProps) {
  if (!status) return null;

  const variants = {
    pending: { label: "待审批", variant: "secondary" as const },
    approved: { label: "已批准", variant: "default" as const },
    rejected: { label: "已拒绝", variant: "destructive" as const },
  };

  const config = variants[status];

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
