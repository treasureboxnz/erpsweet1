import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  listMaterialTypes,
  getMaterialTypeById,
  createMaterialType,
  updateMaterialType,
  deleteMaterialType,
} from "../materialTypes";

export const materialTypesRouter = router({
  /**
   * List all material types
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return listMaterialTypes(ctx.user.erpCompanyId!);
  }),

  /**
   * Get a single material type by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return getMaterialTypeById(input.id, ctx.user.erpCompanyId!);
    }),

  /**
   * Create a new material type
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50),
        icon: z.string().max(10).optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createMaterialType({
        erpCompanyId: ctx.user.erpCompanyId!,
        name: input.name,
        icon: input.icon,
        sortOrder: input.sortOrder,
      });
    }),

  /**
   * Update a material type
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(50).optional(),
        icon: z.string().max(10).optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return updateMaterialType(input.id, ctx.user.erpCompanyId!, {
        name: input.name,
        icon: input.icon,
        sortOrder: input.sortOrder,
      });
    }),

  /**
   * Delete a material type (soft delete)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return deleteMaterialType(input.id, ctx.user.erpCompanyId!);
    }),
});
