/**
 * 修改密码页面
 * 用户可以修改自己的密码
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Key } from "lucide-react";

export default function ChangePassword() {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // 修改密码 mutation
  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("密码修改成功");
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (err) => {
      toast.error(err.message || "密码修改失败");
    },
  });

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 验证表单
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      toast.error("请填写所有字段");
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error("新密码长度至少为6位");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("两次输入的新密码不一致");
      return;
    }

    // 提交修改
    changePassword.mutate({
      oldPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">修改密码</h1>
        <p className="text-muted-foreground mt-1">
          为了账号安全，请定期修改密码
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            密码设置
          </CardTitle>
          <CardDescription>
            请输入当前密码和新密码
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">当前密码 *</Label>
              <Input
                id="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={(e) =>
                  setFormData({ ...formData, currentPassword: e.target.value })
                }
                placeholder="请输入当前密码"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">新密码 *</Label>
              <Input
                id="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={(e) =>
                  setFormData({ ...formData, newPassword: e.target.value })
                }
                placeholder="请输入新密码（至少6位）"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认新密码 *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                placeholder="请再次输入新密码"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setFormData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  })
                }
              >
                重置
              </Button>
              <Button type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending ? "修改中..." : "确认修改"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
