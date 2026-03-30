import React, { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";"wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Copy, Edit, Trash2, Package, Star, Search } from "lucide-react";
import { toast } from "sonner";
import { ColorIcon } from "@/components/ColorIcon";
import VariantDetail from "@/pages/VariantDetail";
import { VariantMaterialsManager } from "@/components/VariantMaterialsManager";
import { PackageBoxesManager } from "@/components/PackageBoxesManager";
import AttributeSelector from "@/components/AttributeSelector";

interface ProductVariantsProps {
  productId: number;
  productSku: string;
  productImageUrl?: string;
}

export default function ProductVariants({ productId, productSku, productImageUrl }: ProductVariantsProps) {
  const utils = trpc.useUtils();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<number | null>(null);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [duplicatingVariantId, setDuplicatingVariantId] = useState<number | null>(null);
  const [duplicateVariantName, setDuplicateVariantName] = useState("");
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [detailVariantId, setDetailVariantId] = useState<number | null>(null);
  
  // 搜索和筛选state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [variantTypeFilter, setVariantTypeFilter] = useState<string>("all");
  const [showMyVariants, setShowMyVariants] = useState(false);
  
  // FOB价格排序 state
  const [fobPriceSortOrder, setFobPriceSortOrder] = useState<"asc" | "desc" | null>(null);
  
  // 颜色选择state
  const [colorSearchQuery, setColorSearchQuery] = useState("");
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  
  // 添加更多材料对话框state
  const [addMaterialType, setAddMaterialType] = useState<string[]>([]);
  const [addMaterialSearchQuery, setAddMaterialSearchQuery] = useState("");
  
  // 动态对话框宽度state
  const [dialogMaxWidth, setDialogMaxWidth] = useState("1600px");
  const [showAddMaterialDropdown, setShowAddMaterialDropdown] = useState(false);
  const [addMaterialSelectedColorId, setAddMaterialSelectedColorId] = useState<number | null>(null);
  
  // 包装信息未保存状态（用于显示 Tab 圆点提示）
  const [packagingDirty, setPackagingDirty] = useState(false);

  const [formData, setFormData] = useState<{
    variantName: string;
    fabricChange: string;
    legTypeChange: string;
    heightChange: string;
    packagingChange: string;
    otherChanges: string;
    productLength: string;
    productWidth: string;
    productHeight: string;
    packageLength: string;
    packageWidth: string;
    packageHeight: string;
    cbm: string;
    variantType: "universal" | "exclusive";
    productionStatus: "designing" | "sampling" | "production" | "completed";
    supplierId: string;
    supplierSku: string;
    customerId: string;
    customerSku: string;
    sellingPriceRMB: string;
    sellingPriceFOB: string;
    costPriceRMB: string;
    linkedCustomerIds: number[];
    materialColorId: number | null;
    materials: Array<{
      materialColorId: number;
      materialType: string;
      sortOrder: number;
    }>;  }>({
    variantName: "",
    fabricChange: "",
    legTypeChange: "",
    heightChange: "",
    packagingChange: "",
    otherChanges: "",
    productLength: "",
    productWidth: "",
    productHeight: "",
    packageLength: "",
    packageWidth: "",
    packageHeight: "",
    cbm: "",
    variantType: "universal",
    productionStatus: "designing",
    supplierId: "",
    supplierSku: "",
    customerId: "",
    customerSku: "",
    sellingPriceRMB: "",
    sellingPriceFOB: "",
    costPriceRMB: "",
    linkedCustomerIds: [],
    materialColorId: null,
    materials: [],
  });
  // 查询批次列表（产品页面使用showAll=true，显示全部客户的批次）
  const { data: variantsData, isLoading } = trpc.productVariants.getAll.useQuery({
    productId,
    search: searchTerm,
    page: 1,
    pageSize: 100,
    showAll: true, // 产品页面显示全部批次，包括客户专属批次
  });
  
  // 查询客户列表用于筛选
  const { data: customersData } = trpc.customerManagement.companies.list.useQuery({});
  
  // 查询供应商列表
  const { data: suppliersData } = trpc.suppliers.list.useQuery();
  
  // 查询产品供应商关联
  const { data: productSuppliersData = [] } = trpc.products.getSuppliers.useQuery({ productId });
  
  // 查询材料类型列表（动态加载）
  const { data: materialTypesData } = trpc.materialTypes.list.useQuery();
  
  // 查询“添加新材料”对话框的颜色列表（根据材料类型过滤）
  const selectedMaterialTypeName = addMaterialType.length > 0 ? addMaterialType[0] : null;
  const selectedMaterialType = useMemo(() => {
    if (!selectedMaterialTypeName || !materialTypesData) return null;
    return materialTypesData.find((type: any) => type.name === selectedMaterialTypeName);
  }, [selectedMaterialTypeName, materialTypesData]);
  
  const { data: addMaterialColorsData } = trpc.materials.colors.list.useQuery(
    {
      materialTypeId: selectedMaterialType?.id,
    },
    {
      enabled: !!selectedMaterialType, // 只有选择了材料类型才查询
    }
  );
  
  // 根据搜索词过滤“添加新材料”对话框的颜色列表
  const filteredAddMaterialColors = useMemo(() => {
    if (!addMaterialColorsData) return [];
    if (!addMaterialSearchQuery) return addMaterialColorsData;
    
    const query = addMaterialSearchQuery.toLowerCase();
    return addMaterialColorsData.filter((item: any) => {
      const supplierCode = item.supplier?.code?.toLowerCase() || '';
      const boardNumber = item.board?.boardNumber?.toLowerCase() || '';
      const colorCode = item.color?.colorCode?.toLowerCase() || '';
      const colorName = item.color?.colorName?.toLowerCase() || '';
      
      return supplierCode.includes(query) || 
             boardNumber.includes(query) || 
             colorCode.includes(query) || 
             colorName.includes(query);
    });
  }, [addMaterialColorsData, addMaterialSearchQuery]);
  
  // 查询颜色列表（不传search参数，返回所有颜色）
  const { data: allColorsData } = trpc.materials.colors.list.useQuery({});
  
  // 根据搜索词过滤颜色
  const colorsData = useMemo(() => {
    if (!allColorsData) return undefined;
    if (!colorSearchQuery) return allColorsData;
    
    const query = colorSearchQuery.toLowerCase();
    return allColorsData.filter((item: any) => {
      const supplierCode = item.supplier?.code?.toLowerCase() || '';
      const boardNumber = item.board?.boardNumber?.toLowerCase() || '';
      const colorCode = item.color?.colorCode?.toLowerCase() || '';
      const colorName = item.color?.colorName?.toLowerCase() || '';
      
      return supplierCode.includes(query) || 
             boardNumber.includes(query) || 
             colorCode.includes(query) || 
             colorName.includes(query);
    });
  }, [allColorsData, colorSearchQuery]);
  
  // 获取选中的颜色详情
  const selectedColor = useMemo(() => {
    if (!formData.materialColorId || !colorsData) return null;
    return colorsData.find((item: any) => item.color.id === formData.materialColorId);
  }, [formData.materialColorId, colorsData]);
  
  // 获取添加材料对话框中选中的颜色详情
  const addMaterialSelectedColor = useMemo(() => {
    if (!addMaterialSelectedColorId || !addMaterialColorsData) return null;
    return addMaterialColorsData.find((item: any) => item.color.id === addMaterialSelectedColorId);
  }, [addMaterialSelectedColorId, addMaterialColorsData]);

  // 动态检测屏幕宽度并设置对话框最大宽度
  useEffect(() => {
    const updateDialogWidth = () => {
      const windowWidth = window.innerWidth;
      const sidebarWidth = 240; // 左侧导航栏宽度
      const contentWidth = windowWidth - sidebarWidth;
      
      if (contentWidth > 1600) {
        setDialogMaxWidth("1600px");
      } else if (contentWidth > 1280) {
        setDialogMaxWidth("90%");
      } else {
        setDialogMaxWidth("95%");
      }
    };
    
    updateDialogWidth();
    window.addEventListener('resize', updateDialogWidth);
    
    return () => window.removeEventListener('resize', updateDialogWidth);
  }, []);
  
  // 自动添加默认ORIG材料到materials数组（当打开创建对话框且materials为空时）
  useEffect(() => {
    if (isCreateDialogOpen && formData.materials.length === 0 && colorsData && colorsData.length > 0) {
      // 查找系统默认颜色（colorCode = 'ORIG'）
      const defaultColor = colorsData.find((item: any) => item.color.colorCode === 'ORIG');
      if (defaultColor) {
        setFormData(prev => ({
          ...prev,
          materialColorId: defaultColor.color.id,
          materials: [{
            materialColorId: defaultColor.color.id,
            materialType: "fabric",
            sortOrder: 0,
          }],
        }));
      }
    }
  }, [isCreateDialogOpen, colorsData]);

  // 排序供应商列表：主供应商和备选供应商置顶
  const sortedSuppliers = useMemo(() => {
    if (!suppliersData || !productSuppliersData) return { prioritySuppliers: [], otherSuppliers: [] };

    const productSupplierIds = new Set(productSuppliersData.map((ps: any) => ps.supplierId));
    const primarySupplier = productSuppliersData.find((ps: any) => ps.isPrimary);
    const alternateSuppliers = productSuppliersData.filter((ps: any) => !ps.isPrimary);

    const prioritySuppliers: any[] = [];
    const otherSuppliers: any[] = [];

    // 首先添加主供应商
    if (primarySupplier) {
      const supplier = suppliersData.find((s: any) => s.id === primarySupplier.supplierId);
      if (supplier) {
        prioritySuppliers.push({ ...supplier, isPrimary: true });
      }
    }

    // 然后添加备选供应商
    alternateSuppliers.forEach((ps: any) => {
      const supplier = suppliersData.find((s: any) => s.id === ps.supplierId);
      if (supplier) {
        prioritySuppliers.push({ ...supplier, isAlternate: true });
      }
    });

    // 最后添加其他供应商
    suppliersData.forEach((supplier: any) => {
      if (!productSupplierIds.has(supplier.id)) {
        otherSuppliers.push(supplier);
      }
    });

    return { prioritySuppliers, otherSuppliers };
  }, [suppliersData, productSuppliersData]);

  // 添加批次材料
  const addVariantMaterial = trpc.variantMaterials.add.useMutation();

  // 创建批次
  const createVariant = trpc.productVariants.create.useMutation({
    onSuccess: async (newVariant) => {
      // 如果有材料清单，批量添加材料
      if (formData.materials.length > 0) {
        try {
          for (const material of formData.materials) {
            await addVariantMaterial.mutateAsync({
              variantId: newVariant.id,
              materialColorId: material.materialColorId,
              materialType: material.materialType,
              sortOrder: material.sortOrder,
            });
          }
          toast.success("批次创建成功", {
            description: `新批次已成功创建，并添加了 ${formData.materials.length} 个材料`,
          });
        } catch (error: any) {
          toast.error("材料添加失败", {
            description: error.message,
          });
        }
      } else {
        toast.success("批次创建成功", {
          description: "新批次已成功创建",
        });
      }
      utils.productVariants.getAll.invalidate();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("创建失败", {
        description: error.message,
      });
    },
  });

  // 复制批次
  const duplicateVariant = trpc.productVariants.duplicate.useMutation({
    onSuccess: () => {
      toast.success("批次复制成功", {
        description: "批次已成功复制",
      });
      utils.productVariants.getAll.invalidate();
    },
    onError: (error) => {
      toast.error("复制失败", {
        description: error.message,
      });
    },
  });

  // 更新批次
  const updateVariant = trpc.productVariants.update.useMutation({
    onSuccess: () => {
      toast.success("批次更新成功", {
        description: "批次已成功更新",
      });
      utils.productVariants.getAll.invalidate();
      setIsEditDialogOpen(false);
      setEditingVariantId(null);
      resetForm();
      setPackagingDirty(false);
    },
    onError: (error) => {
      toast.error("更新失败", {
        description: error.message,
      });
    },
  });

  // 删除批次
  const deleteVariant = trpc.productVariants.delete.useMutation({
    onSuccess: () => {
      toast.success("批次删除成功", {
        description: "批次已成功删除",
      });
      utils.productVariants.getAll.invalidate();
    },
    onError: (error) => {
      toast.error("删除失败", {
        description: error.message,
      });
      // 删除失败时也刷新列表，防止缓存过期导致已删除的批次仍显示
      utils.productVariants.getAll.invalidate();
    },
  });

  // 设为默认批次
  const setDefaultVariant = trpc.productVariants.setDefault.useMutation({
    onSuccess: () => {
      toast.success("设置成功", {
        description: "已将此批次设为默认批次",
      });
      utils.productVariants.getAll.invalidate();
    },
    onError: (error) => {
      toast.error("设置失败", {
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setFormData({
      variantName: "",
      fabricChange: "",
      legTypeChange: "",
      heightChange: "",
      packagingChange: "",
      otherChanges: "",
      productLength: "",
      productWidth: "",
      productHeight: "",
      packageLength: "",
      packageWidth: "",
      packageHeight: "",
      cbm: "",
      variantType: "universal",
      productionStatus: "designing",
      supplierId: "",
      supplierSku: "",
      customerId: "",
      customerSku: "",
      sellingPriceRMB: "",
      sellingPriceFOB: "",
      costPriceRMB: "",
      linkedCustomerIds: [],
      materialColorId: null,
      materials: [],
    });
  };

  const handleSubmit = () => {
    if (!formData.variantName.trim()) {
      toast.error("请填写批次名称");
      return;
    }

    // 计算或获取CBM
    let cbmValue: number | null | undefined;
    if (formData.packageLength && formData.packageWidth && formData.packageHeight) {
      // 如果包装尺寸都已填写，使用自动计算的CBM
      cbmValue = parseFloat(formData.packageLength) * parseFloat(formData.packageWidth) * parseFloat(formData.packageHeight);
    } else if (formData.cbm) {
      // 如果包装尺寸未填写，使用手动输入的CBM
      cbmValue = parseFloat(formData.cbm);
    } else if (editingVariantId) {
      // 编辑模式下，如果包装尺寸和手动CBM都为空，则清除CBM
      cbmValue = null;
    }

    // 获取外箱数据和包装方式（创建和编辑模式都需要）
    let packageBoxes: any[] | undefined = undefined;
    let packagingType: string | undefined = undefined;
    let piecesPerBox: number | undefined = undefined;
    if ((window as any).__packageBoxesManager) {
      const boxesData = (window as any).__packageBoxesManager.getBoxesData();
      packagingType = (window as any).__packageBoxesManager.getPackagingType();
      piecesPerBox = (window as any).__packageBoxesManager.getPiecesPerBox();
      
      if (boxesData && boxesData.length > 0) {
        packageBoxes = boxesData.map((box: any) => ({
          length: parseFloat(box.length) || 0,
          width: parseFloat(box.width) || 0,
          height: parseFloat(box.height) || 0,
          cbm: box.manualCBM ? parseFloat(box.cbm) : undefined, // 手动输入CBM时传递cbm值
          grossWeight: parseFloat(box.grossWeight || "0"),
          netWeight: parseFloat(box.netWeight || "0"),
          packagingType: packagingType || 'single',
          piecesPerBox: piecesPerBox || 1,
        }));
      }
    }

    const data = {
      productId,
      variantName: formData.variantName,
      fabricChange: formData.fabricChange,
      legTypeChange: formData.legTypeChange,
      heightChange: formData.heightChange,
      packagingChange: formData.packagingChange,
      otherChanges: formData.otherChanges,
      productLength: formData.productLength ? parseFloat(formData.productLength) : (editingVariantId ? null : undefined),
      productWidth: formData.productWidth ? parseFloat(formData.productWidth) : (editingVariantId ? null : undefined),
      productHeight: formData.productHeight ? parseFloat(formData.productHeight) : (editingVariantId ? null : undefined),
      packageLength: formData.packageLength ? parseFloat(formData.packageLength) : (editingVariantId ? null : undefined),
      packageWidth: formData.packageWidth ? parseFloat(formData.packageWidth) : (editingVariantId ? null : undefined),
      packageHeight: formData.packageHeight ? parseFloat(formData.packageHeight) : (editingVariantId ? null : undefined),
      cbm: cbmValue,
      variantType: formData.variantType,
      productionStatus: formData.productionStatus,
      supplierId: formData.supplierId && formData.supplierId !== "none" ? parseInt(formData.supplierId) : undefined,
      supplierSku: formData.supplierSku || undefined,
      customerId: formData.customerId && formData.customerId !== "none" ? parseInt(formData.customerId) : undefined,
      customerSku: formData.customerSku || undefined,
      sellingPriceRMB: formData.sellingPriceRMB ? parseFloat(formData.sellingPriceRMB) : undefined,
      sellingPriceFOB: formData.sellingPriceFOB ? parseFloat(formData.sellingPriceFOB) : undefined,
      costPriceRMB: formData.costPriceRMB ? parseFloat(formData.costPriceRMB) : undefined,
      materialColorId: formData.materialColorId ? formData.materialColorId : undefined,
      packageBoxes,
    };

    if (editingVariantId) {
      // 编辑模式：先调用 saveAllBoxes 保存外箱数据，再更新批次信息
      if ((window as any).__packageBoxesManager?.saveAllBoxes) {
        (window as any).__packageBoxesManager.saveAllBoxes().catch(() => {
          // 外箱保存失败不阻断批次保存
        });
      }
      updateVariant.mutate({ id: editingVariantId, ...data });
    } else {
      createVariant.mutate(data);
    }
  };

  // 材料管理函数
  const handleAddMaterial = (materialColorId: number) => {
    // 检查是否已经添加过这个材料
    if (formData.materials.some(m => m.materialColorId === materialColorId)) {
      toast.error("此材料已在清单中");
      return;
    }

    const newMaterial = {
      materialColorId,
      materialType: addMaterialType.length > 0 ? addMaterialType[0] : "fabric", // 使用选中的材料类型，默认为fabric
      sortOrder: formData.materials.length, // 排在最后
    };

    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, newMaterial],
    }));
  };

  const handleDeleteMaterial = (materialColorId: number) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter(m => m.materialColorId !== materialColorId),
    }));
  };

  const handleMoveMaterialUp = (index: number) => {
    if (index === 0) return; // 已经是第一个，不能上移

    setFormData(prev => {
      const newMaterials = [...prev.materials];
      // 交换位置
      [newMaterials[index - 1], newMaterials[index]] = [newMaterials[index], newMaterials[index - 1]];
      // 更新sortOrder
      newMaterials.forEach((m, i) => {
        m.sortOrder = i;
      });
      return {
        ...prev,
        materials: newMaterials,
      };
    });
  };

  const handleMoveMaterialDown = (index: number) => {
    if (index === formData.materials.length - 1) return; // 已经是最后一个，不能下移

    setFormData(prev => {
      const newMaterials = [...prev.materials];
      // 交换位置
      [newMaterials[index], newMaterials[index + 1]] = [newMaterials[index + 1], newMaterials[index]];
      // 更新sortOrder
      newMaterials.forEach((m, i) => {
        m.sortOrder = i;
      });
      return {
        ...prev,
        materials: newMaterials,
      };
    });
  };

  const handleDuplicate = (variantId: number) => {
    const variant = filteredVariants.find(v => v.variant.id === variantId);
    if (variant) {
      // 生成建议的名称（前端临时生成，后端会再次验证）
      const baseName = variant.variant.variantName;
      const baseNameMatch = baseName.match(/^(.+?)\s*(?:\((\d+)\)|（副本）)?$/);
      const cleanBaseName = baseNameMatch ? baseNameMatch[1].trim() : baseName;
      
      // 查找当前最大的编号
      const existingNumbers: number[] = [];
      filteredVariants.forEach(v => {
        if (v.variant.variantName === cleanBaseName) {
          existingNumbers.push(1);
        } else {
          const match = v.variant.variantName.match(/\((\d+)\)$/);
          if (match && v.variant.variantName.startsWith(cleanBaseName)) {
            existingNumbers.push(parseInt(match[1]));
          }
        }
      });
      
      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 2;
      const suggestedName = `${cleanBaseName} (${nextNumber})`;
      
      setDuplicatingVariantId(variantId);
      setDuplicateVariantName(suggestedName);
      setIsDuplicateDialogOpen(true);
    }
  };
  
  const confirmDuplicate = () => {
    if (duplicatingVariantId) {
      duplicateVariant.mutate({ 
        id: duplicatingVariantId,
        customName: duplicateVariantName.trim() || undefined
      });
      setIsDuplicateDialogOpen(false);
      setDuplicatingVariantId(null);
      setDuplicateVariantName("");
    }
  };

  const handleDelete = (variantId: number) => {
    if (confirm("确定要删除这个批次吗？此操作不可恢复。")) {
      deleteVariant.mutate({ id: variantId });
    }
  };

  const handleSetDefault = (variantId: number) => {
    setDefaultVariant.mutate({ variantId });
  };

  const handleEdit = async (variantId: number) => {
    const variant = filteredVariants.find(v => v.variant.id === variantId);
    if (variant) {
      try {
        // 先设置formData和打开对话框
        setFormData({
          variantName: variant.variant.variantName,
          fabricChange: variant.variant.fabricChange || "",
          legTypeChange: variant.variant.legTypeChange || "",
          heightChange: variant.variant.heightChange || "",
          packagingChange: variant.variant.packagingChange || "",
          otherChanges: variant.variant.otherChanges || "",
          productLength: variant.variant.productLength?.toString() || "",
          productWidth: variant.variant.productWidth?.toString() || "",
          productHeight: variant.variant.productHeight?.toString() || "",
          packageLength: variant.variant.packageLength?.toString() || "",
          packageWidth: variant.variant.packageWidth?.toString() || "",
          packageHeight: variant.variant.packageHeight?.toString() || "",
          cbm: variant.variant.cbm?.toString() || "",
          variantType: variant.variant.variantType as "universal" | "exclusive",
          productionStatus: variant.variant.productionStatus as "designing" | "sampling" | "production" | "completed",
          supplierId: variant.variant.supplierId?.toString() || "",
          supplierSku: variant.variant.supplierSku || "",
          customerId: variant.variant.customerId?.toString() || "",
          customerSku: variant.variant.customerSku || "",
          sellingPriceRMB: variant.variant.sellingPriceRMB?.toString() || "",
          sellingPriceFOB: variant.variant.sellingPriceFOB?.toString() || "",
          costPriceRMB: variant.variant.costPriceRMB?.toString() || "",
          linkedCustomerIds: variant.customers?.map((c: any) => c.id) || [],
          materialColorId: variant.variant.materialColorId || null,
          materials: [], // 先设置为空，等待异步加载
        });
        setEditingVariantId(variantId);
        setIsEditDialogOpen(true);
        
        // 异步加载材料清单
        const variantMaterials = await utils.variantMaterials.list.fetch({ variantId });
        
        // 将材料转换为formData格式
        const materials = variantMaterials.map((vm: any, index: number) => ({
          materialColorId: vm.materialColorId,
          materialType: vm.materialType || "fabric",
          sortOrder: vm.sortOrder !== undefined ? vm.sortOrder : index,
        }));
        
        // 更新materials
        setFormData(prev => ({
          ...prev,
          materials: materials,
        }));
      } catch (error) {
        console.error('[ERROR] Failed to load variant materials:', error);
        toast.error("加载批次材料清单失败，请重试");
        // 即使加载失败，也保持对话框打开，用户可以手动添加材料
      }
    }
  };

  // 计算CBM
  const calculateCBM = () => {
    const length = parseFloat(formData.packageLength);
    const width = parseFloat(formData.packageWidth);
    const height = parseFloat(formData.packageHeight);
    
    if (length && width && height) {
      return (length * width * height).toFixed(2);
    }
    return "-";
  };
  
  // 搜索处理
  const handleSearch = () => {
    setSearchTerm(searchInput);
  };
  
  // 重置筛选
  const handleReset = () => {
    setSearchInput("");
    setSearchTerm("");
    setSelectedCustomer("all");
    setDateFilter("all");
    setShowMyVariants(false);
  };
  
  // Sort variants: default batch always first, then by FOB price if sorting is enabled
  const sortedVariants = React.useMemo(() => {
    if (!variantsData?.variants) return [];
    return [...variantsData.variants].sort((a, b) => {
      // Default batch always comes first
      if (a.variant.isDefault && !b.variant.isDefault) return -1;
      if (!a.variant.isDefault && b.variant.isDefault) return 1;
      
      // FOB价格排序（如果启用）
      if (fobPriceSortOrder) {
        const priceA = a.variant.sellingPriceFOB ?? null;
        const priceB = b.variant.sellingPriceFOB ?? null;
        
        // 未设置FOB价格的批次排在最后
        if (priceA === null && priceB !== null) return 1;
        if (priceA !== null && priceB === null) return -1;
        if (priceA === null && priceB === null) return 0;
        
        // 按价格排序
        if (fobPriceSortOrder === "asc") {
          return Number(priceA) - Number(priceB);
        } else {
          return Number(priceB) - Number(priceA);
        }
      }
      
      // Otherwise maintain original order
      return 0;
    });
  }, [variantsData?.variants, fobPriceSortOrder]);
  
  // 客户端筛选逻辑
  const filteredVariants = sortedVariants.filter(item => {
    // 客户筛选
    if (selectedCustomer !== "all") {
      const customerId = parseInt(selectedCustomer);
      const directMatch = item.customer?.id === customerId;
      const linkedMatch = (item.customers as any[])?.some((c: any) => c?.id === customerId);
      if (!directMatch && !linkedMatch) return false;
    }
    // 批次类型筛选（专属/通用）
    if (variantTypeFilter !== "all") {
      if (item.variant.variantType !== variantTypeFilter) return false;
    }
    // 时间筛选
    if (dateFilter !== "all") {
      const createdDate = new Date(item.variant.createdAt);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dateFilter === "week" && diffDays > 7) return false;
      if (dateFilter === "month" && diffDays > 30) return false;
      if (dateFilter === "quarter" && diffDays > 90) return false;
    }
    
    return true;
  });

  return (
    <div className="space-y-6">
      <Card className="max-w-[1600px]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>批次列表</CardTitle>
              <CardDescription>
                共 {filteredVariants.length} 个批次
              </CardDescription>
            </div>
            <Button onClick={() => {
              // 打开Dialog前，自动填充产品的主供应商
              const primarySupplier = productSuppliersData.find((ps: any) => ps.isPrimary);
              if (primarySupplier) {
                setFormData(prev => ({
                  ...prev,
                  supplierId: primarySupplier.supplierId.toString(),
                }));
              }
              setIsCreateDialogOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              新建批次
            </Button>
          </div>
          
          {/* 搜索和筛选区域 */}
          <div className="mt-4 space-y-3">
            {/* 搜索框 */}
            <div className="flex gap-2">
              <Input
                placeholder="搜索批次编号或变更说明..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="max-w-sm"
              />
              <Button onClick={handleSearch} variant="secondary">
                搜索
              </Button>
              <Button onClick={handleReset} variant="outline">
                重置
              </Button>
            </div>
            
            {/* 筛选器 */}
            <div className="flex gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-sm">客户:</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部客户</SelectItem>
                    {customersData?.data?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Label className="text-sm">类型:</Label>
                <Select value={variantTypeFilter} onValueChange={setVariantTypeFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    <SelectItem value="universal">通用批次</SelectItem>
                    <SelectItem value="exclusive">客户专属</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-sm">创建时间:</Label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部时间</SelectItem>
                    <SelectItem value="week">最近一周</SelectItem>
                    <SelectItem value="month">最近一月</SelectItem>
                    <SelectItem value="quarter">最近三月</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              加载中...
            </div>
          ) : filteredVariants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无批次</p>
              <Button
                className="mt-4"
                onClick={() => {
                  // 打开Dialog前，自动填充产品的主供应商
                  const primarySupplier = productSuppliersData.find((ps: any) => ps.isPrimary);
                  if (primarySupplier) {
                    setFormData(prev => ({
                      ...prev,
                      supplierId: primarySupplier.supplierId.toString(),
                    }));
                  }
                  setIsCreateDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                创建第一个批次
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>批次编号</TableHead>
                  <TableHead>批次名称</TableHead>
                  <TableHead>
                    <button
                      onClick={() => {
                        if (fobPriceSortOrder === null) {
                          setFobPriceSortOrder("desc"); // 第一次点击：降序
                        } else if (fobPriceSortOrder === "desc") {
                          setFobPriceSortOrder("asc"); // 第二次点击：升序
                        } else {
                          setFobPriceSortOrder(null); // 第三次点击：取消排序
                        }
                      }}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      FOB价格
                      {fobPriceSortOrder === "desc" && <span className="text-xs">↓</span>}
                      {fobPriceSortOrder === "asc" && <span className="text-xs">↑</span>}
                      {fobPriceSortOrder === null && <span className="text-xs text-muted-foreground">↕</span>}
                    </button>
                  </TableHead>
                  <TableHead>总CBM</TableHead>
                  <TableHead>总毛重</TableHead>
                  <TableHead>总净重</TableHead>
                  <TableHead>布料颜色</TableHead>
                  <TableHead>供应商</TableHead>
                  <TableHead>客户</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVariants.map((item) => (
                  <TableRow 
                    key={item.variant.id}
                    className={`group ${item.variant.isDefault ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-4 flex-shrink-0">
                          {item.variant.isDefault && (
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                          )}
                        </div>
                        <code 
                          className="text-sm bg-muted px-2 py-1 rounded"
                        >
                          {item.variant.variantCode}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(item.variant.variantCode);
                            toast.success('批次号已复制到剪贴板');
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.variant.variantName}
                    </TableCell>
                    <TableCell>
                      {item.variant.sellingPriceFOB
                        ? `$${Number(item.variant.sellingPriceFOB).toFixed(2)}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {item.totalCBM
                        ? `${Number(item.totalCBM).toFixed(2)} m³`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {item.totalGrossWeight
                        ? `${Number(item.totalGrossWeight).toFixed(2)} kg`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {item.totalNetWeight
                        ? `${Number(item.totalNetWeight).toFixed(2)} kg`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {item.materialColor ? (
                        <ColorIcon
                          imageUrl={item.materialColor.color.imageUrl}
                          colorCode={item.materialColor.color.colorCode}
                          colorName={item.materialColor.color.colorName}
                          size="sm"
                        />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.supplier?.supplierName || "暂无"}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        // 合并直接关联客户和通过variant_customer_links关联的客户，去重
                        const allCustomers: any[] = [];
                        if (item.customers && (item.customers as any[]).length > 0) {
                          allCustomers.push(...(item.customers as any[]).filter(Boolean));
                        } else if (item.customer) {
                          allCustomers.push(item.customer);
                        }
                        const uniqueCustomers = allCustomers.filter((c, idx, arr) => 
                          c && arr.findIndex((x: any) => x?.id === c?.id) === idx
                        );
                        if (uniqueCustomers.length === 0) {
                          return <span className="text-muted-foreground">-</span>;
                        }
                        return (
                          <div className="flex flex-wrap gap-1">
                            {uniqueCustomers.map((c: any) => (
                              <Badge key={c.id} variant="outline" className="text-xs">
                                {c.companyName}
                              </Badge>
                            ))}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.variant.variantType === "universal"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {item.variant.variantType === "universal"
                          ? "通用"
                          : "专属"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* 星标位置占位，保持所有行按钮对齐 */}
                        <div className="w-9">
                          {!item.variant.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetDefault(item.variant.id)}
                              title="设为默认批次"
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicate(item.variant.id)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item.variant.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.variant.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 新建批次对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="!h-[1200px] max-h-[95vh] overflow-y-auto" style={{ width: dialogMaxWidth, maxWidth: dialogMaxWidth }}>
          <DialogHeader>
            <DialogTitle>新建批次</DialogTitle>
            <DialogDescription>
              为产品 {productSku} 创建新的批次/变形
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="flex-1">
            <TabsList className="mb-4">
              <TabsTrigger value="basic">基本信息</TabsTrigger>
              <TabsTrigger value="packaging">包装信息</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
          <div className="grid grid-cols-2 gap-10">
            {/* 左列：基本信息 + 变更说明 */}
            <div className="space-y-6">
              {/* 基本信息 */}
            <div className="space-y-4">
              <h3 className="font-semibold mb-4">基本信息</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="variantName">
                    批次名称 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="variantName"
                    value={formData.variantName}
                    onChange={(e) =>
                      setFormData({ ...formData, variantName: e.target.value })
                    }
                    placeholder="例如：高背版、加厚布料版"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="variantType">批次类型</Label>
                  <Select
                    value={formData.variantType}
                    onValueChange={(value: "universal" | "exclusive") =>
                      setFormData({ ...formData, variantType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="universal">通用批次</SelectItem>
                      <SelectItem value="exclusive">客户专属</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="productionStatus">生产状态</Label>
                  <Select
                    value={formData.productionStatus}
                    onValueChange={(value: "designing" | "sampling" | "production" | "completed") =>
                      setFormData({ ...formData, productionStatus: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="designing">设计中</SelectItem>
                      <SelectItem value="sampling">打样中</SelectItem>
                      <SelectItem value="production">量产中</SelectItem>
                      <SelectItem value="completed">已完成</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="supplierId">供应商</Label>
                  <Select
                    value={formData.supplierId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, supplierId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择供应商" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无</SelectItem>
                      {/* 主供应商和备选供应商 */}
                      {sortedSuppliers.prioritySuppliers.map((supplier: any) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.isPrimary ? '⭐ ' : '🔹 '}{supplier.supplierName}
                        </SelectItem>
                      ))}
                      {/* 分隔线 */}
                      {sortedSuppliers.prioritySuppliers.length > 0 && sortedSuppliers.otherSuppliers.length > 0 && (
                        <SelectSeparator />
                      )}
                      {/* 其他供应商 */}
                      {sortedSuppliers.otherSuppliers.map((supplier: any) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.supplierName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="supplierSku">供应商SKU</Label>
                  <Input
                    id="supplierSku"
                    placeholder="输入供应商SKU（工厂SKU编号）"
                    value={formData.supplierSku}
                    onChange={(e) =>
                      setFormData({ ...formData, supplierSku: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="customerId">客户</Label>
                  <Select
                    value={formData.customerId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, customerId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择客户" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无</SelectItem>
                      {customersData?.data?.map((customer: any) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="customerSku">客户SKU</Label>
                  <Input
                    id="customerSku"
                    placeholder="输入客户SKU（客户系统SKU编号）"
                    value={formData.customerSku}
                    onChange={(e) =>
                      setFormData({ ...formData, customerSku: e.target.value })
                    }
                  />
                </div>

              </div>
            </div>

            {/* 变更说明 */}
            <div className="space-y-4">
              <h3 className="font-semibold mb-4">变更说明</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fabricChange">布料变更</Label>
                  <Input
                    id="fabricChange"
                    value={formData.fabricChange}
                    onChange={(e) =>
                      setFormData({ ...formData, fabricChange: e.target.value })
                    }
                    placeholder="例如：麻布改绒布"
                  />
                </div>
                <div>
                  <Label htmlFor="legTypeChange">脚型变更</Label>
                  <Input
                    id="legTypeChange"
                    value={formData.legTypeChange}
                    onChange={(e) =>
                      setFormData({ ...formData, legTypeChange: e.target.value })
                    }
                    placeholder="例如：木脚改金属脚"
                  />
                </div>
                <div>
                  <Label htmlFor="heightChange">高度变更</Label>
                  <Input
                    id="heightChange"
                    value={formData.heightChange}
                    onChange={(e) =>
                      setFormData({ ...formData, heightChange: e.target.value })
                    }
                    placeholder="例如：加高10cm"
                  />
                </div>
                <div>
                  <Label htmlFor="packagingChange">包装变更</Label>
                  <Input
                    id="packagingChange"
                    value={formData.packagingChange}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        packagingChange: e.target.value,
                      })
                    }
                    placeholder="例如：纸箱改木箱"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="otherChanges">其他变更</Label>
                  <Textarea
                    id="otherChanges"
                    value={formData.otherChanges}
                    onChange={(e) =>
                      setFormData({ ...formData, otherChanges: e.target.value })
                    }
                    placeholder="其他变更说明..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
            </div>

            {/* 右列：尺寸信息 + 价格信息 + 批次材料清单 */}
            <div className="space-y-6">
              {/* 尺寸信息 */}
            <div className="space-y-4">
              <h3 className="font-semibold mb-4">尺寸信息（单位：m）</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="productLength">产品长度</Label>
                  <Input
                    id="productLength"
                    type="number"
                    step="0.01"
                    value={formData.productLength}
                    onChange={(e) =>
                      setFormData({ ...formData, productLength: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="productWidth">产品宽度</Label>
                  <Input
                    id="productWidth"
                    type="number"
                    step="0.01"
                    value={formData.productWidth}
                    onChange={(e) =>
                      setFormData({ ...formData, productWidth: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="productHeight">产品高度</Label>
                  <Input
                    id="productHeight"
                    type="number"
                    step="0.01"
                    value={formData.productHeight}
                    onChange={(e) =>
                      setFormData({ ...formData, productHeight: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* 价格信息 */}
            <div className="space-y-4">
              <h3 className="font-semibold mb-4">价格信息</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="sellingPriceRMB">售价：RMB含税</Label>
                  <Input
                    id="sellingPriceRMB"
                    type="number"
                    step="0.01"
                    value={formData.sellingPriceRMB}
                    onChange={(e) =>
                      setFormData({ ...formData, sellingPriceRMB: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="sellingPriceFOB">售价：美金FOB</Label>
                  <Input
                    id="sellingPriceFOB"
                    type="number"
                    step="0.01"
                    value={formData.sellingPriceFOB}
                    onChange={(e) =>
                      setFormData({ ...formData, sellingPriceFOB: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="costPriceRMB">成本：RMB含税</Label>
                  <Input
                    id="costPriceRMB"
                    type="number"
                    step="0.01"
                    value={formData.costPriceRMB}
                    onChange={(e) =>
                      setFormData({ ...formData, costPriceRMB: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* 批次材料清单 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">批次材料清单</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      添加更多材料
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="!w-[600px] !h-[600px] !max-w-[600px] max-h-[95vh] overflow-y-auto !content-start">
                    <DialogHeader>
                      <DialogTitle>添加新材料</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 w-full">
                      {/* 材料类型选择 */}
                      <div>
                        <Label className="mb-2 block">材料类型</Label>
                        <AttributeSelector
                          category="材料管理"
                          subcategory="材料供应商"
                          fieldName="材料类型"
                          value={addMaterialType}
                          onChange={(value) => {
                            setAddMaterialType(value);
                            // 切换材料类型时清除当前选择的材料颜色
                            setAddMaterialSelectedColorId(null);
                            setAddMaterialSearchQuery("");
                          }}
                          multiple={false}
                          placeholder="选择或创建材料类型"
                        />
                      </div>
                      
                      {/* 材料颜色搜索 */}
                      <div>
                        <Label className="mb-2 block">材料颜色</Label>
                        <div className="relative">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="搜索供应商、布板或颜色编号..."
                              value={addMaterialSearchQuery}
                              onChange={(e) => setAddMaterialSearchQuery(e.target.value)}
                              onFocus={() => setShowAddMaterialDropdown(true)}
                              className="w-full pl-10"
                            />
                          </div>
                          
                          {/* 选中的颜色显示 */}
                          {addMaterialSelectedColor && (
                            <div className="mt-2 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <ColorIcon
                                imageUrl={addMaterialSelectedColor.color.imageUrl}
                                colorCode={addMaterialSelectedColor.color.colorCode}
                                colorName={addMaterialSelectedColor.color.colorName}
                                size="lg"
                              />
                              <div className="flex-1">
                                <div className="font-medium">
                                  {addMaterialSelectedColor.supplier!.code || 'N/A'} - {addMaterialSelectedColor.board!.boardNumber || 'N/A'} - {addMaterialSelectedColor.color.colorCode}
                                </div>
                                {addMaterialSelectedColor.color.colorName && (
                                  <div className="text-sm text-gray-500">{addMaterialSelectedColor.color.colorName}</div>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setAddMaterialSelectedColorId(null);
                                  setAddMaterialSearchQuery("");
                                }}
                              >
                                清除
                              </Button>
                            </div>
                          )}

                          {/* 颜色下拉列表 */}
                          {selectedMaterialType && showAddMaterialDropdown && (
                            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-[40rem] overflow-y-auto">
                              {filteredAddMaterialColors && filteredAddMaterialColors.length > 0 ? (
                                filteredAddMaterialColors.map((item: any) => {
                                  const isAdded = formData.materials.some(m => m.materialColorId === item.color.id);
                                  return (
                                    <div
                                      key={item.color.id}
                                      className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${
                                        isAdded ? 'opacity-50 cursor-not-allowed' : ''
                                      }`}
                                      onClick={() => {
                                        if (!isAdded) {
                                          setAddMaterialSelectedColorId(item.color.id);
                                          setShowAddMaterialDropdown(false);
                                          setAddMaterialSearchQuery("");
                                        }
                                      }}
                                    >
                                      <ColorIcon
                                        imageUrl={item.color.imageUrl}
                                        colorCode={item.color.colorCode}
                                        colorName={item.color.colorName}
                                        size="md"
                                      />
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">
                                          {item.supplier!.code || 'N/A'} - {item.board!.boardNumber || 'N/A'} - {item.color.colorCode}
                                        </div>
                                        {item.color.colorName && (
                                          <div className="text-xs text-gray-500">{item.color.colorName}</div>
                                        )}
                                      </div>
                                      {isAdded && (
                                        <Badge variant="secondary" className="text-xs">已添加</Badge>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="p-4 text-center text-gray-500">未找到匹配的颜色</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* 添加按钮 */}
                      <div className="flex justify-end">
                        <Button
                          onClick={() => {
                            if (addMaterialSelectedColorId) {
                              handleAddMaterial(addMaterialSelectedColorId);
                              setAddMaterialSelectedColorId(null);
                              setAddMaterialSearchQuery("");
                              setAddMaterialType([]);
                            }
                          }}
                          disabled={!addMaterialSelectedColorId}
                          className="w-full"
                        >
                          添加
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* 材料列表 */}
              {formData.materials.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>暂无材料，请点击“添加更多材料”按钮添加</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.materials.map((material, index) => {
                    const materialColor = colorsData?.find((item: any) => item.color.id === material.materialColorId);
                    if (!materialColor) return null;

                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 border rounded-lg bg-white hover:bg-gray-50 transition-colors"
                      >
                        {/* 材料图片 */}
                        <div className="flex-shrink-0">
                          <ColorIcon
                            imageUrl={materialColor.color.imageUrl}
                            colorCode={materialColor.color.colorCode}
                            size="md"
                          />
                        </div>

                        {/* 材料信息 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {index === 0 && (
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                            )}
                            <span className="font-medium text-sm">
                              {index === 0 ? '主材料' : '辅助材料'}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {material.materialType}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            {materialColor.supplier?.code || ''} - {materialColor.board?.boardNumber || ''} - {materialColor.color.colorCode}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {materialColor.color.colorName}
                          </p>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* 上移 */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={index === 0}
                            onClick={() => handleMoveMaterialUp(index)}
                            className="h-8 w-8 p-0"
                          >
                            <span className="text-lg">↑</span>
                          </Button>

                          {/* 下移 */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={index === formData.materials.length - 1}
                            onClick={() => handleMoveMaterialDown(index)}
                            className="h-8 w-8 p-0"
                          >
                            <span className="text-lg">↓</span>
                          </Button>

                          {/* 删除 */}
                          {index !== 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                handleDeleteMaterial(material.materialColorId);
                                toast.success("已删除材料");
                              }}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <span className="font-medium">提示：</span>
                </p>
                <ul className="text-sm text-amber-700 mt-1 space-y-1">
                  <li>• 主材料（带⭐标记）不可删除，也可以修改其颜色</li>
                  <li>• 使用上移/下移按钮调整材料顺序，排在前面的材料将显示在行计中</li>
                  <li>• 订单中最多显示前3个材料图片</li>
                </ul>
              </div>
            </div>
            </div>
          </div>
            </TabsContent>

            <TabsContent value="packaging" className="space-y-4">
              <PackageBoxesManager variantId={null} mode="create" onDirtyChange={() => {}} />
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={createVariant.isPending}>
              {createVariant.isPending ? "创建中..." : "创建批次"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑批次对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          setEditingVariantId(null);
          resetForm();
          setPackagingDirty(false);
        }
      }}>
        <DialogContent className="!h-[1200px] max-h-[95vh] flex flex-col overflow-hidden" style={{ width: dialogMaxWidth, maxWidth: dialogMaxWidth }}>
          <DialogHeader>
            <div className="flex items-start gap-4">
              {productImageUrl && (
                <img
                  src={productImageUrl}
                  alt={productSku}
                  className="w-16 h-16 object-cover rounded-lg border flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <DialogTitle>编辑批次</DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-1 mt-1">
                  <span>产品：{productSku}</span>
                  {editingVariantId && variantsData?.variants && (() => {
                    const v = variantsData.variants.find((x: any) => x.variant.id === editingVariantId);
                    return v ? (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="font-medium text-foreground">{v.variant.variantCode}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="font-medium text-foreground">{v.variant.variantName}</span>
                      </>
                    ) : null;
                  })()}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="basic" className="flex-1 flex flex-col min-h-0">
            <TabsList className="mb-4 flex-shrink-0">
              <TabsTrigger value="basic">基本信息</TabsTrigger>
              <TabsTrigger value="packaging" className="relative">
                包装信息
                {packagingDirty && (
                  <span
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-background"
                    title="包装信息有未保存的修改"
                  />
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 overflow-y-auto flex-1 pr-1">
          <div className="grid grid-cols-2 gap-10">
            {/* 左列：基本信息 + 变更说明 */}
            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="space-y-4">
                <h3 className="font-semibold mb-4">基本信息</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-variantName">
                      批次名称 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="edit-variantName"
                      value={formData.variantName}
                      onChange={(e) =>
                        setFormData({ ...formData, variantName: e.target.value })
                      }
                      placeholder="例如：高背版、加厚布料版"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-variantType">批次类型</Label>
                    <Select
                      value={formData.variantType}
                      onValueChange={(value: "universal" | "exclusive") =>
                        setFormData({ ...formData, variantType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="universal">通用批次</SelectItem>
                        <SelectItem value="exclusive">客户专属</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-productionStatus">生产状态</Label>
                    <Select
                      value={formData.productionStatus}
                      onValueChange={(value: "designing" | "sampling" | "production" | "completed") =>
                        setFormData({ ...formData, productionStatus: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="designing">设计中</SelectItem>
                        <SelectItem value="sampling">打样中</SelectItem>
                        <SelectItem value="production">量产中</SelectItem>
                        <SelectItem value="completed">已完成</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-supplierId">供应商</Label>
                    <Select
                      value={formData.supplierId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, supplierId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择供应商" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">无</SelectItem>
                        {/* 主供应商和备选供应商 */}
                        {sortedSuppliers.prioritySuppliers.map((supplier: any) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.isPrimary ? '⭐ ' : '🔹 '}{supplier.supplierName}
                          </SelectItem>
                        ))}
                        {/* 分隔线 */}
                        {sortedSuppliers.prioritySuppliers.length > 0 && sortedSuppliers.otherSuppliers.length > 0 && (
                          <SelectSeparator />
                        )}
                        {/* 其他供应商 */}
                        {sortedSuppliers.otherSuppliers.map((supplier: any) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.supplierName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-supplierSku">供应商SKU</Label>
                    <Input
                      id="edit-supplierSku"
                      placeholder="输入供应商SKU（工厂SKU编号）"
                      value={formData.supplierSku}
                      onChange={(e) =>
                        setFormData({ ...formData, supplierSku: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-customerId">客户</Label>
                    <Select
                      value={formData.customerId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, customerId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择客户" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">无</SelectItem>
                        {customersData?.data?.map((customer: any) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-customerSku">客户SKU</Label>
                    <Input
                      id="edit-customerSku"
                      placeholder="输入客户SKU（客户系统SKU编号）"
                      value={formData.customerSku}
                      onChange={(e) =>
                        setFormData({ ...formData, customerSku: e.target.value })
                      }
                    />
                  </div>
                  

                </div>
              </div>

              {/* 变更说明 */}
              <div className="space-y-4">
                <h3 className="font-semibold mb-4">变更说明</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-fabricChange">布料变更</Label>
                    <Input
                      id="edit-fabricChange"
                      value={formData.fabricChange}
                      onChange={(e) =>
                        setFormData({ ...formData, fabricChange: e.target.value })
                      }
                      placeholder="例如：麻布改绒布"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-legTypeChange">脚型变更</Label>
                    <Input
                      id="edit-legTypeChange"
                      value={formData.legTypeChange}
                      onChange={(e) =>
                        setFormData({ ...formData, legTypeChange: e.target.value })
                      }
                      placeholder="例如：木脚改金属脚"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-heightChange">高度变更</Label>
                    <Input
                      id="edit-heightChange"
                      value={formData.heightChange}
                      onChange={(e) =>
                        setFormData({ ...formData, heightChange: e.target.value })
                      }
                      placeholder="例如：加高10cm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-packagingChange">包装变更</Label>
                    <Input
                      id="edit-packagingChange"
                      value={formData.packagingChange}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          packagingChange: e.target.value,
                        })
                      }
                      placeholder="例如：纸箱改木箱"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="edit-otherChanges">其他变更</Label>
                    <Textarea
                      id="edit-otherChanges"
                      value={formData.otherChanges}
                      onChange={(e) =>
                        setFormData({ ...formData, otherChanges: e.target.value })
                      }
                      placeholder="其他变更说明..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 右列：尺寸信息 + 价格信息 */}
            <div className="space-y-6">
              {/* 尺寸信息 */}
              <div className="space-y-4">
                <h3 className="font-semibold mb-4">尺寸信息（单位：m）</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="edit-productLength">产品长度</Label>
                    <Input
                      id="edit-productLength"
                      type="number"
                      step="0.01"
                      value={formData.productLength}
                      onChange={(e) =>
                        setFormData({ ...formData, productLength: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-productWidth">产品宽度</Label>
                    <Input
                      id="edit-productWidth"
                      type="number"
                      step="0.01"
                      value={formData.productWidth}
                      onChange={(e) =>
                        setFormData({ ...formData, productWidth: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-productHeight">产品高度</Label>
                    <Input
                      id="edit-productHeight"
                      type="number"
                      step="0.01"
                      value={formData.productHeight}
                      onChange={(e) =>
                        setFormData({ ...formData, productHeight: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* 价格信息 */}
              <div className="space-y-4">
                <h3 className="font-semibold mb-4">价格信息</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="sellingPriceRMB">售价：RMB含税</Label>
                    <Input
                      id="sellingPriceRMB"
                      type="number"
                      step="0.01"
                      value={formData.sellingPriceRMB}
                      onChange={(e) =>
                        setFormData({ ...formData, sellingPriceRMB: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sellingPriceFOB">售价：美金FOB</Label>
                    <Input
                      id="sellingPriceFOB"
                      type="number"
                      step="0.01"
                      value={formData.sellingPriceFOB}
                      onChange={(e) =>
                        setFormData({ ...formData, sellingPriceFOB: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="costPriceRMB">成本：RMB含税</Label>
                    <Input
                      id="costPriceRMB"
                      type="number"
                      step="0.01"
                      value={formData.costPriceRMB}
                      onChange={(e) =>
                        setFormData({ ...formData, costPriceRMB: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* 批次材料管理 */}
              {editingVariantId && (
                <div className="border-t pt-6 mt-6">
                  <VariantMaterialsManager variantId={editingVariantId} />
                </div>
              )}
            </div>
          </div>
          </TabsContent>

          <TabsContent value="packaging" className="space-y-4 overflow-y-auto flex-1 pr-1">
            <PackageBoxesManager
              variantId={editingVariantId}
              mode="edit"
              onDirtyChange={setPackagingDirty}
            />
          </TabsContent>
          </Tabs>

          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingVariantId(null);
                resetForm();
              }}
            >
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={updateVariant.isPending}>
              {updateVariant.isPending ? "保存中..." : "保存修改"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 复制批次确认对话框 */}
      <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>复制批次</DialogTitle>
            <DialogDescription>
              请确认或编辑新批次的名称
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="duplicateVariantName">批次名称 *</Label>
              <Input
                id="duplicateVariantName"
                value={duplicateVariantName}
                onChange={(e) => setDuplicateVariantName(e.target.value)}
                placeholder="例如：高背版本 (2)"
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-2">
                系统已自动生成建议名称，您可以直接确认或修改
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDuplicateDialogOpen(false);
                setDuplicatingVariantId(null);
                setDuplicateVariantName("");
              }}
            >
              取消
            </Button>
            <Button 
              onClick={confirmDuplicate}
              disabled={!duplicateVariantName.trim() || duplicateVariant.isPending}
            >
              {duplicateVariant.isPending ? "复制中..." : "确认复制"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批次详情弹窗 */}
      {detailVariantId && (
        <VariantDetail
          open={isDetailDialogOpen}
          onOpenChange={(open) => {
            setIsDetailDialogOpen(open);
            if (!open) {
              setDetailVariantId(null);
            }
          }}
          variantId={detailVariantId}
          productId={productId}
        />
      )}
    </div>
  );
}
