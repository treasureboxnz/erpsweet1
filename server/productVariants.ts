import { eq, and, desc, asc, sql, like, or, isNotNull } from "drizzle-orm";
import { getDb } from "./db";
import {
  productVariants,
  variantCustomerLinks,
  variantPricing,
  variantPricingHistory,
  variantImages,
  variantSuppliers,
  variantMaterials,
  products,
  companies,
  users,
  suppliers,
  materialColors,
  materialBoards,
  materialSuppliers,
  packageBoxes,
  customerPriceHistory,
  type InsertProductVariant,
  type InsertVariantCustomerLink,
  type InsertVariantPricing,
  type InsertVariantPricingHistory,
} from "../drizzle/schema";

/**
 * 生成批次编号
 * 格式：基础SKU-V001
 */
export async function generateVariantCode(productId: number, baseSku: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 查询该产品下已有批次的最大递增号
  const result = await db
    .select({
      maxNum: sql<number>`MAX(CAST(SUBSTRING(${productVariants.variantCode}, LENGTH(${baseSku}) + 3) AS UNSIGNED))`,
    })
    .from(productVariants)
    .where(
      and(
        eq(productVariants.productId, productId),
        like(productVariants.variantCode, `${baseSku}-V%`)
      )
    );
  
  const maxNum = result[0]?.maxNum || 0;
  const nextNum = maxNum + 1;
  const paddedNum = nextNum.toString().padStart(3, "0");
  
  return `${baseSku}-V${paddedNum}`;
}

/**
 * 计算CBM（立方米）
 * 公式：包装长度（m） × 包装宽度（m） × 包装高度（m）
 * 注意：尺寸单位统一为 m，直接相乘得 m³
 */
export function calculateCBM(
  packageLength: number | null,
  packageWidth: number | null,
  packageHeight: number | null
): number | null {
  if (!packageLength || !packageWidth || !packageHeight) return null;
  // 尺寸单位为 m，CBM = l × w × h（m³）
  return packageLength * packageWidth * packageHeight;
}

/**
 * 获取所有批次（支持筛选和分页）
 */
