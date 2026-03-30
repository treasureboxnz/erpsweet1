import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getAttributes,
  getAttributesGroupedByCategory,
  createAttribute,
  updateAttribute,
  deleteAttribute,
  bulkCreateAttributes,
} from "../attributes";

export const attributesRouter = router({
  /**
   * 获取所有属性（支持筛选）
   */
  getAll: protectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
        subcategory: z.string().optional(),
        fieldName: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await getAttributes({ ...input, erpCompanyId: ctx.user.erpCompanyId });
    }),

  /**
   * 按根目录分组获取属性
   */
  getGrouped: protectedProcedure.query(async ({ ctx }) => {
    return await getAttributesGroupedByCategory(ctx.user.erpCompanyId);
  }),

  /**
   * 创建属性
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        category: z.string().min(1),
        subcategory: z.string().optional(),
        fieldName: z.string().min(1),
        displayOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await createAttribute({
        ...input,
        createdBy: ctx.user.id,
      }, ctx.user.erpCompanyId);
    }),

  /**
   * 更新属性
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        displayOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      return await updateAttribute(id, data, ctx.user.erpCompanyId);
    }),

  /**
   * 删除属性
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await deleteAttribute(input.id, ctx.user.erpCompanyId);
    }),

  /**
   * 批量创建属性
   */
  bulkCreate: protectedProcedure
    .input(
      z.array(
        z.object({
          name: z.string().min(1),
          category: z.string().min(1),
          subcategory: z.string().optional(),
          fieldName: z.string().min(1),
          displayOrder: z.number().optional(),
        })
      )
    )
    .mutation(async ({ input, ctx }) => {
      const data = input.map((item) => ({
        ...item,
        createdBy: ctx.user.id,
      }));
      return await bulkCreateAttributes(data, ctx.user.erpCompanyId);
    }),
});
