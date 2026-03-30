/**
 * 登录页面 - 两步登录流程
 * 第一步：输入公司代码
 * 第二步：输入邮箱和密码
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Building2, Mail, Lock, ArrowLeft } from "lucide-react";

export default function Login() {
  const [location, setLocation] = useLocation();
  
  // 登录步骤：1=输入公司代码，2=输入邮箱密码
  const [step, setStep] = useState<1 | 2>(1);
  
  // 表单数据
  const [companyCode, setCompanyCode] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // 错误信息
  const [error, setError] = useState("");

  // 验证公司代码
  const verifyCompany = trpc.auth.verifyCompany.useMutation({
    onSuccess: (data) => {
      setCompanyName(data.companyName);
      setStep(2);
      setError("");
    },
    onError: (err) => {
      setError(err.message || "公司代码验证失败");
    },
  });

  // 登录
  const login = trpc.auth.login.useMutation({
    onSuccess: () => {
      // 登录成功，跳转到首页
      const returnPath = new URLSearchParams(location.split("?")[1]).get("return") || "/";
      setLocation(returnPath);
      window.location.reload(); // 刷新页面以更新用户状态
    },
    onError: (err) => {
      setError(err.message || "登录失败");
    },
  });

  // 处理第一步：验证公司代码
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyCode.trim()) {
      setError("请输入公司代码");
      return;
    }
    verifyCompany.mutate({ companyCode: companyCode.trim() });
  };

  // 处理第二步：登录
  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("请输入邮箱和密码");
      return;
    }
    login.mutate({
      companyCode: companyCode.trim(),
      email: email.trim(),
      password,
    });
  };

  // 返回第一步
  const handleBackToStep1 = () => {
    setStep(1);
    setEmail("");
    setPassword("");
    setError("");
  };

  const isLoading = verifyCompany.isPending || login.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            {step === 1 ? "欢迎登录" : "登录到您的账户"}
          </CardTitle>
          <CardDescription className="text-center">
            {step === 1
              ? "请输入您的公司代码"
              : `登录到 ${companyName}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 1 ? (
            // 第一步：输入公司代码
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyCode">公司代码</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="companyCode"
                    type="text"
                    placeholder="请输入公司代码"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  请联系管理员获取公司代码
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    验证中...
                  </>
                ) : (
                  "下一步"
                )}
              </Button>
            </form>
          ) : (
            // 第二步：输入邮箱和密码
            <form onSubmit={handleStep2Submit} className="space-y-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBackToStep1}
                className="mb-2"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回
              </Button>

              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登录中...
                  </>
                ) : (
                  "登录"
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>忘记密码？请联系管理员重置</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
