import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Mail, Phone, Globe, MapPin, Star } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

export default function SupplierDetail() {
  const params = useParams();
  const supplierId = parseInt(params.id || "0");

  const { data: supplier, isLoading } = trpc.suppliers.getById.useQuery({ id: supplierId });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">加载中...</div>;
  }

  if (!supplier) {
    return <div className="flex items-center justify-center h-64">供应商不存在</div>;
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      active: { label: "活跃", variant: "default" as const },
      inactive: { label: "停用", variant: "secondary" as const },
      suspended: { label: "暂停", variant: "destructive" as const },
    };
    const config = statusMap[status as keyof typeof statusMap] || statusMap.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "供应商管理", href: "/suppliers" },
          { label: supplier.supplierName },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/suppliers">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{supplier.supplierName}</h1>
              {getStatusBadge(supplier.status)}
            </div>
            {supplier.supplierCode && (
              <p className="text-gray-500 mt-1">供应商编号: {supplier.supplierCode}</p>
            )}
          </div>
        </div>
        <Link href={`/suppliers/${supplierId}/edit`}>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            编辑
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {supplier.contactPerson && (
              <div>
                <div className="text-sm text-gray-500">联系人</div>
                <div className="text-base font-medium">{supplier.contactPerson}</div>
              </div>
            )}
            
            {supplier.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">联系电话</div>
                  <div className="text-base font-medium">{supplier.phone}</div>
                </div>
              </div>
            )}
            
            {supplier.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">邮箱</div>
                  <div className="text-base font-medium">{supplier.email}</div>
                </div>
              </div>
            )}
            
            {supplier.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">网站</div>
                  <a
                    href={supplier.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base font-medium text-primary hover:underline"
                  >
                    {supplier.website}
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 地址信息 */}
        <Card>
          <CardHeader>
            <CardTitle>地址信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(supplier.address || supplier.city || supplier.province || supplier.country) && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <div className="text-sm text-gray-500">地址</div>
                  <div className="text-base font-medium space-y-1">
                    {supplier.address && <div>{supplier.address}</div>}
                    <div>
                      {[supplier.city, supplier.province, supplier.country]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                    {supplier.postalCode && <div>邮编: {supplier.postalCode}</div>}
                  </div>
                </div>
              </div>
            )}
            
            {!supplier.address && !supplier.city && !supplier.province && !supplier.country && (
              <div className="text-sm text-gray-500">暂无地址信息</div>
            )}
          </CardContent>
        </Card>

        {/* 商业信息 */}
        <Card>
          <CardHeader>
            <CardTitle>商业信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {supplier.taxId && (
              <div>
                <div className="text-sm text-gray-500">税号</div>
                <div className="text-base font-medium">{supplier.taxId}</div>
              </div>
            )}
            
            {supplier.businessLicense && (
              <div>
                <div className="text-sm text-gray-500">营业执照号</div>
                <div className="text-base font-medium">{supplier.businessLicense}</div>
              </div>
            )}
            
            <div>
              <div className="text-sm text-gray-500">评级</div>
              <div className="flex items-center gap-2 mt-1">
                {renderStars(supplier.rating || 0)}
                <span className="text-sm text-gray-600">
                  {supplier.rating ? `${supplier.rating}/5` : "未评级"}
                </span>
              </div>
            </div>
            
            {supplier.currency && (
              <div>
                <div className="text-sm text-gray-500">默认货币</div>
                <div className="text-base font-medium">{supplier.currency}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 付款与备注 */}
        <Card>
          <CardHeader>
            <CardTitle>付款与备注</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {supplier.paymentTerms && (
              <div>
                <div className="text-sm text-gray-500">付款条款</div>
                <div className="text-base font-medium">{supplier.paymentTerms}</div>
              </div>
            )}
            
            {supplier.notes && (
              <div>
                <div className="text-sm text-gray-500">备注</div>
                <div className="text-base font-medium whitespace-pre-wrap">{supplier.notes}</div>
              </div>
            )}
            
            {!supplier.paymentTerms && !supplier.notes && (
              <div className="text-sm text-gray-500">暂无付款条款和备注信息</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
