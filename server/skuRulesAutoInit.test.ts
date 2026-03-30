import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { generateSkuCode } from "./skuRulesHelper";
import { getDb } from "./db";
import { skuRules, erpCompanies } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// 使用一个测试专用公司ID（会在beforeAll中创建，afterAll中删除）
const TEST_COMPANY_ID = 88888;

describe("SKU Rules Auto-Initialization", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    // 清理可能残留的测试数据
    await db.delete(skuRules).where(eq(skuRules.erpCompanyId, TEST_COMPANY_ID));
    await db.delete(erpCompanies).where(eq(erpCompanies.id, TEST_COMPANY_ID));
    // 创建测试公司
    await db.insert(erpCompanies).values({
      id: TEST_COMPANY_ID,
      companyCode: "TEST-SKU-88888",
      companyName: "SKU Test Company",
    });
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;
    // 清理测试数据
    await db.delete(skuRules).where(eq(skuRules.erpCompanyId, TEST_COMPANY_ID));
    await db.delete(erpCompanies).where(eq(erpCompanies.id, TEST_COMPANY_ID));
  });

  it("应该在SKU规则不存在时自动初始化", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 清理测试数据（如果存在）
    await db.delete(skuRules).where(eq(skuRules.erpCompanyId, TEST_COMPANY_ID));

    // 验证规则不存在
    const beforeRules = await db
      .select()
      .from(skuRules)
      .where(eq(skuRules.erpCompanyId, TEST_COMPANY_ID));
    expect(beforeRules.length).toBe(0);

    // 尝试生成客户编号（应该触发自动初始化）
    const customerCode = await generateSkuCode("customer", TEST_COMPANY_ID);
    expect(customerCode).toMatch(/^CUS\d{4}$/);

    // 验证规则已创建
    const afterRules = await db
      .select()
      .from(skuRules)
      .where(eq(skuRules.erpCompanyId, TEST_COMPANY_ID));
    expect(afterRules.length).toBeGreaterThan(0);

    // 验证所有必要的规则类型都已创建
    const ruleTypes = afterRules.map(r => r.ruleType);
    const expectedTypes = ["supplier", "product", "variant", "customer", "order", "quotation", "inspection"];
    expectedTypes.forEach(type => {
      expect(ruleTypes).toContain(type);
    });

    // 清理测试数据
    await db.delete(skuRules).where(eq(skuRules.erpCompanyId, TEST_COMPANY_ID));
  });

  it("应该能够连续生成不同类型的编号", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 清理测试数据
    await db.delete(skuRules).where(eq(skuRules.erpCompanyId, TEST_COMPANY_ID));

    // 生成不同类型的编号
    const customerCode = await generateSkuCode("customer", TEST_COMPANY_ID);
    const variantCode = await generateSkuCode("variant", TEST_COMPANY_ID);
    const supplierCode = await generateSkuCode("supplier", TEST_COMPANY_ID);

    expect(customerCode).toMatch(/^CUS\d{4}$/);
    expect(variantCode).toMatch(/^VAR\d{4}$/);
    expect(supplierCode).toMatch(/^SUP\d{4}$/);

    // 清理测试数据
    await db.delete(skuRules).where(eq(skuRules.erpCompanyId, TEST_COMPANY_ID));
  });

  it("应该在已有部分规则时只创建缺失的规则", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 清理测试数据
    await db.delete(skuRules).where(eq(skuRules.erpCompanyId, TEST_COMPANY_ID));

    // 手动创建一个规则
    await db.insert(skuRules).values({
      erpCompanyId: TEST_COMPANY_ID,
      ruleType: "supplier",
      prefix: "SUP",
      suffixLength: 4,
      currentCounter: 0,
      description: "供应商编号",
    });

    // 验证只有1个规则
    const beforeRules = await db
      .select()
      .from(skuRules)
      .where(eq(skuRules.erpCompanyId, TEST_COMPANY_ID));
    expect(beforeRules.length).toBe(1);

    // 尝试生成客户编号（应该只创建缺失的规则）
    const customerCode = await generateSkuCode("customer", TEST_COMPANY_ID);
    expect(customerCode).toMatch(/^CUS\d{4}$/);

    // 验证所有规则都已创建
    const afterRules = await db
      .select()
      .from(skuRules)
      .where(eq(skuRules.erpCompanyId, TEST_COMPANY_ID));
    expect(afterRules.length).toBe(7); // 应该有7种类型的规则

    // 清理测试数据
    await db.delete(skuRules).where(eq(skuRules.erpCompanyId, TEST_COMPANY_ID));
  });
});
