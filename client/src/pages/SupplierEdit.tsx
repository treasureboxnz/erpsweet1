import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "wouter";
import Breadcrumb from "@/components/Breadcrumb";
import { toast } from "sonner";
import SupplierBankAccounts from "@/components/SupplierBankAccounts";

export default function SupplierEdit() {
  const params = useParams();
  const supplierId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Form state
  const [supplierName, setSupplierName] = useState("");
  const [supplierCode, setSupplierCode] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [website, setWebsite] = useState("");
  const [taxId, setTaxId] = useState("");
  const [businessLicense, setBusinessLicense] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [currency, setCurrency] = useState("CNY");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"active" | "inactive" | "suspended">("active");

  // Fetch supplier data
  const { data: supplier, isLoading } = trpc.suppliers.getById.useQuery({ id: supplierId });

  // Populate form when supplier data is loaded
  useEffect(() => {
    if (supplier) {
      setSupplierName(supplier.supplierName || "");
      setSupplierCode(supplier.supplierCode || "");
      setContactPerson(supplier.contactPerson || "");
      setEmail(supplier.email || "");
      setPhone(supplier.phone || "");
      setAddress(supplier.address || "");
      setCity(supplier.city || "");
      setProvince(supplier.province || "");
      setCountry(supplier.country || "");
      setPostalCode(supplier.postalCode || "");
      setWebsite(supplier.website || "");
      setTaxId(supplier.taxId || "");
      setBusinessLicense(supplier.businessLicense || "");
      setRating(supplier.rating || 0);
      setPaymentTerms(supplier.paymentTerms || "");
      setCurrency(supplier.currency || "CNY");
      setNotes(supplier.notes || "");
      setStatus(supplier.status || "active");
    }
  }, [supplier]);

  const updateMutation = trpc.suppliers.update.useMutation({
    onSuccess: () => {
      toast.success("供应商更新成功");
      utils.suppliers.list.invalidate();
      utils.suppliers.getById.invalidate({ id: supplierId });
      setLocation(`/suppliers/${supplierId}`);
    },
    onError: (error) => {
      toast.error(`更新失败：${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!supplierName.trim()) {
      toast.error("请输入供应商名称");
      return;
    }

    updateMutation.mutate({
      id: supplierId,
      supplierName,
      supplierCode: supplierCode || undefined,
      contactPerson: contactPerson || undefined,
      email: email || undefined,
      phone: phone || undefined,
      address: address || undefined,
      city: city || undefined,
      province: province || undefined,
      country: country || undefined,
      postalCode: postalCode || undefined,
      website: website || undefined,
      taxId: taxId || undefined,
      businessLicense: businessLicense || undefined,
      rating: rating || undefined,
      paymentTerms: paymentTerms || undefined,
      currency: currency || undefined,
      notes: notes || undefined,
      status,
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">加载中...</div>;
  }

  if (!supplier) {
    return <div className="flex items-center justify-center h-64">供应商不存在</div>;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "供应商管理", href: "/suppliers" },
          { label: supplier.supplierName, href: `/suppliers/${supplierId}` },
          { label: "编辑" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/suppliers/${supplierId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">编辑供应商</h1>
            <p className="text-gray-500 mt-1">修改供应商基本信息</p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? "保存中..." : "保存"}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplierName">供应商名称 *</Label>
                <Input
                  id="supplierName"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="请输入供应商名称"
                  required
                />
              </div>
              <div>
                <Label htmlFor="supplierCode">供应商编号</Label>
                <Input
                  id="supplierCode"
                  value={supplierCode}
                  onChange={(e) => setSupplierCode(e.target.value)}
                  placeholder="请输入供应商编号"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactPerson">联系人</Label>
                <Input
                  id="contactPerson"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="请输入联系人姓名"
                />
              </div>
              <div>
                <Label htmlFor="phone">联系电话</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入联系电话"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="请输入邮箱地址"
                />
              </div>
              <div>
                <Label htmlFor="website">网站</Label>
                <Input
                  id="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 地址信息 */}
        <Card>
          <CardHeader>
            <CardTitle>地址信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address">详细地址</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="请输入详细地址"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">城市</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="请输入城市"
                />
              </div>
              <div>
                <Label htmlFor="province">省份/州</Label>
                <Input
                  id="province"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="请输入省份"
                />
              </div>
              <div>
                <Label htmlFor="country">国家</Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="请输入国家"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="postalCode">邮政编码</Label>
                <Input
                  id="postalCode"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="请输入邮政编码"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 商业信息 */}
        <Card>
          <CardHeader>
            <CardTitle>商业信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="taxId">税号</Label>
                <Input
                  id="taxId"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="请输入税号"
                />
              </div>
              <div>
                <Label htmlFor="businessLicense">营业执照号</Label>
                <Input
                  id="businessLicense"
                  value={businessLicense}
                  onChange={(e) => setBusinessLicense(e.target.value)}
                  placeholder="请输入营业执照号"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="rating">评级 (0-5)</Label>
                <Select value={rating.toString()} onValueChange={(v) => setRating(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">未评级</SelectItem>
                    <SelectItem value="1">1星</SelectItem>
                    <SelectItem value="2">2星</SelectItem>
                    <SelectItem value="3">3星</SelectItem>
                    <SelectItem value="4">4星</SelectItem>
                    <SelectItem value="5">5星</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="currency">默认货币</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CNY">人民币 (CNY)</SelectItem>
                    <SelectItem value="USD">美元 (USD)</SelectItem>
                    <SelectItem value="EUR">欧元 (EUR)</SelectItem>
                    <SelectItem value="GBP">英镑 (GBP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">状态</Label>
                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">活跃</SelectItem>
                    <SelectItem value="inactive">停用</SelectItem>
                    <SelectItem value="suspended">暂停</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="paymentTerms">付款条款</Label>
              <Input
                id="paymentTerms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="例如：30天账期、预付50%等"
              />
            </div>

            <div>
              <Label htmlFor="notes">备注</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="请输入备注信息"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* 银行账户 */}
        <Card>
          <CardHeader>
            <CardTitle>银行账户</CardTitle>
          </CardHeader>
          <CardContent>
            <SupplierBankAccounts supplierId={supplierId} />
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
