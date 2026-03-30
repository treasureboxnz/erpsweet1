import { describe, expect, it } from "vitest";
import { getDb } from "./db";
import { systemSettings } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * 多租户数据隔离测试
 * 验证：
 * 1. systemSettings按erpCompanyId隔离
 * 2. 所有关键表不存在NULL erpCompanyId
 * 3. 更新test公司数据不影响其他公司
 */

const TEST_COMPANY_ID = 1;
const CASAVIVA_COMPANY_ID = 60001;

describe("多租户数据隔离", () => {
  describe("systemSettings 租户隔离", () => {
    it("每个公司应有独立的systemSettings", async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      const testSettings = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.erpCompanyId, TEST_COMPANY_ID));

      const casavivaSettings = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.erpCompanyId, CASAVIVA_COMPANY_ID));

      expect(testSettings.length).toBeGreaterThan(0);
      expect(casavivaSettings.length).toBeGreaterThan(0);
    });

    it("更新test公司的设置不应影响CASAVIVA公司", async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      const casavivaSettingsBefore = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.erpCompanyId, CASAVIVA_COMPANY_ID));

      await db
        .update(systemSettings)
        .set({ settingValue: "test_value_isolation_check", updatedAt: new Date() })
        .where(
          and(
            eq(systemSettings.erpCompanyId, TEST_COMPANY_ID),
            eq(systemSettings.settingKey, "quotationMode")
          )
        );

      const casavivaSettingsAfter = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.erpCompanyId, CASAVIVA_COMPANY_ID));

      expect(casavivaSettingsAfter.length).toBe(casavivaSettingsBefore.length);
      for (const setting of casavivaSettingsAfter) {
        const before = casavivaSettingsBefore.find(
          (s) => s.settingKey === setting.settingKey
        );
        expect(before).toBeDefined();
        expect(setting.settingValue).toBe(before!.settingValue);
      }

      // Restore
      await db
        .update(systemSettings)
        .set({ settingValue: "fob_only", updatedAt: new Date() })
        .where(
          and(
            eq(systemSettings.erpCompanyId, TEST_COMPANY_ID),
            eq(systemSettings.settingKey, "quotationMode")
          )
        );
    });

    it("不应存在erpCompanyId为NULL的systemSettings记录", async () => {
      const mysql = require("mysql2/promise");
      const conn = await mysql.createConnection(process.env.DATABASE_URL);
      const [rows] = await conn.query(
        "SELECT COUNT(*) as cnt FROM system_settings WHERE erpCompanyId IS NULL"
      );
      await conn.end();
      expect(rows[0].cnt).toBe(0);
    });
  });

  describe("全部关键表erpCompanyId完整性检查", () => {
    // All tables that have erpCompanyId column
    const allTablesWithErpCompanyId = [
      "products",
      "product_variants",
      "product_images",
      "product_suppliers",
      "attributes",
      "attribute_values",
      "contacts",
      "follow_up_records",
      "operation_logs",
      "system_settings",
      "companies",
      "company_contacts",
      "quotations",
      "quotation_items",
      "quotation_batches",
      "quotation_versions",
      "quotation_approvals",
      "quotation_templates",
      "orders",
      "order_items",
      "order_status_history",
      "order_finance",
      "order_tracking",
      "inspections",
      "inspection_files",
      "material_suppliers",
      "material_boards",
      "material_colors",
      "variant_materials",
      "positions",
      "permissions",
      "in_app_notifications",
      "email_templates",
      "sku_rules",
      "package_boxes",
      "cost_snapshots",
      "price_history",
      "apollo_candidates",
      "company_bank_accounts",
      "supplier_bank_accounts",
      "customers",
      "company_assignees",
    ];

    for (const table of allTablesWithErpCompanyId) {
      it(`${table}表不应有erpCompanyId为NULL的记录`, async () => {
        const mysql = require("mysql2/promise");
        const conn = await mysql.createConnection(process.env.DATABASE_URL);
        try {
          const [cols] = await conn.query(
            `SHOW COLUMNS FROM \`${table}\` LIKE 'erpCompanyId'`
          );
          if ((cols as any[]).length === 0) {
            // Table doesn't have erpCompanyId column, skip
            return;
          }
          const [rows] = await conn.query(
            `SELECT COUNT(*) as cnt FROM \`${table}\` WHERE erpCompanyId IS NULL`
          );
          expect((rows as any[])[0].cnt).toBe(0);
        } catch (e: any) {
          // Table might not exist yet, skip
          if (e.code === "ER_NO_SUCH_TABLE") return;
          throw e;
        } finally {
          await conn.end();
        }
      });
    }
  });
});
