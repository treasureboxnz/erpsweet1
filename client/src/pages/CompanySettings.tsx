import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast as sonnerToast } from "sonner";
import { Loader2, Plus, Trash2, Upload, Star } from "lucide-react";
import { storagePut } from "@/lib/storage";

const CURRENCIES = [
  { value: "USD", label: "美元 (USD)" },
  { value: "CNY", label: "人民币 (CNY)" },
  { value: "EUR", label: "欧元 (EUR)" },
  { value: "GBP", label: "英镑 (GBP)" },
  { value: "JPY", label: "日元 (JPY)" },
  { value: "AUD", label: "澳元 (AUD)" },
  { value: "CAD", label: "加元 (CAD)" },
  { value: "HKD", label: "港币 (HKD)" },
  { value: "SGD", label: "新加坡元 (SGD)" },
  { value: "KRW", label: "韩元 (KRW)" },
];

const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "Asia/Shanghai", label: "中国标准时间 (UTC+8)" },
  { value: "America/New_York", label: "美国东部时间 (UTC-5)" },
  { value: "Europe/London", label: "英国时间 (UTC+0)" },
];

const LANGUAGES = [
  { value: "zh-CN", label: "简体中文" },
  { value: "en-US", label: "English" },
];

interface BankAccountForm {
  id?: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  currency: string;
  swiftCode: string;
  iban: string;
  routingNumber: string;
  bankAddress: string;
  isDefault: boolean;
}

