import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: number;
    name: string;
    email: string;
    role: "operator" | "admin" | "super_admin";
    status: "active" | "suspended" | "deleted";
  };
  onSuccess: () => void;
}

export function UserEditDialog({ open, onOpenChange, user, onSuccess }: UserEditDialogProps) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<"operator" | "admin" | "super_admin">(user.role);
  const [status, setStatus] = useState<"active" | "suspended" | "deleted">(user.status);

  const updateUser = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("用户信息更新成功");
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  // 当user prop变化时更新表单状态
  useEffect(() => {
    setName(user.name);
    setRole(user.role);
    setStatus(user.status);
  }, [user]);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("用户姓名不能为空");
      return;
    }

    updateUser.mutate({
      id: user.id,
      name: name.trim(),
      role,
      status,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>编辑用户信息</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                value={user.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">邮箱不可修改</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">姓名 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入用户姓名"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">角色 *</Label>
              <Select value={role} onValueChange={(value: "operator" | "admin" | "super_admin") => setRole(value)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operator">普通用户</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                  <SelectItem value="super_admin">超级管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">状态 *</Label>
              <Select value={status} onValueChange={(value: "active" | "suspended" | "deleted") => setStatus(value)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">正常</SelectItem>
                  <SelectItem value="suspended">暂停</SelectItem>
                  <SelectItem value="deleted">已删除</SelectItem>
                </SelectContent>
              </Select>
            </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateUser.isPending}
          >
            取消
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={updateUser.isPending}>
            {updateUser.isPending ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
