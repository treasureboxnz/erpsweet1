import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Shield, Save, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

// 模块定义
const modules = [
  { id: "customer_management", name: "客户管理", description: "管理客户信息、联系人和跟进记录" },
  { id: "product_management", name: "产品管理", description: "管理产品信息、分类和库存" },
  { id: "order_management", name: "订单管理", description: "管理订单信息和订单状态" },
  { id: "report_center", name: "报表中心", description: "查看和导出各类报表" },
  { id: "user_management", name: "用户管理", description: "管理用户账户和权限" },
  { id: "operation_logs", name: "操作日志", description: "查看系统操作日志" },
];

// 权限类型定义
const permissionTypes = [
  { id: "read", name: "只读", description: "查看数据" },
  { id: "write", name: "编辑", description: "创建和修改数据" },
  { id: "download", name: "下载", description: "导出数据" },
  { id: "delete", name: "删除", description: "删除数据" },
  { id: "all", name: "全部", description: "拥有所有权限" },
];

export default function Permissions() {
  const { data: matrix, isLoading, refetch } = trpc.permissionManagement.permissions.getMatrix.useQuery();
  const updateMutation = trpc.permissionManagement.permissions.updateMatrix.useMutation();
  const [pendingChanges, setPendingChanges] = useState<Map<string, Set<string>>>(new Map());

  // 构建权限映射表
  const permissionMap = useMemo(() => {
    if (!matrix) return new Map();
    
    const map = new Map<string, Set<string>>();
    matrix.forEach((item: any) => {
      item.permissions.forEach((perm: any) => {
        const key = `${item.position.id}-${perm.module}`;
        if (!map.has(key)) {
          map.set(key, new Set());
        }
        map.get(key)!.add(perm.permissionType);
      });
    });
    
    return map;
  }, [matrix]);

  // 检查是否有权限
  const hasPermission = (positionId: number, module: string, permissionType: string) => {
    const key = `${positionId}-${module}`;
    const changedPerms = pendingChanges.get(key);
    
    if (changedPerms) {
      return changedPerms.has(permissionType);
    }
    
    return permissionMap.get(key)?.has(permissionType) || false;
  };

  // 切换权限
  const togglePermission = (positionId: number, module: string, permissionType: string) => {
    const key = `${positionId}-${module}`;
    const currentPerms = pendingChanges.get(key) || new Set(permissionMap.get(key) || []);
    
    if (permissionType === "all") {
      // 如果选择"全部"，清除其他权限，只保留"all"
      if (currentPerms.has("all")) {
        currentPerms.delete("all");
      } else {
        currentPerms.clear();
        currentPerms.add("all");
      }
    } else {
      // 如果选择其他权限，先移除"all"
      currentPerms.delete("all");
      
      if (currentPerms.has(permissionType)) {
        currentPerms.delete(permissionType);
      } else {
        currentPerms.add(permissionType);
      }
    }
    
    const newPendingChanges = new Map(pendingChanges);
    newPendingChanges.set(key, currentPerms);
    setPendingChanges(newPendingChanges);
  };

  // 保存所有更改
  const handleSaveAll = async () => {
    if (pendingChanges.size === 0) {
      toast.info("没有需要保存的更改");
      return;
    }

    try {
      const promises = Array.from(pendingChanges.entries()).map(([key, perms]) => {
        const [positionId, module] = key.split("-");
        return updateMutation.mutateAsync({
          positionId: Number(positionId),
          module: module as any,
          permissionTypes: Array.from(perms) as any[],
        });
      });

      await Promise.all(promises);
      toast.success("权限配置已保存");
      setPendingChanges(new Map());
      refetch();
    } catch (error: any) {
      toast.error(error.message || "保存失败");
    }
  };

  // 重置更改
  const handleReset = () => {
    setPendingChanges(new Map());
    toast.info("已重置所有未保存的更改");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">权限管理</h1>
          <p className="text-muted-foreground mt-2">配置各岗位在不同模块中的权限</p>
        </div>
        <div className="flex gap-2">
          {pendingChanges.size > 0 && (
            <>
              <Button variant="outline" onClick={handleReset}>
                重置
              </Button>
              <Button onClick={handleSaveAll} disabled={updateMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {updateMutation.isPending ? "保存中..." : `保存更改 (${pendingChanges.size})`}
              </Button>
            </>
          )}
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>权限说明：</strong>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li><strong>只读</strong>：可以查看数据，但不能修改</li>
            <li><strong>编辑</strong>：可以创建和修改数据</li>
            <li><strong>下载</strong>：可以导出数据</li>
            <li><strong>删除</strong>：可以删除数据</li>
            <li><strong>全部</strong>：拥有该模块的所有权限</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
                  {matrix?.map((item: any) => (
          <Card key={item.position.id}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>{item.position.displayName}</CardTitle>
                {item.position.isSystem && (
                  <Badge variant="secondary">系统岗位</Badge>
                )}
              </div>
              <CardDescription>
                {item.position.description || "暂无描述"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modules.map((module) => (
                  <div
                    key={module.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{module.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {module.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {permissionTypes.map((permType) => {
                        const checked = hasPermission(
                          item.position.id,
                          module.id,
                          permType.id
                        );
                        const isChanged = pendingChanges.has(
                          `${item.position.id}-${module.id}`
                        );

                        return (
                          <div
                            key={permType.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`${item.position.id}-${module.id}-${permType.id}`}
                              checked={checked}
                              onCheckedChange={() =>
                                togglePermission(
                                  item.position.id,
                                  module.id,
                                  permType.id
                                )
                              }
                              disabled={item.position.isSystem && item.position.name === "super_admin"}
                            />
                            <label
                              htmlFor={`${item.position.id}-${module.id}-${permType.id}`}
                              className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer ${
                                isChanged ? "text-primary" : ""
                              }`}
                            >
                              {permType.name}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
