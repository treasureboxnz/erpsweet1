import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { quotationApprovals, quotations, users } from "../../drizzle/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

/**
 * Quotation Approvals router
 */
export const quotationApprovalsRouter = router({
  /**
   * Submit quotation for approval
   */
  submitForApproval: protectedProcedure
    .input(z.object({
      quotationId: z.number(),
      comments: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get quotation (with tenant isolation)
      const [quotation] = await db
        .select()
        .from(quotations)
        .where(and(
          eq(quotations.id, input.quotationId),
          eq(quotations.erpCompanyId, ctx.user.erpCompanyId),
          isNull(quotations.deletedAt)
        ))
        .limit(1);

      if (!quotation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quotation not found" });
      }

      // Check if user owns this quotation
      if (quotation.createdBy !== ctx.user!.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only submit your own quotations for approval" });
      }

      // Update quotation status
      await db
        .update(quotations)
        .set({
          status: "pending_approval",
          requiresApproval: true,
          approvalStatus: "pending",
        })
        .where(eq(quotations.id, input.quotationId));

      // Get all admin users
      const admins = await db
        .select()
        .from(users)
        .where(eq(users.role, "admin"));

      // Create approval records for each admin
      for (const admin of admins) {
        await db.insert(quotationApprovals).values({
          quotationId: input.quotationId,
          approverId: admin.id,
          approverName: admin.name || admin.displayName || "Admin",
          status: "pending",
          comments: input.comments,
          erpCompanyId: ctx.user.erpCompanyId,
        });
      }

      // Notify owner
      await notifyOwner({
        title: `报价单 ${quotation.quotationNumber} 待审批`,
        content: `报价单 ${quotation.quotationNumber} (金额: ${quotation.currency} ${quotation.totalAmount}) 已提交审批，请及时处理。`,
      });

      return { success: true };
    }),

  /**
   * Approve or reject quotation
   */
  processApproval: protectedProcedure
    .input(z.object({
      approvalId: z.number(),
      decision: z.enum(["approved", "rejected"]),
      comments: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Check if user is admin
      if (ctx.user!.role !== "admin" && ctx.user!.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can approve quotations" });
      }

      // Get approval record (with tenant isolation)
      const [approval] = await db
        .select()
        .from(quotationApprovals)
        .where(and(
          eq(quotationApprovals.id, input.approvalId),
          eq(quotationApprovals.erpCompanyId, ctx.user.erpCompanyId)
        ))
        .limit(1);

      if (!approval) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Approval record not found" });
      }

      // Check if this approval is for current user
      if (approval.approverId !== ctx.user!.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only process your own approval requests" });
      }

      // Check if already processed
      if (approval.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This approval has already been processed" });
      }

      // Update approval record
      await db
        .update(quotationApprovals)
        .set({
          status: input.decision,
          decision: input.decision,
          comments: input.comments,
          decidedAt: new Date(),
        })
        .where(eq(quotationApprovals.id, input.approvalId));

      // Update quotation status
      const quotationStatus = input.decision === "approved" ? "draft" : "approval_rejected";
      const approvalStatus = input.decision;

      await db
        .update(quotations)
        .set({
          status: quotationStatus,
          approvalStatus: approvalStatus,
        })
        .where(eq(quotations.id, approval.quotationId));

      // Get quotation for notification
      const [quotation] = await db
        .select()
        .from(quotations)
        .where(eq(quotations.id, approval.quotationId))
        .limit(1);

      if (quotation) {
        // Notify owner
        const decisionText = input.decision === "approved" ? "已通过" : "已拒绝";
        await notifyOwner({
          title: `报价单 ${quotation.quotationNumber} 审批${decisionText}`,
          content: `报价单 ${quotation.quotationNumber} 的审批${decisionText}。${input.comments ? `审批意见：${input.comments}` : ""}`,
        });
      }

      return { success: true };
    }),

  /**
   * Get approval history for a quotation
   */
  getApprovalHistory: protectedProcedure
    .input(z.object({
      quotationId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const approvals = await db
        .select()
        .from(quotationApprovals)
        .where(and(
          eq(quotationApprovals.quotationId, input.quotationId),
          eq(quotationApprovals.erpCompanyId, ctx.user.erpCompanyId)
        ))
        .orderBy(desc(quotationApprovals.createdAt));

      return approvals;
    }),

  /**
   * Get pending approvals for current user
   */
  getPendingApprovals: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Only admins can see pending approvals
      if (ctx.user!.role !== "admin" && ctx.user!.role !== "super_admin") {
        return [];
      }

      const approvals = await db
        .select({
          id: quotationApprovals.id,
          quotationId: quotationApprovals.quotationId,
          quotationNumber: quotations.quotationNumber,
          customerName: quotations.customerName,
          totalAmount: quotations.totalAmount,
          currency: quotations.currency,
          status: quotationApprovals.status,
          createdAt: quotationApprovals.createdAt,
        })
        .from(quotationApprovals)
        .innerJoin(quotations, eq(quotationApprovals.quotationId, quotations.id))
        .where(and(
          eq(quotationApprovals.approverId, ctx.user!.id),
          eq(quotationApprovals.status, "pending"),
          eq(quotationApprovals.erpCompanyId, ctx.user.erpCompanyId)
        ))
        .orderBy(desc(quotationApprovals.createdAt));

      return approvals;
    }),
});