export async function getAllVariants(params: {
  productId?: number;
  variantType?: "universal" | "exclusive";
  status?: "active" | "inactive";
  customerId?: number;
  showAll?: boolean; // 如果为true，则不过滤客户专属批次（产品页面使用）
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  erpCompanyId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const {
    productId,
    variantType,
    status,
    customerId,
    showAll = false,
    search,
    page = 1,
    pageSize = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
    erpCompanyId,
  } = params;

  // 构建筛选条件
  const conditions = [];
  // 租户隔离：通过products表过滤
  conditions.push(eq(products.erpCompanyId, erpCompanyId));
  if (productId) conditions.push(eq(productVariants.productId, productId));
  if (variantType) conditions.push(eq(productVariants.variantType, variantType));
  if (status) conditions.push(eq(productVariants.status, status));
  if (search) {
    conditions.push(
      or(
        like(productVariants.variantCode, `%${search}%`),
        like(productVariants.variantName, `%${search}%`)
      )
    );
  }

  // 如果指定了客户ID，只显示关联该客户的批次
  let query = db
    .select({
      variant: productVariants,
      product: products,
      creator: users,
      supplier: suppliers,
      customer: companies,
      pricing: variantPricing,
      materialColor: materialColors,
      materialBoard: materialBoards,
      materialSupplier: materialSuppliers,
    })
    .from(productVariants)
    .leftJoin(products, eq(productVariants.productId, products.id))
    .leftJoin(users, eq(productVariants.createdBy, users.id))
    .leftJoin(suppliers, eq(productVariants.supplierId, suppliers.id))
    .leftJoin(companies, eq(productVariants.customerId, companies.id))
    .leftJoin(variantPricing, and(
      eq(productVariants.id, variantPricing.variantId),
      eq(variantPricing.isCurrent, true)
    ))
    .leftJoin(materialColors, eq(productVariants.materialColorId, materialColors.id))
    .leftJoin(materialBoards, eq(materialColors.boardId, materialBoards.id))
    .leftJoin(materialSuppliers, eq(materialBoards.supplierId, materialSuppliers.id));

  if (showAll) {
    // 产品页面查看批次：显示全部批次（包括客户专属批次），不添加任何客户过滤条件
  } else if (customerId) {
    // 订单/报价单选批次：关联 variant_customers 表，显示该客户的批次 + 默认批次 + 真正通用批次
    query = query.leftJoin(
      variantCustomerLinks,
      and(
        eq(productVariants.id, variantCustomerLinks.variantId),
        eq(variantCustomerLinks.customerId, customerId)
      )
    );
    // 子查询：判断批次是否有任何客户关联（用于区分「真正通用」和「有客户限定的通用」）
    // 修复逻辑：
    // 1. 通过variant_customer_links关联了该客户的批次（无论variantType是什么）
    // 2. 直接customerId关联了该客户的专属批次
    // 3. 默认批次（isDefault=true）
    // 4. variantType=universal 且 没有任何variant_customer_links关联（真正的全局通用批次）
    const noLinksSubquery = sql<number>`(
      SELECT COUNT(*) FROM variant_customer_links vcl2 
      WHERE vcl2.variantId = ${productVariants.id}
    )`;
    conditions.push(
      or(
        eq(variantCustomerLinks.customerId, customerId),  // 通过关联表关联了该客户的批次
        eq(productVariants.customerId, customerId),       // 直接在product_variants上关联了该客户的专属批次
        eq(productVariants.isDefault, true),              // 默认批次
        and(
          eq(productVariants.variantType, 'universal'),   // 通用批次
          sql`${noLinksSubquery} = 0`                     // 且没有任何客户关联（真正的全局通用批次）
        )
      )
    );
  } else {
    // 订单/报价单未选客户时，只显示真正的通用批次（无客户关联的universal批次）
    const noLinksSubquery = sql<number>`(
      SELECT COUNT(*) FROM variant_customer_links vcl2 
      WHERE vcl2.variantId = ${productVariants.id}
    )`;
    conditions.push(
      and(
        eq(productVariants.variantType, 'universal'),
        sql`${noLinksSubquery} = 0`
      )
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  // GROUP BY removed as we no longer aggregate package_boxes

  // 排序
  const sortColumn = sortBy === "variantCode" ? productVariants.variantCode
    : sortBy === "variantName" ? productVariants.variantName
    : sortBy === "variantType" ? productVariants.variantType
    : sortBy === "status" ? productVariants.status
    : productVariants.createdAt;
  query = (sortOrder === "asc" ? query.orderBy(asc(sortColumn)) : query.orderBy(desc(sortColumn))) as any;

  // 分页
  const offset = (page - 1) * pageSize;
  const variants = await query.limit(pageSize).offset(offset);

  // 查询总数
  let countQuery = db
    .select({ count: sql<number>`count(DISTINCT ${productVariants.id})` })
    .from(productVariants)
    .leftJoin(products, eq(productVariants.productId, products.id));

  if (customerId) {
    countQuery = countQuery.leftJoin(
      variantCustomerLinks,
      and(
        eq(productVariants.id, variantCustomerLinks.variantId),
        eq(variantCustomerLinks.customerId, customerId)
      )
    ) as any;
  }

  if (conditions.length > 0) {
    countQuery = countQuery.where(and(...conditions)) as any;
  }

  const totalResult = await countQuery;
  const total = totalResult[0]?.count || 0;

  // 为每个批次查询关联的客户列表
  const variantsWithCustomers = await Promise.all(
    variants.map(async (item) => {
      const customers = await db
        .select({
          customer: companies,
        })
        .from(variantCustomerLinks)
        .leftJoin(companies, eq(variantCustomerLinks.customerId, companies.id))
        .where(eq(variantCustomerLinks.variantId, item.variant.id));
      
      // 查询外箱总毛重、总净重、总CBM、包装方式和每箱件数
      const weightResult = await db
        .select({
          totalGrossWeight: sql<number>`COALESCE(SUM(${packageBoxes.grossWeight}), 0)`,
          totalNetWeight: sql<number>`COALESCE(SUM(${packageBoxes.netWeight}), 0)`,
          totalCBM: sql<number>`COALESCE(SUM(${packageBoxes.cbm}), 0)`,
          packagingType: sql<string>`MAX(${packageBoxes.packagingType})`,
          piecesPerBox: sql<number>`MAX(${packageBoxes.piecesPerBox})`,
        })
        .from(packageBoxes)
        .where(eq(packageBoxes.variantId, item.variant.id))
        .limit(1);
      
      // 如果指定了客户ID，查询该客户对该产品的历史成交价格
      let customerHistoryPrice = null;
      if (customerId && item.product) {
        const historyResult = await db
          .select({
            price: customerPriceHistory.unitPrice,
            currency: customerPriceHistory.currency,
          })
          .from(customerPriceHistory)
          .where(
            and(
              eq(customerPriceHistory.customerId, customerId),
              eq(customerPriceHistory.productId, item.product.id),
              isNotNull(customerPriceHistory.currency)
            )
          )
          .orderBy(desc(customerPriceHistory.transactionDate))
          .limit(1);
        
        if (historyResult.length > 0) {
          customerHistoryPrice = {
            price: parseFloat(historyResult[0].price!),
            currency: historyResult[0].currency!,
          };
        }
      }
      
      // 构建合并后的pricing：优先使用variantPricing表的值，fallback到variant表的直接价格字段
      const mergedPricing = item.pricing ? {
        ...item.pricing,
        // 若L1价格为null，fallback到variant.sellingPriceFOB
        sellingPriceFobL1: item.pricing.sellingPriceFobL1 ?? (item.variant as any).sellingPriceFOB ?? null,
        sellingPriceFobL2: item.pricing.sellingPriceFobL2 ?? (item.variant as any).sellingPriceFOB ?? null,
        sellingPriceFobL3: item.pricing.sellingPriceFobL3 ?? (item.variant as any).sellingPriceFOB ?? null,
        // 若RMB价格为null，fallback到variant.sellingPriceRMB
        sellingPriceRmbIncTax: item.pricing.sellingPriceRmbIncTax ?? (item.variant as any).sellingPriceRMB ?? null,
      } : {
        // 没有variantPricing记录时，直接从variant表读取
        id: null,
        erpCompanyId: null,
        variantId: item.variant.id,
        factoryCostRmbExTax: null,
        factoryCostRmbIncTax: null,
        factoryCostUsdFob: null,
        myCostRmb: null,
        myCostUsd: null,
        fobFeeRmb: null,
        sellingPriceRmbIncTax: (item.variant as any).sellingPriceRMB ?? null,
        sellingPriceFobL1: (item.variant as any).sellingPriceFOB ?? null,
        sellingPriceFobL2: (item.variant as any).sellingPriceFOB ?? null,
        sellingPriceFobL3: (item.variant as any).sellingPriceFOB ?? null,
        effectiveDate: new Date(),
        isCurrent: true,
        createdBy: null,
        createdAt: new Date(),
      };

      return {
        variant: item.variant,
        product: item.product,
        creator: item.creator,
        supplier: item.supplier,
        customer: item.customer,
        pricing: mergedPricing,
        materialColor: item.materialColor ? {
          color: item.materialColor,
          board: item.materialBoard,
          supplier: item.materialSupplier,
        } : null,
        customers: customers.map(c => c.customer).filter(Boolean),
        totalGrossWeight: weightResult[0]?.totalGrossWeight || 0,
        totalNetWeight: weightResult[0]?.totalNetWeight || 0,
        totalCBM: weightResult[0]?.totalCBM || 0,
        packagingType: weightResult[0]?.packagingType || 'single',
        piecesPerBox: weightResult[0]?.piecesPerBox || 1,
        customerHistoryPrice,
      };
    })
  );

  return {
    variants: variantsWithCustomers,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 根据ID获取批次详情
 */
export async function getVariantById(variantId: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select({
      variant: productVariants,
      product: products,
      creator: users,
    })
    .from(productVariants)
    .leftJoin(products, eq(productVariants.productId, products.id))
    .leftJoin(users, eq(productVariants.createdBy, users.id))
    .where(
      and(
        eq(productVariants.id, variantId),
        eq(products.erpCompanyId, erpCompanyId)
      )
    )
    .limit(1);

  if (!result[0]) return null;

  // 查询关联的客户
  const linkedCustomers = await db
    .select({
      customer: companies,
    })
    .from(variantCustomerLinks)
    .leftJoin(companies, eq(variantCustomerLinks.customerId, companies.id))
    .where(eq(variantCustomerLinks.variantId, variantId));

  // 查询当前价格
  const currentPricing = await db
    .select()
    .from(variantPricing)
    .where(
      and(
        eq(variantPricing.variantId, variantId),
        eq(variantPricing.isCurrent, true)
      )
    )
    .limit(1);

  // 查询布料颜色信息
  let materialColor = null;
  if (result[0].variant.materialColorId) {
    const colorResult = await db
      .select({
        color: materialColors,
        board: materialBoards,
        supplier: materialSuppliers,
      })
      .from(materialColors)
      .leftJoin(materialBoards, eq(materialColors.boardId, materialBoards.id))
      .leftJoin(materialSuppliers, eq(materialBoards.supplierId, materialSuppliers.id))
      .where(eq(materialColors.id, result[0].variant.materialColorId))
      .limit(1);
    
    if (colorResult[0]) {
      materialColor = colorResult[0];
    }
  }

  return {
    ...result[0],
    linkedCustomers: linkedCustomers.map((lc) => lc.customer),
    currentPricing: currentPricing[0] || null,
    materialColor,
  };
}

/**
 * 创建批次
 */
export async function createVariant(data: {
  productId: number;
  variantCode?: string;
  variantName: string;
  fabricChange?: string;
  legTypeChange?: string;
  heightChange?: string;
  packagingChange?: string;
  otherChanges?: string;
  productLength?: number | null;
  productWidth?: number | null;
  productHeight?: number | null;
  packageLength?: number | null;
  packageWidth?: number | null;
  packageHeight?: number | null;
  cbm?: number | null;
  variantType: "universal" | "exclusive";
  supplierId?: number;
  supplierSku?: string;
  customerId?: number;
  customerSku?: string;
  materialColorId?: number;
  productionStatus?: "designing" | "sampling" | "production" | "completed";
  sellingPriceRMB?: number;
  sellingPriceFOB?: number;
  costPriceRMB?: number;
  linkedCustomerIds?: number[];
  packageBoxes?: Array<{
    length: number;
    width: number;
    height: number;
    cbm?: number; // 手动输入的CBM值
    grossWeight?: number;
    netWeight?: number;
  }>;
  createdBy: number;
  erpCompanyId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 如果没有提供批次编号，自动生成
  let variantCode = data.variantCode;
  if (!variantCode) {
    // 查询产品的基础SKU
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, data.productId))
      .limit(1);
    
    if (!product[0]) throw new Error("Product not found");
    
    variantCode = await generateVariantCode(data.productId, product[0].sku);
  }

  // 计算CBM：优先使用手动输入的值，否则自动计算
  const cbm = data.cbm !== undefined 
    ? data.cbm 
    : calculateCBM(data.packageLength || null, data.packageWidth || null, data.packageHeight || null);

  // 检查该产品是否已有默认批次
  const existingVariants = await db
    .select({ isDefault: productVariants.isDefault })
    .from(productVariants)
    .where(
      and(
        eq(productVariants.productId, data.productId),
        eq(productVariants.isDefault, true)
      )
    )
    .limit(1);
  
  // 如果没有默认批次,将新批次设置为默认
  const isDefault = existingVariants.length === 0;

  // 如果选择了颜色，自动引用颜色图片
  let imageUrl: string | null = null;
  if (data.materialColorId) {
    const colorResult = await db
      .select({ imageUrl: materialColors.imageUrl })
      .from(materialColors)
      .where(eq(materialColors.id, data.materialColorId))
      .limit(1);
    
    if (colorResult.length > 0 && colorResult[0].imageUrl) {
      imageUrl = colorResult[0].imageUrl;
    }
  }

  // 创建批次
  const variantData: InsertProductVariant = {
    productId: data.productId,
    variantCode,
    variantName: data.variantName,
    fabricChange: data.fabricChange,
    legTypeChange: data.legTypeChange,
    heightChange: data.heightChange,
    packagingChange: data.packagingChange,
    otherChanges: data.otherChanges,
    productLength: data.productLength ? data.productLength.toString() : null,
    productWidth: data.productWidth ? data.productWidth.toString() : null,
    productHeight: data.productHeight ? data.productHeight.toString() : null,
    packageLength: data.packageLength ? data.packageLength.toString() : null,
    packageWidth: data.packageWidth ? data.packageWidth.toString() : null,
    packageHeight: data.packageHeight ? data.packageHeight.toString() : null,
    cbm: cbm ? cbm.toString() : null,
    variantType: data.variantType,
    status: "active",
    isDefault: isDefault, // 如果是该产品的第一个批次,设置为默认
    supplierId: data.supplierId || null,
    supplierSku: data.supplierSku || null,
    customerId: data.customerId || null,
    customerSku: data.customerSku || null,
    materialColorId: data.materialColorId || null,
    productionStatus: data.productionStatus || "designing",
    sellingPriceRMB: data.sellingPriceRMB ? data.sellingPriceRMB.toString() : null,
    sellingPriceFOB: data.sellingPriceFOB ? data.sellingPriceFOB.toString() : null,
    costPriceRMB: data.costPriceRMB ? data.costPriceRMB.toString() : null,
    createdBy: data.createdBy,
    erpCompanyId: data.erpCompanyId,
  };

  const [newVariant] = await db.insert(productVariants).values(variantData);

  // 创建客户关联
  const customerIdsToLink: number[] = [];
  
  // 如果指定了linkedCustomerIds，使用它们
  if (data.linkedCustomerIds && data.linkedCustomerIds.length > 0) {
    customerIdsToLink.push(...data.linkedCustomerIds);
  }
  // 如果指定了customerId且不在linkedCustomerIds中，也添加进去
  if (data.customerId && !customerIdsToLink.includes(data.customerId)) {
    customerIdsToLink.push(data.customerId);
  }
  
  // 创建客户关联记录
  if (customerIdsToLink.length > 0) {
    const linkData: InsertVariantCustomerLink[] = customerIdsToLink.map((customerId) => ({
      erpCompanyId: data.erpCompanyId,
      variantId: newVariant.insertId,
      customerId,
    }));
    await db.insert(variantCustomerLinks).values(linkData);
  }

  // 创建初始定价记录（所有价格字段为空）
  const pricingData: InsertVariantPricing = {
    erpCompanyId: data.erpCompanyId,
    variantId: newVariant.insertId,
    effectiveDate: new Date(),
    isCurrent: true,
    createdBy: data.createdBy,
  };
  await db.insert(variantPricing).values(pricingData);

  // 自动添加默认颜色材料（优先使用ORIG颜色，如果没有则使用第一个颜色）
  // 加erpCompanyId过滤，防止跨租户引用其他公司的颜色
  let defaultColor = await db
    .select({ id: materialColors.id, colorCode: materialColors.colorCode })
    .from(materialColors)
    .leftJoin(materialBoards, eq(materialColors.boardId, materialBoards.id))
    .leftJoin(materialSuppliers, eq(materialBoards.supplierId, materialSuppliers.id))
    .where(
      and(
        eq(materialSuppliers.erpCompanyId, data.erpCompanyId),
        like(materialColors.colorCode, '%ORIG%')
      )
    )
    .limit(1);

  // 如果没有ORIG颜色，使用该公司第一个颜色作为默认
  if (defaultColor.length === 0) {
    defaultColor = await db
      .select({ id: materialColors.id, colorCode: materialColors.colorCode })
      .from(materialColors)
      .leftJoin(materialBoards, eq(materialColors.boardId, materialBoards.id))
      .leftJoin(materialSuppliers, eq(materialBoards.supplierId, materialSuppliers.id))
      .where(eq(materialSuppliers.erpCompanyId, data.erpCompanyId))
      .orderBy(materialColors.sortOrder, materialColors.id)
      .limit(1);
  }

  if (defaultColor.length > 0) {
    const { addVariantMaterial } = await import("./variantMaterials.js");
    await addVariantMaterial({
      variantId: newVariant.insertId,
      materialColorId: defaultColor[0].id,
      materialType: "fabric",
      sortOrder: 0,
    });
  }

  // 保存外箱数据
  if (data.packageBoxes && data.packageBoxes.length > 0) {
    const { addBox } = await import("./packageBoxes.js");
    for (const box of data.packageBoxes) {
      await addBox({
        variantId: newVariant.insertId,
        erpCompanyId: data.erpCompanyId,
        length: box.length,
        width: box.width,
        height: box.height,
        cbm: box.cbm, // 传递手动输入的CBM值（如果有）
        grossWeight: box.grossWeight,
        netWeight: box.netWeight,
      });
    }
  }

  return newVariant.insertId;
}

/**
 * 更新批次信息
 */
export async function updateVariant(
  variantId: number,
  data: Partial<InsertProductVariant> & {
    packageBoxes?: Array<{
      length: number;
      width: number;
      height: number;
      cbm?: number; // 手动输入的CBM值
      grossWeight?: number;
      netWeight?: number;
      packagingType?: string;
      piecesPerBox?: number;
    }>;
    erpCompanyId?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 如果更新了包装尺寸，重新计算CBM
  if (data.packageLength || data.packageWidth || data.packageHeight) {
    const currentVariant = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, variantId))
      .limit(1);

    if (currentVariant[0]) {
      const packageLength = data.packageLength
        ? Number(data.packageLength)
        : currentVariant[0].packageLength
        ? Number(currentVariant[0].packageLength)
        : null;
      const packageWidth = data.packageWidth
        ? Number(data.packageWidth)
        : currentVariant[0].packageWidth
        ? Number(currentVariant[0].packageWidth)
        : null;
      const packageHeight = data.packageHeight
        ? Number(data.packageHeight)
        : currentVariant[0].packageHeight
        ? Number(currentVariant[0].packageHeight)
        : null;

      const cbm = calculateCBM(packageLength, packageWidth, packageHeight);
      data.cbm = cbm ? cbm.toString() : null;
    }
  }
  // 从data中提取packageBoxes和erpCompanyId，避免传递给productVariants表
  const { packageBoxes: newPackageBoxes, erpCompanyId, ...variantData } = data;

  await db
    .update(productVariants)
    .set(variantData)
    .where(eq(productVariants.id, variantId));

  // 更新外箱数据
  if (newPackageBoxes !== undefined) {
    // 先删除旧的外箱数据
    await db
      .delete(packageBoxes)
      .where(eq(packageBoxes.variantId, variantId));

    // 插入新的外箱数据
    if (newPackageBoxes.length > 0 && erpCompanyId) {
      const { addBox } = await import("./packageBoxes.js");
      for (const box of newPackageBoxes) {
        await addBox({
          variantId,
          erpCompanyId,
          length: box.length,
          width: box.width,
          height: box.height,
          cbm: box.cbm, // 传递手动输入的CBM值（如果有）
          grossWeight: box.grossWeight,
          netWeight: box.netWeight,
        });
      }
    }
  }

  return variantId;
}

/**
 * 删除批次
 */
export async function deleteVariant(variantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if this is a default batch
  const variant = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);
  
  if (!variant[0]) {
    // 批次已不存在，视为已删除（幂等删除）
    return true;
  }
  
  if (variant[0].isDefault) {
    // Check if there are other batches for this product
    const otherVariants = await db
      .select()
      .from(productVariants)
      .where(
        and(
          eq(productVariants.productId, variant[0].productId),
          sql`${productVariants.id} != ${variantId}`
        )
      );
    
    if (otherVariants.length === 0) {
      throw new Error("Cannot delete the default batch. This is the only batch for this product.");
    } else {
      throw new Error("Cannot delete the default batch. Please set another batch as default first.");
    }
  }
  
  // 由于设置了 onDelete: "cascade"，删除批次会自动删除相关的客户关联、定价、图片等
  await db.delete(productVariants).where(eq(productVariants.id, variantId));
  
  return true;
}

/**
 * 生成智能递增的批次名称
 * 例如："高背版本" -> "高背版本 (2)"
 *       "高背版本 (2)" -> "高背版本 (3)"
 */
export async function generateIncrementalVariantName(productId: number, baseName: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 提取基础名称（去除后缀的 (n) 或 （副本））
  const baseNameMatch = baseName.match(/^(.+?)\s*(?:\((\d+)\)|（副本）)?$/);
  const cleanBaseName = baseNameMatch ? baseNameMatch[1].trim() : baseName;

  // 查询该产品下所有以该基础名称开头的批次
  const existingVariants = await db
    .select({ variantName: productVariants.variantName })
    .from(productVariants)
    .where(
      and(
        eq(productVariants.productId, productId),
        like(productVariants.variantName, `${cleanBaseName}%`)
      )
    );

  // 提取所有已存在的编号
  const existingNumbers: number[] = [];
  existingVariants.forEach(v => {
    if (v.variantName === cleanBaseName) {
      existingNumbers.push(1); // 原始名称算作 (1)
    } else {
      const match = v.variantName.match(/\((\d+)\)$/);
      if (match) {
        existingNumbers.push(parseInt(match[1]));
      }
    }
  });

  // 找到下一个可用的编号
  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 2;
  return `${cleanBaseName} (${nextNumber})`;
}

/**
 * 复制批次
 */
export async function duplicateVariant(variantId: number, createdBy: number, erpCompanyId: number, customName?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 查询源批次信息
  const sourceVariant = await getVariantById(variantId, erpCompanyId);
  if (!sourceVariant) throw new Error("Source variant not found");

  // 使用产品编号+V+序号生成新的批次编号（与新建批次一致）
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const productRow = await db2.select().from(products).where(eq(products.id, sourceVariant.variant.productId)).limit(1);
  if (!productRow[0]) throw new Error("Product not found");
  const newVariantCode = await generateVariantCode(sourceVariant.variant.productId, productRow[0].sku);

  // 生成或使用自定义名称
  const newVariantName = customName || await generateIncrementalVariantName(
    sourceVariant.variant.productId,
    sourceVariant.variant.variantName
  );

  // 创建新批次（完整复制源批次的所有字段）
  const newVariantData: InsertProductVariant = {
    productId: sourceVariant.variant.productId,
    erpCompanyId: erpCompanyId,
    variantCode: newVariantCode,
    variantName: newVariantName,
    fabricChange: sourceVariant.variant.fabricChange,
    legTypeChange: sourceVariant.variant.legTypeChange,
    heightChange: sourceVariant.variant.heightChange,
    packagingChange: sourceVariant.variant.packagingChange,
    otherChanges: sourceVariant.variant.otherChanges,
    productLength: sourceVariant.variant.productLength,
    productWidth: sourceVariant.variant.productWidth,
    productHeight: sourceVariant.variant.productHeight,
    packageLength: sourceVariant.variant.packageLength,
    packageWidth: sourceVariant.variant.packageWidth,
    packageHeight: sourceVariant.variant.packageHeight,
    cbm: sourceVariant.variant.cbm,
    variantType: sourceVariant.variant.variantType,
    productionStatus: sourceVariant.variant.productionStatus,
    // 完整复制供应商和客户信息
    supplierId: sourceVariant.variant.supplierId,
    supplierSku: sourceVariant.variant.supplierSku,
    customerId: sourceVariant.variant.customerId,
    customerSku: sourceVariant.variant.customerSku,
    // 复制旧材料颜色字段（向后兼容）
    materialColorId: sourceVariant.variant.materialColorId,
    // 复制价格字段
    sellingPriceRMB: sourceVariant.variant.sellingPriceRMB,
    sellingPriceFOB: sourceVariant.variant.sellingPriceFOB,
    costPriceRMB: sourceVariant.variant.costPriceRMB,
    status: "active",
    createdBy,
  };

  const [newVariant] = await db.insert(productVariants).values(newVariantData);
  const newVariantId = newVariant.insertId;

  // 复制客户关联（variant_customer_links）
  if (sourceVariant.linkedCustomers && sourceVariant.linkedCustomers.length > 0) {
    const linkData: InsertVariantCustomerLink[] = sourceVariant.linkedCustomers.map((customer) => ({
      erpCompanyId,
      variantId: newVariantId,
      customerId: customer!.id,
    }));
    await db.insert(variantCustomerLinks).values(linkData);
  }

  // 复制材料和颜色（variant_materials）
  const sourceMaterials = await db
    .select()
    .from(variantMaterials)
    .where(eq(variantMaterials.variantId, variantId))
    .orderBy(asc(variantMaterials.sortOrder));
  if (sourceMaterials.length > 0) {
    await db.insert(variantMaterials).values(
      sourceMaterials.map((m) => ({
        erpCompanyId: m.erpCompanyId,
        variantId: newVariantId,
        materialColorId: m.materialColorId,
        sortOrder: m.sortOrder,
        materialType: m.materialType,
        materialTypeId: m.materialTypeId,
        quantityUsed: m.quantityUsed,
        notes: m.notes,
      }))
    );
  }

  // 复制包装信息（package_boxes）
  const sourceBoxes = await db
    .select()
    .from(packageBoxes)
    .where(eq(packageBoxes.variantId, variantId))
    .orderBy(asc(packageBoxes.sortOrder));
  if (sourceBoxes.length > 0) {
    await db.insert(packageBoxes).values(
      sourceBoxes.map((box) => ({
        erpCompanyId: box.erpCompanyId,
        variantId: newVariantId,
        boxNumber: box.boxNumber,
        length: box.length,
        width: box.width,
        height: box.height,
        cbm: box.cbm,
        grossWeight: box.grossWeight,
        netWeight: box.netWeight,
        packagingType: box.packagingType,
        piecesPerBox: box.piecesPerBox,
        sortOrder: box.sortOrder,
      }))
    );
  }

  // 复制当前价格
  if (sourceVariant.currentPricing) {
    const pricingData: InsertVariantPricing = {
      erpCompanyId,
      variantId: newVariantId,
      factoryCostRmbExTax: sourceVariant.currentPricing.factoryCostRmbExTax,
      factoryCostRmbIncTax: sourceVariant.currentPricing.factoryCostRmbIncTax,
      factoryCostUsdFob: sourceVariant.currentPricing.factoryCostUsdFob,
      myCostRmb: sourceVariant.currentPricing.myCostRmb,
      myCostUsd: sourceVariant.currentPricing.myCostUsd,
      fobFeeRmb: sourceVariant.currentPricing.fobFeeRmb,
      sellingPriceRmbIncTax: sourceVariant.currentPricing.sellingPriceRmbIncTax,
      sellingPriceFobL1: sourceVariant.currentPricing.sellingPriceFobL1,
      sellingPriceFobL2: sourceVariant.currentPricing.sellingPriceFobL2,
      sellingPriceFobL3: sourceVariant.currentPricing.sellingPriceFobL3,
      effectiveDate: new Date(),
      isCurrent: true,
      createdBy,
    };
    await db.insert(variantPricing).values(pricingData);
  } else {
    // 如果源批次没有价格，创建空的价格记录
    const pricingData: InsertVariantPricing = {
      erpCompanyId,
      variantId: newVariantId,
      effectiveDate: new Date(),
      isCurrent: true,
      createdBy,
    };
    await db.insert(variantPricing).values(pricingData);
  }

  return newVariantId;
}

/**
 * 更新批次-客户关联
 */
export async function updateVariantCustomerLinks(
  variantId: number,
  customerIds: number[],
  erpCompanyId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 删除现有关联
  await db
    .delete(variantCustomerLinks)
    .where(eq(variantCustomerLinks.variantId, variantId));

  // 创建新关联
  if (customerIds.length > 0) {
    const linkData: InsertVariantCustomerLink[] = customerIds.map((customerId) => ({
      erpCompanyId: erpCompanyId || 1,
      variantId,
      customerId,
    }));
    await db.insert(variantCustomerLinks).values(linkData);
  }

  return true;
}

/**
 * 更新批次价格并记录历史
 */
export async function updateVariantPricing(
  variantId: number,
  newPricing: Partial<InsertVariantPricing>,
  modifiedBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 查询当前价格
  const currentPricing = await db
    .select()
    .from(variantPricing)
    .where(
      and(
        eq(variantPricing.variantId, variantId),
        eq(variantPricing.isCurrent, true)
      )
    )
    .limit(1);

  if (!currentPricing[0]) throw new Error("Current pricing not found");

  const oldPricing = currentPricing[0];

  // 对比新旧值，记录历史
  const priceFields = [
    "factoryCostRmbExTax",
    "factoryCostRmbIncTax",
    "factoryCostUsdFob",
    "myCostRmb",
    "myCostUsd",
    "fobFeeRmb",
    "sellingPriceRmbIncTax",
    "sellingPriceFobL1",
    "sellingPriceFobL2",
    "sellingPriceFobL3",
  ] as const;

  for (const field of priceFields) {
    if (newPricing[field] !== undefined && newPricing[field] !== oldPricing[field]) {
      const historyData: InsertVariantPricingHistory = {
        erpCompanyId: oldPricing.erpCompanyId,
        variantId,
        fieldName: field,
        oldValue: oldPricing[field]?.toString() || null,
        newValue: newPricing[field]?.toString() || null,
        modifiedBy,
      };
      await db.insert(variantPricingHistory).values(historyData);
    }
  }

  // 更新当前价格
  await db
    .update(variantPricing)
    .set(newPricing)
    .where(eq(variantPricing.id, oldPricing.id));

  return true;
}

/**
 * 获取批次价格历史
 */
export async function getVariantPricingHistory(variantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const history = await db
    .select({
      history: variantPricingHistory,
      modifier: users,
    })
    .from(variantPricingHistory)
    .leftJoin(users, eq(variantPricingHistory.modifiedBy, users.id))
    .where(eq(variantPricingHistory.variantId, variantId))
    .orderBy(desc(variantPricingHistory.modifiedAt));

  return history;
}

/**
 * 获取批次图片列表
 */
export async function getVariantImages(variantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const images = await db
    .select()
    .from(variantImages)
    .where(eq(variantImages.variantId, variantId))
    .orderBy(asc(variantImages.sortOrder));

  return images;
}

/**
 * 上传批次图片
 */
export async function uploadVariantImage(data: {
  variantId: number;
  fileName: string;
  fileSize: number;
  imageData: string;
  uploadedBy: number;
  erpCompanyId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 解析base64数据
  const base64Data = data.imageData.split(",")[1];
  const buffer = Buffer.from(base64Data, "base64");

  // 生成文件key（添加随机后缀防止枚举）
  const randomSuffix = Math.random().toString(36).substring(2, 15);
  const fileExt = data.fileName.split(".").pop();
  const fileKey = `variant-images/${data.variantId}/${Date.now()}-${randomSuffix}.${fileExt}`;

  // 上传到S3
  const { storagePut } = await import("./storage");
  const { url } = await storagePut(fileKey, buffer, `image/${fileExt}`);

  // 获取当前最大sortOrder
  const maxSortOrder = await db
    .select({ maxOrder: variantImages.sortOrder })
    .from(variantImages)
    .where(eq(variantImages.variantId, data.variantId))
    .orderBy(desc(variantImages.sortOrder))
    .limit(1);

  const nextSortOrder = maxSortOrder[0]?.maxOrder !== null ? (maxSortOrder[0]?.maxOrder ?? 0) + 1 : 0;

  // 检查是否是第一张图片
  const imageCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(variantImages)
    .where(eq(variantImages.variantId, data.variantId));

  const isFirstImage = (imageCount[0]?.count ?? 0) === 0;

  // 获取erpCompanyId（从参数或从关联的product获取）
  let erpCompanyId = data.erpCompanyId;
  if (!erpCompanyId) {
    const [variant] = await db.select({ productId: productVariants.productId }).from(productVariants).where(eq(productVariants.id, data.variantId)).limit(1);
    if (variant) {
      const [product] = await db.select({ erpCompanyId: products.erpCompanyId }).from(products).where(eq(products.id, variant.productId)).limit(1);
      erpCompanyId = product?.erpCompanyId || 1;
    } else {
      erpCompanyId = 1;
    }
  }

  // 保存图片记录
  const [result] = await db.insert(variantImages).values({
    erpCompanyId,
    variantId: data.variantId,
    imageUrl: url,
    imageKey: fileKey,
    fileName: data.fileName,
    fileSize: data.fileSize,
    sortOrder: nextSortOrder,
    isPrimary: isFirstImage, // 第一张图片默认为主图
    uploadedBy: data.uploadedBy,
  });

  return Number(result.insertId);
}

/**
 * 更新图片排序
 */
export async function updateVariantImageOrder(
  variantId: number,
  imageOrders: Array<{ id: number; sortOrder: number }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 批量更新排序
  for (const order of imageOrders) {
    await db
      .update(variantImages)
      .set({ sortOrder: order.sortOrder })
      .where(
        and(
          eq(variantImages.id, order.id),
          eq(variantImages.variantId, variantId)
        )
      );
  }

  return true;
}

/**
 * 设置主图
 */
export async function setPrimaryVariantImage(variantId: number, imageId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 先将所有图片的isPrimary设置为false
  await db
    .update(variantImages)
    .set({ isPrimary: false })
    .where(eq(variantImages.variantId, variantId));

  // 将指定图片设置为主图
  await db
    .update(variantImages)
    .set({ isPrimary: true })
    .where(
      and(
        eq(variantImages.id, imageId),
        eq(variantImages.variantId, variantId)
      )
    );

  return true;
}

/**
 * 删除批次图片
 */
export async function deleteVariantImage(imageId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 获取图片信息
  const image = await db
    .select()
    .from(variantImages)
    .where(eq(variantImages.id, imageId))
    .limit(1);

  if (!image[0]) {
    throw new Error("Image not found");
  }

  // 删除数据库记录
  await db.delete(variantImages).where(eq(variantImages.id, imageId));

  // 注意：S3文件不删除，保留历史记录

  return true;
}

/**
 * 设置默认批次
 * 确保一个产品只能有一个默认批次
 */
export async function setDefaultVariant(variantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 获取批次信息
  const variant = await db
    .select({ productId: productVariants.productId })
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);

  if (!variant[0]) {
    throw new Error("Variant not found");
  }

  // 先将该产品的所有批次的isDefault设置为false
  await db
    .update(productVariants)
    .set({ isDefault: false })
    .where(eq(productVariants.productId, variant[0].productId));

  // 将指定批次设置为默认
  await db
    .update(productVariants)
    .set({ isDefault: true })
    .where(eq(productVariants.id, variantId));

  return true;
}
