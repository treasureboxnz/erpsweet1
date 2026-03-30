import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  getOrderStats,
  updateOrderStatus,
  getOrdersByStatus,
} from "../orders";
import { getDb, getCustomerLastPrice } from "../db";
import { companies, productVariants, variantPricing, systemSettings as systemSettingsTable, orders } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export const ordersRouter = router({
  /**
   * Get all orders with pagination and filtering
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().optional(),
        pageSize: z.number().optional(),
        status: z.string().optional(),
        paymentStatus: z.string().optional(),
        searchTerm: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        showDeleted: z.boolean().optional(), // 是否显示已删除订单（仅管理员可用）
      })
    )
    .query(async ({ input, ctx }) => {
      // 如果不是管理员，强制showDeleted=false
      const showDeleted = (ctx.user.role === 'admin' || ctx.user.role === 'super_admin') && input.showDeleted;
      return await getAllOrders({ ...input, showDeleted, erpCompanyId: ctx.user.erpCompanyId });
    }),

  /**
   * Get order by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return await getOrderById(input.id, ctx.user.erpCompanyId);
    }),

  /**
   * Create new order
   */
  create: protectedProcedure
    .input(
      z.object({
        orderNumber: z.string().optional(),
        customerId: z.number(),
        customerName: z.string().optional(),
        totalAmount: z.string(),
        orderMode: z.enum(["fob", "batch"]).default("fob"),
        currency: z.string().optional(),
        exchangeRate: z.string().optional(),
        status: z.string().optional(),
        paymentStatus: z.string().optional(),
        paymentMethod: z.string().optional(),
        paymentTerms: z.string().optional(),
        expectedDeliveryDate: z.date().optional(),
        shippingMethod: z.string().optional(),
        shippingAddress: z.string().optional(),
        billingAddress: z.string().optional(),
        contactPerson: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().optional(),
        notes: z.string().optional(),
        priority: z.string().optional(),
        source: z.string().optional(),
        customStatus: z.string().optional(), // 自定义订单状态
        items: z.array(
          z.object({
            // 通用字段
            productId: z.number().optional(),
            productName: z.string().optional(),
            productSku: z.string().optional(),
            orderMode: z.enum(['batch_selection', 'fob_only']).optional(),
            // 批次模式字段
            variantId: z.number().optional(),
            sku: z.string().optional(),
            quantity: z.number().optional(),
            unitPrice: z.string().optional(),
            discount: z.string().optional(),
            taxRate: z.string().optional(),
            subtotal: z.string().optional(),
            // FOB模式字段
            fobQuantity: z.number().optional(),
            fobUnitPrice: z.string().optional(),
            fobTotalPrice: z.string().optional(),
            notes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { items, customerId, ...orderData } = input;
      
      // Get system settings and customer info
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Generate order number if not provided, auto-retry on conflict
      let orderNumber = input.orderNumber;
      if (!orderNumber) {
        const { generateSkuCode } = await import("../skuRulesHelper");
        let attempts = 0;
        while (attempts < 10) {
          orderNumber = await generateSkuCode("order", ctx.user.erpCompanyId);
          const existing = await db
            .select({ id: orders.id })
            .from(orders)
            .where(and(eq(orders.orderNumber, orderNumber!), eq(orders.erpCompanyId, ctx.user.erpCompanyId)))
            .limit(1);
          if (existing.length === 0) break;
          attempts++;
        }
      } else {
        // Check if manually provided order number already exists
        const existingOrder = await db
          .select()
          .from(orders)
          .where(and(eq(orders.orderNumber, orderNumber), eq(orders.erpCompanyId, ctx.user.erpCompanyId)))
          .limit(1);
        if (existingOrder.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `订单编号 "${orderNumber}" 已存在，请使用其他编号`,
          });
        }
      }
      
      // Get system settings
      const settingsRows = await db.select().from(systemSettingsTable);
      const settingsObj: Record<string, string> = {};
      settingsRows.forEach((setting: { settingKey: string; settingValue: string | null }) => {
        settingsObj[setting.settingKey] = setting.settingValue || "";
      });
      
      const [customer] = await db.select().from(companies).where(eq(companies.id, customerId));
      
      // Process items: auto-fill default variant in FOB mode
      console.log('[FOB Mode] Settings:', settingsObj);
      console.log('[FOB Mode] Items:', items);
      const processedItems = await Promise.all(
        items.map(async (item) => {
          console.log('[FOB Mode] Processing item:', item);
          // If variantId is missing and we're in order mode (fob_only), find default variant
          if (!item.variantId && item.productId && input.orderMode === "fob") {
            console.log('[FOB Mode] Item needs default variant:', item.productId);
            // Find default variant for this product
            const [defaultVariant] = await db
              .select()
              .from(productVariants)
              .where(
                and(
                  eq(productVariants.productId, item.productId),
                  eq(productVariants.isDefault, true)
                )
              )
              .limit(1);
            
            console.log('[FOB Mode] Default variant found:', defaultVariant);
            if (defaultVariant) {
              let unitPrice: number;
              
              // Check if user provided a unit price (non-zero)
              if (item.unitPrice && parseFloat(item.unitPrice) > 0) {
                // Use user-provided price
                unitPrice = parseFloat(item.unitPrice);
                console.log('[FOB Mode] Using user-provided price:', unitPrice);
              } else {
                // Auto-fill price: try customer history first, then FOB price
                // Get pricing for this variant
                const [pricing] = await db
                  .select()
                  .from(variantPricing)
                  .where(eq(variantPricing.variantId, defaultVariant.id))
                  .limit(1);
                console.log('[FOB Mode] Pricing found:', pricing);
                
                if (pricing && customer) {
                  // First, try to get customer's last transaction price for this product
                  const lastPrice = await getCustomerLastPrice(customerId, item.productId);
                  console.log('[FOB Mode] Customer last price:', lastPrice);
                  
                  if (lastPrice) {
                    // Use customer's historical price
                    unitPrice = parseFloat(lastPrice);
                    console.log('[FOB Mode] Using customer historical price:', unitPrice);
                  } else {
                    // Get FOB price based on customer's default level
                    const fobLevel = customer.defaultFobLevel || "level1";
                    console.log('[FOB Mode] Customer FOB level:', fobLevel);
                    // Map level1/level2/level3 to sellingPriceFobL1/L2/L3
                    const fobFieldMap: Record<string, string> = {
                      level1: 'sellingPriceFobL1',
                      level2: 'sellingPriceFobL2',
                      level3: 'sellingPriceFobL3',
                    };
                    const fobPrice = pricing[fobFieldMap[fobLevel] as keyof typeof pricing] as string;
                    console.log('[FOB Mode] FOB price from default level:', fobPrice);
                    unitPrice = parseFloat(fobPrice || "0");
                  }
                } else {
                  unitPrice = 0;
                }
              }
              
              // Calculate subtotal
              const subtotal = (unitPrice * (item.quantity || 1)).toFixed(2);
              console.log('[FOB Mode] Calculated - unitPrice:', unitPrice, 'subtotal:', subtotal);
              
              return {
                ...item,
                variantId: defaultVariant.id,
                unitPrice: unitPrice.toFixed(2),
                subtotal,
              };
            } else {
              // No default variant found - this is OK for FOB mode
              // Just use the user-provided price and keep variantId as null
              console.log('[FOB Mode] No default variant, using user price');
              const unitPrice = parseFloat(item.unitPrice || "0");
              const subtotal = (unitPrice * (item.quantity || 1)).toFixed(2);
              return {
                ...item,
                variantId: null, // Set to null instead of 0
                unitPrice: unitPrice.toFixed(2),
                subtotal,
              };
            }
          }
          
          return item;
        })
      );
      
      // Recalculate total amount
      const totalAmount = processedItems.reduce((sum, item) => {
        return sum + parseFloat(item.subtotal || "0");
      }, 0).toFixed(2);
      
      const orderId = await createOrder(
        { ...orderData, orderNumber, customerId, totalAmount, orderMode: input.orderMode, createdBy: ctx.user.id, erpCompanyId: ctx.user.erpCompanyId } as any,
        processedItems as any
      );
      
      // [批次模式] 订单保存时同步回写批次价格到 productVariants 表
      // 当订单行单价不为0时，更新对应批次的 sellingPriceFOB 或 sellingPriceRMB
      const orderCurrency = input.currency || "USD";
      for (const item of items) {
        if (
          item.orderMode === 'batch_selection' &&
          item.variantId &&
          item.unitPrice &&
          parseFloat(item.unitPrice) > 0
        ) {
          const priceField = orderCurrency === "RMB" ? 'sellingPriceRMB' : 'sellingPriceFOB';
          await db
            .update(productVariants)
            .set({ [priceField]: item.unitPrice })
            .where(eq(productVariants.id, item.variantId));
          console.log(`[Batch Price Sync] create: Updated ${priceField} to ${item.unitPrice} for variant ${item.variantId}`);
        }
      }

      // Auto-update FOB prices to database when user manually inputs prices
      if (input.orderMode === "fob" && customer) {
        const fobLevel = customer.defaultFobLevel || "level1";
        const fobFieldMap: Record<string, string> = {
          level1: 'sellingPriceFobL1',
          level2: 'sellingPriceFobL2',
          level3: 'sellingPriceFobL3',
        };
        const fobField = fobFieldMap[fobLevel];
        
        for (const item of items) {
          // Only update if user provided a non-zero price
          if (item.unitPrice && parseFloat(item.unitPrice) > 0 && item.productId) {
            // Find default variant for this product
            const [defaultVariant] = await db
              .select()
              .from(productVariants)
              .where(
                and(
                  eq(productVariants.productId, item.productId),
                  eq(productVariants.isDefault, true)
                )
              )
              .limit(1);
            
            if (defaultVariant) {
              // Check if pricing record exists
              const [existingPricing] = await db
                .select()
                .from(variantPricing)
                .where(eq(variantPricing.variantId, defaultVariant.id))
                .limit(1);
              
              if (existingPricing) {
                // Only update if current FOB price is 0 or null
                const currentFobPrice = existingPricing[fobField as keyof typeof existingPricing] as string;
                if (!currentFobPrice || parseFloat(currentFobPrice) === 0) {
                  // Update FOB price based on customer's level
                  await db
                    .update(variantPricing)
                    .set({ [fobField]: item.unitPrice })
                    .where(eq(variantPricing.variantId, defaultVariant.id));
                  console.log(`[FOB Price Update] Updated ${fobField} from ${currentFobPrice || '0'} to ${item.unitPrice} for variant ${defaultVariant.id}`);
                } else {
                  console.log(`[FOB Price Update] Skipped update for variant ${defaultVariant.id} - existing price ${currentFobPrice} is not zero`);
                }
              }
            }
          }
        }
      }
      
      return { id: orderId };
    }),

  /**
   * Update order
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        orderNumber: z.string().optional(),
        customerId: z.number().optional(),
        customerName: z.string().optional(),
        totalAmount: z.string().optional(),
        currency: z.string().optional(),
        exchangeRate: z.string().optional(),
        status: z.string().optional(),
        paymentStatus: z.string().optional(),
        paymentMethod: z.string().optional(),
        paymentTerms: z.string().optional(),
        expectedDeliveryDate: z.date().optional(),
        actualDeliveryDate: z.date().optional(),
        shippingMethod: z.string().optional(),
        trackingNumber: z.string().optional(),
        shippingAddress: z.string().optional(),
        billingAddress: z.string().optional(),
        contactPerson: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().optional(),
        notes: z.string().optional(),
        priority: z.string().optional(),
        source: z.string().optional(),
        customStatus: z.string().optional(), // 自定义订单状态
        items: z
          .array(
            z.object({
              // 混合模式字段
              productId: z.number().optional(),
              productName: z.string().optional(),
              productSku: z.string().optional(),
              orderMode: z.enum(['batch_selection', 'fob_only']).optional(),
              // 批次模式字段
              variantId: z.number().optional(),
              quantity: z.number().optional(),
              unitPrice: z.string().optional(),
              subtotal: z.string().optional(),
              // FOB模式字段
              fobQuantity: z.number().optional(),
              fobUnitPrice: z.string().optional(),
              fobTotalPrice: z.string().optional(),
              notes: z.string().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, items, customerId, ...orderData } = input;
      await updateOrder(id, { ...orderData, customerId } as any, items as any, ctx.user.id);
      
      // [批次模式] 编辑订单时同步回写批次价格到 productVariants 表
      if (items && items.length > 0) {
        const dbForBatch = await getDb();
        if (dbForBatch) {
          const batchCurrency = (orderData as any).currency || "USD";
          for (const item of items) {
            if (
              item.orderMode === 'batch_selection' &&
              item.variantId &&
              item.unitPrice &&
              parseFloat(item.unitPrice) > 0
            ) {
              const priceField = batchCurrency === "RMB" ? 'sellingPriceRMB' : 'sellingPriceFOB';
              await dbForBatch
                .update(productVariants)
                .set({ [priceField]: item.unitPrice })
                .where(eq(productVariants.id, item.variantId));
              console.log(`[Batch Price Sync] update: Updated ${priceField} to ${item.unitPrice} for variant ${item.variantId}`);
            }
          }
        }
      }

      // Auto-update FOB prices to database when user manually inputs/modifies prices
      if (items && items.length > 0 && customerId) {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Get customer info
        const [customer] = await db.select().from(companies).where(eq(companies.id, customerId));
        if (customer) {
          const fobLevel = customer.defaultFobLevel || "level1";
          const fobFieldMap: Record<string, string> = {
            level1: 'sellingPriceFobL1',
            level2: 'sellingPriceFobL2',
            level3: 'sellingPriceFobL3',
          };
          const fobField = fobFieldMap[fobLevel];
          
          for (const item of items) {
            // Only update FOB mode items with non-zero prices
            if (item.orderMode === 'fob_only' && item.fobUnitPrice && parseFloat(item.fobUnitPrice) > 0 && item.productId) {
              // Find default variant for this product
              const [defaultVariant] = await db
                .select()
                .from(productVariants)
                .where(
                  and(
                    eq(productVariants.productId, item.productId),
                    eq(productVariants.isDefault, true)
                  )
                )
                .limit(1);
              
              if (defaultVariant) {
                // Check if pricing record exists
                const [existingPricing] = await db
                  .select()
                  .from(variantPricing)
                  .where(eq(variantPricing.variantId, defaultVariant.id))
                  .limit(1);
                
                if (existingPricing) {
                  // Only update if current FOB price is 0 or null
                  const currentFobPrice = existingPricing[fobField as keyof typeof existingPricing] as string;
                  if (!currentFobPrice || parseFloat(currentFobPrice) === 0) {
                    // Update FOB price based on customer's level
                    await db
                      .update(variantPricing)
                      .set({ [fobField]: item.fobUnitPrice })
                      .where(eq(variantPricing.variantId, defaultVariant.id));
                    console.log(`[FOB Price Update] Updated ${fobField} from ${currentFobPrice || '0'} to ${item.fobUnitPrice} for variant ${defaultVariant.id}`);
                  } else {
                    console.log(`[FOB Price Update] Skipped update for variant ${defaultVariant.id} - existing price ${currentFobPrice} is not zero`);
                  }
                }
              }
            }
          }
        }
      }
      
      return { success: true };
    }),

  /**
   * Soft delete order (普通用户和管理员均可删除)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // 软删除：设置deletedAt和deletedBy
      await db
        .update(orders)
        .set({ 
          deletedAt: new Date(),
          deletedBy: ctx.user.id 
        })
        .where(eq(orders.id, input.id));
      
      return { success: true };
    }),

  /**
   * Recover deleted order (仅管理员可恢复)
   */
  recover: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // 检查是否为管理员
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin') {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "只有管理员可以恢复已删除的订单" 
        });
      }
      
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // 恢复：清除deletedAt和deletedBy
      await db
        .update(orders)
        .set({ 
          deletedAt: null,
          deletedBy: null 
        })
        .where(eq(orders.id, input.id));
      
      return { success: true };
    }),

  /**
   * Get order statistics
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    return await getOrderStats(ctx.user.erpCompanyId);
  }),

  /**
   * Update order status
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        orderId: z.number(),
        status: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await updateOrderStatus(input.orderId, input.status, input.notes, ctx.user.id);
      return { success: true };
    }),

  /**
   * Get orders by status
   */
  getByStatus: protectedProcedure
    .input(
      z.object({
        status: z.string(),
        page: z.number().optional(),
        pageSize: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await getOrdersByStatus(input.status, input.page, input.pageSize, ctx.user.erpCompanyId);
    }),

  /**
   * Get recommended price for a product based on customer
   */
  getRecommendedPrice: protectedProcedure
    .input(
      z.object({
        customerId: z.number(),
        productId: z.number(),
        currency: z.enum(["USD", "RMB"]).optional().default("USD"),
      })
    )
    .query(async ({ input }) => {
      const { customerId, productId, currency } = input;
      const db = await getDb();
      if (!db) {
        throw new Error('Database connection failed');
      }

      // Get customer info
      const [customer] = await db.select().from(companies).where(eq(companies.id, customerId));
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Get default variant for this product, or first variant if no default
      let [defaultVariant] = await db
        .select()
        .from(productVariants)
        .where(
          and(
            eq(productVariants.productId, productId),
            eq(productVariants.isDefault, true)
          )
        )
        .limit(1);
      
      // If no default variant, get the first variant
      if (!defaultVariant) {
        [defaultVariant] = await db
          .select()
          .from(productVariants)
          .where(eq(productVariants.productId, productId))
          .limit(1);
      }
      
      if (!defaultVariant) {
        throw new Error('No variant found for this product');
      }

      // Get pricing for this variant
      const [pricing] = await db
        .select()
        .from(variantPricing)
        .where(eq(variantPricing.variantId, defaultVariant.id))
        .limit(1);

      if (!pricing) {
        throw new Error('Pricing not found for default variant');
      }

      // Get price based on currency
      let price: string;
      let source: 'fob' | 'rmb' | 'history';
      
      // Try to get customer's historical price for this product (with currency filter)
      const lastPrice = await getCustomerLastPrice(customerId, productId, currency);

      if (lastPrice) {
        // Use customer's historical price
        price = lastPrice;
        source = 'history';
      } else if (currency === 'RMB') {
        // Use RMB price from pricing table
        price = pricing.sellingPriceRmbIncTax || '0';
        source = 'rmb';
      } else {
        // For USD, use FOB price from pricing table
        const fobLevel = customer.defaultFobLevel || 'level1';
        const fobFieldMap: Record<string, string> = {
          level1: 'sellingPriceFobL1',
          level2: 'sellingPriceFobL2',
          level3: 'sellingPriceFobL3',
        };
        price = pricing[fobFieldMap[fobLevel] as keyof typeof pricing] as string || '0';
        source = 'fob';
      }

      return {
        price,
        source,
        fobLevel: currency === 'USD' ? (customer.defaultFobLevel || 'level1') : undefined,
      };
    }),
});
