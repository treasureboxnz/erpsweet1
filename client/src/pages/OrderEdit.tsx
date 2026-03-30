import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ImageHoverPreview } from "@/components/ImageHoverPreview";
import { ColorIcon } from "@/components/ColorIcon";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Pencil, Check, X, FileText, DollarSign, ShoppingCart, ClipboardCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrderTrackingTab } from "@/components/OrderTrackingTab";
import { OrderFinanceTab } from "@/components/OrderFinanceTab";
import { OrderInspectionTab } from "@/components/OrderInspectionTab";
import { OrderStatusCard } from "@/components/OrderStatusCard";
import { ProductSearchCombobox, ProductSearchItem } from "@/components/ProductSearchCombobox";
import { CustomerSearchCombobox, CustomerSearchItem } from "@/components/CustomerSearchCombobox";
import { VariantCreateDialog } from "@/components/VariantCreateDialog";
import { getSearchHistory, addSearchHistory, clearSearchHistory, SearchHistoryItem } from "@/lib/searchHistory";

// 订单项接口
interface OrderItem {
  id: string; // 临时ID用于前端列表管理
  productId: number;
  productName: string;
  productSku: string;
  productImageUrl?: string;
  mode: 'batch_selection' | 'fob_only';
  // 批次模式字段
  variantId?: number;
  variantCode?: string;
  batchQuantity?: number;
  batchUnitPrice?: string;
  batchSubtotal?: string;
  // FOB模式字段
  fobQuantity?: number;
  fobUnitPrice?: string;
  fobSubtotal?: string;
  // 材料颜色信息（旧字段，用于兼容性）
  materialColor?: {
    colorCode: string;
    colorName: string | null;
    imageUrl?: string | null;
    thumbnailUrl?: string | null;
  };
  // 批次材料清单（新字段，优先使用）
  materials?: Array<{
    id: number;
    materialType: string;
    materialTypeId: number | null;
    materialTypeName: string | null;
    materialTypeIcon: string | null;
    sortOrder: number;
    colorCode: string;
    colorName: string | null;
    imageUrl: string | null;
  }>;
  materialCount?: number; // 材料总数（用于显示"+N"）
  // 重量和体积信息
  grossWeight?: number; // 毛重（公斤）
  netWeight?: number; // 净重（公斤）
  cbm?: number; // 立方数（立方米）
  piecesPerBox?: number; // 每箱件数
}

