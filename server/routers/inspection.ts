import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { inspections, inspectionFiles, orders } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";

/**
 * Inspection router
 * 验货信息管理
 */
export const inspectionRouter = router({
  /**
   * 获取订单的验货信息
   */
  getByOrderId: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // 查询验货信息
      const [inspection] = await db.select().from(inspections).where(
        and(
          eq(inspections.orderId, input.orderId),
          eq(inspections.erpCompanyId, ctx.user.erpCompanyId)
        )
      ).limit(1);

      if (!inspection) return null;

      // 查询验货文件
      const files = await db.select().from(inspectionFiles).where(
        eq(inspectionFiles.inspectionId, inspection.id)
      ).orderBy(inspectionFiles.sortOrder);

      return { ...inspection, files };
    }),

  /**
   * 创建或更新验货信息
   */
  createOrUpdate: protectedProcedure
    .input(
      z.object({
        orderId: z.number(),
        inspectionMethods: z.array(z.string()).optional(),
        inspectionDate: z.string().optional(), // ISO date string
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { orderId, inspectionMethods, inspectionDate } = input;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // 检查订单是否存在且属于当前公司
      const [order] = await db.select().from(orders).where(
        and(
          eq(orders.id, orderId),
          eq(orders.erpCompanyId, ctx.user.erpCompanyId)
        )
      ).limit(1);

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "订单不存在",
        });
      }

      // 查找是否已存在验货记录
      const [existing] = await db.select().from(inspections).where(
        and(
          eq(inspections.orderId, orderId),
          eq(inspections.erpCompanyId, ctx.user.erpCompanyId)
        )
      ).limit(1);

      const inspectionData = {
        orderId,
        erpCompanyId: ctx.user.erpCompanyId,
        inspectionMethods: inspectionMethods || [],
        inspectionDate: inspectionDate ? new Date(inspectionDate) : null,
      };

      if (existing) {
        // 更新
        await db
          .update(inspections)
          .set(inspectionData)
          .where(eq(inspections.id, existing.id));

        return { id: existing.id, ...inspectionData };
      } else {
        // 创建
        const [result] = await db.insert(inspections).values(inspectionData);
        return { id: result.insertId, ...inspectionData };
      }
    }),

  /**
   * 上传验货报告文件
   */
  uploadFile: protectedProcedure
    .input(
      z.object({
        orderId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // Base64 encoded file data
        mimeType: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { orderId, fileName, fileData, mimeType } = input;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // 获取或创建验货记录
      let [inspection] = await db.select().from(inspections).where(
        and(
          eq(inspections.orderId, orderId),
          eq(inspections.erpCompanyId, ctx.user.erpCompanyId)
        )
      ).limit(1);

      if (!inspection) {
        // 自动创建验货记录
        const [result] = await db.insert(inspections).values({
          orderId,
          erpCompanyId: ctx.user.erpCompanyId,
          inspectionMethods: [],
          inspectionDate: null,
        });
        inspection = {
          id: result.insertId,
          orderId,
          erpCompanyId: ctx.user.erpCompanyId,
          inspectionMethods: [],
          inspectionDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      // 解码Base64文件数据
      const buffer = Buffer.from(fileData, "base64");
      const fileSize = buffer.length;

      // 生成文件key（添加随机后缀防止枚举）
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileKey = `inspections/${orderId}/${timestamp}-${randomSuffix}-${fileName}`;

      // 上传到S3
      const { url: fileUrl } = await storagePut(fileKey, buffer, mimeType);

      // 获取当前最大sortOrder
      const existingFiles = await db.select().from(inspectionFiles).where(
        eq(inspectionFiles.inspectionId, inspection.id)
      );
      const maxSortOrder = existingFiles.reduce(
        (max: number, file: any) => Math.max(max, file.sortOrder),
        0
      );

      // 保存文件记录
      const [result] = await db.insert(inspectionFiles).values({
        inspectionId: inspection.id,
        erpCompanyId: ctx.user.erpCompanyId,
        fileName,
        fileUrl,
        fileKey,
        fileSize,
        mimeType,
        sortOrder: maxSortOrder + 1,
        uploadedBy: ctx.user.id,
      });

      return {
        id: result.insertId,
        fileName,
        fileUrl,
        fileSize,
        mimeType,
      };
    }),

  /**
   * 删除验货报告文件
   */
  deleteFile: protectedProcedure
    .input(z.object({ fileId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [file] = await db.select().from(inspectionFiles).where(
        and(
          eq(inspectionFiles.id, input.fileId),
          eq(inspectionFiles.erpCompanyId, ctx.user.erpCompanyId)
        )
      ).limit(1);

      if (!file) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "文件不存在",
        });
      }

      // 删除数据库记录（S3文件保留作为备份）
      await db.delete(inspectionFiles).where(eq(inspectionFiles.id, input.fileId));

      return { success: true };
    }),
});
