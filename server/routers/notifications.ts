/**
 * 站内通知路由 - @提醒同事功能
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { inAppNotifications, users } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const notificationsRouter = router({
  // 获取当前用户的通知列表
  list: protectedProcedure
    .input(z.object({
      limit: z.number().default(20),
      unreadOnly: z.boolean().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { notifications: [], unreadCount: 0 };

      const conditions = [eq(inAppNotifications.recipientId, ctx.user.id)];
      if (input.unreadOnly) {
        conditions.push(eq(inAppNotifications.isRead, false));
      }

      const items = await db
        .select()
        .from(inAppNotifications)
        .where(and(...conditions))
        .orderBy(desc(inAppNotifications.createdAt))
        .limit(input.limit);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(inAppNotifications)
        .where(and(
          eq(inAppNotifications.recipientId, ctx.user.id),
          eq(inAppNotifications.isRead, false)
        ));

      return { notifications: items, unreadCount: Number(count) };
    }),

  // 获取未读数量
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { count: 0 };

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(inAppNotifications)
      .where(and(
        eq(inAppNotifications.recipientId, ctx.user.id),
        eq(inAppNotifications.isRead, false)
      ));

    return { count: Number(count) };
  }),

  // 标记单条通知为已读
  markRead: protectedProcedure
    .input(z.number())
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return;

      await db
        .update(inAppNotifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(
          eq(inAppNotifications.id, input),
          eq(inAppNotifications.recipientId, ctx.user.id)
        ));
    }),

  // 标记所有通知为已读
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return;

    await db
      .update(inAppNotifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(inAppNotifications.recipientId, ctx.user.id),
        eq(inAppNotifications.isRead, false)
      ));
  }),

  // 获取同公司的同事列表（用于@选择）
  getColleagues: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db || !ctx.user.erpCompanyId) return [];

    return db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(and(
        eq(users.erpCompanyId, ctx.user.erpCompanyId),
        eq(users.status, "active")
      ));
  }),
});
