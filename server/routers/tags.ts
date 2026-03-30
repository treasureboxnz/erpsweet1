import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as tagsDb from "../tags";

export const tagsRouter = router({
  // Get all tags
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return await tagsDb.getAllTags(ctx.user.erpCompanyId);
  }),

  // Search tags
  search: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input, ctx }) => {
      return await tagsDb.searchTags(input.query, ctx.user.erpCompanyId);
    }),

  // Get tag by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return await tagsDb.getTagById(input.id, ctx.user.erpCompanyId);
    }),

  // Create tag
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "标签名称不能为空"),
        color: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await tagsDb.createTag({
        ...input,
        createdBy: ctx.user.id,
      }, ctx.user.erpCompanyId);
    }),

  // Update tag
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1, "标签名称不能为空").optional(),
        color: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      return await tagsDb.updateTag(id, data, ctx.user.erpCompanyId);
    }),

  // Delete tag
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await tagsDb.deleteTag(input.id, ctx.user.erpCompanyId);
      return { success: true };
    }),

  // Get product tags
  getProductTags: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      return await tagsDb.getProductTags(input.productId);
    }),

  // Set product tags
  setProductTags: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        tagIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await tagsDb.setProductTags(input.productId, input.tagIds, ctx.user.erpCompanyId);
      return { success: true };
    }),
});
