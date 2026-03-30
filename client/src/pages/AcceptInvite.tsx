import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, Building2 } from "lucide-react";
import { getLoginUrl } from "@/const";

export default function AcceptInvite() {
  const [, params] = useRoute("/invite/:token");
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "expired">("loading");
  const [message, setMessage] = useState("");

  const { data: invitation, isLoading, error } = trpc.users.getInvitationByToken.useQuery(
    { token: params?.token || "" },
    { enabled: !!params?.token }
  );

  const acceptMutation = trpc.users.acceptInvitation.useMutation({
    onSuccess: () => {
      setStatus("success");
      setMessage("邀请已接受，请使用您的邮箱登录");
      // Redirect to login after 3 seconds
      setTimeout(() => {
        window.location.href = getLoginUrl();
      }, 3000);
    },
    onError: (error) => {
      setStatus("error");
      setMessage(error.message);
    },
  });

  useEffect(() => {
    if (invitation) {
      if (invitation.status === "expired") {
        setStatus("expired");
        setMessage("邀请链接已过期");
      } else if (invitation.status === "accepted") {
        setStatus("success");
        setMessage("此邀请已被使用");
      }
    }
  }, [invitation]);

  useEffect(() => {
    if (error) {
      setStatus("error");
      setMessage(error.message);
    }
  }, [error]);

  const handleAccept = () => {
    if (params?.token) {
      acceptMutation.mutate({ token: params.token });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-400 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="w-10 h-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Casaviva ERP 系统</CardTitle>
          <CardDescription>用户邀请</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <p className="text-muted-foreground">正在验证邀请...</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">邀请已接受</h3>
                <p className="text-muted-foreground">{message}</p>
                <p className="text-sm text-muted-foreground">正在跳转到登录页面...</p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <XCircle className="h-16 w-16 text-red-600" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">邀请无效</h3>
                <p className="text-muted-foreground">{message}</p>
              </div>
              <Button onClick={() => setLocation("/")} className="mt-4">
                返回首页
              </Button>
            </div>
          )}

          {status === "expired" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <XCircle className="h-16 w-16 text-orange-600" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">邀请已过期</h3>
                <p className="text-muted-foreground">{message}</p>
                <p className="text-sm text-muted-foreground">请联系管理员重新发送邀请</p>
              </div>
              <Button onClick={() => setLocation("/")} className="mt-4">
                返回首页
              </Button>
            </div>
          )}

          {status === "loading" && invitation && invitation.status === "pending" && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-blue-900">邀请信息</p>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>邮箱：{invitation.email}</p>
                  <p>角色：{invitation.role === "admin" ? "管理员" : invitation.role === "super_admin" ? "超级管理员" : "操作员"}</p>
                  <p>过期时间：{new Date(invitation.expiresAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-yellow-900">重要提示</p>
                  <div className="text-sm text-yellow-700 space-y-1">
                    <p>• 您的登录邮箱：<strong className="text-yellow-900">{invitation.email}</strong></p>
                    <p>• 接受邀请后，请使用 <strong>Manus OAuth</strong> 登录</p>
                    <p>• 首次登录时，系统将引导您设置密码</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  点击下方按钮接受邀请，然后使用您的邮箱登录系统
                </p>
                <Button
                  onClick={handleAccept}
                  disabled={acceptMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {acceptMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    "接受邀请"
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
