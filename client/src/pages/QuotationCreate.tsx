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
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { ProductSearchCombobox, ProductSearchItem } from "@/components/ProductSearchCombobox";
import { CustomerSearchCombobox, CustomerSearchItem } from "@/components/CustomerSearchCombobox";
import { VariantCreateDialog } from "@/components/VariantCreateDialog";
import { ColorIcon } from "@/components/ColorIcon";
import { ImageHoverPreview } from "@/components/ImageHoverPreview";
import { getSearchHistory, addSearchHistory, clearSearchHistory, SearchHistoryItem } from "@/lib/searchHistory";
import { SmartCodeInput } from "@/components/SmartCodeInput";

// 报价单项接口
interface QuotationItem {
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
  // 材料颜色信息
  materialColor?: {
    colorCode: string;
    colorName: string | null;
    imageUrl?: string | null;
    thumbnailUrl?: string | null;
  };
  // FOB模式字段
  fobQuantity?: number;
  fobUnitPrice?: string;
  fobSubtotal?: string;
  // 重量和体积信息
  grossWeight?: number; // 毛重（公斤）
  netWeight?: number; // 净重（公斤）
  cbm?: number; // 立方数（立方米）
  piecesPerBox?: number; // 每箱件数
}

export default function QuotationCreate() {
  const [, navigate] = useLocation();
  
  // 从sourceId读取源报价数据（用于复制功能）
  const sourceId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('sourceId');
    return id ? parseInt(id, 10) : null;
  }, []);
  
  const { data: sourceQuotation } = trpc.quotations.getById.useQuery(
    { id: sourceId! },
    { enabled: !!sourceId }
  );
  
  // 基本信息
  const [quotationNumber, setQuotationNumber] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [currency, setCurrency] = useState<"USD" | "RMB">("USD");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [notes, setNotes] = useState("");
  
  // 报价单特有字段
  const [validUntil, setValidUntil] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30); // 默认30天有效期
    return date.toISOString().slice(0, 10);
  });

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

  // 报价单项列表
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([]);
  
  // 编辑状态
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editUnitPrice, setEditUnitPrice] = useState<string>("0");

  // 批次创建对话框状态
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);

  // 客户SKU搜索状态
  const [customerSkuSearch, setCustomerSkuSearch] = useState<string>("");
  const [skuSearchResults, setSkuSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

  // 查询数据
  const { data: customers } = trpc.customers.list.useQuery();
  const { data: products } = trpc.products.list.useQuery();
  const { data: variantsData } = trpc.productVariants.getAll.useQuery(
    { 
      productId: selectedProductId!, 
      customerId: customerId || undefined,
      pageSize: 100 
    },
    { enabled: !!selectedProductId }
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

  // 查询公司文件抬头信息
  const { data: letterhead } = trpc.customerManagement.companyLetterheads.getByCompanyId.useQuery(
    { companyId: customerId! },
    { enabled: !!customerId }
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
    } else if (customerId) {
      // 如果没有文件抬头，清空字段
      setContactPerson("");
      setContactPhone("");
      setContactEmail("");
      setShippingAddress("");
    }
  }, [letterhead, customerId]);

  const createQuotationMutation = trpc.quotations.create.useMutation({
    onSuccess: (data) => {
      toast.success(`报价单创建成功，报价单号：${quotationNumber}`, {
        duration: 5000,
      });
      // 跳转到报价单列表页面
      navigate(`/quotations`);
    },
    onError: (error) => {
      // 提供更详细和友好的错误信息
      let errorMessage = '创建报价单失败';
      
      if (error.message.includes('customer')) {
        errorMessage = '请选择客户后再创建报价单';
      } else if (error.message.includes('items') || error.message.includes('报价单明细')) {
        errorMessage = '请添加至少一个产品到报价单中';
      } else if (error.message.includes('quantity') || error.message.includes('数量')) {
        errorMessage = '报价单数量不符合要求，请检查包装方式和每箱件数';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = '网络连接失败，请检查网络后重试';
      } else {
        errorMessage = `创建报价单失败: ${error.message}`;
      }
      
      toast.error(errorMessage, {
        duration: 5000,
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

  // 加载搜索历史记录
  useEffect(() => {
    if (customerId) {
      setSearchHistory(getSearchHistory(customerId));
    }
  }, [customerId]);

  // 监听货币切换，重新计算批次价格
  useEffect(() => {
    if (selectedMode === 'batch_selection' && selectedVariantId && variantsData) {
      const variantData = variantsData.variants.find((item: any) => item.variant.id === selectedVariantId);
      if (variantData && variantData.pricing) {
        const price = currency === "USD" 
          ? variantData.pricing.sellingPriceFobL1?.toString() || "0"
          : variantData.pricing.sellingPriceRmbIncTax?.toString() || "0";
        setBatchUnitPrice(price);
      }
    }
  }, [currency, selectedMode, selectedVariantId, variantsData]);
  
  // 自动填充源报价数据（用于复制功能）
  useEffect(() => {
    if (sourceQuotation) {
      // 填充基本信息
      setCustomerId(sourceQuotation.customerId);
      setCurrency(sourceQuotation.currency);
      setContactPerson(sourceQuotation.contactPerson || "");
      setContactPhone(sourceQuotation.contactPhone || "");
      setContactEmail(sourceQuotation.contactEmail || "");
      setShippingAddress(sourceQuotation.shippingAddress || "");
      setNotes(sourceQuotation.notes || "");
      
      // 重新设置有效期（默认30天）
      const newValidUntil = new Date();
      newValidUntil.setDate(newValidUntil.getDate() + 30);
      setValidUntil(newValidUntil.toISOString().slice(0, 10));
      
      // 填充报价单项列表
      if (sourceQuotation.items && sourceQuotation.items.length > 0) {
        const items: QuotationItem[] = sourceQuotation.items.map((item: any) => ({
          id: `temp-${Date.now()}-${Math.random()}`,
          productId: item.productId,
          productName: item.productName || "",
          productSku: item.productSku || "",
          productImageUrl: item.productImageUrl || undefined,
          mode: item.mode as 'batch_selection' | 'fob_only',
          variantId: item.variantId || undefined,
          variantCode: item.variantCode || undefined,
          batchQuantity: item.batchQuantity || undefined,
          batchUnitPrice: item.batchUnitPrice || undefined,
          batchSubtotal: item.batchSubtotal || undefined,
          materialColor: item.materialColor || undefined,
          fobQuantity: item.fobQuantity || undefined,
          fobUnitPrice: item.fobUnitPrice || undefined,
          fobSubtotal: item.fobSubtotal || undefined,
          grossWeight: item.grossWeight ? Number(item.grossWeight) : undefined,
          netWeight: item.netWeight ? Number(item.netWeight) : undefined,
          cbm: item.cbm ? Number(item.cbm) : undefined,
        }));
        setQuotationItems(items);
        
        toast.success(`已复制报价单 ${sourceQuotation.quotationNumber} 的数据，请修改后保存`, {
          duration: 5000,
        });
      }
    }
  }, [sourceQuotation]);

  // 客户SKU搜索函数
  const utils = trpc.useUtils();
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
      const results = await utils.client.productVariants.searchByCustomerSku.query({
        customerSku: customerSkuSearch,
        customerId: customerId,
      });
      setSkuSearchResults(results);
      if (results.length === 0) {
        toast.info("未找到匹配的批次");
      } else if (results.length > 0) {
        // 保存搜索历史记录
        addSearchHistory(customerId, {
          sku: customerSkuSearch,
          productName: results[0].productName || undefined,
          batchCode: results[0].variantCode || undefined
        });
        // 更新历史记录显示
        setSearchHistory(getSearchHistory(customerId));
      }
    } catch (error: any) {
      toast.error(`搜索失败: ${error.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  // 从历史记录快速搜索
  const handleSearchFromHistory = (sku: string) => {
    setCustomerSkuSearch(sku);
    // 自动触发搜索
    setTimeout(() => {
      handleSkuSearch();
    }, 100);
  };

  // 清除搜索历史
  const handleClearHistory = () => {
    if (customerId) {
      clearSearchHistory(customerId);
      setSearchHistory([]);
      toast.success("搜索历史已清除");
    }
  };

  // 从 SKU 搜索结果添加批次到报价单
  const handleAddFromSkuSearch = (result: any) => {
    // 设置产品和批次
    setSelectedProductId(result.productId);
    setSelectedMode('batch_selection');
    setSelectedVariantId(result.variantId);
    setBatchQuantity(1);
    setBatchUnitPrice(result.fobPrice?.toString() || "0");
    
    // 清空搜索结果
    setSkuSearchResults([]);
    setCustomerSkuSearch("");
    
    toast.success(`已选择批次: ${result.variantCode}`);
  };

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
    
    // 检查NaN
    if (isNaN(id)) {
      console.error('[handleVariantChange] Invalid variantId:', variantId);
      return;
    }
    
    setSelectedVariantId(id);
    
    console.log('[handleVariantChange] Selected variant ID:', id);
    
    // 打印选中的批次的完整数据
    const selectedVariantData = variantsWithMaterial.find((v: any) => v.variant.id === id);
    console.log('[handleVariantChange] selectedVariantData.materialColor:', selectedVariantData?.materialColor);
    console.log('[handleVariantChange] variantsData:', variantsData);
    
    // 自动填充价格 - 从 variant 对象读取价格
    const variantData = variantsData?.variants.find((item: any) => item.variant.id === id);
    
    console.log('[handleVariantChange] Found variantData:', variantData);
    
    if (variantData && variantData.pricing) {
      const price = currency === "USD" 
        ? variantData.pricing.sellingPriceFobL1?.toString() || "0"
        : variantData.pricing.sellingPriceRmbIncTax?.toString() || "0";
      console.log('[handleVariantChange] Calculated price:', price, 'currency:', currency);
      setBatchUnitPrice(price);
    } else {
      console.warn('[handleVariantChange] No variant data found for id:', id);
    }
  };

  // 计算批次模式小计
  const batchSubtotal = (batchQuantity * parseFloat(batchUnitPrice || "0")).toFixed(2);

  // 计算FOB模式小计
  const fobSubtotal = (fobQuantity * parseFloat(fobUnitPrice || "0")).toFixed(2);

  // 添加到报价单列表
  const handleAddToQuotation = () => {
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

      // 获取批次信息（包含materialColor）
      const variantItem = variantsWithMaterial.find((item: any) => item.variant.id === selectedVariantId);
      if (!variantItem) {
        toast.error("批次信息加载失败");
        return;
      }

      const variant = variantItem.variant;
      const materialColor = variantItem.materialColor?.color;

      // 验证批次包装方式和数量
      // packagingType和piecesPerBox在variantItem外层
      if (variantItem.packagingType === 'bulk' && variantItem.piecesPerBox && variantItem.piecesPerBox > 1) {
        if (batchQuantity % variantItem.piecesPerBox !== 0) {
          toast.error(`报价单数量必须是${variantItem.piecesPerBox}件的倍数（一箱多件包装）`);
          return;
        }
      }

      // 计算重量和CBM（基于批次的单件数据 × 数量）
      // 重量和CBM数据在variantItem外层，不在variant对象上
      const grossWeight = variantItem.totalGrossWeight ? variantItem.totalGrossWeight * batchQuantity : undefined;
      const netWeight = variantItem.totalNetWeight ? variantItem.totalNetWeight * batchQuantity : undefined;
      const cbm = variantItem.totalCBM ? variantItem.totalCBM * batchQuantity : undefined;

      const newItem: QuotationItem = {
        id: `${Date.now()}-${Math.random()}`,
        productId: product.id,
        productName: product.name || product.sku,
        productSku: product.sku,
        productImageUrl: productItem.firstImage?.imageUrl,
        mode: 'batch_selection',
        variantId: variant.id,
        variantCode: variant.variantCode,
        batchQuantity,
        batchUnitPrice,
        batchSubtotal,
        materialColor: materialColor ? {
          colorCode: materialColor.colorCode,
          colorName: materialColor.colorName,
          imageUrl: materialColor.imageUrl,
          thumbnailUrl: materialColor.thumbnailUrl,
        } : undefined,
        grossWeight,
        netWeight,
        cbm,
      };

      // 检查是否已有相同批次的行，有则叠加数量
      const existingBatchIndex = quotationItems.findIndex(
        item => item.mode === 'batch_selection' && item.variantId === variant.id
      );
      if (existingBatchIndex >= 0) {
        const updated = [...quotationItems];
        const existing = updated[existingBatchIndex];
        const newQty = (existing.batchQuantity || 0) + batchQuantity;
        const unitPrice = parseFloat(existing.batchUnitPrice || '0');
        updated[existingBatchIndex] = {
          ...existing,
          batchQuantity: newQty,
          batchSubtotal: (newQty * unitPrice).toFixed(2),
        };
        setQuotationItems(updated);
        toast.success(`已将批次 ${variant.variantCode} 数量叠加，当前数量: ${newQty}`);
      } else {
        setQuotationItems([...quotationItems, newItem]);
        toast.success("产品已添加到报价单");
      }
    } else {
      // FOB模式
      const newItem: QuotationItem = {
        id: `${Date.now()}-${Math.random()}`,
        productId: product.id,
        productName: product.name || product.sku,
        productSku: product.sku,
        productImageUrl: productItem.firstImage?.imageUrl,
        mode: 'fob_only',
        fobQuantity,
        fobUnitPrice,
        fobSubtotal,
      };

      // 检查是否已有相同产品的FOB行，有则叠加数量
      const existingFobIndex = quotationItems.findIndex(
        item => item.mode === 'fob_only' && item.productId === product.id
      );
      if (existingFobIndex >= 0) {
        const updated = [...quotationItems];
        const existing = updated[existingFobIndex];
        const newQty = (existing.fobQuantity || 0) + fobQuantity;
        const unitPrice = parseFloat(existing.fobUnitPrice || '0');
        updated[existingFobIndex] = {
          ...existing,
          fobQuantity: newQty,
          fobSubtotal: (newQty * unitPrice).toFixed(2),
        };
        setQuotationItems(updated);
        toast.success(`已将产品 ${product.name} 数量叠加，当前数量: ${newQty}`);
      } else {
        setQuotationItems([...quotationItems, newItem]);
        toast.success("产品已添加到报价单");
      }
    }

    // 重置表单
    setSelectedProductId(null);
    setSelectedVariantId(null);
    setBatchQuantity(1);
    setBatchUnitPrice("0");
    setFobQuantity(1);
    setFobUnitPrice("0");
    setPriceLoaded(false);
  };

  // 删除报价单项
  const handleRemoveItem = (itemId: string) => {
    setQuotationItems(quotationItems.filter(item => item.id !== itemId));
    toast.success("产品已从报价单中移除");
  };

  // 开始编辑
  const handleStartEdit = (item: QuotationItem) => {
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
    setQuotationItems(quotationItems.map(item => {
      if (item.id === itemId) {
        const subtotal = (editQuantity * parseFloat(editUnitPrice || "0")).toFixed(2);
        
        if (item.mode === 'batch_selection') {
          // 批次模式：重新计算重量和CBM
          const variantItem = variantsWithMaterial.find((v: any) => v.variant.id === item.variantId);
          if (variantItem) {
            // 重量和CBM数据在variantItem外层，不在variant对象上
            const grossWeight = variantItem.totalGrossWeight ? variantItem.totalGrossWeight * editQuantity : undefined;
            const netWeight = variantItem.totalNetWeight ? variantItem.totalNetWeight * editQuantity : undefined;
            const cbm = variantItem.totalCBM ? variantItem.totalCBM * editQuantity : undefined;
            
            return {
              ...item,
              batchQuantity: editQuantity,
              batchUnitPrice: editUnitPrice,
              batchSubtotal: subtotal,
              grossWeight,
              netWeight,
              cbm,
            };
          }
          return {
            ...item,
            batchQuantity: editQuantity,
            batchUnitPrice: editUnitPrice,
            batchSubtotal: subtotal,
          };
        } else {
          return {
            ...item,
            fobQuantity: editQuantity,
            fobUnitPrice: editUnitPrice,
            fobSubtotal: subtotal,
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
  };

  // 计算总金额
  const totalAmount = quotationItems.reduce((sum, item) => {
    const subtotal = item.mode === 'batch_selection' ? item.batchSubtotal : item.fobSubtotal;
    return sum + parseFloat(subtotal || "0");
  }, 0);

  // 提交报价单
  const handleSubmit = () => {
    if (!customerId) {
      toast.error("请选择客户");
      return;
    }

    if (quotationItems.length === 0) {
      toast.error("请至少添加一个产品");
      return;
    }

    // 判断报价单模式：如果所有项都是FOB模式则为fob_only，否则为batch_selection
    const quotationMode = quotationItems.every(item => item.mode === 'fob_only') 
      ? 'fob_only' as const 
      : 'batch_selection' as const;

    // 转换报价单项为API格式（按产品分组）
    const itemsMap = new Map<number, {
      productId: number;
      fobQuantity?: number;
      fobUnitPrice?: number;
      batches?: { variantId: number | null; quantity: number; unitPrice: number; notes?: string }[];
    }>();

    quotationItems.forEach(item => {
      if (!itemsMap.has(item.productId)) {
        itemsMap.set(item.productId, { productId: item.productId });
      }
      
      const apiItem = itemsMap.get(item.productId)!;
      
      if (item.mode === 'batch_selection') {
        // 批次模式
        if (!apiItem.batches) {
          apiItem.batches = [];
        }
        apiItem.batches.push({
          variantId: item.variantId!,
          quantity: item.batchQuantity!,
          unitPrice: parseFloat(item.batchUnitPrice!),
        });
      } else {
        // FOB模式
        apiItem.fobQuantity = item.fobQuantity!;
        apiItem.fobUnitPrice = parseFloat(item.fobUnitPrice!);
      }
    });

    const items = Array.from(itemsMap.values());

    createQuotationMutation.mutate({
      customerId,
      quotationMode,
      currency,
      contactPerson,
      contactPhone,
      contactEmail,
      shippingAddress,
      notes,
      validUntil,
      items,
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/quotations">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">创建报价单</h1>
            <p className="text-sm text-muted-foreground">填写报价单信息并添加产品</p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={createQuotationMutation.isPending}>
          {createQuotationMutation.isPending ? "保存中..." : "保存报价单"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：基本信息 */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SmartCodeInput
                label="报价单编号"
                ruleType="quotation"
                value={quotationNumber}
                onChange={setQuotationNumber}
                required
              />

              <div>
                <Label>客户 *</Label>
                <CustomerSearchCombobox
                  customers={customers?.map((c): CustomerSearchItem => ({
                    id: c.id,
                    name: c.companyName,
                    country: c.country || undefined,
                    city: c.city || undefined,
                  })) || []}
                  value={customerId || undefined}
                  onSelect={(id) => {
                    setCustomerId(id);
                    // 选择客户后，useEffect会自动加载文件抬头信息
                  }}
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
                <Label>有效期至</Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
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
                  placeholder="报价单备注信息"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：产品选择和报价单列表 */}
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSkuSearch();
                    }
                  }}
                />
                <Button
                  onClick={handleSkuSearch}
                  disabled={isSearching || !customerId}
                >
                  {isSearching ? "搜索中..." : "搜索"}
                </Button>
              </div>

              {/* 搜索历史记录 */}
              {searchHistory.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">📜 最近搜索</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearHistory}
                      className="h-7 text-xs"
                    >
                      清除历史
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {searchHistory.map((item, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSearchFromHistory(item.sku)}
                        className="h-8 text-xs"
                      >
                        <span className="font-medium">{item.sku}</span>
                        {item.productName && (
                          <span className="ml-1 text-muted-foreground">({item.productName})</span>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* 搜索结果列表 */}
              {skuSearchResults.length > 0 && (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>产品名称</TableHead>
                        <TableHead>批次号</TableHead>
                        <TableHead>供应商SKU</TableHead>
                        <TableHead>客户SKU</TableHead>
                        <TableHead>生产状态</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {skuSearchResults.map((result) => (
                        <TableRow key={result.variantId}>
                          <TableCell>{result.productName}</TableCell>
                          <TableCell>{result.variantCode}</TableCell>
                          <TableCell>{result.supplierSku || '-'}</TableCell>
                          <TableCell>{result.customerSku || '-'}</TableCell>
                          <TableCell>{result.productionStatus}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleAddFromSkuSearch(result)}
                            >
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
                    price: item.defaultVariant?.variant?.sellingPriceFOB?.toString() || undefined,
                    currency: "USD",
                    image: item.firstImage?.imageUrl || undefined,
                    cbm: item.defaultVariant?.totalCbm || undefined,
                    grossWeight: item.defaultVariant?.totalGrossWeight || undefined,
                    netWeight: item.defaultVariant?.totalNetWeight || undefined,
                    variantCode: item.defaultVariant?.variant?.variantCode || undefined,
                  })) || []}
                  value={selectedProductId || undefined}
                  onSelect={(id) => handleProductChange(id.toString())}
                  placeholder="搜索产品..."
                />
              </div>

              {/* 模式选择 */}
              {selectedProductId && (
                <div>
                  <Label>报价模式 *</Label>
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
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            新建批次
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
                  onClick={handleAddToQuotation}
                  className="w-full"
                  size="lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  添加到报价单
                </Button>
              )}
            </CardContent>
          </Card>

          {/* 报价单明细列表 */}
          <Card>
            <CardHeader>
              <CardTitle>报价单明细</CardTitle>
              <CardDescription>
                已添加 {quotationItems.length} 个产品，总额: {currency} {totalAmount.toFixed(2)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {quotationItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>暂无产品，请在上方添加产品</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
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
                    {quotationItems.map((item) => (
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
                            {item.materialColor && (
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
                            )}
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
                    {/* 总计行 */}
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell colSpan={6} className="text-right">总计</TableCell>
                      <TableCell className="text-right font-bold">{currency} {totalAmount.toFixed(2)}</TableCell>
                       <TableCell className="text-right font-bold">
                         {quotationItems.reduce((sum, item) => sum + (item.cbm || 0) * (item.batchQuantity || item.fobQuantity || 0), 0).toFixed(3)} m³
                       </TableCell>
                       <TableCell className="text-right font-bold">
                         {quotationItems.reduce((sum, item) => sum + (item.grossWeight || 0) * (item.batchQuantity || item.fobQuantity || 0), 0).toFixed(2)} kg
                       </TableCell>
                       <TableCell className="text-right font-bold">
                         {quotationItems.reduce((sum, item) => sum + (item.netWeight || 0) * (item.batchQuantity || item.fobQuantity || 0), 0).toFixed(2)} kg
                       </TableCell>
                       <TableCell className="text-right font-bold">
                         {quotationItems.reduce((sum, item) => {
                           const qty = item.batchQuantity || item.fobQuantity || 0;
                           const ppb = item.piecesPerBox || 1;
                           return sum + Math.ceil(qty / ppb);
                         }, 0)} 箱
                       </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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