export default function CompanySettings() {
  // Using toast pattern
  const toast = ({ title, description, variant }: { title: string; description: string; variant?: string }) => {
    if (variant === 'destructive') {
      sonnerToast.error(`${title} ${description}`);
    } else {
      sonnerToast.success(`${title} ${description}`);
    }
  };
  const utils = trpc.useUtils();

  // 查询公司信息
  const { data: settings, isLoading: settingsLoading } = trpc.companySettings.get.useQuery();
  
  // 查询银行账户列表
  const { data: bankAccounts = [], isLoading: accountsLoading } = trpc.bankAccounts.getCompanyBankAccounts.useQuery();

  // 公司信息表单状态
  const [companyForm, setCompanyForm] = useState({
    companyName: "",
    companyLogo: "",
    contactPhone: "",
    contactEmail: "",
    companyAddress: "",
    postalCode: "",
    invoiceCompanyName: "",
    taxNumber: "",
    brandName: "",
    brandSlogan: "",
    websiteUrl: "",
    defaultCurrency: "USD",
    timezone: "Asia/Shanghai",
    language: "zh-CN",
    // 邮件营销信息
    marketingCompanyName: "",
    marketingEmail: "",
    marketingAddress: "",
    marketingPhone: "",
    marketingWebsite: "",
    // 汇率设置
    exchangeRateUsdCny: 7.2,
    exchangeRateEurCny: 0,
    exchangeRateGbpCny: 0,
  });

  // 银行账户表单状态
  const [bankAccountForms, setBankAccountForms] = useState<BankAccountForm[]>([]);
  const [isAddingAccount, setIsAddingAccount] = useState(false);

  // Logo上传状态
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // 当settings加载完成时，更新表单
  useEffect(() => {
    if (settings) {
      setCompanyForm({
        companyName: settings.companyName || "",
        companyLogo: settings.companyLogo || "",
        contactPhone: settings.contactPhone || "",
        contactEmail: settings.contactEmail || "",
        companyAddress: settings.companyAddress || "",
        postalCode: settings.postalCode || "",
        invoiceCompanyName: settings.invoiceCompanyName || "",
        taxNumber: settings.taxNumber || "",
        brandName: settings.brandName || "",
        brandSlogan: settings.brandSlogan || "",
        websiteUrl: settings.websiteUrl || "",
        defaultCurrency: settings.defaultCurrency || "USD",
        timezone: settings.timezone || "Asia/Shanghai",
        language: settings.language || "zh-CN",
        // 邮件营销信息
        marketingCompanyName: settings.marketingCompanyName || "",
        marketingEmail: settings.marketingEmail || "",
        marketingAddress: settings.marketingAddress || "",
        marketingPhone: settings.marketingPhone || "",
        marketingWebsite: settings.marketingWebsite || "",
        // 汇率设置
        exchangeRateUsdCny: settings.exchangeRateUsdCny ? Number(settings.exchangeRateUsdCny) : 7.2,
        exchangeRateEurCny: settings.exchangeRateEurCny ? Number(settings.exchangeRateEurCny) : 0,
        exchangeRateGbpCny: settings.exchangeRateGbpCny ? Number(settings.exchangeRateGbpCny) : 0,
      });
    }
  }, [settings]);

  // 当bankAccounts加载完成时，更新表单
  useEffect(() => {
    if (bankAccounts.length > 0) {
      setBankAccountForms(
        bankAccounts.map((account: any) => ({
          id: account.id,
          bankName: account.bankName,
          accountName: account.accountName,
          accountNumber: account.accountNumber,
          currency: account.currency,
          swiftCode: account.swiftCode || "",
          iban: account.iban || "",
          routingNumber: account.routingNumber || "",
          bankAddress: account.bankAddress || "",
          isDefault: account.isDefault,
        }))
      );
    }
  }, [bankAccounts]);

  // 更新公司信息mutation
  const updateSettings = trpc.companySettings.update.useMutation({
    onSuccess: () => {
      toast({ title: "成功：", description: "公司信息已更新" });
      utils.companySettings.get.invalidate();
    },
    onError: (error: any) => {
      toast({ title: "失败：", description: error.message, variant: "destructive" });
    },
  });

  // 添加银行账户mutation
  const addBankAccount = trpc.bankAccounts.createCompanyBankAccount.useMutation({
    onSuccess: () => {
      toast({ title: "成功：", description: "银行账户已添加" });
      utils.bankAccounts.getCompanyBankAccounts.invalidate();
      setIsAddingAccount(false);
    },
    onError: (error: any) => {
      toast({ title: "失败：", description: error.message, variant: "destructive" });
    },
  });

  // 更新银行账户mutation
  const updateBankAccount = trpc.bankAccounts.updateCompanyBankAccount.useMutation({
    onSuccess: () => {
      toast({ title: "成功：", description: "银行账户已更新" });
      utils.bankAccounts.getCompanyBankAccounts.invalidate();
    },
    onError: (error: any) => {
      toast({ title: "失败：", description: error.message, variant: "destructive" });
    },
  });

  // 删除银行账户mutation
  const deleteBankAccount = trpc.bankAccounts.deleteCompanyBankAccount.useMutation({
    onSuccess: () => {
      toast({ title: "成功：", description: "银行账户已删除" });
      utils.bankAccounts.getCompanyBankAccounts.invalidate();
    },
    onError: (error: any) => {
      toast({ title: "失败：", description: error.message, variant: "destructive" });
    },
  });

  // Logo上传处理
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith("image/")) {
      toast({ title: "失败：", description: "只能上传图片文件", variant: "destructive" });
      return;
    }

    // 验证文件大小（最大2MB）
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "失败：", description: "图片大小不能超过2MB", variant: "destructive" });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const url = await storagePut(file, `company-logos/${Date.now()}-${file.name}`);
      
      setCompanyForm({ ...companyForm, companyLogo: url });
      toast({ title: "成功：", description: "Logo已上传" });
    } catch (error) {
      toast({ title: "失败：", description: "请稍后重试", variant: "destructive" });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // 保存公司信息
  const handleSaveSettings = () => {
    updateSettings.mutate(companyForm);
  };

  // 添加新银行账户
  const handleAddBankAccount = () => {
    setIsAddingAccount(true);
    setBankAccountForms([
      ...bankAccountForms,
      {
        bankName: "",
        accountName: "",
        accountNumber: "",
        currency: "USD",
        swiftCode: "",
        iban: "",
        routingNumber: "",
        bankAddress: "",
        isDefault: false,
      },
    ]);
  };

  // 保存银行账户
  const handleSaveBankAccount = (index: number) => {
    const account = bankAccountForms[index];
    
    if (!account.bankName || !account.accountName || !account.accountNumber) {
      toast({ title: "失败：", description: "请填写必填字段", variant: "destructive" });
      return;
    }

    if (account.id) {
      // 更新现有账户
      updateBankAccount.mutate({
        id: account.id,
        data: account,
      });
    } else {
      // 添加新账户
      addBankAccount.mutate(account);
    }
  };

  // 删除银行账户
  const handleDeleteBankAccount = (index: number) => {
    const account = bankAccountForms[index];
    
    if (account.id) {
      // 删除已保存的账户
      deleteBankAccount.mutate({ id: account.id });
    } else {
      // 删除未保存的新账户
      setBankAccountForms(bankAccountForms.filter((_, i) => i !== index));
      setIsAddingAccount(false);
    }
  };

  if (settingsLoading || accountsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">公司信息设置</h1>
        <p className="text-muted-foreground mt-2">
          配置公司基本信息、发票抬头和银行账户，用于生成报价单、订单和发票
        </p>
      </div>

      <div className="space-y-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
            <CardDescription>公司名称、Logo和联系方式</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">公司名称 *</Label>
                <Input
                  id="companyName"
                  value={companyForm.companyName}
                  onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                  placeholder="请输入公司名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">联系邮箱</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={companyForm.contactEmail}
                  onChange={(e) => setCompanyForm({ ...companyForm, contactEmail: e.target.value })}
                  placeholder="contact@company.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPhone">联系电话</Label>
                <Input
                  id="contactPhone"
                  value={companyForm.contactPhone}
                  onChange={(e) => setCompanyForm({ ...companyForm, contactPhone: e.target.value })}
                  placeholder="+86 138 0000 0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">邮政编码</Label>
                <Input
                  id="postalCode"
                  value={companyForm.postalCode}
                  onChange={(e) => setCompanyForm({ ...companyForm, postalCode: e.target.value })}
                  placeholder="100000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyAddress">公司地址</Label>
              <Textarea
                id="companyAddress"
                value={companyForm.companyAddress}
                onChange={(e) => setCompanyForm({ ...companyForm, companyAddress: e.target.value })}
                placeholder="请输入公司详细地址"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>公司Logo</Label>
              <div className="flex items-center gap-4">
                {companyForm.companyLogo && (
                  <img
                    src={companyForm.companyLogo}
                    alt="Company Logo"
                    className="h-20 w-20 object-contain border rounded"
                  />
                )}
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={isUploadingLogo}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Label htmlFor="logo-upload">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUploadingLogo}
                      onClick={() => document.getElementById("logo-upload")?.click()}
                      asChild
                    >
                      <span>
                        {isUploadingLogo ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            上传中...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            上传Logo
                          </>
                        )}
                      </span>
                    </Button>
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    支持 JPG、PNG 格式，最大 2MB
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 发票抬头 */}
        <Card>
          <CardHeader>
            <CardTitle>发票抬头</CardTitle>
            <CardDescription>用于生成发票的公司信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceCompanyName">发票公司全称</Label>
                <Input
                  id="invoiceCompanyName"
                  value={companyForm.invoiceCompanyName}
                  onChange={(e) => setCompanyForm({ ...companyForm, invoiceCompanyName: e.target.value })}
                  placeholder="请输入发票公司全称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxNumber">税号</Label>
                <Input
                  id="taxNumber"
                  value={companyForm.taxNumber}
                  onChange={(e) => setCompanyForm({ ...companyForm, taxNumber: e.target.value })}
                  placeholder="请输入税号"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 品牌信息 */}
        <Card>
          <CardHeader>
            <CardTitle>品牌信息</CardTitle>
            <CardDescription>用于报价单和营销材料的品牌信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brandName">品牌名称</Label>
                <Input
                  id="brandName"
                  value={companyForm.brandName}
                  onChange={(e) => setCompanyForm({ ...companyForm, brandName: e.target.value })}
                  placeholder="请输入品牌名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="websiteUrl">网站URL</Label>
                <Input
                  id="websiteUrl"
                  value={companyForm.websiteUrl}
                  onChange={(e) => setCompanyForm({ ...companyForm, websiteUrl: e.target.value })}
                  placeholder="https://www.example.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandSlogan">品牌口号</Label>
              <Input
                id="brandSlogan"
                value={companyForm.brandSlogan}
                onChange={(e) => setCompanyForm({ ...companyForm, brandSlogan: e.target.value })}
                placeholder="请输入品牌口号"
              />
            </div>
          </CardContent>
        </Card>

        {/* 系统设置 */}
        <Card>
          <CardHeader>
            <CardTitle>系统设置</CardTitle>
            <CardDescription>默认货币、时区和语言设置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultCurrency">默认货币</Label>
                <Select
                  value={companyForm.defaultCurrency}
                  onValueChange={(value) => setCompanyForm({ ...companyForm, defaultCurrency: value })}
                >
                  <SelectTrigger id="defaultCurrency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">时区</Label>
                <Select
                  value={companyForm.timezone}
                  onValueChange={(value) => setCompanyForm({ ...companyForm, timezone: value })}
                >
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">语言</Label>
                <Select
                  value={companyForm.language}
                  onValueChange={(value) => setCompanyForm({ ...companyForm, language: value })}
                >
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 汇率设置 */}
        <Card>
          <CardHeader>
            <CardTitle>汇率设置</CardTitle>
            <CardDescription>设置常用货币对人民币的汇率，用于产品定价和成本计算时自动引用</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exchangeRateUsdCny">USD/CNY 汇率</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">1 USD =</span>
                  <Input
                    id="exchangeRateUsdCny"
                    type="number"
                    step="0.0001"
                    value={companyForm.exchangeRateUsdCny || ""}
                    onChange={(e) => setCompanyForm({ ...companyForm, exchangeRateUsdCny: Number(e.target.value) })}
                    className="pl-16"
                    placeholder="7.2000"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">CNY</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="exchangeRateEurCny">EUR/CNY 汇率</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">1 EUR =</span>
                  <Input
                    id="exchangeRateEurCny"
                    type="number"
                    step="0.0001"
                    value={companyForm.exchangeRateEurCny || ""}
                    onChange={(e) => setCompanyForm({ ...companyForm, exchangeRateEurCny: Number(e.target.value) })}
                    className="pl-16"
                    placeholder="7.8000"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">CNY</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="exchangeRateGbpCny">GBP/CNY 汇率</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">1 GBP =</span>
                  <Input
                    id="exchangeRateGbpCny"
                    type="number"
                    step="0.0001"
                    value={companyForm.exchangeRateGbpCny || ""}
                    onChange={(e) => setCompanyForm({ ...companyForm, exchangeRateGbpCny: Number(e.target.value) })}
                    className="pl-16"
                    placeholder="9.1000"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">CNY</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              汇率将自动应用于产品定价页面的成本计算。保存成本时，当前汇率将被记录在历史快照中。
            </p>
          </CardContent>
        </Card>

        {/* 邮件营销信息 */}
        <Card>
          <CardHeader>
            <CardTitle>邮件营销信息</CardTitle>
            <CardDescription>用于邮件推广的公司信息（显示在邮件底部）</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="marketingCompanyName">营销公司名称</Label>
                <Input
                  id="marketingCompanyName"
                  value={companyForm.marketingCompanyName}
                  onChange={(e) => setCompanyForm({ ...companyForm, marketingCompanyName: e.target.value })}
                  placeholder="请输入营销公司名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="marketingEmail">营销邮箱</Label>
                <Input
                  id="marketingEmail"
                  type="email"
                  value={companyForm.marketingEmail}
                  onChange={(e) => setCompanyForm({ ...companyForm, marketingEmail: e.target.value })}
                  placeholder="sales@company.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="marketingPhone">营销电话</Label>
                <Input
                  id="marketingPhone"
                  value={companyForm.marketingPhone}
                  onChange={(e) => setCompanyForm({ ...companyForm, marketingPhone: e.target.value })}
                  placeholder="+86 21 1234 5678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="marketingWebsite">营销网站</Label>
                <Input
                  id="marketingWebsite"
                  value={companyForm.marketingWebsite}
                  onChange={(e) => setCompanyForm({ ...companyForm, marketingWebsite: e.target.value })}
                  placeholder="https://www.company.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="marketingAddress">营销地址</Label>
              <Textarea
                id="marketingAddress"
                value={companyForm.marketingAddress}
                onChange={(e) => setCompanyForm({ ...companyForm, marketingAddress: e.target.value })}
                placeholder="请输入营销地址（显示在邮件底部）"
                rows={3}
              />
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <p className="text-sm text-primary">
                <strong>提示：</strong>这些信息将显示在邮件推广的底部，包括公司名称、地址、联系电话、邮箱和网站。如果不填写，将使用上面“基本信息”中的对应字段。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 银行账户 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>银行账户</CardTitle>
                <CardDescription>用于发票和付款的银行账户信息</CardDescription>
              </div>
              <Button onClick={handleAddBankAccount} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                添加账户
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {bankAccountForms.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                暂无银行账户，点击"添加账户"按钮添加
              </p>
            ) : (
              bankAccountForms.map((account, index) => (
                <Card key={index} className="border-2">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">账户 {index + 1}</h4>
                        {account.isDefault && (
                          <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            <Star className="h-3 w-3 fill-current" />
                            默认账户
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBankAccount(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>银行名称 *</Label>
                        <Input
                          value={account.bankName}
                          onChange={(e) => {
                            const newForms = [...bankAccountForms];
                            newForms[index].bankName = e.target.value;
                            setBankAccountForms(newForms);
                          }}
                          placeholder="中国银行"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>账户名称 *</Label>
                        <Input
                          value={account.accountName}
                          onChange={(e) => {
                            const newForms = [...bankAccountForms];
                            newForms[index].accountName = e.target.value;
                            setBankAccountForms(newForms);
                          }}
                          placeholder="公司全称"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>账户号码 *</Label>
                        <Input
                          value={account.accountNumber}
                          onChange={(e) => {
                            const newForms = [...bankAccountForms];
                            newForms[index].accountNumber = e.target.value;
                            setBankAccountForms(newForms);
                          }}
                          placeholder="6222 0000 0000 0000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>货币类型</Label>
                        <Select
                          value={account.currency}
                          onValueChange={(value) => {
                            const newForms = [...bankAccountForms];
                            newForms[index].currency = value;
                            setBankAccountForms(newForms);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map((currency) => (
                              <SelectItem key={currency.value} value={currency.value}>
                                {currency.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>SWIFT码</Label>
                        <Input
                          value={account.swiftCode}
                          onChange={(e) => {
                            const newForms = [...bankAccountForms];
                            newForms[index].swiftCode = e.target.value;
                            setBankAccountForms(newForms);
                          }}
                          placeholder="BKCHCNBJ"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>IBAN</Label>
                        <Input
                          value={account.iban}
                          onChange={(e) => {
                            const newForms = [...bankAccountForms];
                            newForms[index].iban = e.target.value;
                            setBankAccountForms(newForms);
                          }}
                          placeholder="GB29 NWBK 6016 1331 9268 19"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>路由号码</Label>
                        <Input
                          value={account.routingNumber}
                          onChange={(e) => {
                            const newForms = [...bankAccountForms];
                            newForms[index].routingNumber = e.target.value;
                            setBankAccountForms(newForms);
                          }}
                          placeholder="026009593"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>银行地址</Label>
                      <Textarea
                        value={account.bankAddress}
                        onChange={(e) => {
                          const newForms = [...bankAccountForms];
                          newForms[index].bankAddress = e.target.value;
                          setBankAccountForms(newForms);
                        }}
                        placeholder="请输入银行详细地址"
                        rows={2}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`isDefault-${index}`}
                        checked={account.isDefault}
                        onChange={(e) => {
                          const newForms = [...bankAccountForms];
                          newForms[index].isDefault = e.target.checked;
                          setBankAccountForms(newForms);
                        }}
                        className="h-4 w-4"
                      />
                      <Label htmlFor={`isDefault-${index}`} className="cursor-pointer">
                        设为该货币的默认账户
                      </Label>
                    </div>

                    <Button
                      onClick={() => handleSaveBankAccount(index)}
                      disabled={updateBankAccount.isPending || addBankAccount.isPending}
                      className="w-full"
                    >
                      {updateBankAccount.isPending || addBankAccount.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          保存中...
                        </>
                      ) : (
                        "保存账户"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* 保存按钮 */}
        <div className="flex justify-end gap-4">
          <Button
            onClick={handleSaveSettings}
            disabled={updateSettings.isPending}
            size="lg"
          >
            {updateSettings.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              "保存公司信息"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
