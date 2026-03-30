import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { orderTracking, orders, erpCompanies } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const orderTrackingRouter = router({
  /**
   * 创建或更新订单跟进信息
   */
  createOrUpdate: protectedProcedure
    .input(
      z.object({
        orderId: z.number(),
        inspectionDate: z.string().optional().nullable(),
        inspectionReportUrl: z.string().optional().nullable(),
        inspectionReportFilename: z.string().optional().nullable(),
        estimatedShippingDate: z.string().optional().nullable(),
        actualShippingDate: z.string().optional().nullable(),
        etd: z.string().optional().nullable(),
        eta: z.string().optional().nullable(),
        shippingPort: z.string().optional().nullable(),
        containerNumber: z.string().optional().nullable(),
        billOfLadingNumber: z.string().optional().nullable(),
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

      // 检查是否已存在跟进记录
      const [existing] = await db.select().from(orderTracking).where(and(eq(orderTracking.orderId, input.orderId), eq(orderTracking.erpCompanyId, erpCompanyId))).limit(1);

      const trackingData = {
        orderId: input.orderId,
        erpCompanyId,
        inspectionDate: input.inspectionDate ? new Date(input.inspectionDate) : null,
        inspectionReportUrl: input.inspectionReportUrl || null,
        inspectionReportFilename: input.inspectionReportFilename || null,
        estimatedShippingDate: input.estimatedShippingDate ? new Date(input.estimatedShippingDate) : null,
        actualShippingDate: input.actualShippingDate ? new Date(input.actualShippingDate) : null,
        etd: input.etd ? new Date(input.etd) : null,
        eta: input.eta ? new Date(input.eta) : null,
        shippingPort: input.shippingPort || null,
        containerNumber: input.containerNumber || null,
        billOfLadingNumber: input.billOfLadingNumber || null,
      };

      if (existing) {
        // 更新现有记录
        await db
          .update(orderTracking)
          .set(trackingData)
          .where(eq(orderTracking.id, existing.id));

        return { success: true, id: existing.id };
      } else {
        // 创建新记录
        const [result] = await db.insert(orderTracking).values(trackingData);
        return { success: true, id: result.insertId };
      }
    }),

  /**
   * 根据订单ID获取跟进信息
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

      const [tracking] = await db.select().from(orderTracking).where(and(eq(orderTracking.orderId, input.orderId), eq(orderTracking.erpCompanyId, erpCompanyId))).limit(1);

      return tracking || null;
    }),
});