export default function OrderEdit() {
  const [, navigate] = useLocation();
  const orderId = parseInt(window.location.pathname.split('/')[2]);
  
  // 基本信息
  const [orderNumber, setOrderNumber] = useState(() => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `ORD-${date}-${random}`;
  });
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [currency, setCurrency] = useState<"USD" | "RMB">("USD");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [notes, setNotes] = useState("");

  // 产品选择区域状态
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedMode, setSelectedMode] = useState<'batch_selection' | 'fob_only'>('batch_selection');
  
  // 批次模式表单状态
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [batchQuantity, setBatchQuantity] = useState<number>(1);
  const [batchUnitPrice, setBatchUnitPrice] = useState<string>("0");
  
  // FOB模式表单状态
  const [fobQuantity, setFobQuantity] = useState<number>(1);
  const [fobUnitPrice, setFobUnitPrice] = useState<string>("0");
  
  // 价格加载状态
  const [priceLoaded, setPriceLoaded] = useState<boolean>(false);

  // 订单项列表
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  
  // 编辑状态
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editUnitPrice, setEditUnitPrice] = useState<string>("0");

  // 批次创建对话框状态
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);
  // 客户SKU搜索状态
  const [customerSkuSearch, setCustomerSkuSearch] = useState("");
  const [skuSearchResults, setSkuSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

  // 查询数据
  const utils = trpc.useUtils();
  const { data: customers } = trpc.customers.list.useQuery();
  const { data: products } = trpc.products.list.useQuery();
  const { data: variantsData } = trpc.productVariants.getAll.useQuery(
    { 
      productId: selectedProductId!, 
      customerId: customerId || undefined,
      pageSize: 100 
    },
    { enabled: !!selectedProductId && selectedMode === 'batch_selection' }
  );
  // 保留完整的variantsData用于获取materialColor
  const variants = variantsData?.variants.map((item: any) => item.variant);
  // 排序：默认批次(isDefault=true)始终排在第一位
  const variantsWithMaterial = useMemo(() => {
    if (!variantsData?.variants) return [];
    return [...variantsData.variants].sort((a, b) => {
      if (a.variant.isDefault && !b.variant.isDefault) return -1;
      if (!a.variant.isDefault && b.variant.isDefault) return 1;
      return 0;
    });
  }, [variantsData]);

  // 加载订单数据（只在orderId有效时查询）
  const { data: orderData, isLoading, refetch: refetchOrder } = trpc.orders.getById.useQuery(
    { id: orderId },
    { enabled: !isNaN(orderId) && orderId > 0 }
  );

  // 查询公司文件抬头信息
  const { data: letterhead } = trpc.customerManagement.companyLetterheads.getByCompanyId.useQuery(
    { companyId: customerId! },
    { enabled: !!customerId }
  );

  const updateOrderMutation = trpc.orders.update.useMutation({
    onSuccess: () => {
      toast.success(`订单更新成功，订单号：${orderNumber}`, {
        duration: 3000,
      });
      // 保存成功后跳转到订单详情页，方便用户导出Invoice
      navigate(`/orders/${orderId}`);
    },
    onError: (error) => {
      // 提供更详细和友好的错误信息
      let errorMessage = '更新订单失败';
      
      if (error.message.includes('customer')) {
        errorMessage = '请选择客户后再更新订单';
      } else if (error.message.includes('items') || error.message.includes('订单明细')) {
        errorMessage = '请添加至少一个产品到订单中';
      } else if (error.message.includes('quantity') || error.message.includes('数量')) {
        errorMessage = '订单数量不符合要求，请检查包装方式和每箱件数';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = '网络连接失败，请检查网络后重试';
      } else if (error.message.includes('not found') || error.message.includes('不存在')) {
        errorMessage = '订单不存在或已被删除';
      } else {
        errorMessage = `更新订单失败: ${error.message}`;
      }
      
      toast.error(errorMessage, {
        duration: 5000, // 显示5秒
      });
    },
  });

  // 获取FOB推荐价格
  const { data: recommendedPriceData, refetch: refetchRecommendedPrice } = trpc.orders.getRecommendedPrice.useQuery(
    {
      customerId: customerId || 0,
      productId: selectedProductId || 0,
      currency: currency,
    },
    {
      enabled: false, // 手动触发
    }
  );

  // 当客户选择变化时，自动填充文件抬头信息
  useEffect(() => {
    if (letterhead) {
      // 填充联系人信息
      setContactPerson(letterhead.contactPersonEn || "");
      setContactPhone(letterhead.contactPhone || "");
      setContactEmail(letterhead.contactEmail || "");
      
      // 组合收货地址
      const addressParts = [
        letterhead.addressEn,
        letterhead.cityEn,
        letterhead.stateEn,
        letterhead.postalCode,
        letterhead.countryEn
      ].filter(Boolean); // 过滤空值
      
      setShippingAddress(addressParts.join(", "));
    }
  }, [letterhead]);

  // 加载订单数据后初始化表单
  useEffect(() => {
    if (orderData) {
      const order = orderData as any; // Type assertion to access all order fields
      setOrderNumber(order.orderNumber);
      setCustomerId(order.customerId);
      setCurrency(order.currency);
      // 注意：不再从 orderData 加载联系人信息，而是等待 letterhead 自动填充
      // setContactPerson(orderData.contactPerson || "");
      // setContactPhone(orderData.contactPhone || "");
      // setContactEmail(orderData.contactEmail || "");
      // setShippingAddress(order.shippingAddress || "");
      setNotes(order.notes || "");
      
      // 加载订单项数据
      if (orderData.items) {
        console.log('[OrderEdit] Order items from API:', orderData.items);
        const items: OrderItem[] = orderData.items.map((item: any) => ({
          id: `${item.id}`,
          productId: item.productId,
          productName: item.productName || "",
          productSku: item.productSku,
          productImageUrl: item.productImageUrl,
          mode: item.orderMode,
          variantId: item.variantId,
          variantCode: item.variantCode,
          batchQuantity: item.orderMode === 'batch_selection' ? item.quantity : undefined,
          batchUnitPrice: item.orderMode === 'batch_selection' ? item.unitPrice : undefined,
          batchSubtotal: item.orderMode === 'batch_selection' ? item.subtotal : undefined,
          fobQuantity: item.orderMode === 'fob_only' ? item.fobQuantity : undefined,
          fobUnitPrice: item.orderMode === 'fob_only' ? item.fobUnitPrice : undefined,
          fobSubtotal: item.orderMode === 'fob_only' ? item.fobTotalPrice : undefined,
          materialColor: item.materialColor ? {
            colorCode: item.materialColor.colorCode,
            colorName: item.materialColor.colorName,
            imageUrl: item.materialColor.imageUrl,
          } : undefined,
          materials: item.materials || undefined, // 批次材料清单
          materialCount: item.materialCount || 0, // 材料总数
          grossWeight: item.totalGrossWeight ? Number(item.totalGrossWeight) : undefined,
          netWeight: item.totalNetWeight ? Number(item.totalNetWeight) : undefined,
          cbm: item.totalCBM ? Number(item.totalCBM) : undefined,
          piecesPerBox: item.piecesPerBox ? Number(item.piecesPerBox) : 1,
        }));
        setOrderItems(items);
      }
    }
  }, [orderData]);

  // 监听推荐价格数据变化
  useEffect(() => {
    if (recommendedPriceData?.price && recommendedPriceData.price !== '0') {
      // 价格加载成功
      setFobUnitPrice(recommendedPriceData.price.toString());
    } else if (recommendedPriceData && (recommendedPriceData.price === '0' || !recommendedPriceData.price)) {
      // FOB价格加载失败,显示错误提示
      toast.error('无法加载FOB价格:该产品可能没有设置FOB价格或客户没有FOB等级');
      setFobUnitPrice("0");
    }
  }, [recommendedPriceData]);

  // 监听货币切换，重新加载FOB价格
  useEffect(() => {
    if (selectedMode === 'fob_only' && priceLoaded && customerId && selectedProductId) {
      refetchRecommendedPrice();
    }
  }, [currency, selectedMode, priceLoaded, customerId, selectedProductId, refetchRecommendedPrice]);

  // 监听货币切换，重新计算批次价格
  useEffect(() => {
    if (selectedMode === 'batch_selection' && selectedVariantId && variantsData) {
      const variantData = variantsData.variants.find((item: any) => item.variant.id === selectedVariantId);
      if (variantData) {
        // 批次模式直接读取批次自身的价格字段
        const price = currency === "USD" 
          ? variantData.variant.sellingPriceFOB?.toString() || "0"
          : variantData.variant.sellingPriceRMB?.toString() || "0";
        setBatchUnitPrice(price);
      }
    }
  }, [currency, selectedMode, selectedVariantId, variantsData]);

  // 处理产品选择
  const handleProductChange = (productId: string) => {
    const id = parseInt(productId);
    setSelectedProductId(id);
    
    // 重置表单和加载状态
    setSelectedVariantId(null);
    setBatchQuantity(1);
    setBatchUnitPrice("0");
    setFobQuantity(1);
    setFobUnitPrice("0");
    setPriceLoaded(false);
  };

  // 处理模式切换
  const handleModeChange = (mode: 'batch_selection' | 'fob_only') => {
    setSelectedMode(mode);
    
    // 重置表单和加载状态
    setSelectedVariantId(null);
    setBatchQuantity(1);
    setBatchUnitPrice("0");
    setFobQuantity(1);
    setFobUnitPrice("0");
    setPriceLoaded(false);
  };
  
  // 处理加载价格按钮点击
  const handleLoadPrice = () => {
    if (selectedMode === 'batch_selection') {
      // 批次模式:标记为已加载,显示批次选择框
      setPriceLoaded(true);
    } else if (selectedMode === 'fob_only') {
      // FOB模式:调用API获取推荐价格
      if (customerId && selectedProductId) {
        refetchRecommendedPrice();
        setPriceLoaded(true);
      } else {
        toast.error('请先选择客户和产品');
      }
    }
  };

  // 处理批次选择
  const handleVariantChange = (variantId: string) => {
    const id = parseInt(variantId);
    setSelectedVariantId(id);
    
    // 批次模式直接读取批次自身的价格字段
    const variantData = variantsData?.variants.find((item: any) => item.variant.id === id);
    
    if (variantData) {
      const price = currency === "USD" 
        ? variantData.variant.sellingPriceFOB?.toString() || "0"
        : variantData.variant.sellingPriceRMB?.toString() || "0";
      setBatchUnitPrice(price);
    }
  };

  // 计算批次模式小计
  const batchSubtotal = (batchQuantity * parseFloat(batchUnitPrice || "0")).toFixed(2);

  // 计算FOB模式小计
  const fobSubtotal = (fobQuantity * parseFloat(fobUnitPrice || "0")).toFixed(2);

  // 处理客户SKU搜索
  const handleSkuSearch = async () => {
    if (!customerSkuSearch.trim()) {
      toast.error("请输入客户SKU");
      return;
    }
    if (!customerId) {
      toast.error("请先选择客户");
      return;
    }
    setIsSearching(true);
    try {
      const results = await utils.productVariants.searchByCustomerSku.fetch({
        customerSku: customerSkuSearch,
        customerId: customerId,
      });
      setSkuSearchResults(results || []);
      if (!results || results.length === 0) {
        toast.info("未找到匹配的批次");
      } else if (results.length > 0) {
        addSearchHistory(customerId, {
          sku: customerSkuSearch,
          productName: results[0].productName || undefined,
          batchCode: results[0].variantCode || undefined
        });
        setSearchHistory(getSearchHistory(customerId));
      }
    } catch (error) {
      toast.error("搜索失败，请重试");
    } finally {
      setIsSearching(false);
    }
  };
  // 从历史记录快速搜索
  const handleSearchFromHistory = (sku: string) => {
    setCustomerSkuSearch(sku);
    setTimeout(() => { handleSkuSearch(); }, 100);
  };
  // 清除搜索历史
  const handleClearHistory = () => {
    if (customerId) {
      clearSearchHistory(customerId);
      setSearchHistory([]);
      toast.success("搜索历史已清除");
    }
  };
  // 从搜索结果添加批次到订单
  const handleAddFromSearch = async (searchResult: any) => {
    try {
      const variantData = await utils.productVariants.getAll.fetch({
        productId: searchResult.productId,
        customerId: customerId || undefined,
        pageSize: 100,
      });
      const variant = variantData?.variants.find(
        (v: any) => v.variant.id === searchResult.id
      );
      if (!variant) {
        toast.error("未找到批次详细信息");
        return;
      }
      const price = currency === "USD"
        ? variant.variant.sellingPriceFOB?.toString() || "0"
        : variant.variant.sellingPriceRMB?.toString() || "0";
      const productItem = products?.find(p => p.product.id === searchResult.productId);
      const newItem: OrderItem = {
        id: `${Date.now()}-${Math.random()}`,
        productId: searchResult.productId,
        productName: searchResult.productName || productItem?.product?.name || "",
        productSku: productItem?.product?.sku || "",
        productImageUrl: (productItem?.product as any)?.imageUrl || undefined,
        mode: 'batch_selection',
        variantId: searchResult.id,
        variantCode: searchResult.variantCode,
        batchQuantity: 1,
        batchUnitPrice: price,
        batchSubtotal: price,
        materialColor: variant.materialColor ? {
          colorCode: (variant.materialColor as any).colorCode || (variant.materialColor as any).color?.colorCode,
          colorName: (variant.materialColor as any).colorName || (variant.materialColor as any).color?.colorName,
          imageUrl: (variant.materialColor as any).imageUrl || (variant.materialColor as any).color?.imageUrl,
        } : undefined,
        grossWeight: (variant.variant as any).totalGrossWeight ? Number((variant.variant as any).totalGrossWeight) : undefined,
        netWeight: (variant.variant as any).totalNetWeight ? Number((variant.variant as any).totalNetWeight) : undefined,
        cbm: (variant.variant as any).totalCBM ? Number((variant.variant as any).totalCBM) : undefined,
        piecesPerBox: (variant.variant as any).piecesPerBox ? Number((variant.variant as any).piecesPerBox) : 1,
      };
      // 检查是否已存在相同批次
      const existingIdx = orderItems.findIndex(
        i => i.mode === 'batch_selection' && i.variantId === newItem.variantId
      );
      if (existingIdx >= 0) {
        setOrderItems(prev => prev.map((item, idx) =>
          idx === existingIdx
            ? { ...item, batchQuantity: (item.batchQuantity || 0) + 1,
                batchSubtotal: ((parseFloat(item.batchUnitPrice || "0")) * ((item.batchQuantity || 0) + 1)).toFixed(2) }
            : item
        ));
        toast.success("数量已叠加");
      } else {
        setOrderItems(prev => [...prev, newItem]);
        toast.success("已添加到订单");
      }
    } catch (error) {
      toast.error("添加失败，请重试");
    }
  };
  // 添加到订单列表
  const handleAddToOrder = () => {
    if (!selectedProductId) {
      toast.error("请选择产品");
      return;
    }

    const productItem = products?.find(p => p.product.id === selectedProductId);
    if (!productItem) return;
    const product = productItem.product;

    if (selectedMode === 'batch_selection') {
      // 批次模式验证
      if (!selectedVariantId) {
        toast.error("请选择批次");
        return;
      }
      
      const variant = variants?.find(v => v.id === selectedVariantId);
      if (!variant) return;

      // 获取材料颜色信息
      const variantWithMaterial = variantsWithMaterial.find((v: any) => v.variant.id === selectedVariantId);
      console.log('[handleAddToOrder] product:', product);
      console.log('[handleAddToOrder] variantWithMaterial:', variantWithMaterial);
      const materialColor = variantWithMaterial?.materialColor?.color ? {
        colorCode: variantWithMaterial.materialColor.color.colorCode,
        colorName: variantWithMaterial.materialColor.color.colorName,
        imageUrl: variantWithMaterial.materialColor.color.imageUrl,
        thumbnailUrl: variantWithMaterial.materialColor.color.thumbnailUrl,
      } : undefined;

      const newItem: OrderItem = {
        id: `${Date.now()}-${Math.random()}`,
        productId: product.id,
        productName: product.name || product.sku,
        productSku: product.sku,
        productImageUrl: product.imageUrl || undefined,
        mode: 'batch_selection',
        variantId: variant.id,
        variantCode: variant.variantCode,
        batchQuantity,
        batchUnitPrice,
        batchSubtotal,
        materialColor,
      };

      // 检查是否已有相同批次的行，有则叠加数量
      const existingBatchIndex = orderItems.findIndex(
        item => item.mode === 'batch_selection' && item.variantId === variant.id
      );
      if (existingBatchIndex >= 0) {
        const updated = [...orderItems];
        const existing = updated[existingBatchIndex];
        const newQty = (existing.batchQuantity || 0) + batchQuantity;
        const unitPrice = parseFloat(existing.batchUnitPrice || '0');
        updated[existingBatchIndex] = {
          ...existing,
          batchQuantity: newQty,
          batchSubtotal: (newQty * unitPrice).toFixed(2),
        };
        setOrderItems(updated);
        toast.success(`已将批次 ${variant.variantCode} 数量叠加，当前数量: ${newQty}`);
      } else {
        setOrderItems([...orderItems, newItem]);
        toast.success('已添加到订单');
      }
      
    } else {
      // FOB模式
      // 查找DEFAULT批次（isDefault=true）
      const defaultVariant = variantsWithMaterial.find((v: any) => v.variant.isDefault);
      console.log('[handleAddToOrder] FOB mode - defaultVariant:', defaultVariant);
      
      // 获取DEFAULT批次的材料颜色信息
      const materialColor = defaultVariant?.materialColor?.color ? {
        colorCode: defaultVariant.materialColor.color.colorCode,
        colorName: defaultVariant.materialColor.color.colorName,
        imageUrl: defaultVariant.materialColor.color.imageUrl,
        thumbnailUrl: defaultVariant.materialColor.color.thumbnailUrl,
      } : undefined;
      
      const newItem: OrderItem = {
        id: `${Date.now()}-${Math.random()}`,
        productId: product.id,
        productName: product.name || product.sku,
        productSku: product.sku,
        productImageUrl: product.imageUrl || undefined,
        mode: 'fob_only',
        fobQuantity,
        fobUnitPrice,
        fobSubtotal,
        materialColor, // 添加DEFAULT批次的材料颜色
      };
      
      console.log('[handleAddToOrder] FOB mode - newItem:', newItem);

      // 检查是否已有相同产品的FOB行，有则叠加数量
      const existingFobIndex = orderItems.findIndex(
        item => item.mode === 'fob_only' && item.productId === product.id
      );
      if (existingFobIndex >= 0) {
        const updated = [...orderItems];
        const existing = updated[existingFobIndex];
        const newQty = (existing.fobQuantity || 0) + fobQuantity;
        const unitPrice = parseFloat(existing.fobUnitPrice || '0');
        updated[existingFobIndex] = {
          ...existing,
          fobQuantity: newQty,
          fobSubtotal: (newQty * unitPrice).toFixed(2),
        };
        setOrderItems(updated);
        toast.success(`已将产品 ${product.name || product.sku} 数量叠加，当前数量: ${newQty}`);
      } else {
        setOrderItems([...orderItems, newItem]);
        toast.success('已添加到订单');
      }
    }

    // 重置表单
    setSelectedProductId(null);
    setSelectedVariantId(null);
    setBatchQuantity(1);
    setBatchUnitPrice("0");
    setFobQuantity(1);
    setFobUnitPrice("0");
    
    toast.success("已添加到订单");
  };

  // 从订单列表删除
  const handleRemoveItem = (itemId: string) => {
    setOrderItems(orderItems.filter(item => item.id !== itemId));
    toast.success("已从订单中移除");
  };
  
  // 开始编辑
  const handleStartEdit = (item: OrderItem) => {
    setEditingItemId(item.id);
    if (item.mode === 'batch_selection') {
      setEditQuantity(item.batchQuantity || 1);
      setEditUnitPrice(item.batchUnitPrice || "0");
    } else {
      setEditQuantity(item.fobQuantity || 1);
      setEditUnitPrice(item.fobUnitPrice || "0");
    }
  };
  
  // 保存编辑
  const handleSaveEdit = (itemId: string) => {
    setOrderItems(orderItems.map(item => {
      if (item.id === itemId) {
        const newSubtotal = (editQuantity * parseFloat(editUnitPrice || "0")).toFixed(2);
        if (item.mode === 'batch_selection') {
          return {
            ...item,
            batchQuantity: editQuantity,
            batchUnitPrice: parseFloat(editUnitPrice).toFixed(2),
            batchSubtotal: newSubtotal,
          };
        } else {
          return {
            ...item,
            fobQuantity: editQuantity,
            fobUnitPrice: parseFloat(editUnitPrice).toFixed(2),
            fobSubtotal: newSubtotal,
          };
        }
      }
      return item;
    }));
    setEditingItemId(null);
    toast.success("修改已保存");
  };
  
  // 取消编辑
  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditQuantity(1);
    setEditUnitPrice("0");
  };

  // 计算订单总额
  const totalAmount = orderItems.reduce((sum, item) => {
    const subtotal = item.mode === 'batch_selection' 
      ? parseFloat(item.batchSubtotal || "0")
      : parseFloat(item.fobSubtotal || "0");
    return sum + subtotal;
  }, 0).toFixed(2);

  // 提交订单
  const handleSubmit = async () => {
    if (!customerId) {
      toast.error("请选择客户");
      return;
    }

    if (orderItems.length === 0) {
      toast.error("请至少添加一个产品");
      return;
    }

    // 转换订单项数据格式
    const items = orderItems.map(item => {
      if (item.mode === 'batch_selection') {
        return {
          productId: item.productId,
          variantId: item.variantId!,
          orderMode: 'batch_selection' as const,
          productName: item.productName,
          productSku: item.productSku,
          quantity: item.batchQuantity!,
          unitPrice: item.batchUnitPrice!,
          subtotal: item.batchSubtotal!,
          // FOB字段填充默认值以满足数据库要求
          fobQuantity: 0,
          fobUnitPrice: "0",
          fobTotalPrice: "0",
        };
      } else {
        // FOB模式
        return {
          productId: item.productId,
          variantId: item.variantId || undefined, // FOB模式可能没有variantId，设置为undefined
          orderMode: 'fob_only' as const,
          productName: item.productName,
          productSku: item.productSku,
          sku: item.productSku, // FOB模式使用产品SKU
          quantity: item.fobQuantity!,
          unitPrice: item.fobUnitPrice!,
          subtotal: item.fobSubtotal!,
          fobQuantity: item.fobQuantity!,
          fobUnitPrice: item.fobUnitPrice!,
          fobTotalPrice: item.fobSubtotal!,
        };
      }
    });

    updateOrderMutation.mutate({
      id: orderId,
      orderNumber,
      customerId,
      currency,
      totalAmount,
      contactPerson,
      contactPhone,
      contactEmail,
      shippingAddress,
      notes,
      items,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="text-center py-12">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="text-center py-12">
          <p className="text-destructive">订单不存在</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">编辑订单</h1>
            <p className="text-sm text-muted-foreground">修改订单信息和产品</p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={updateOrderMutation.isPending}>
          {updateOrderMutation.isPending ? "保存中..." : "保存订单"}
        </Button>
      </div>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="bg-white border">
          <TabsTrigger value="basic" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <ShoppingCart className="h-4 w-4 mr-2" />
            基本信息
          </TabsTrigger>
          <TabsTrigger value="tracking" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <FileText className="h-4 w-4 mr-2" />
            订单跟进
          </TabsTrigger>
          <TabsTrigger value="finance" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <DollarSign className="h-4 w-4 mr-2" />
            财务信息
          </TabsTrigger>
          <TabsTrigger value="inspection" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            验货
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：基本信息 */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>订单编号</Label>
                <Input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="自动生成"
                />
              </div>

              <div>
                <Label>客户 *</Label>
                <CustomerSearchCombobox
                  customers={customers?.map((c): CustomerSearchItem => ({
                    id: c.id,
                    name: c.companyName,
                    code: c.customerCode || undefined,
                    country: c.country || undefined,
                  })) || []}
                  value={customerId || undefined}
                  onSelect={(id) => setCustomerId(id)}
                  placeholder="搜索客户..."
                />
              </div>

              <div>
                <Label>币种</Label>
                <Select value={currency} onValueChange={(value) => setCurrency(value as "USD" | "RMB")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="RMB">RMB</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>联系人</Label>
                <Input
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="联系人姓名"
                />
              </div>

              <div>
                <Label>联系电话</Label>
                <Input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="联系电话"
                />
              </div>

              <div>
                <Label>联系邮箱</Label>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="联系邮箱"
                />
              </div>

              <div>
                <Label>收货地址</Label>
                <Textarea
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="详细收货地址"
                  rows={3}
                />
              </div>

              <div>
                <Label>备注</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="订单备注信息"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* 订单状态卡片 */}
          <OrderStatusCard
            orderId={orderId}
            currentStatus={(orderData as any)?.customStatus}
            onStatusUpdate={(status) => {
              // 状态更新后刷新订单数据
              refetchOrder();
            }}
          />
        </div>

        {/* 右侧：产品选择和订单列表 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 客户SKU搜索区域 */}
          <Card>
            <CardHeader>
              <CardTitle>客户SKU搜索</CardTitle>
              <CardDescription>输入客户货号快速查找批次</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="输入客户SKU..."
                  value={customerSkuSearch}
                  onChange={(e) => setCustomerSkuSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSkuSearch(); }}
                  className="flex-1"
                />
                <Button
                  onClick={handleSkuSearch}
                  disabled={isSearching || !customerId}
                >
                  {isSearching ? "搜索中..." : "搜索"}
                </Button>
              </div>
              {searchHistory.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">📜 最近搜索</Label>
                    <Button variant="ghost" size="sm" onClick={handleClearHistory} className="h-7 text-xs">清除历史</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {searchHistory.map((item, index) => (
                      <Button key={index} variant="outline" size="sm" onClick={() => handleSearchFromHistory(item.sku)} className="h-8 text-xs">
                        <span className="font-medium">{item.sku}</span>
                        {item.productName && <span className="ml-1 text-muted-foreground">({item.productName})</span>}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {skuSearchResults.length > 0 && (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>产品名称</TableHead>
                        <TableHead>批次号</TableHead>
                        <TableHead>供应商SKU</TableHead>
                        <TableHead>客户SKU</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {skuSearchResults.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">{result.productName || "暂无"}</TableCell>
                          <TableCell>{result.variantCode}</TableCell>
                          <TableCell>{result.supplierSku || "暂无"}</TableCell>
                          <TableCell>{result.customerSku || "暂无"}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                              result.isDefault ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                            }`}>
                              {result.isDefault ? "默认批次" : "普通批次"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" onClick={() => handleAddFromSearch(result)}>
                              <Plus className="h-4 w-4 mr-1" />
                              添加
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          {/* 产品选择区域 */}
          <Card>
            <CardHeader>
              <CardTitle>添加产品</CardTitle>
              <CardDescription>选择产品、模式并填写信息后点击添加</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 产品选择 */}
              <div>
                <Label>选择产品 *</Label>
                <ProductSearchCombobox
                  products={products?.map((item): ProductSearchItem => ({
                    id: item.product.id,
                    sku: item.product.sku,
                    name: item.product.name || item.product.sku,
                    category: item.category?.name || undefined,
                    status: item.product.status || undefined,
                    price: item.product.sellingPrice || undefined,
                    currency: "USD",
                    image: item.firstImage?.imageUrl || undefined,
                  })) || []}
                  value={selectedProductId || undefined}
                  onSelect={(id) => handleProductChange(id.toString())}
                  placeholder="搜索产品..."
                />
              </div>

              {/* 模式选择 */}
              {selectedProductId && (
                <div>
                  <Label>订单模式 *</Label>
                  <RadioGroup
                    value={selectedMode}
                    onValueChange={(value) => handleModeChange(value as 'batch_selection' | 'fob_only')}
                    className="flex gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="batch_selection" id="batch" />
                      <Label htmlFor="batch" className="font-normal cursor-pointer">
                        批次模式
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fob_only" id="fob" />
                      <Label htmlFor="fob" className="font-normal cursor-pointer">
                        FOB模式
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* 批次模式表单 */}
              {selectedProductId && selectedMode === 'batch_selection' && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  {!priceLoaded ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground mb-4">
                        请点击下方按钮加载批次信息和价格
                      </p>
                      <Button onClick={handleLoadPrice} variant="outline">
                        加载价格
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label>选择批次 *</Label>
                        <div className="flex gap-2">
                          <Select
                            value={selectedVariantId?.toString() || ""}
                            onValueChange={handleVariantChange}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="选择批次" />
                            </SelectTrigger>
                            <SelectContent>
                              {variantsWithMaterial?.map((item: any) => {
                                const variant = item.variant;
                                const materialColor = item.materialColor?.color;
                                
                                // 获取价格、毛重、CBM信息（根据货币类型选择正确的价格字段）
                                 const price = currency === "USD" 
                                   ? item.pricing?.sellingPriceFobL1 
                                   : item.pricing?.sellingPriceRmbIncTax;
                                 const grossWeight = item.totalGrossWeight;
                                 const cbm = item.totalCBM;
                                 
                                 // 包装方式图标
                                 const packagingIcon = item.packagingType === 'multiple' ? '📦📦' 
                                   : item.packagingType === 'bulk' ? `📦×${item.piecesPerBox}` 
                                   : '📦';
                                 
                                 // 历史价格对比
                                 let historyPriceDisplay = null;
                                 if (item.customerHistoryPrice && item.customerHistoryPrice.currency === currency && price) {
                                   const historyPrice = Number(item.customerHistoryPrice.price);
                                   const currentPrice = Number(price);
                                   const priceDiff = currentPrice - historyPrice;
                                   const priceChangePercent = (priceDiff / historyPrice * 100).toFixed(1);
                                   const isDecrease = priceDiff < 0;
                                   historyPriceDisplay = (
                                     <span className={`ml-2 text-xs ${isDecrease ? 'text-green-600' : 'text-red-600'}`}>
                                       上次: {currency} {historyPrice.toFixed(2)} {isDecrease ? '↓' : '↑'}{Math.abs(Number(priceChangePercent))}%
                                     </span>
                                   );
                                 }
                                
                                // 客户专属批次的客户名称
                                const exclusiveCustomerName = variant.variantType === 'exclusive'
                                  ? (item.customers && item.customers.length > 0
                                    ? item.customers.map((c: any) => c?.companyName || c?.name).filter(Boolean).join(', ')
                                    : item.customer?.companyName || item.customer?.name || '')
                                  : null;

                                return (
                                  <SelectItem key={variant.id} value={variant.id.toString()}>
                                    <div className="flex items-center gap-2 w-full">
                                      {/* 使用ColorIcon组件显示材料照片 */}
                                      {materialColor && (
                                        <ColorIcon
                                          imageUrl={materialColor.imageUrl}
                                          colorCode={materialColor.colorCode}
                                          colorName={materialColor.colorName}
                                          size="sm"
                                        />
                                      )}
                                       {/* 批次信息 - 横向单行显示 */}
                                       <span className="flex-1 text-sm">
                                         {packagingIcon} {variant.isDefault && "⭐ "}
                                         {variant.variantType === 'exclusive' && (
                                           <span className="inline-flex items-center px-1 py-0 text-xs font-medium bg-amber-100 text-amber-700 rounded mr-1">专属</span>
                                         )}
                                         {variant.variantType === 'universal' && (
                                           <span className="inline-flex items-center px-1 py-0 text-xs font-medium bg-blue-100 text-blue-700 rounded mr-1">通用</span>
                                         )}
                                         {variant.variantCode} - {variant.variantName || "无名称"}
                                         {exclusiveCustomerName && (
                                           <span className="ml-1 text-xs text-amber-600">[客户: {exclusiveCustomerName}]</span>
                                         )}
                                         <span className="text-foreground ml-2">
                                           {price && `${currency} ${Number(price).toFixed(2)}`}
                                           {historyPriceDisplay}
                                           {price && (grossWeight || cbm) && " • "}
                                           {grossWeight > 0 && `${Number(grossWeight).toFixed(2)}kg`}
                                           {grossWeight > 0 && cbm > 0 && " • "}
                                           {cbm > 0 && `${Number(cbm).toFixed(2)}m³`}
                                         </span>
                                       </span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsVariantDialogOpen(true)}
                            className="whitespace-nowrap"
                          >
                            创建批次
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>数量</Label>
                          <Input
                            type="number"
                            min="1"
                            value={batchQuantity}
                            onChange={(e) => setBatchQuantity(parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div>
                          <Label>单价 ({currency})</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={batchUnitPrice}
                            onChange={(e) => setBatchUnitPrice(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>小计 ({currency})</Label>
                          <Input
                            value={batchSubtotal}
                            readOnly
                            className="bg-muted"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* FOB模式表单 */}
              {selectedProductId && selectedMode === 'fob_only' && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  {!priceLoaded ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground mb-4">
                        请点击下方按钮加载FOB推荐价格
                      </p>
                      <Button onClick={handleLoadPrice} variant="outline">
                        加载价格
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>数量</Label>
                          <Input
                            type="number"
                            min="1"
                            value={fobQuantity}
                            onChange={(e) => setFobQuantity(parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div>
                          <Label>单价 ({currency})</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={fobUnitPrice}
                            onChange={(e) => setFobUnitPrice(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>小计 ({currency})</Label>
                          <Input
                            value={fobSubtotal}
                            readOnly
                            className="bg-muted"
                          />
                        </div>
                      </div>
                      {customerId && (
                        <p className="text-sm text-muted-foreground">
                          💡 价格已根据客户FOB等级自动填充
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* 添加按钮 */}
              {selectedProductId && (
                <Button
                  onClick={handleAddToOrder}
                  className="w-full"
                  size="lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  添加到订单
                </Button>
              )}
            </CardContent>
          </Card>

          {/* 订单列表 */}
          <Card>
            <CardHeader>
              <CardTitle>订单明细</CardTitle>
              <CardDescription>
                已添加 {orderItems.length} 个产品，总额: {currency} {totalAmount}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orderItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>暂无产品，请在上方添加产品</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>产品名称</TableHead>
                      <TableHead>模式</TableHead>
                      <TableHead>批次/SKU</TableHead>
                      <TableHead className="text-right">数量</TableHead>
                      <TableHead className="text-right">单价</TableHead>
                      <TableHead className="text-right">小计</TableHead>
                      <TableHead className="text-right">CBM(m³)</TableHead>
                      <TableHead className="text-right">毛重(kg)</TableHead>
                      <TableHead className="text-right">净重(kg)</TableHead>
                      <TableHead className="text-right">箱数</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {item.productImageUrl && (
                              <ImageHoverPreview
                                src={item.productImageUrl}
                                alt={item.productName || 'Product'}
                                previewSize="lg"
                                className="w-12 h-12 flex-shrink-0"
                              >
                                <img
                                  src={item.productImageUrl}
                                  alt={item.productName || 'Product'}
                                  className="w-full h-full object-cover rounded border cursor-pointer"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </ImageHoverPreview>
                            )}
                            {/* 显示批次材料清单（优先）或单个材料颜色（fallback） */}
                            {item.materials && item.materials.length > 0 ? (
                              <div className="flex items-center gap-1">
                                {item.materials.slice(0, 3).map((material, index) => (
                                  <div key={index} className="relative">
                                    <ImageHoverPreview
                                      src={material.imageUrl || ''}
                                      alt={`${material.materialTypeName || material.materialType} - ${material.colorName || material.colorCode}`}
                                      previewSize="lg"
                                      className="w-8 h-8 flex-shrink-0"
                                    >
                                      <div className="w-full h-full cursor-pointer relative">
                                        <ColorIcon
                                          colorCode={material.colorCode}
                                          colorName={material.colorName}
                                          imageUrl={material.imageUrl}
                                          size="sm"
                                        />
                                        {/* 材料类型图标叠加层 */}
                                        {material.materialTypeIcon && (
                                          <div className="absolute bottom-0 right-0 bg-white/80 rounded-tl px-0.5 text-xs leading-none">
                                            {material.materialTypeIcon}
                                          </div>
                                        )}
                                      </div>
                                    </ImageHoverPreview>
                                  </div>
                                ))}
                                {/* "+N"指示器 */}
                                {item.materialCount && item.materialCount > 3 && (
                                  <div className="w-8 h-8 flex items-center justify-center bg-muted rounded text-xs font-medium text-muted-foreground">
                                    +{item.materialCount - 3}
                                  </div>
                                )}
                              </div>
                            ) : item.materialColor ? (
                              <ImageHoverPreview
                                src={item.materialColor.imageUrl || ''}
                                alt={item.materialColor.colorName || ''}
                                previewSize="lg"
                                className="w-8 h-8 flex-shrink-0"
                              >
                                <div className="w-full h-full cursor-pointer">
                                  <ColorIcon
                                    colorCode={item.materialColor.colorCode}
                                    colorName={item.materialColor.colorName}
                                    imageUrl={item.materialColor.imageUrl}
                                    size="sm"
                                  />
                                </div>
                              </ImageHoverPreview>
                            ) : null}
                            <span className="font-medium">{item.productName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            item.mode === 'batch_selection' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {item.mode === 'batch_selection' ? '批次' : 'FOB'}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.mode === 'batch_selection' ? item.variantCode : item.productSku}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingItemId === item.id ? (
                            <Input
                              type="number"
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(Number(e.target.value))}
                              className="w-20 text-right"
                              min="1"
                            />
                          ) : (
                            item.mode === 'batch_selection' ? item.batchQuantity : item.fobQuantity
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingItemId === item.id ? (
                            <Input
                              type="number"
                              value={editUnitPrice}
                              onChange={(e) => setEditUnitPrice(e.target.value)}
                              className="w-24 text-right"
                              min="0"
                              step="0.01"
                            />
                          ) : (
                            `${currency} ${item.mode === 'batch_selection' ? item.batchUnitPrice : item.fobUnitPrice}`
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {currency} {editingItemId === item.id 
                            ? (editQuantity * parseFloat(editUnitPrice || "0")).toFixed(2)
                            : (item.mode === 'batch_selection' ? item.batchSubtotal : item.fobSubtotal)
                          }
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {item.cbm ? `${item.cbm.toFixed(3)} m³` : '-'}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {item.grossWeight ? `${item.grossWeight.toFixed(2)} kg` : '-'}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {item.netWeight ? `${item.netWeight.toFixed(2)} kg` : '-'}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {item.piecesPerBox && (item.batchQuantity || item.fobQuantity)
                            ? Math.ceil((item.batchQuantity || item.fobQuantity || 0) / item.piecesPerBox)
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {editingItemId === item.id ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleSaveEdit(item.id)}
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCancelEdit()}
                                >
                                  <X className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleStartEdit(item)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveItem(item.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* 汇总行 */}
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell colSpan={5} className="text-right">总计</TableCell>
                      <TableCell className="text-right font-bold">{currency} {orderItems.reduce((sum, item) => sum + parseFloat(item.mode === 'batch_selection' ? item.batchSubtotal || '0' : item.fobSubtotal || '0'), 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold">
                        {orderItems.reduce((sum, item) => sum + (item.cbm || 0), 0).toFixed(3)} m³
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {orderItems.reduce((sum, item) => sum + (item.grossWeight || 0), 0).toFixed(2)} kg
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {orderItems.reduce((sum, item) => sum + (item.netWeight || 0), 0).toFixed(2)} kg
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {orderItems.reduce((sum, item) => {
                          const qty = item.batchQuantity || item.fobQuantity || 0;
                          const ppb = item.piecesPerBox || 1;
                          return sum + Math.ceil(qty / ppb);
                        }, 0)} 箱
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          </div>
        </div>
        </TabsContent>

        <TabsContent value="tracking" className="space-y-6">
          <OrderTrackingTab orderId={orderId} />
        </TabsContent>

        <TabsContent value="finance" className="space-y-6">
          <OrderFinanceTab orderId={orderId} currency={currency} />
        </TabsContent>

        <TabsContent value="inspection" className="space-y-6">
          <OrderInspectionTab orderId={orderId} />
        </TabsContent>
      </Tabs>

      {/* 批次创建对话框 */}
      {selectedProductId && (
        <VariantCreateDialog
          open={isVariantDialogOpen}
          onOpenChange={setIsVariantDialogOpen}
          productId={selectedProductId}
          productSku={products?.find(p => p.product.id === selectedProductId)?.product.sku || ""}
          defaultCustomerId={customerId || undefined}
          onSuccess={(variantId) => {
            // 批次创建成功后的回调
            // 1. 自动选中新创建的批次
            setSelectedVariantId(variantId);
            // 2. 触发批次变更处理，加载价格
            handleVariantChange(variantId.toString());
            toast.success("批次已创建并自动选中");
          }}
        />
      )}
    </div>
  );
}
