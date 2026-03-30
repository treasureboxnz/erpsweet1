import { useParams, useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, Palette } from "lucide-react";
import { useState } from "react";

export function SupplierDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const supplierId = parseInt(params.id || "0");

  // Query supplier details
  const { data: suppliers } = trpc.materials.suppliers.list.useQuery({});
  const supplier = suppliers?.find((s: any) => s.id === supplierId);

  // Query boards for this supplier
  const { data: boards, isLoading: boardsLoading } = trpc.materials.boards.list.useQuery({
    supplierId,
  });

  // Query colors for this supplier (through boards)
  const { data: colors, isLoading: colorsLoading } = trpc.materials.colors.list.useQuery({
    supplierId,
  });

  if (!supplier) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">供应商不存在</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setLocation("/materials")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回材料管理
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/materials")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{supplier.name}</h1>
            <p className="text-muted-foreground">供应商详情</p>
          </div>
        </div>
        <Badge variant={supplier.status === "active" ? "default" : "secondary"}>
          {supplier.status === "active" ? "启用" : "停用"}
        </Badge>
      </div>

      {/* Supplier Information */}
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
          <CardDescription>供应商的基本信息和联系方式</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">供应商编号</p>
              <p className="font-medium">{supplier.code || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">联系人</p>
              <p className="font-medium">{supplier.contactPerson || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">联系电话</p>
              <p className="font-medium">{supplier.contactPhone || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">联系邮箱</p>
              <p className="font-medium">{supplier.contactEmail || "-"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">地址</p>
              <p className="font-medium">{supplier.address || "-"}</p>
            </div>
            {supplier.notes && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">备注</p>
                <p className="font-medium">{supplier.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">布板数量</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{boards?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              该供应商提供的布板总数
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">颜色数量</CardTitle>
            <Palette className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{colors?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              该供应商提供的布料颜色总数
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Boards List */}
      <Card>
        <CardHeader>
          <CardTitle>布板列表</CardTitle>
          <CardDescription>该供应商提供的所有布板</CardDescription>
        </CardHeader>
        <CardContent>
          {boardsLoading ? (
            <p className="text-center py-8 text-muted-foreground">加载中...</p>
          ) : !boards?.length ? (
            <p className="text-center py-8 text-muted-foreground">暂无布板数据</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>缩略图</TableHead>
                    <TableHead>布板编号</TableHead>
                    <TableHead>布板名称</TableHead>
                    <TableHead>材质类型</TableHead>
                    <TableHead>价格(¥/米)</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boards.map((board: any) => (
                    <TableRow key={board.id}>
                      <TableCell>
                        {board.imageUrl ? (
                          <img
                            src={board.imageUrl}
                            alt={board.boardNumber}
                            className="h-12 w-12 object-cover rounded"
                          />
                        ) : (
                          <div className="h-12 w-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                            无图片
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{board.boardNumber}</TableCell>
                      <TableCell>{board.boardName || "-"}</TableCell>
                      <TableCell>{board.materialType || "-"}</TableCell>
                      <TableCell>{board.pricePerMeter ? `¥${board.pricePerMeter}` : "-"}</TableCell>
                      <TableCell>
                        <Badge variant={board.status === "active" ? "default" : "secondary"}>
                          {board.status === "active" ? "启用" : "停用"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Colors List */}
      <Card>
        <CardHeader>
          <CardTitle>布料颜色列表</CardTitle>
          <CardDescription>该供应商提供的所有布料颜色</CardDescription>
        </CardHeader>
        <CardContent>
          {colorsLoading ? (
            <p className="text-center py-8 text-muted-foreground">加载中...</p>
          ) : !colors?.length ? (
            <p className="text-center py-8 text-muted-foreground">暂无颜色数据</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>缩略图</TableHead>
                    <TableHead>完整编号</TableHead>
                    <TableHead>颜色编号</TableHead>
                    <TableHead>颜色名称</TableHead>
                    <TableHead>布板编号</TableHead>
                    <TableHead>库存(米)</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {colors.map((color: any) => (
                    <TableRow key={color.id}>
                      <TableCell>
                        {color.imageUrl ? (
                          <img
                            src={color.imageUrl}
                            alt={color.colorCode}
                            className="h-12 w-12 object-cover rounded"
                          />
                        ) : (
                          <div className="h-12 w-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                            无图片
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{color.fullCode}</TableCell>
                      <TableCell>{color.colorCode}</TableCell>
                      <TableCell>{color.colorName || "-"}</TableCell>
                      <TableCell>{color.board?.boardNumber || "-"}</TableCell>
                      <TableCell>{color.stockQuantity || 0}</TableCell>
                      <TableCell>
                        <Badge variant={color.status === "active" ? "default" : "secondary"}>
                          {color.status === "active" ? "启用" : "停用"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
