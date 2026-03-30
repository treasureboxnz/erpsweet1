import { CheckCircle2, Circle, Clock } from "lucide-react";

interface OrderProgressBarProps {
  status: string;
  paymentStatus?: string;
  hasTracking?: boolean;
  hasInspection?: boolean;
}

const STEPS = [
  { key: "pending", label: "待确认", description: "订单已创建" },
  { key: "confirmed", label: "已确认", description: "订单已确认" },
  { key: "processing", label: "生产中", description: "工厂生产中" },
  { key: "shipped", label: "已发货", description: "货物已发出" },
  { key: "delivered", label: "已完成", description: "客户已收货" },
];

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
  cancelled: -1,
};

export function OrderProgressBar({ status, paymentStatus }: OrderProgressBarProps) {
  const currentIndex = STATUS_ORDER[status] ?? -1;
  const isCancelled = status === "cancelled";

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-red-50 rounded-lg border border-red-200">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <span className="text-sm font-medium text-red-700">订单已取消</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 z-0 mx-8"></div>
        {/* Progress line */}
        <div
          className="absolute top-4 left-0 h-0.5 bg-blue-500 z-0 mx-8 transition-all duration-500"
          style={{
            width: currentIndex >= 0 ? `${(currentIndex / (STEPS.length - 1)) * 100}%` : "0%",
            maxWidth: "calc(100% - 4rem)",
          }}
        ></div>

        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;

          return (
            <div key={step.key} className="flex flex-col items-center relative z-10" style={{ flex: 1 }}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? "bg-blue-500 text-white"
                    : isCurrent
                    ? "bg-blue-500 text-white ring-4 ring-blue-100"
                    : "bg-white border-2 border-gray-300 text-gray-400"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : isCurrent ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </div>
              <span
                className={`text-xs mt-2 font-medium ${
                  isCompleted || isCurrent ? "text-blue-600" : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
              {isCurrent && (
                <span className="text-[10px] text-blue-500 mt-0.5">{step.description}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Payment status indicator */}
      {paymentStatus && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="text-gray-500">付款状态:</span>
          <span
            className={`px-2 py-0.5 rounded-full font-medium ${
              paymentStatus === "paid"
                ? "bg-green-100 text-green-700"
                : paymentStatus === "partial"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {paymentStatus === "paid" ? "已付清" : paymentStatus === "partial" ? "部分付款" : "未付款"}
          </span>
        </div>
      )}
    </div>
  );
}
