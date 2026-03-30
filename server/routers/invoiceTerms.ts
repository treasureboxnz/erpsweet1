import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getInvoiceTermsTemplates,
  getInvoiceTermsTemplateById,
  createInvoiceTermsTemplate,
  updateInvoiceTermsTemplate,
  deleteInvoiceTermsTemplate,
  initializeDefaultInvoiceTerms,
} from "../invoiceTerms";

const invoiceTermsTemplateSchema = z.object({
  termNumber: z.number().min(1).max(17),
  titleCn: z.string().min(1),
  titleEn: z.string().min(1),
  contentCn: z.string().optional(),
  contentEn: z.string().optional(),
  isEnabled: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

export const invoiceTermsRouter = router({
  // Get all invoice terms templates
  list: protectedProcedure.query(async ({ ctx }) => {
    return await getInvoiceTermsTemplates(ctx.user.erpCompanyId);
  }),

  // Get a specific invoice terms template by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return await getInvoiceTermsTemplateById(input.id, ctx.user.erpCompanyId);
    }),

  // Create a new invoice terms template
  create: protectedProcedure
    .input(invoiceTermsTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const id = await createInvoiceTermsTemplate({
        ...input,
        erpCompanyId: ctx.user.erpCompanyId,
      });
      return { id };
    }),

  // Update an invoice terms template
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: invoiceTermsTemplateSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateInvoiceTermsTemplate(input.id, ctx.user.erpCompanyId, input.data);
      return { success: true };
    }),

  // Delete an invoice terms template
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteInvoiceTermsTemplate(input.id, ctx.user.erpCompanyId);
      return { success: true };
    }),

  // Initialize default invoice terms templates
  initializeDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    await initializeDefaultInvoiceTerms(ctx.user.erpCompanyId);
    return { success: true };
  }),
});
