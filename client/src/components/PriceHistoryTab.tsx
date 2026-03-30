import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from "@/lib/trpc";
import { DollarSign, Package, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface PriceHistoryTabProps {
  companyId: number;
}

export default function PriceHistoryTab({ companyId }: PriceHistoryTabProps) {
  const { data: priceHistory, isLoading } = trpc.customerManagement.priceHistory.list.useQuery({ customerId: companyId });
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());

  const toggleExpand = (productId: number) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-500">加载中...</p>
        </CardContent>
      </Card>
    );
  }

  if (!priceHistory || priceHistory.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">暂无历史成交价记录</p>
          <p className="text-sm text-gray-400 mt-2">当客户完成首次订单后，历史价格将显示在这里</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>历史成交价</CardTitle>
        <CardDescription>查看该客户对各产品的历史成交价格</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {priceHistory.map((item) => {
            const isExpanded = expandedProducts.has(item.productId);
            const hasMultiplePrices = item.priceHistory.length > 1;

            return (
              <div key={item.productId} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Product Image */}
                  <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                    {item.productImage ? (
                      <img
                        src={item.productImage}
                        alt={item.productTitle || ''}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {item.productTitle || '未知产品'}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">SKU: {item.productSku || 'N/A'}</p>
                      </div>

                      {/* Last Price */}
                      <div className="text-right ml-4">
                        <div className="text-2xl font-bold text-blue-600">
                          ${parseFloat(item.lastPrice).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center justify-end gap-1">
                          <Calendar className="h-3 w-3" />
                          {item.lastTransactionDate
                            ? new Date(item.lastTransactionDate).toLocaleDateString('zh-CN')
                            : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Price History Toggle */}
                    {hasMultiplePrices && (
                      <div className="mt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(item.productId)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-1" />
                              收起历史记录
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-1" />
                              查看完整历史 ({item.priceHistory.length} 条记录)
                            </>
                          )}
                        </Button>

                        {/* Expanded Price History */}
                        {isExpanded && (
                          <div className="mt-3 pl-4 border-l-2 border-blue-200 space-y-2">
                            {item.priceHistory.map((record, index) => (
                              <div
                                key={record.id}
                                className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">#{index + 1}</span>
                                  <span className="text-gray-600">
                                    {record.createdAt
                                      ? new Date(record.createdAt).toLocaleString('zh-CN')
                                      : 'N/A'}
                                  </span>
                                </div>
                                <div className="font-medium text-gray-900">
                                  ${parseFloat(record.unitPrice).toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
