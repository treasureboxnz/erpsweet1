import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { productVariants, products, variantCustomerLinks } from "../../drizzle/schema";
import { eq, and, or, isNotNull, like } from "drizzle-orm";
import {
  getAllVariants,
  getVariantById,
  createVariant,
  updateVariant,
  deleteVariant,
  duplicateVariant,
  updateVariantCustomerLinks,
  updateVariantPricing,
  getVariantPricingHistory,
  getVariantImages,
  uploadVariantImage,
  updateVariantImageOrder,
  setPrimaryVariantImage,
  deleteVariantImage,
  setDefaultVariant,
  generateVariantCode,
} from "../productVariants";

export const productVariantsRouter = router({
  /**
   * 获取产品的默认批次（用于FOB报价模式）
   */
  getDefault: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input, ctx }) => {
      const result = await getAllVariants({
        productId: input.productId,
        page: 1,
        pageSize: 100, // 获取所有批次来查找默认批次
        sortBy: "createdAt",
        sortOrder: "asc",
        erpCompanyId: ctx.user.erpCompanyId,
      });
      
      // 查找标记为isDefault=true的批次
      const defaultVariant = result.variants.find((item: any) => item.variant.isDefault);
      
      // 如果没有默认批次，返回第一个批次
      return defaultVariant || result.variants[0] || null;
    }),

  /**
   * 获取默认批次的FOB价格（根据客户FOB等级）
   */
  getDefaultPrice: protectedProcedure
    .input(z.object({ 
      productId: z.number(),
      fobLevel: z.enum(["level1", "level2", "level3"])
    }))
    .query(async ({ input, ctx }) => {
      const result = await getAllVariants({
        productId: input.productId,
        page: 1,
        pageSize: 100,
        sortBy: "createdAt",
        sortOrder: "asc",
        erpCompanyId: ctx.user.erpCompanyId,
      });
      
      // 查找默认批次
      const defaultVariant = result.variants.find((item: any) => item.variant.isDefault) || result.variants[0];
      
      if (!defaultVariant || !defaultVariant.pricing) {
        return null;
      }
      
      // 根据FOB等级返回对应价格
      const pricing = defaultVariant.pricing as any;
      const variant = defaultVariant.variant as any;
      let price = 0;
      
      if (input.fobLevel === "level1") {
        price = parseFloat(pricing.sellingPriceFobL1 || "0");
      } else if (input.fobLevel === "level2") {
        price = parseFloat(pricing.sellingPriceFobL2 || "0");
      } else if (input.fobLevel === "level3") {
        price = parseFloat(pricing.sellingPriceFobL3 || "0");
      }
      
      return {
        variantId: variant.id,
        variantCode: variant.variantCode,
        price: price,
        fobLevel: input.fobLevel
      };
    }),

  /**
   * 获取所有批次（支持筛选和分页）
   */
  getAll: protectedProcedure
    .input(
      z.object({
        productId: z.number().optional(),
        variantType: z.enum(["universal", "exclusive"]).optional(),
        status: z.enum(["active", "inactive"]).optional(),
        customerId: z.number().optional(),
        showAll: z.boolean().optional(), // 产品页面使用，显示全部批次
        search: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(20),
        sortBy: z.string().default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
    )
    .query(async ({ input, ctx }) => {
      return await getAllVariants({ ...input, erpCompanyId: ctx.user.erpCompanyId });
    }),

  /**
   * 根据ID获取批次详情
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return await getVariantById(input.id, ctx.user.erpCompanyId);
    }),

  /**
   * 创建批次
   */
  create: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        variantCode: z.string().optional(),
        variantName: z.string(),
        fabricChange: z.string().optional(),
        legTypeChange: z.string().optional(),
        heightChange: z.string().optional(),
        packagingChange: z.string().optional(),
        otherChanges: z.string().optional(),
        productLength: z.number().nullable().optional(),
        productWidth: z.number().nullable().optional(),
        productHeight: z.number().nullable().optional(),
        packageLength: z.number().nullable().optional(),
        packageWidth: z.number().nullable().optional(),
        packageHeight: z.number().nullable().optional(),
        cbm: z.number().nullable().optional(),
        variantType: z.enum(["universal", "exclusive"]),
        supplierId: z.number().optional(),
        supplierSku: z.string().optional(),
        customerId: z.number().optional(),
        customerSku: z.string().optional(),
        materialColorId: z.number().optional(),
        productionStatus: z.enum(["designing", "sampling", "production", "completed"]).optional(),
        sellingPriceRMB: z.number().optional(),
        sellingPriceFOB: z.number().optional(),
        costPriceRMB: z.number().optional(),
        linkedCustomerIds: z.array(z.number()).optional(),
        packageBoxes: z.array(z.object({
          length: z.number().nonnegative(), // 允许为0（手动输入CBM时）
          width: z.number().nonnegative(), // 允许为0（手动输入CBM时）
          height: z.number().nonnegative(), // 允许为0（手动输入CBM时）
          cbm: z.number().positive().optional(), // 手动输入的CBM值
          grossWeight: z.number().nonnegative().optional(),
          netWeight: z.number().nonnegative().optional(),
        })).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Generate variant code if not provided
      let variantCode = input.variantCode;
      // Check if variant code already exists
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      if (!variantCode) {
        // 使用产品SKU+V+序号格式生成批次编号（与复制批次保持一致）
        const productRow = await db.select().from(products).where(eq(products.id, input.productId)).limit(1);
        if (!productRow[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
        variantCode = await generateVariantCode(input.productId, productRow[0].sku);
      }
      
      const existingVariant = await db
        .select()
        .from(productVariants)
        .where(and(eq(productVariants.variantCode, variantCode), eq(productVariants.erpCompanyId, ctx.user.erpCompanyId)))
        .limit(1);
      if (existingVariant.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `批次编号 "${variantCode}" 已存在，请使用其他编号`,
        });
      }
      
      const variantId = await createVariant({
        ...input,
        variantCode,
        createdBy: ctx.user.id,
        erpCompanyId: ctx.user.erpCompanyId,
      });
      return { id: variantId };
    }),

  /**
   * 更新批次信息
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        variantName: z.string().optional(),
        fabricChange: z.string().optional(),
        legTypeChange: z.string().optional(),
        heightChange: z.string().optional(),
        packagingChange: z.string().optional(),
        otherChanges: z.string().optional(),
        productLength: z.number().nullable().optional(),
        productWidth: z.number().nullable().optional(),
        productHeight: z.number().nullable().optional(),
        packageLength: z.number().nullable().optional(),
        packageWidth: z.number().nullable().optional(),
        packageHeight: z.number().nullable().optional(),
        cbm: z.number().nullable().optional(),
        variantType: z.enum(["universal", "exclusive"]).optional(),
        status: z.enum(["active", "inactive"]).optional(),
        supplierId: z.number().optional(),
        supplierSku: z.string().optional(),
        customerId: z.number().optional(),
        customerSku: z.string().optional(),
        materialColorId: z.number().optional(),
        productionStatus: z.enum(["designing", "sampling", "production", "completed"]).optional(),
        sellingPriceRMB: z.number().optional(),
        sellingPriceFOB: z.number().optional(),
        costPriceRMB: z.number().optional(),
        packageBoxes: z.array(z.object({
          length: z.number().nonnegative(), // 允许为0（手动输入CBM时）
          width: z.number().nonnegative(), // 允许为0（手动输入CBM时）
          height: z.number().nonnegative(), // 允许为0（手动输入CBM时）
          cbm: z.number().positive().optional(), // 手动输入的CBM值
          grossWeight: z.number().nonnegative().optional(),
          netWeight: z.number().nonnegative().optional(),
          packagingType: z.string().optional(),
          piecesPerBox: z.number().positive().optional(),
        })).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      
      // 转换数字为字符串（Decimal类型）
      const updateData: any = {};
      if (data.variantName !== undefined) updateData.variantName = data.variantName;
      if (data.fabricChange !== undefined) updateData.fabricChange = data.fabricChange;
      if (data.legTypeChange !== undefined) updateData.legTypeChange = data.legTypeChange;
      if (data.heightChange !== undefined) updateData.heightChange = data.heightChange;
      if (data.packagingChange !== undefined) updateData.packagingChange = data.packagingChange;
      if (data.otherChanges !== undefined) updateData.otherChanges = data.otherChanges;
      if (data.productLength !== undefined) updateData.productLength = data.productLength !== null ? data.productLength.toString() : null;
      if (data.productWidth !== undefined) updateData.productWidth = data.productWidth !== null ? data.productWidth.toString() : null;
      if (data.productHeight !== undefined) updateData.productHeight = data.productHeight !== null ? data.productHeight.toString() : null;
      if (data.packageLength !== undefined) updateData.packageLength = data.packageLength !== null ? data.packageLength.toString() : null;
      if (data.packageWidth !== undefined) updateData.packageWidth = data.packageWidth !== null ? data.packageWidth.toString() : null;
      if (data.packageHeight !== undefined) updateData.packageHeight = data.packageHeight !== null ? data.packageHeight.toString() : null;
      if (data.cbm !== undefined) updateData.cbm = data.cbm !== null ? data.cbm.toString() : null;
      if (data.variantType !== undefined) updateData.variantType = data.variantType;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.supplierId !== undefined) updateData.supplierId = data.supplierId;
      if (data.supplierSku !== undefined) updateData.supplierSku = data.supplierSku;
      if (data.customerId !== undefined) updateData.customerId = data.customerId;
      if (data.customerSku !== undefined) updateData.customerSku = data.customerSku;
      if (data.materialColorId !== undefined) updateData.materialColorId = data.materialColorId;
      if (data.productionStatus !== undefined) updateData.productionStatus = data.productionStatus;
      if (data.sellingPriceRMB !== undefined) updateData.sellingPriceRMB = data.sellingPriceRMB.toString();
      if (data.sellingPriceFOB !== undefined) updateData.sellingPriceFOB = data.sellingPriceFOB.toString();
      if (data.costPriceRMB !== undefined) updateData.costPriceRMB = data.costPriceRMB.toString();
      
      // 传递packageBoxes和erpCompanyId给updateVariant函数
      if (data.packageBoxes !== undefined) updateData.packageBoxes = data.packageBoxes;
      updateData.erpCompanyId = ctx.user.erpCompanyId;
      
      await updateVariant(id, updateData);
      return { success: true };
    }),

  /**
   * 删除批次
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteVariant(input.id);
      return { success: true };
    }),

  /**
   * 复制批次
   */
  duplicate: protectedProcedure
    .input(z.object({ 
      id: z.number(),
      customName: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const newVariantId = await duplicateVariant(input.id, ctx.user.id, ctx.user.erpCompanyId, input.customName);
      return { id: newVariantId };
    }),

  /**
   * 更新批次-客户关联
   */
  updateCustomerLinks: protectedProcedure
    .input(
      z.object({
        variantId: z.number(),
        customerIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input }) => {
      await updateVariantCustomerLinks(input.variantId, input.customerIds);
      return { success: true };
    }),

  /**
   * 更新批次价格
   */
  updatePricing: protectedProcedure
    .input(
      z.object({
        variantId: z.number(),
        factoryCostRmbExTax: z.number().optional(),
        factoryCostRmbIncTax: z.number().optional(),
        factoryCostUsdFob: z.number().optional(),
        myCostRmb: z.number().optional(),
        myCostUsd: z.number().optional(),
        fobFeeRmb: z.number().optional(),
        sellingPriceRmbIncTax: z.number().optional(),
        sellingPriceFobL1: z.number().optional(),
        sellingPriceFobL2: z.number().optional(),
        sellingPriceFobL3: z.number().optional(),
        effectiveDate: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { variantId, ...pricing } = input;
      
      // 转换数字为字符串（Decimal类型）
      const pricingData: any = {};
      if (pricing.factoryCostRmbExTax !== undefined) pricingData.factoryCostRmbExTax = pricing.factoryCostRmbExTax.toString();
      if (pricing.factoryCostRmbIncTax !== undefined) pricingData.factoryCostRmbIncTax = pricing.factoryCostRmbIncTax.toString();
      if (pricing.factoryCostUsdFob !== undefined) pricingData.factoryCostUsdFob = pricing.factoryCostUsdFob.toString();
      if (pricing.myCostRmb !== undefined) pricingData.myCostRmb = pricing.myCostRmb.toString();
      if (pricing.myCostUsd !== undefined) pricingData.myCostUsd = pricing.myCostUsd.toString();
      if (pricing.fobFeeRmb !== undefined) pricingData.fobFeeRmb = pricing.fobFeeRmb.toString();
      if (pricing.sellingPriceRmbIncTax !== undefined) pricingData.sellingPriceRmbIncTax = pricing.sellingPriceRmbIncTax.toString();
      if (pricing.sellingPriceFobL1 !== undefined) pricingData.sellingPriceFobL1 = pricing.sellingPriceFobL1.toString();
      if (pricing.sellingPriceFobL2 !== undefined) pricingData.sellingPriceFobL2 = pricing.sellingPriceFobL2.toString();
      if (pricing.sellingPriceFobL3 !== undefined) pricingData.sellingPriceFobL3 = pricing.sellingPriceFobL3.toString();
      if (pricing.effectiveDate !== undefined) pricingData.effectiveDate = pricing.effectiveDate;
      
      await updateVariantPricing(variantId, pricingData, ctx.user.id);
      return { success: true };
    }),

  /**
   * 获取批次价格历史
   */
  getPricingHistory: protectedProcedure
    .input(z.object({ variantId: z.number() }))
    .query(async ({ input }) => {
      return await getVariantPricingHistory(input.variantId);
    }),

  /**
   * 获取批次图片列表
   */
  getImages: protectedProcedure
    .input(z.object({ variantId: z.number() }))
    .query(async ({ input }) => {
      return await getVariantImages(input.variantId);
    }),

  /**
   * 上传批次图片
   */
  uploadImage: protectedProcedure
    .input(
      z.object({
        variantId: z.number(),
        fileName: z.string(),
        fileSize: z.number(),
        imageData: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const imageId = await uploadVariantImage({
        ...input,
        uploadedBy: ctx.user.id,
      });
      return { id: imageId };
    }),

  /**
   * 更新图片排序
   */
  updateImageOrder: protectedProcedure
    .input(
      z.object({
        variantId: z.number(),
        imageOrders: z.array(
          z.object({
            id: z.number(),
            sortOrder: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      await updateVariantImageOrder(input.variantId, input.imageOrders);
      return { success: true };
    }),

  /**
   * 设置主图
   */
  setPrimaryImage: protectedProcedure
    .input(
      z.object({
        variantId: z.number(),
        imageId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await setPrimaryVariantImage(input.variantId, input.imageId);
      return { success: true };
    }),

  /**
   * 删除图片
   */
  deleteImage: protectedProcedure
    .input(z.object({ imageId: z.number() }))
    .mutation(async ({ input }) => {
      await deleteVariantImage(input.imageId);
      return { success: true };
    }),

  /**
   * 设置默认批次
   * 确保一个产品只能有一个默认批次
   */
  setDefault: protectedProcedure
    .input(z.object({ variantId: z.number() }))
    .mutation(async ({ input }) => {
      await setDefaultVariant(input.variantId);
      return { success: true };
    }),

  /**
   * 根据客户SKU搜索批次
   * 用于快速查找批次创建补货单
   */
  searchByCustomerSku: protectedProcedure
    .input(z.object({ 
      customerSku: z.string(),
      customerId: z.number().optional(), // 可选：过滤特定客户的批次
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // 查询条件：客户SKU + ERP公司ID
      const conditions = [
        eq(productVariants.customerSku, input.customerSku),
        eq(productVariants.erpCompanyId, ctx.user.erpCompanyId),
      ];
      
      console.log('[searchByCustomerSku] Input:', JSON.stringify(input));
      console.log('[searchByCustomerSku] ERP Company ID:', ctx.user.erpCompanyId);
      console.log('[searchByCustomerSku] Conditions:', {
        customerSku: input.customerSku,
        erpCompanyId: ctx.user.erpCompanyId,
        customerSkuType: typeof input.customerSku,
        erpCompanyIdType: typeof ctx.user.erpCompanyId,
      });
      
      // 临时调试：查询所有包含'CLIENT-SKU-ABC'的批次
      const debugVariants = await db.select({
        id: productVariants.id,
        variantCode: productVariants.variantCode,
        customerSku: productVariants.customerSku,
        erpCompanyId: productVariants.erpCompanyId,
        customerId: productVariants.customerId,
        variantType: productVariants.variantType,
      })
      .from(productVariants)
      .where(like(productVariants.customerSku, '%CLIENT-SKU-ABC%'))
      .limit(5);
      console.log('[searchByCustomerSku] DEBUG: All variants with CLIENT-SKU-ABC:', JSON.stringify(debugVariants, null, 2));
      
      try {
        // 先查询所有匹配customerSku的批次，不过滤customerId
        console.log('[searchByCustomerSku] Step 1: Query all variants matching customerSku...');
        const allVariants = await db
          .select({
            id: productVariants.id,
            variantCode: productVariants.variantCode,
            variantName: productVariants.variantName,
            variantType: productVariants.variantType,
            customerId: productVariants.customerId,
            customerSku: productVariants.customerSku,
          })
          .from(productVariants)
          .where(and(...conditions))
          .limit(10);
        
        console.log('[searchByCustomerSku] All variants count:', allVariants.length);
        console.log('[searchByCustomerSku] All variants:', JSON.stringify(allVariants, null, 2));
        
        // 如果指定了客户ID，过滤批次（通用批次 + 客户专属批次）
        if (input.customerId) {
          console.log('[searchByCustomerSku] Step 2: Filter by customerId...');
          const variants = await db
          .select({
            id: productVariants.id,
            variantCode: productVariants.variantCode,
            variantName: productVariants.variantName,
            productId: productVariants.productId,
            productName: products.name,
            productSku: products.sku,
            supplierSku: productVariants.supplierSku,
            customerSku: productVariants.customerSku,
            variantType: productVariants.variantType,
            productionStatus: productVariants.productionStatus,
            isDefault: productVariants.isDefault,
          })
          .from(productVariants)
          .leftJoin(products, eq(productVariants.productId, products.id))
          .leftJoin(variantCustomerLinks, eq(productVariants.id, variantCustomerLinks.variantId))
          .where(
            and(
              ...conditions,
              or(
                eq(productVariants.variantType, 'universal'), // 通用批次
                eq(productVariants.customerId, input.customerId) // 批次直接关联的客户
              )
            )
          )
          .limit(10);
        
        console.log('[searchByCustomerSku] Filtered variants count:', variants.length);
        console.log('[searchByCustomerSku] Filtered variants:', JSON.stringify(variants, null, 2));
        return variants;
      } else {
        // 不指定客户ID，返回所有匹配的批次
        const variants = await db
          .select({
            id: productVariants.id,
            variantCode: productVariants.variantCode,
            variantName: productVariants.variantName,
            productId: productVariants.productId,
            productName: products.name,
            productSku: products.sku,
            supplierSku: productVariants.supplierSku,
            customerSku: productVariants.customerSku,
            variantType: productVariants.variantType,
            productionStatus: productVariants.productionStatus,
            isDefault: productVariants.isDefault,
          })
          .from(productVariants)
          .leftJoin(products, eq(productVariants.productId, products.id))
          .where(and(...conditions))
          .limit(10);
        
        return variants;
      }
      } catch (error) {
        console.error('[searchByCustomerSku] Error:', error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to search by customer SKU" });
      }
    }),
});
