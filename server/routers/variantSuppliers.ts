import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { variantSuppliers, suppliers } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const variantSuppliersRouter = router({
  // 获取批次的供应商版本列表
  list: protectedProcedure
    .input(z.object({ variantId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const results = await db
        .select({
          id: variantSuppliers.id,
          variantId: variantSuppliers.variantId,
          supplierId: variantSuppliers.supplierId,
          supplierName: suppliers.supplierName,
          factoryItemCode: variantSuppliers.factoryItemCode,
          factoryQuote: variantSuppliers.factoryQuote,
          moq: variantSuppliers.moq,
          leadTimeDays: variantSuppliers.leadTimeDays,
          isDefault: variantSuppliers.isDefault,
          status: variantSuppliers.status,
          createdAt: variantSuppliers.createdAt,
        })
        .from(variantSuppliers)
        .leftJoin(suppliers, eq(variantSuppliers.supplierId, suppliers.id))
        .where(and(
          eq(variantSuppliers.variantId, input.variantId),
          eq(variantSuppliers.erpCompanyId, ctx.user.erpCompanyId)
        ))
        .orderBy(desc(variantSuppliers.isDefault), desc(variantSuppliers.createdAt));
      
      return results;
    }),

  // 创建供应商版本
  create: protectedProcedure
    .input(
      z.object({
        variantId: z.number(),
        supplierId: z.number(),
        factoryItemCode: z.string().optional(),
        factoryQuote: z.number().optional(),
        moq: z.number().optional(),
        leadTimeDays: z.number().optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // 如果设置为默认供应商，先取消其他默认供应商
      if (input.isDefault) {
        await db
          .update(variantSuppliers)
          .set({ isDefault: false })
          .where(and(
            eq(variantSuppliers.variantId, input.variantId),
            eq(variantSuppliers.erpCompanyId, ctx.user.erpCompanyId)
          ));
      }
      
      await db.insert(variantSuppliers).values({
        variantId: input.variantId,
        supplierId: input.supplierId,
        factoryItemCode: input.factoryItemCode,
        factoryQuote: input.factoryQuote?.toString(),
        moq: input.moq,
        leadTimeDays: input.leadTimeDays,
        isDefault: input.isDefault || false,
        createdBy: ctx.user.id,
        erpCompanyId: ctx.user.erpCompanyId,
      });
      
      return { success: true };
    }),

  // 更新供应商版本
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        factoryItemCode: z.string().optional(),
        factoryQuote: z.number().optional(),
        moq: z.number().optional(),
        leadTimeDays: z.number().optional(),
        status: z.enum(["active", "inactive"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const { id, ...updateData } = input;
      
      await db
        .update(variantSuppliers)
        .set({
          ...updateData,
          factoryQuote: updateData.factoryQuote?.toString(),
        })
        .where(and(
          eq(variantSuppliers.id, id),
          eq(variantSuppliers.erpCompanyId, ctx.user.erpCompanyId)
        ));
      
      return { success: true };
    }),

  // 设置默认供应商
  setDefault: protectedProcedure
    .input(z.object({ id: z.number(), variantId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // 先取消该批次的所有默认供应商
      await db
        .update(variantSuppliers)
        .set({ isDefault: false })
        .where(and(
          eq(variantSuppliers.variantId, input.variantId),
          eq(variantSuppliers.erpCompanyId, ctx.user.erpCompanyId)
        ));
      
      // 设置新的默认供应商
      await db
        .update(variantSuppliers)
        .set({ isDefault: true })
        .where(and(
          eq(variantSuppliers.id, input.id),
          eq(variantSuppliers.erpCompanyId, ctx.user.erpCompanyId)
        ));
      
      return { success: true };
    }),

  // 删除供应商版本
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      await db
        .delete(variantSuppliers)
        .where(and(
          eq(variantSuppliers.id, input.id),
          eq(variantSuppliers.erpCompanyId, ctx.user.erpCompanyId)
        ));
      
      return { success: true };
    }),
});
