import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface OrderStatusCardProps {
  orderId: number;
  currentStatus?: string | null;
  onStatusUpdate?: (status: string) => void;
}

export function OrderStatusCard({
  orderId,
  currentStatus,
  onStatusUpdate,
}: OrderStatusCardProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>(currentStatus || "");

  // 获取订单状态选项
  const { data: statusOptions = [] } = trpc.attributes.getAll.useQuery({
    fieldName: "order_status",
  });

  // 更新订单状态
  const updateOrderMutation = trpc.orders.update.useMutation({
    onSuccess: () => {
      toast.success("订单状态更新成功");
      if (onStatusUpdate) {
        onStatusUpdate(selectedStatus);
      }
    },
    onError: (error) => {
      toast.error(`更新失败：${error.message}`);
    },
  });

  // 同步currentStatus到selectedStatus
  useEffect(() => {
    setSelectedStatus(currentStatus || "");
  }, [currentStatus]);

  // 保存订单状态
  const handleSave = () => {
    updateOrderMutation.mutate({
      id: orderId,
      customStatus: selectedStatus || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>订单状态</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>当前状态</Label>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="选择订单状态" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.id} value={option.name}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleSave}
          disabled={updateOrderMutation.isPending || !selectedStatus}
          className="w-full"
        >
          {updateOrderMutation.isPending ? "保存中..." : "保存状态"}
        </Button>
      </CardContent>
    </Card>
  );
}
