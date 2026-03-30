import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { quotationTemplates } from "../../drizzle/schema";
import { eq, desc, sql, and } from "drizzle-orm";

/**
 * Quotation Templates router
 */
export const quotationTemplatesRouter = router({
  /**
   * Create a new quotation template
   */
  create: protectedProcedure
    .input(z.object({
      templateName: z.string(),
      description: z.string().optional(),
      quotationMode: z.enum(["fob_only", "batch_selection"]),
      currency: z.string().default("USD"),
      productsData: z.any(), // JSON data containing products and batches
      notes: z.string().optional(),
      customerNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [template] = await db.insert(quotationTemplates).values({
        templateName: input.templateName,
        description: input.description,
        quotationMode: input.quotationMode,
        currency: input.currency,
        productsData: input.productsData,
        notes: input.notes,
        customerNotes: input.customerNotes,
        createdBy: ctx.user.id,
        erpCompanyId: ctx.user.erpCompanyId,
      });

      return {
        id: template.insertId,
        templateName: input.templateName,
      };
    }),

  /**
   * List all templates
   */
  list: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const offset = (input.page - 1) * input.pageSize;

      const templates = await db
        .select()
        .from(quotationTemplates)
        .where(eq(quotationTemplates.erpCompanyId, ctx.user.erpCompanyId))
        .orderBy(desc(quotationTemplates.createdAt))
        .limit(input.pageSize)
        .offset(offset);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(quotationTemplates)
        .where(eq(quotationTemplates.erpCompanyId, ctx.user.erpCompanyId));

      return {
        items: templates,
        total: countResult?.count || 0,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  /**
   * Get template by ID
   */
  getById: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [template] = await db
        .select()
        .from(quotationTemplates)
        .where(and(
          eq(quotationTemplates.id, input.id),
          eq(quotationTemplates.erpCompanyId, ctx.user.erpCompanyId)
        ))
        .limit(1);

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      return template;
    }),

  /**
   * Update template
   */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      templateName: z.string().optional(),
      description: z.string().optional(),
      quotationMode: z.enum(["fob_only", "batch_selection"]).optional(),
      currency: z.string().optional(),
      productsData: z.any().optional(),
      notes: z.string().optional(),
      customerNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [existing] = await db
        .select()
        .from(quotationTemplates)
        .where(and(
          eq(quotationTemplates.id, input.id),
          eq(quotationTemplates.erpCompanyId, ctx.user.erpCompanyId)
        ))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      await db.update(quotationTemplates).set({
        templateName: input.templateName,
        description: input.description,
        quotationMode: input.quotationMode,
        currency: input.currency,
        productsData: input.productsData,
        notes: input.notes,
        customerNotes: input.customerNotes,
      }).where(and(
        eq(quotationTemplates.id, input.id),
        eq(quotationTemplates.erpCompanyId, ctx.user.erpCompanyId)
      ));

      return { success: true };
    }),

  /**
   * Delete template
   */
  delete: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [existing] = await db
        .select()
        .from(quotationTemplates)
        .where(and(
          eq(quotationTemplates.id, input.id),
          eq(quotationTemplates.erpCompanyId, ctx.user.erpCompanyId)
        ))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      await db.delete(quotationTemplates).where(and(
        eq(quotationTemplates.id, input.id),
        eq(quotationTemplates.erpCompanyId, ctx.user.erpCompanyId)
      ));

      return { success: true };
    }),

  /**
   * Create quotation from template
   */
  createFromTemplate: protectedProcedure
    .input(z.object({
      templateId: z.number(),
      customerId: z.number(),
      contactPerson: z.string().optional(),
      contactPhone: z.string().optional(),
      contactEmail: z.string().optional(),
      shippingAddress: z.string().optional(),
      validUntil: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get template (with tenant isolation)
      const [template] = await db
        .select()
        .from(quotationTemplates)
        .where(and(
          eq(quotationTemplates.id, input.templateId),
          eq(quotationTemplates.erpCompanyId, ctx.user.erpCompanyId)
        ))
        .limit(1);

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      // This would call the quotations.create procedure with template data
      // For now, return template data for frontend to handle
      return {
        template,
        message: "Use this template data to create quotation",
      };
    }),
});
