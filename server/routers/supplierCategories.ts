import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as supplierCategoriesDb from "../supplierCategories";

export const supplierCategoriesRouter = router({
  /**
   * Get all supplier categories
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return await supplierCategoriesDb.getAllSupplierCategories(ctx.user.erpCompanyId);
  }),

  /**
   * Get supplier category by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return await supplierCategoriesDb.getSupplierCategoryById(input.id, ctx.user.erpCompanyId);
    }),

  /**
   * Create a new supplier category
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        parentId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await supplierCategoriesDb.createSupplierCategory(input, ctx.user.erpCompanyId);
    }),

  /**
   * Update supplier category
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      return await supplierCategoriesDb.updateSupplierCategory(id, data, ctx.user.erpCompanyId);
    }),

  /**
   * Delete supplier category
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await supplierCategoriesDb.deleteSupplierCategory(input.id, ctx.user.erpCompanyId);
    }),

  /**
   * Move supplier category (drag and drop)
   */
  move: protectedProcedure
    .input(
      z.object({
        categoryId: z.number(),
        newParentId: z.number().nullable(),
        newSortOrder: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await supplierCategoriesDb.moveSupplierCategory(
        input.categoryId,
        input.newParentId,
        input.newSortOrder,
        ctx.user.erpCompanyId
      );
    }),
});
