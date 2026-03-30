import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";
import { Upload, User, Mail, Shield, Calendar } from "lucide-react";
import { storagePut } from "@/lib/storage";

export default function Profile() {
  const { user, refresh } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || user?.name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [isUploading, setIsUploading] = useState(false);

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("资料已更新");
      refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSave = () => {
    if (!user) return;
    updateMutation.mutate({
      id: user.id,
      name: displayName,
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("图片大小不能超过2MB");
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast.error("只能上传图片文件");
      return;
    }

    setIsUploading(true);
    try {
      const url = await storagePut(file, `avatars/${user?.id}-${Date.now()}`);
      setAvatarUrl(url);
      toast.success("头像已上传");
    } catch (error) {
      toast.error("上传失败，请重试");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: "超级管理员",
      admin: "管理员",
      operator: "操作员",
    };
    return labels[role] || role;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">个人资料</h1>
        <p className="text-gray-500 mt-1">管理您的个人信息和偏好设置</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-primary text-white text-2xl">
                {(displayName || user.name || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Upload className="h-4 w-4" />
                  {isUploading ? "上传中..." : "更换头像"}
                </div>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                />
              </Label>
              <p className="text-sm text-gray-500 mt-2">
                支持 JPG、PNG 格式，最大 2MB
              </p>
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">显示名称</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="输入您的显示名称"
            />
            <p className="text-sm text-gray-500">
              这是在系统中显示的名称
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "保存中..." : "保存更改"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>账户信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Mail className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm text-gray-500">邮箱地址</p>
              <p className="font-medium">{user.email || "未设置"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Shield className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm text-gray-500">用户角色</p>
              <Badge variant={user.role === "super_admin" ? "destructive" : "default"}>
                {getRoleLabel(user.role)}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <User className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm text-gray-500">登录方式</p>
              <p className="font-medium">{user.loginMethod || "Manus OAuth"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Calendar className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm text-gray-500">加入时间</p>
              <p className="font-medium">
                {new Date(user.createdAt).toLocaleDateString("zh-CN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
