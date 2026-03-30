/**
 * 用户管理页面 - 多租户版本
 * 管理员可以添加、编辑、删除用户，重置密码
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Trash2, Key, Search, Edit } from "lucide-react";
import { toast } from "sonner";
import { UserEditDialog } from "@/components/users/UserEditDialog";

export default function UserManagement() {
  // 用户列表
  const { data: users, isLoading, refetch } = trpc.userManagementNew.list.useQuery();

  // 对话框状态
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: number;
    name: string;
    email: string;
    role: "operator" | "admin" | "super_admin";
    status: "active" | "suspended" | "deleted";
  } | null>(null);

  // 表单数据
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
    role: "operator" as "operator" | "admin" | "super_admin",
  });

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // 创建用户
  const createUser = trpc.userManagementNew.create.useMutation({
    onSuccess: () => {
      toast.success("用户创建成功");
      setAddDialogOpen(false);
      setFormData({ email: "", name: "", password: "", role: "operator" });
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "创建用户失败");
    },
  });

  // 重置密码
  const resetPassword = trpc.userManagementNew.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("密码重置成功");
      setResetPasswordDialogOpen(false);
      setNewPassword("");
      setSelectedUserId(null);
    },
    onError: (err) => {
      toast.error(err.message || "重置密码失败");
    },
  });

  // 删除用户
  const deleteUser = trpc.userManagementNew.delete.useMutation({
    onSuccess: () => {
      toast.success("用户已删除");
      setDeleteDialogOpen(false);
      setSelectedUserId(null);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "删除用户失败");
    },
  });

  // 处理添加用户
  const handleAddUser = () => {
    if (!formData.email || !formData.name || !formData.password) {
      toast.error("请填写所有必填字段");
      return;
    }
    createUser.mutate(formData);
  };

  // 处理重置密码
  const handleResetPassword = () => {
    if (!selectedUserId || !newPassword) {
      toast.error("请输入新密码");
      return;
    }
    resetPassword.mutate({ userId: selectedUserId, newPassword });
  };

  // 处理删除用户
  const handleDeleteUser = () => {
    if (!selectedUserId) return;
    deleteUser.mutate({ userId: selectedUserId });
  };

  // 过滤用户
  const filteredUsers = users?.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (user.name && user.name.toLowerCase().includes(query)) ||
      (user.email && user.email.toLowerCase().includes(query))
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">用户管理</h1>
          <p className="text-muted-foreground mt-1">
            管理系统用户，添加新用户或重置密码
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          添加用户
        </Button>
      </div>

      {/* 搜索栏 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索用户名或邮箱..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* 用户列表 */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>姓名</TableHead>
              <TableHead>邮箱</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  加载中...
                </TableCell>
              </TableRow>
            ) : filteredUsers && filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email || "暂无"}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role === "admin" ? "管理员" : "普通用户"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === "active" ? "default" : "destructive"}>
                      {user.status === "active" ? "正常" : "已停用"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedUser({
                          id: user.id,
                          name: user.name || "",
                          email: user.email || "",
                          role: user.role as "operator" | "admin" | "super_admin",
                          status: user.status as "active" | "suspended" | "deleted",
                        });
                        setEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setResetPasswordDialogOpen(true);
                      }}
                    >
                      <Key className="h-4 w-4 mr-1" />
                      重置密码
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      删除
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "未找到匹配的用户" : "暂无用户"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 添加用户对话框 */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加新用户</DialogTitle>
            <DialogDescription>
              创建新用户账号，设置初始密码
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">姓名 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入姓名"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱 *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">初始密码 *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="请设置初始密码"
              />
              <p className="text-sm text-muted-foreground">
                建议密码长度至少8位
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">角色 *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: "operator" | "admin" | "super_admin") =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operator">普通用户</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                  <SelectItem value="super_admin">超级管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={createUser.isPending}
            >
              {createUser.isPending ? "创建中..." : "创建用户"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重置密码对话框 */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重置用户密码</DialogTitle>
            <DialogDescription>
              为用户设置新密码
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">新密码</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetPasswordDialogOpen(false);
                setNewPassword("");
                setSelectedUserId(null);
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resetPassword.isPending}
            >
              {resetPassword.isPending ? "重置中..." : "确认重置"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除用户确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除用户？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。用户的所有数据将被永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedUserId(null);
              }}
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUser.isPending ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 编辑用户对话框 */}
      {selectedUser && (
        <UserEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          user={selectedUser}
          onSuccess={() => {
            refetch();
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}
