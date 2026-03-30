import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as packageBoxes from "../packageBoxes";

export const packageBoxesRouter = router({
  /**
   * 查询批次的所有外箱
   */
  list: protectedProcedure
    .input(
      z.object({
        variantId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const boxes = await packageBoxes.getBoxesByVariantId(
        input.variantId,
        ctx.user.erpCompanyId
      );
      return boxes;
    }),

  /**
   * 添加新外箱
   * 手动CBM模式下：length/width/height 传 0，cbm 传手动输入值
   * 自动计算模式下：length/width/height 传实际值，cbm 不传（自动计算）
   */
  add: protectedProcedure
    .input(
      z.object({
        variantId: z.number(),
        length: z.number().nonnegative(),
        width: z.number().nonnegative(),
        height: z.number().nonnegative(),
        cbm: z.number().nonnegative().optional(), // 手动CBM模式下直接传入
        grossWeight: z.number().nonnegative().optional(),
        netWeight: z.number().nonnegative().optional(),
        packagingType: z.string().optional(),
        piecesPerBox: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const newBox = await packageBoxes.addBox({
        variantId: input.variantId,
        erpCompanyId: ctx.user.erpCompanyId,
        length: input.length,
        width: input.width,
        height: input.height,
        cbm: input.cbm,
        grossWeight: input.grossWeight,
        netWeight: input.netWeight,
        packagingType: input.packagingType,
        piecesPerBox: input.piecesPerBox,
      });
      return newBox;
    }),

  /**
   * 更新外箱尺寸
   * 手动CBM模式下：length/width/height 传 0，cbm 传手动输入值
   * 自动计算模式下：length/width/height 传实际值，cbm 不传（自动计算）
   */
  update: protectedProcedure
    .input(
      z.object({
        boxId: z.number(),
        length: z.number().nonnegative().optional(),
        width: z.number().nonnegative().optional(),
        height: z.number().nonnegative().optional(),
        cbm: z.number().nonnegative().optional(), // 手动CBM模式下直接传入
        grossWeight: z.number().nonnegative().optional(),
        netWeight: z.number().nonnegative().optional(),
        packagingType: z.string().optional(),
        piecesPerBox: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const updateData: Record<string, any> = {};
      if (input.length !== undefined) updateData.length = input.length;
      if (input.width !== undefined) updateData.width = input.width;
      if (input.height !== undefined) updateData.height = input.height;
      if (input.cbm !== undefined) updateData.cbm = input.cbm; // 手动CBM直接写入
      if (input.grossWeight !== undefined) updateData.grossWeight = input.grossWeight;
      if (input.netWeight !== undefined) updateData.netWeight = input.netWeight;
      if (input.packagingType !== undefined) updateData.packagingType = input.packagingType;
      if (input.piecesPerBox !== undefined) updateData.piecesPerBox = input.piecesPerBox;
      const updatedBox = await packageBoxes.updateBox(
        input.boxId,
        ctx.user.erpCompanyId,
        updateData
      );
      return updatedBox;
    }),

  /**
   * 删除外箱
   */
  delete: protectedProcedure
    .input(
      z.object({
        boxId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await packageBoxes.deleteBox(input.boxId, ctx.user.erpCompanyId);
      return { success: true };
    }),

  /**
   * 获取批次的总CBM
   */
  getTotalCBM: protectedProcedure
    .input(
      z.object({
        variantId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const totalCBM = await packageBoxes.calculateTotalCBM(
        input.variantId,
        ctx.user.erpCompanyId
      );
      return { totalCBM };
    }),

  /**
   * 获取批次的总重量（总毛重和总净重）
   */
  getTotalWeight: protectedProcedure
    .input(
      z.object({
        variantId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { totalGrossWeight, totalNetWeight } = await packageBoxes.calculateTotalWeight(
        input.variantId,
        ctx.user.erpCompanyId
      );
      return { totalGrossWeight, totalNetWeight };
    }),
});
