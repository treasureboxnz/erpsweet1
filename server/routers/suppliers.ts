import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as suppliersDb from "../suppliers";

export const suppliersRouter = router({
  // List all suppliers
  list: protectedProcedure.query(async ({ ctx }) => {
    return await suppliersDb.getAllSuppliers(ctx.user.erpCompanyId);
  }),

  // Search suppliers
  search: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input, ctx }) => {
      return await suppliersDb.searchSuppliers(input.query, ctx.user.erpCompanyId);
    }),

  // Get supplier by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return await suppliersDb.getSupplierById(input.id, ctx.user.erpCompanyId);
    }),

  // Create supplier
  create: protectedProcedure
    .input(
      z.object({
        supplierName: z.string().min(1, "供应商名称不能为空"),
        supplierCode: z.string().optional(),
        contactPerson: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        province: z.string().optional(),
        country: z.string().optional(),
        postalCode: z.string().optional(),
        website: z.string().optional(),
        taxId: z.string().optional(),
        businessLicense: z.string().optional(),
        categoryId: z.number().optional(),
        rating: z.number().min(0).max(5).optional(),
        paymentTerms: z.string().optional(),
        currency: z.string().optional(),
        notes: z.string().optional(),
        status: z.enum(["active", "inactive", "suspended"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Generate supplier code if not provided
      let supplierCode = input.supplierCode;
      if (!supplierCode) {
        const { generateSkuCode } = await import("../skuRulesHelper");
        supplierCode = await generateSkuCode("supplier", ctx.user.erpCompanyId);
      }
      
      // Check if supplier code already exists
      const existingSupplier = await suppliersDb.getSupplierByCode(supplierCode, ctx.user.erpCompanyId);
      if (existingSupplier) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `供应商编号 "${supplierCode}" 已存在，请使用其他编号`,
        });
      }
      
      return await suppliersDb.createSupplier({
        ...input,
        supplierCode,
        createdBy: ctx.user.id,
        erpCompanyId: ctx.user.erpCompanyId,
      });
    }),

  // Update supplier
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        supplierName: z.string().min(1, "供应商名称不能为空").optional(),
        supplierCode: z.string().optional(),
        contactPerson: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        province: z.string().optional(),
        country: z.string().optional(),
        postalCode: z.string().optional(),
        website: z.string().optional(),
        taxId: z.string().optional(),
        businessLicense: z.string().optional(),
        categoryId: z.number().optional(),
        rating: z.number().min(0).max(5).optional(),
        paymentTerms: z.string().optional(),
        currency: z.string().optional(),
        notes: z.string().optional(),
        status: z.enum(["active", "inactive", "suspended"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      return await suppliersDb.updateSupplier(id, ctx.user.erpCompanyId, data);
    }),

  // Delete supplier
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await suppliersDb.deleteSupplier(input.id, ctx.user.erpCompanyId);
      return { success: true };
    }),

  // Get supplier statistics
  stats: protectedProcedure.query(async ({ ctx }) => {
    return await suppliersDb.getSupplierStats(ctx.user.erpCompanyId);
  }),
});
