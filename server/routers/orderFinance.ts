import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { orderFinance, orders } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const orderFinanceRouter = router({
  /**
   * 创建或更新订单财务信息
   */
  createOrUpdate: protectedProcedure
    .input(
      z.object({
        orderId: z.number(),
        customerAdvancePaymentDate: z.string().optional().nullable(),
        customerAdvancePaymentAmount: z.string().optional().nullable(),
        customerFinalPaymentDate: z.string().optional().nullable(),
        customerFinalPaymentAmount: z.string().optional().nullable(),
        supplierAdvancePaymentDate: z.string().optional().nullable(),
        supplierAdvancePaymentAmount: z.string().optional().nullable(),
        supplierFinalPaymentDate: z.string().optional().nullable(),
        supplierFinalPaymentAmount: z.string().optional().nullable(),
        paymentMethod: z.enum(["30TT_70TT", "LC_AT_SIGHT"]).optional().nullable(),
        supplierCurrency: z.enum(["USD", "RMB", "EUR", "GBP"]).optional().nullable(),
        documentsRequired: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const erpCompanyId = ctx.user.erpCompanyId;
      if (!erpCompanyId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User not associated with any company" });
      }

      // 验证订单是否存在且属于当前公司
      const [order] = await db.select().from(orders).where(and(eq(orders.id, input.orderId), eq(orders.erpCompanyId, erpCompanyId))).limit(1);

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      // 检查是否已存在财务记录
      const [existing] = await db.select().from(orderFinance).where(and(eq(orderFinance.orderId, input.orderId), eq(orderFinance.erpCompanyId, erpCompanyId))).limit(1);

      const financeData = {
        orderId: input.orderId,
        erpCompanyId,
        customerAdvancePaymentDate: input.customerAdvancePaymentDate ? new Date(input.customerAdvancePaymentDate) : null,
        customerAdvancePaymentAmount: input.customerAdvancePaymentAmount || null,
        customerFinalPaymentDate: input.customerFinalPaymentDate ? new Date(input.customerFinalPaymentDate) : null,
        customerFinalPaymentAmount: input.customerFinalPaymentAmount || null,
        supplierAdvancePaymentDate: input.supplierAdvancePaymentDate ? new Date(input.supplierAdvancePaymentDate) : null,
        supplierAdvancePaymentAmount: input.supplierAdvancePaymentAmount || null,
        supplierFinalPaymentDate: input.supplierFinalPaymentDate ? new Date(input.supplierFinalPaymentDate) : null,
        supplierFinalPaymentAmount: input.supplierFinalPaymentAmount || null,
        paymentMethod: input.paymentMethod || null,
        supplierCurrency: input.supplierCurrency || "RMB",
        documentsRequired: input.documentsRequired ?? null,
      };

      if (existing) {
        // 更新现有记录
        await db
          .update(orderFinance)
          .set(financeData)
          .where(eq(orderFinance.id, existing.id));

        return { success: true, id: existing.id };
      } else {
        // 创建新记录
        const [result] = await db.insert(orderFinance).values(financeData);
        return { success: true, id: result.insertId };
      }
    }),

  /**
   * 根据订单ID获取财务信息
   */
  getByOrderId: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const erpCompanyId = ctx.user.erpCompanyId;
      if (!erpCompanyId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User not associated with any company" });
      }

      const [finance] = await db.select().from(orderFinance).where(and(eq(orderFinance.orderId, input.orderId), eq(orderFinance.erpCompanyId, erpCompanyId))).limit(1);

      return finance || null;
    }),

  /**
   * 获取订单财务汇总数据
   */
  getFinanceSummary: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const erpCompanyId = ctx.user.erpCompanyId;
      if (!erpCompanyId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User not associated with any company" });
      }

      // 验证订单是否存在且属于当前公司
      const [order] = await db.select().from(orders).where(and(eq(orders.id, input.orderId), eq(orders.erpCompanyId, erpCompanyId))).limit(1);

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      // 获取订单明细和产品信息
      const { orderItems, products } = await import("../../drizzle/schema");
      const items = await db
        .select({
          quantity: orderItems.quantity,
          fobUnitPrice: orderItems.fobUnitPrice,
          fobTotalPrice: orderItems.fobTotalPrice,
          productId: orderItems.productId,
          itemCbm: orderItems.cbm,          // 优先使用订单行CBM（从package_boxes复制）
          packageCbm: products.packageCbm,  // 备用：产品级CBM
          myCostRmb: products.myCostRmb,
        })
        .from(orderItems)
        .leftJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, input.orderId));

      // 计算汇总数据
      let totalQuantity = 0;
      let totalVolume = 0;
      let totalFobPrice = 0;
      let totalPurchasePrice = 0;
      let singleProductVolume: number | null = null;
      let singlePurchaseUnitPrice: number | null = null;

      for (const item of items) {
        const quantity = item.quantity || 0;
        // 优先使用订单行CBM（从package_boxes复制），其次使用产品级packageCbm
        const cbm = item.itemCbm ? parseFloat(item.itemCbm.toString())
          : item.packageCbm ? parseFloat(item.packageCbm.toString()) : 0;
        const fobTotal = item.fobTotalPrice ? parseFloat(item.fobTotalPrice) : 0;
        const purchaseUnitPrice = item.myCostRmb ? parseFloat(item.myCostRmb.toString()) : 0;

        totalQuantity += quantity;
        totalVolume += quantity * cbm;
        totalFobPrice += fobTotal;
        totalPurchasePrice += quantity * purchaseUnitPrice;

        // 记录第一个产品的体积和采购单价（用于显示“单个产品体积”和“采购单价”）
        if (singleProductVolume === null && cbm > 0) {
          singleProductVolume = cbm;
        }
        if (singlePurchaseUnitPrice === null && purchaseUnitPrice > 0) {
          singlePurchaseUnitPrice = purchaseUnitPrice;
        }
      }

      return {
        orderQuantity: totalQuantity,
        singleProductVolume: singleProductVolume,
        totalVolume: totalVolume,
        fobTotalPrice: totalFobPrice,
        purchaseUnitPrice: singlePurchaseUnitPrice,
        purchaseTotalPrice: totalPurchasePrice,
        currency: order.currency || "USD",
      };
    }),
});
