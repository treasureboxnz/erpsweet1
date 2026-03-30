import { z } from "zod";
import { getDb } from "../db";
import { quotationVersions, quotations, quotationItems, quotationBatches } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

export const quotationVersionsRouter = router({
  /**
   * Create a new version snapshot
   */
  createVersion: protectedProcedure
    .input(z.object({
      quotationId: z.number(),
      changeDescription: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      // Get current quotation data with items and batches (with tenant isolation)
      const [quotation] = await db.select().from(quotations).where(
        and(
          eq(quotations.id, input.quotationId),
          eq(quotations.erpCompanyId, ctx.user.erpCompanyId)
        )
      ).limit(1);

      if (!quotation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "报价单不存在" });
      }

      const items = await db.select().from(quotationItems).where(eq(quotationItems.quotationId, input.quotationId));

      const batches = await Promise.all(
        items.map(async (item: any) => {
          const itemBatches = await db.select().from(quotationBatches).where(eq(quotationBatches.quotationItemId, item.id));
          return { itemId: item.id, batches: itemBatches };
        })
      );

      // Get current max version number (with tenant isolation)
      const versions = await db.select().from(quotationVersions).where(
        and(
          eq(quotationVersions.quotationId, input.quotationId),
          eq(quotationVersions.erpCompanyId, ctx.user.erpCompanyId)
        )
      ).orderBy(desc(quotationVersions.versionNumber)).limit(1);

      const nextVersionNumber = versions.length > 0 ? versions[0].versionNumber + 1 : 1;

      // Create snapshot
      const snapshotData = {
        quotation,
        items,
        batches,
        timestamp: new Date().toISOString(),
      };

      const [version] = await db.insert(quotationVersions).values({
        quotationId: input.quotationId,
        versionNumber: nextVersionNumber,
        snapshotData: JSON.stringify(snapshotData),
        changeDescription: input.changeDescription || `版本 ${nextVersionNumber}`,
        createdBy: ctx.user.id,
        erpCompanyId: ctx.user.erpCompanyId,
      });

      return { versionId: version.insertId, versionNumber: nextVersionNumber };
    }),

  /**
   * Get version history for a quotation
   */
  getVersionHistory: protectedProcedure
    .input(z.object({
      quotationId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      const versions = await db.select().from(quotationVersions).where(
        and(
          eq(quotationVersions.quotationId, input.quotationId),
          eq(quotationVersions.erpCompanyId, ctx.user.erpCompanyId)
        )
      ).orderBy(desc(quotationVersions.versionNumber));

      return versions.map((v: any) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        changeDescription: v.changeDescription,
        createdBy: v.createdBy,
        createdAt: v.createdAt,
      }));
    }),

  /**
   * Get specific version details
   */
  getVersionDetail: protectedProcedure
    .input(z.object({
      versionId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      const [version] = await db.select().from(quotationVersions).where(
        and(
          eq(quotationVersions.id, input.versionId),
          eq(quotationVersions.erpCompanyId, ctx.user.erpCompanyId)
        )
      ).limit(1);

      if (!version) {
        throw new TRPCError({ code: "NOT_FOUND", message: "版本不存在" });
      }

      return {
        ...version,
        snapshotData: JSON.parse(version.snapshotData as string),
      };
    }),

  /**
   * Rollback to a specific version
   */
  rollbackToVersion: protectedProcedure
    .input(z.object({
      versionId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      const [version] = await db.select().from(quotationVersions).where(
        and(
          eq(quotationVersions.id, input.versionId),
          eq(quotationVersions.erpCompanyId, ctx.user.erpCompanyId)
        )
      ).limit(1);

      if (!version) {
        throw new TRPCError({ code: "NOT_FOUND", message: "版本不存在" });
      }

      const snapshotData = JSON.parse(version.snapshotData as string);
      const quotationId = version.quotationId;

      // Delete current items and batches
      await db.delete(quotationItems).where(eq(quotationItems.quotationId, quotationId));

      // Restore quotation basic info
      await db.update(quotations)
        .set({
          ...snapshotData.quotation,
          updatedAt: new Date(),
        })
        .where(eq(quotations.id, quotationId));

      // Restore items
      for (const item of snapshotData.items) {
        const [newItem] = await db.insert(quotationItems).values({
          quotationId,
          erpCompanyId: ctx.user.erpCompanyId,
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          fobQuantity: item.fobQuantity,
          fobUnitPrice: item.fobUnitPrice,
          fobSubtotal: item.fobSubtotal,
          sortOrder: item.sortOrder,
        });

        // Restore batches for this item
        const itemBatches = snapshotData.batches.find((b: any) => b.itemId === item.id);
        if (itemBatches && itemBatches.batches.length > 0) {
          for (const batch of itemBatches.batches) {
            await db.insert(quotationBatches).values({
              erpCompanyId: ctx.user.erpCompanyId,
              quotationItemId: newItem.insertId,
              variantId: batch.variantId,
              variantName: batch.variantName,
              quantity: batch.quantity,
              unitPrice: batch.unitPrice,
              subtotal: batch.subtotal,
              sortOrder: batch.sortOrder,
            });
          }
        }
      }

      // Create a new version for the rollback
      const versions = await db.select().from(quotationVersions).where(
        and(
          eq(quotationVersions.quotationId, quotationId),
          eq(quotationVersions.erpCompanyId, ctx.user.erpCompanyId)
        )
      ).orderBy(desc(quotationVersions.versionNumber)).limit(1);

      const nextVersionNumber = versions.length > 0 ? versions[0].versionNumber + 1 : 1;

      await db.insert(quotationVersions).values({
        quotationId,
        versionNumber: nextVersionNumber,
        snapshotData: version.snapshotData,
        changeDescription: `回滚到版本 ${version.versionNumber}`,
        createdBy: ctx.user.id,
        erpCompanyId: ctx.user.erpCompanyId,
      });

      return { success: true, message: `已回滚到版本 ${version.versionNumber}` };
    }),
});
