import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getVariantMaterials,
  addVariantMaterial,
  updateVariantMaterial,
  deleteVariantMaterial,
  reorderVariantMaterial,
  setVariantMaterials,
} from "../variantMaterials";
import { getVariantById } from "../productVariants";
import { getDb } from "../db";
import { materialColors } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";

export const variantMaterialsRouter = router({
  /**
   * 获取批次的所有材料
   */
  list: protectedProcedure
    .input(
      z.object({
        variantId: z.number(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      // 验证批次属于当前公司
      const variant = await getVariantById(input.variantId, ctx.user.erpCompanyId!);
      if (!variant) {
        throw new Error("Variant not found or access denied");
      }

      return await getVariantMaterials(input.variantId, input.limit);
    }),

  /**
   * 添加材料到批次
   */
  add: protectedProcedure
    .input(
      z.object({
        variantId: z.number(),
        materialColorId: z.number(),
        materialType: z.string(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 验证批次属于当前公司
      const variant = await getVariantById(input.variantId, ctx.user.erpCompanyId!);
      if (!variant) {
        throw new Error("Variant not found or access denied");
      }

      // 验证材料颜色属于当前公司（防止跨租户数据污染）
      const db = await getDb();
      if (db) {
        const { materialBoards, materialSuppliers } = await import("../../drizzle/schema.js");
        const { and, eq: drizzleEq } = await import("drizzle-orm");
        const colorCheck = await db
          .select({ id: materialColors.id })
          .from(materialColors)
          .leftJoin(materialBoards, drizzleEq(materialColors.boardId, materialBoards.id))
          .leftJoin(materialSuppliers, drizzleEq(materialBoards.supplierId, materialSuppliers.id))
          .where(and(
            drizzleEq(materialColors.id, input.materialColorId),
            drizzleEq(materialSuppliers.erpCompanyId, ctx.user.erpCompanyId!)
          ))
          .limit(1);
        if (colorCheck.length === 0) {
          throw new Error("Material color not found or access denied");
        }
      }

      const result = await addVariantMaterial(input);
      // 增加材料颜色引用次数（热度排序依据）
      if (db) {
        await db.update(materialColors)
          .set({ usageCount: sql`${materialColors.usageCount} + 1` })
          .where(eq(materialColors.id, input.materialColorId));
      }
      return result;
    }),

  /**
   * 更新材料信息
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        materialColorId: z.number().optional(),
        materialType: z.string().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;

      // TODO: 验证材料属于当前公司的批次
      await updateVariantMaterial(id, data);
      return { success: true };
    }),

  /**
   * 删除材料
   */
  delete: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: 验证材料属于当前公司的批次
      await deleteVariantMaterial(input.id);
      return { success: true };
    }),

  /**
   * 调整材料顺序
   */
  reorder: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        direction: z.enum(["up", "down"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: 验证材料属于当前公司的批次
      await reorderVariantMaterial(input.id, input.direction);
      return { success: true };
    }),

  /**
   * 批量设置批次材料（用于批次创建/编辑）
   */
  setMaterials: protectedProcedure
    .input(
      z.object({
        variantId: z.number(),
        materials: z.array(
          z.object({
            materialColorId: z.number(),
            materialType: z.string(),
            sortOrder: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 验证批次属于当前公司
      const variant = await getVariantById(input.variantId, ctx.user.erpCompanyId!);
      if (!variant) {
        throw new Error("Variant not found or access denied");
      }

      await setVariantMaterials(input.variantId, input.materials);
      return { success: true };
    }),
});
