import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar, FileText, Upload, Ship, Package, FileCheck } from "lucide-react";

interface OrderTrackingTabProps {
  orderId: number;
}

export function OrderTrackingTab({ orderId }: OrderTrackingTabProps) {
  const [inspectionDate, setInspectionDate] = useState("");
  const [inspectionReportUrl, setInspectionReportUrl] = useState("");
  const [estimatedShippingDate, setEstimatedShippingDate] = useState("");
  const [actualShippingDate, setActualShippingDate] = useState("");
  const [etd, setEtd] = useState("");
  const [eta, setEta] = useState("");
  const [shippingPort, setShippingPort] = useState("");
  const [containerNumber, setContainerNumber] = useState("");
  const [billOfLadingNumber, setBillOfLadingNumber] = useState("");

  // 查询出货港口属性列表
  const { data: shippingPorts = [] } = trpc.attributes.getAll.useQuery({
    category: "shipping_port",
  });

  // 查询订单跟进信息
  const { data: tracking, refetch } = trpc.orderTracking.getByOrderId.useQuery({ orderId });
  
  // 创建或更新订单跟进信息
  const createOrUpdateMutation = trpc.orderTracking.createOrUpdate.useMutation({
    onSuccess: () => {
      toast.success("订单跟进信息已保存");
      refetch();
    },
    onError: (error) => {
      toast.error(`保存失败: ${error.message}`);
    },
  });

  // 加载现有数据
  useEffect(() => {
    if (tracking) {
      setInspectionDate(tracking.inspectionDate ? new Date(tracking.inspectionDate).toISOString().split('T')[0] : "");
      setInspectionReportUrl(tracking.inspectionReportUrl || "");
      setEstimatedShippingDate(tracking.estimatedShippingDate ? new Date(tracking.estimatedShippingDate).toISOString().split('T')[0] : "");
      setActualShippingDate(tracking.actualShippingDate ? new Date(tracking.actualShippingDate).toISOString().split('T')[0] : "");
      setEtd(tracking.etd ? new Date(tracking.etd).toISOString().split('T')[0] : "");
      setEta(tracking.eta ? new Date(tracking.eta).toISOString().split('T')[0] : "");
      setShippingPort(tracking.shippingPort || "");
      setContainerNumber(tracking.containerNumber || "");
      setBillOfLadingNumber(tracking.billOfLadingNumber || "");
    }
  }, [tracking]);

  const handleSave = () => {
    createOrUpdateMutation.mutate({
      orderId,
      inspectionDate: inspectionDate || null,
      inspectionReportUrl: inspectionReportUrl || null,
      estimatedShippingDate: estimatedShippingDate || null,
      actualShippingDate: actualShippingDate || null,
      etd: etd || null,
      eta: eta || null,
      shippingPort: shippingPort || null,
      containerNumber: containerNumber || null,
      billOfLadingNumber: billOfLadingNumber || null,
    });
  };

  // 文件上传mutation
  const uploadMutation = trpc.uploadInspectionReport.upload.useMutation({
    onSuccess: (data) => {
      setInspectionReportUrl(data.url);
      toast.success("文件上传成功");
    },
    onError: (error) => {
      toast.error(`文件上传失败: ${error.message}`);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("仅支持Excel、Word或PDF文件");
      return;
    }

    // 验证文件大小（最大16MB）
    if (file.size > 16 * 1024 * 1024) {
      toast.error("文件大小不能超过16MB");
      return;
    }

    try {
      // 将文件转换为base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        const base64Content = base64Data.split(',')[1]; // 移除data:xxx;base64,前缀

        // 调用tRPC mutation上传文件
        uploadMutation.mutate({
          fileName: file.name,
          fileData: base64Content,
          fileType: file.type,
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("文件读取失败");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>订单跟进信息</CardTitle>
          <CardDescription>记录订单的物流和验货信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 验货信息 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">验货信息</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inspectionDate">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  验货日期
                </Label>
                <Input
                  id="inspectionDate"
                  type="date"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inspectionReport">
                  <FileText className="inline h-4 w-4 mr-1" />
                  验货报告
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="inspectionReport"
                    type="file"
                    accept=".xlsx,.xls,.docx,.doc"
                    onChange={handleFileUpload}
                    className="flex-1"
                  />
                  {inspectionReportUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(inspectionReportUrl, "_blank")}
                    >
                      查看
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 发货信息 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">发货信息</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimatedShippingDate">预计发货日期</Label>
                <Input
                  id="estimatedShippingDate"
                  type="date"
                  value={estimatedShippingDate}
                  onChange={(e) => setEstimatedShippingDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="actualShippingDate">实际装柜日期/发货日期</Label>
                <Input
                  id="actualShippingDate"
                  type="date"
                  value={actualShippingDate}
                  onChange={(e) => setActualShippingDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 物流信息 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">物流信息</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="etd">ETD (Estimated Time of Departure)</Label>
                <Input
                  id="etd"
                  type="date"
                  value={etd}
                  onChange={(e) => setEtd(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eta">ETA (Estimated Time of Arrival)</Label>
                <Input
                  id="eta"
                  type="date"
                  value={eta}
                  onChange={(e) => setEta(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="shippingPort">
                  <Ship className="inline h-4 w-4 mr-1" />
                  出货港口
                </Label>
                <Select value={shippingPort} onValueChange={setShippingPort}>
                  <SelectTrigger id="shippingPort">
                    <SelectValue placeholder="选择出货港口" />
                  </SelectTrigger>
                  <SelectContent>
                    {shippingPorts.map((port) => (
                      <SelectItem key={port.id} value={port.name}>
                        {port.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="containerNumber">
                  <Package className="inline h-4 w-4 mr-1" />
                  集装箱号码
                </Label>
                <Input
                  id="containerNumber"
                  type="text"
                  placeholder="例如：ABCD1234567"
                  value={containerNumber}
                  onChange={(e) => setContainerNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billOfLadingNumber">
                  <FileCheck className="inline h-4 w-4 mr-1" />
                  提单号码
                </Label>
                <Input
                  id="billOfLadingNumber"
                  type="text"
                  placeholder="例如：BL123456789"
                  value={billOfLadingNumber}
                  onChange={(e) => setBillOfLadingNumber(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 保存按钮 */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={createOrUpdateMutation.isPending}>
              {createOrUpdateMutation.isPending ? "保存中..." : "保存跟进信息"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
