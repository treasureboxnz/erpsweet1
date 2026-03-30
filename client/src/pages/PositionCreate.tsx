import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import Breadcrumb from "@/components/Breadcrumb";

export default function PositionCreate() {
  const [, setLocation] = useLocation();
  const navigate = (path: string) => setLocation(path);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Create position mutation
  const createPosition = trpc.permissionManagement.positions.create.useMutation({
    onSuccess: () => {
      toast.success("岗位创建成功", {
        description: `岗位 "${name}" 已创建`,
      });
      // Navigate back to positions list
      navigate("/users/positions");
    },
    onError: (error: any) => {
      toast.error("创建失败", {
        description: error.message,
      });
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("验证失败", {
        description: "岗位名称不能为空",
      });
      return;
    }

    createPosition.mutate({
      name: name.trim(),
      displayName: name.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/users/positions")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回
              </Button>
              <div>
                <h1 className="text-2xl font-bold">新建岗位</h1>
                <Breadcrumb
                  items={[
                    { label: "用户管理", href: "/users" },
                    { label: "岗位管理", href: "/users/positions" },
                    { label: "新建岗位" },
                  ]}
                />
              </div>
            </div>
            <Button onClick={handleSave} disabled={createPosition.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {createPosition.isPending ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>岗位信息</CardTitle>
              <CardDescription>填写岗位的基本信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name" className="mb-2 block">岗位名称 *</Label>
                <Input
                  id="name"
                  placeholder="例如：销售经理、采购专员、财务主管"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="description" className="mb-2 block">岗位描述</Label>
                <Textarea
                  id="description"
                  placeholder="描述此岗位的职责和要求..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>权限配置</CardTitle>
              <CardDescription>创建岗位后，可在权限管理页面配置此岗位的具体权限</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                岗位创建后，您可以前往 <strong>用户管理 &gt; 权限管理</strong> 页面，为此岗位配置详细的模块访问权限（只读、编辑、删除等）。
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
