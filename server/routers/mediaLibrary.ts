import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  uploadMediaFile,
  getMediaFiles,
  updateMediaFile,
  deleteMediaFile,
  getMediaFileById,
} from "../mediaLibrary";

export const mediaLibraryRouter = router({
  /**
   * 上传文件到媒体库
   */
  upload: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileSize: z.number(),
        imageData: z.string(),
        mimeType: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const fileId = await uploadMediaFile({
        ...input,
        uploadedBy: ctx.user.id,
        erpCompanyId: ctx.user.erpCompanyId,
      });
      return { id: fileId };
    }),

  /**
   * 获取媒体文件列表
   */
  getAll: protectedProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
        search: z.string().optional(),
        mimeType: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await getMediaFiles({ ...input, erpCompanyId: ctx.user.erpCompanyId });
    }),

  /**
   * 根据ID获取媒体文件
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return await getMediaFileById(input.id, ctx.user.erpCompanyId);
    }),

  /**
   * 更新媒体文件信息
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        altText: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await updateMediaFile(id, data, ctx.user.erpCompanyId);
      return { success: true };
    }),

  /**
   * 删除媒体文件
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await deleteMediaFile(input.id, ctx.user.erpCompanyId);
      return { success: true };
    }),
});
