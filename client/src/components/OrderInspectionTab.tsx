import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Upload, X, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface OrderInspectionTabProps {
  orderId: number;
}

interface InspectionFile {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
}

export function OrderInspectionTab({ orderId }: OrderInspectionTabProps) {
  const [inspectionMethods, setInspectionMethods] = useState<string[]>([]);
  const [inspectionDate, setInspectionDate] = useState<Date | undefined>();
  const [uploadingFiles, setUploadingFiles] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // 获取验货方式选项
  const { data: methodOptions = [] } = trpc.attributes.getAll.useQuery({
    fieldName: "inspection_method",
  });

  // 获取验货信息
  const { data: inspectionData, refetch: refetchInspection } = trpc.inspection.getByOrderId.useQuery(
    { orderId },
    { enabled: !!orderId }
  );

  // 创建或更新验货信息
  const createOrUpdateMutation = trpc.inspection.createOrUpdate.useMutation({
    onSuccess: () => {
      toast.success("验货信息保存成功");
      refetchInspection();
    },
    onError: (error) => {
      toast.error(`保存失败：${error.message}`);
    },
  });

  // 上传文件
  const uploadFileMutation = trpc.inspection.uploadFile.useMutation({
    onSuccess: () => {
      toast.success("文件上传成功");
      refetchInspection();
    },
    onError: (error) => {
      toast.error(`上传失败：${error.message}`);
    },
  });

  // 删除文件
  const deleteFileMutation = trpc.inspection.deleteFile.useMutation({
    onSuccess: () => {
      toast.success("文件删除成功");
      refetchInspection();
    },
    onError: (error) => {
      toast.error(`删除失败：${error.message}`);
    },
  });

  // 初始化表单数据
  useEffect(() => {
    if (inspectionData) {
      setInspectionMethods(inspectionData.inspectionMethods || []);
      setInspectionDate(
        inspectionData.inspectionDate ? new Date(inspectionData.inspectionDate) : undefined
      );
    }
  }, [inspectionData]);

  // 保存验货信息
  const handleSave = () => {
    createOrUpdateMutation.mutate({
      orderId,
      inspectionMethods,
      inspectionDate: inspectionDate?.toISOString(),
    });
  };

  // 处理验货方式选择
  const handleMethodToggle = (method: string) => {
    setInspectionMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  // 处理文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingFiles(true);

    try {
      for (const file of Array.from(files)) {
        // 读取文件为Base64
        const reader = new FileReader();
        const fileData = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(",")[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // 上传文件
        await uploadFileMutation.mutateAsync({
          orderId,
          fileName: file.name,
          fileData,
          mimeType: file.type,
        });
      }
    } catch (error) {
      console.error("File upload error:", error);
    } finally {
      setUploadingFiles(false);
      // 清空input
      event.target.value = "";
    }
  };

  // 删除文件
  const handleDeleteFile = (fileId: number) => {
    if (confirm("确定要删除这个文件吗？")) {
      deleteFileMutation.mutate({ fileId });
    }
  };

  // 处理拖拽事件
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    setUploadingFiles(true);

    try {
      for (const file of Array.from(files)) {
        // 读取文件为Base64
        const reader = new FileReader();
        const fileData = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(",")[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // 上传文件
        await uploadFileMutation.mutateAsync({
          orderId,
          fileName: file.name,
          fileData,
          mimeType: file.type,
        });
      }
    } catch (error) {
      console.error("File upload error:", error);
    } finally {
      setUploadingFiles(false);
    }
  };

  const files: InspectionFile[] = inspectionData?.files || [];

  return (
    <div className="space-y-6">
      {/* 验货信息卡片 */}
      <Card>
        <CardHeader>
          <CardTitle>验货信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 验货方式（多选） */}
          <div className="space-y-2">
            <Label>验货方式</Label>
            <div className="flex flex-wrap gap-4">
              {methodOptions.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`method-${option.id}`}
                    checked={inspectionMethods.includes(option.name)}
                    onCheckedChange={() => handleMethodToggle(option.name)}
                  />
                  <label
                    htmlFor={`method-${option.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {option.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* 验货日期 */}
          <div className="space-y-2">
            <Label>验货日期</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !inspectionDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {inspectionDate ? (
                    format(inspectionDate, "PPP", { locale: zhCN })
                  ) : (
                    <span>选择验货日期</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={inspectionDate}
                  onSelect={setInspectionDate}
                  initialFocus
                  locale={zhCN}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 保存按钮 */}
          <Button
            onClick={handleSave}
            disabled={createOrUpdateMutation.isPending}
            className="w-full"
          >
            {createOrUpdateMutation.isPending ? "保存中..." : "保存验货信息"}
          </Button>
        </CardContent>
      </Card>

      {/* 验货报告文件卡片 */}
      <Card>
        <CardHeader>
          <CardTitle>验货报告</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 文件上传 */}
          <div className="space-y-2">
            <Label>上传文件（支持拖拽或点击上传）</Label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              )}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                disabled={uploadingFiles}
                className="hidden"
                id="file-upload"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center space-y-2"
              >
                {uploadingFiles ? (
                  <>
                    <Loader2 className="h-10 w-10 text-gray-400 animate-spin" />
                    <p className="text-sm text-gray-600">上传中...</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      点击或拖拽文件到这里上传
                    </p>
                    <p className="text-xs text-gray-500">
                      支持 PDF, Word, Excel, 图片格式
                    </p>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* 文件列表 */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label>已上传文件</Label>
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.fileName}</p>
                        <p className="text-xs text-gray-500">
                          {file.fileSize ? (file.fileSize / 1024).toFixed(2) + ' KB' : '未知大小'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(file.fileUrl, "_blank")}
                      >
                        查看
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFile(file.id)}
                        disabled={deleteFileMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
