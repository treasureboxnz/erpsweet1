import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { generateCustomerInvoice, generateInternalInvoice, generateFactoryInvoices } from "../invoiceGenerator";

export const invoiceRouter = router({
  /**
   * 生成客户版Invoice
   */
  generateCustomerInvoice: protectedProcedure
    .input(
      z.object({
        orderId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const buffer = await generateCustomerInvoice(input.orderId, ctx.user.erpCompanyId);
      
      // 返回Base64编码的文件数据
      return {
        fileName: `Customer_Invoice_${input.orderId}.xlsx`,
        data: buffer.toString("base64"),
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }),

  /**
   * 生成内部版Invoice
   */
  generateInternalInvoice: protectedProcedure
    .input(
      z.object({
        orderId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const buffer = await generateInternalInvoice(input.orderId, ctx.user.erpCompanyId);
      
      return {
        fileName: `Internal_Invoice_${input.orderId}.xlsx`,
        data: buffer.toString("base64"),
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }),

  /**
   * 生成工厂版Invoice（ZIP文件，按供应商拆分）
   */
  generateFactoryInvoices: protectedProcedure
    .input(
      z.object({
        orderId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const buffer = await generateFactoryInvoices(input.orderId, ctx.user.erpCompanyId);
      
      return {
        fileName: `Factory_Orders_${input.orderId}.zip`,
        data: buffer.toString("base64"),
        mimeType: "application/zip",
      };
    }),
});
