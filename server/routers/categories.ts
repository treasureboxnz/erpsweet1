import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as categoriesDb from "../categories";

export const categoriesRouter = router({
  // List all categories with product count
  list: protectedProcedure.query(async ({ ctx }) => {
    return await categoriesDb.listCategoriesWithCount(ctx.user.erpCompanyId);
  }),

  // Get all categories
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return await categoriesDb.getAllCategories(ctx.user.erpCompanyId);
  }),

  // Search categories
  search: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input, ctx }) => {
      return await categoriesDb.searchCategories(input.query, ctx.user.erpCompanyId);
    }),

  // Get category by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return await categoriesDb.getCategoryById(input.id, ctx.user.erpCompanyId);
    }),

  // Create category
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "类目名称不能为空"),
        description: z.string().optional(),
        parentId: z.number().nullable().optional(),
        sortOrder: z.number().optional(),
        isEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await categoriesDb.createCategory(input, ctx.user.erpCompanyId);
    }),

  // Update category
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1, "类目名称不能为空").optional(),
        description: z.string().optional(),
        parentId: z.number().nullable().optional(),
        sortOrder: z.number().optional(),
        isEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      return await categoriesDb.updateCategory(id, data, ctx.user.erpCompanyId);
    }),

  // Delete category
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await categoriesDb.deleteCategory(input.id, ctx.user.erpCompanyId);
      return { success: true };
    }),

  // Get product categories
  getProductCategories: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input, ctx }) => {
      return await categoriesDb.getProductCategories(input.productId, ctx.user.erpCompanyId);
    }),

  // Set product categories
  setProductCategories: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        categoryIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await categoriesDb.setProductCategories(input.productId, input.categoryIds, ctx.user.erpCompanyId);
      return { success: true };
    }),

  // Move category (change parent or reorder)
  move: protectedProcedure
    .input(
      z.object({
        categoryId: z.number(),
        newParentId: z.number().nullable(),
        newSortOrder: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await categoriesDb.moveCategory(
        input.categoryId,
        input.newParentId,
        input.newSortOrder,
        ctx.user.erpCompanyId
      );
    }),
});
