import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { systemSettings } from "../../drizzle/schema";
import { getDb } from "../db";
import { eq, and } from "drizzle-orm";

export const systemSettingsRouter = router({
  /**
   * Get system settings for current company (returns an object with all settings)
   */
  get: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const erpCompanyId = ctx.user.erpCompanyId;
    const settings = await db.select().from(systemSettings).where(eq(systemSettings.erpCompanyId, erpCompanyId));
    
    // Convert array of settings to object
    const settingsObj: Record<string, string> = {};
    settings.forEach((setting: { settingKey: string; settingValue: string | null }) => {
      settingsObj[setting.settingKey] = setting.settingValue || "";
    });
    
    return settingsObj;
  }),

  /**
   * Update a system setting (admin only) - scoped to current company
   */
  update: protectedProcedure
    .input(
      z.object({
        key: z.string(),
        value: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { key, value } = input;
      const erpCompanyId = ctx.user.erpCompanyId;
      
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db
        .select()
        .from(systemSettings)
        .where(and(eq(systemSettings.erpCompanyId, erpCompanyId), eq(systemSettings.settingKey, key)))
        .limit(1);
      
      if (existing.length > 0) {
        await db
          .update(systemSettings)
          .set({ settingValue: value, updatedAt: new Date() })
          .where(and(eq(systemSettings.erpCompanyId, erpCompanyId), eq(systemSettings.settingKey, key)));
      } else {
        await db.insert(systemSettings).values({
          erpCompanyId,
          settingKey: key,
          settingValue: value,
          description: `Setting for ${key}`,
        });
      }
      
      return { success: true };
    }),

  /**
   * Batch update multiple settings at once
   */
  batchUpdate: protectedProcedure
    .input(
      z.object({
        settings: z.record(z.string(), z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const erpCompanyId = ctx.user.erpCompanyId;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      for (const [key, value] of Object.entries(input.settings)) {
        const existing = await db
          .select()
          .from(systemSettings)
          .where(and(eq(systemSettings.erpCompanyId, erpCompanyId), eq(systemSettings.settingKey, key)))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(systemSettings)
            .set({ settingValue: value, updatedAt: new Date() })
            .where(and(eq(systemSettings.erpCompanyId, erpCompanyId), eq(systemSettings.settingKey, key)));
        } else {
          await db.insert(systemSettings).values({
            erpCompanyId,
            settingKey: key,
            settingValue: value,
            description: `Setting for ${key}`,
          });
        }
      }

      return { success: true };
    }),
});
