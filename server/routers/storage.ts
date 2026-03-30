import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";

export const storageRouter = router({
  // Get upload URL for client-side upload
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        contentType: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Generate unique file key
      const ext = input.filename.split(".").pop();
      const fileKey = `uploads/${ctx.user.id}/${nanoid()}.${ext}`;

      // For now, return a placeholder - actual upload will be handled by a separate endpoint
      return {
        fileKey,
        uploadUrl: `/api/storage/upload`,
      };
    }),
});
