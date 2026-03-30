import { router, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { getAllOperationLogs, getOperationLogsByModule } from "../db";

export const operationLogsRouter = router({
  // Get all operation logs with optional filters
  list: adminProcedure
    .input(
      z
        .object({
          userId: z.number().optional(),
          module: z.enum(["customer", "product", "order", "user", "price"]).optional(),
          operationType: z.enum(["create", "update", "delete", "suspend", "activate"]).optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          limit: z.number().min(1).max(1000).default(100),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      return await getAllOperationLogs({
        ...input,
        erpCompanyId: ctx.user.erpCompanyId,
      });
    }),

  // Get logs by module
  byModule: adminProcedure
    .input(
      z.object({
        module: z.enum(["customer", "product", "order", "user", "price"]),
        limit: z.number().min(1).max(500).default(100),
      })
    )
    .query(async ({ input, ctx }) => {
      return await getOperationLogsByModule(input.module, input.limit, ctx.user.erpCompanyId);
    }),
});
