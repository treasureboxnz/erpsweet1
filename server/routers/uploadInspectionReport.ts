import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { storagePut } from "../storage";

export const uploadInspectionReportRouter = router({
  upload: publicProcedure
    .input(z.object({
      fileName: z.string(),
      fileData: z.string(), // base64 encoded file data
      fileType: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { fileName, fileData, fileType } = input;

      // 将base64数据转换为Buffer
      const buffer = Buffer.from(fileData, 'base64');

      // 生成唯一的文件名
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const fileExtension = fileName.split('.').pop();
      const uniqueFileName = `inspection-reports/${timestamp}-${randomSuffix}.${fileExtension}`;

      // 上传到S3
      const { url } = await storagePut(uniqueFileName, buffer, fileType);

      return { url };
    }),
});
