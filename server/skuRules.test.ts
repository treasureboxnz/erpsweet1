import { describe, it, expect, beforeAll } from "vitest";
import { generateSkuCode } from "./skuRulesHelper";
import { getDb } from "./db";
import { skuRules } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("SKU Rules System", () => {
  const TEST_COMPANY_ID = 1; // ERP Sweet测试公司

  beforeAll(async () => {
    // 确保测试公司有SKU规则配置
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 检查是否已有规则，如果没有则创建默认规则
    const existingRules = await db
      .select()
      .from(skuRules)
      .where(eq(skuRules.erpCompanyId, TEST_COMPANY_ID));

    if (existingRules.length === 0) {
      // 创建默认规则
      const defaultRules = [
        { ruleType: "supplier", prefix: "SUP", suffixLength: 4 },
        { ruleType: "product", prefix: "PRD", suffixLength: 4 },
        { ruleType: "variant", prefix: "VAR", suffixLength: 4 },
        { ruleType: "customer", prefix: "CUS", suffixLength: 4 },
        { ruleType: "order", prefix: "ORD", suffixLength: 5 },
        { ruleType: "quotation", prefix: "QUO", suffixLength: 4 },
        { ruleType: "inspection", prefix: "INS", suffixLength: 4 },
      ];

      for (const rule of defaultRules) {
        await db.insert(skuRules).values({
          erpCompanyId: TEST_COMPANY_ID,
          ruleType: rule.ruleType,
          prefix: rule.prefix,
          suffixLength: rule.suffixLength,
          currentCounter: 0,
        });
      }
    }
  });

  it("应该能够生成供应商编号", async () => {
    const code = await generateSkuCode("supplier", TEST_COMPANY_ID);
    expect(code).toMatch(/^SUP\d{4}$/);
    console.log("生成的供应商编号:", code);
  });

  it("应该能够生成产品编号", async () => {
    const code = await generateSkuCode("product", TEST_COMPANY_ID);
    expect(code).toMatch(/^PRD\d{4}$/);
    console.log("生成的产品编号:", code);
  });

  it("应该能够生成批次编号", async () => {
    const code = await generateSkuCode("variant", TEST_COMPANY_ID);
    expect(code).toMatch(/^VAR\d{4}$/);
    console.log("生成的批次编号:", code);
  });

  it("应该能够生成客户编号", async () => {
    const code = await generateSkuCode("customer", TEST_COMPANY_ID);
    expect(code).toMatch(/^CUS\d{4}$/);
    console.log("生成的客户编号:", code);
  });

  it("应该能够生成订单编号", async () => {
    const code = await generateSkuCode("order", TEST_COMPANY_ID);
    expect(code).toMatch(/^ORD\d{5}$/);
    console.log("生成的订单编号:", code);
  });

  it("应该能够生成报价单编号", async () => {
    const code = await generateSkuCode("quotation", TEST_COMPANY_ID);
    expect(code).toMatch(/^QUO\d{4}$/);
    console.log("生成的报价单编号:", code);
  });

  it("应该能够生成报关单编号", async () => {
    const code = await generateSkuCode("inspection", TEST_COMPANY_ID);
    expect(code).toMatch(/^INS\d{4}$/);
    console.log("生成的报关单编号:", code);
  });

  it("连续生成的编号应该递增", async () => {
    const code1 = await generateSkuCode("supplier", TEST_COMPANY_ID);
    const code2 = await generateSkuCode("supplier", TEST_COMPANY_ID);
    
    const num1 = parseInt(code1.replace("SUP", ""));
    const num2 = parseInt(code2.replace("SUP", ""));
    
    expect(num2).toBe(num1 + 1);
    console.log("连续生成的供应商编号:", code1, "->", code2);
  });

  it("不同类型的编号应该独立计数", async () => {
    const supplierCode = await generateSkuCode("supplier", TEST_COMPANY_ID);
    const productCode = await generateSkuCode("product", TEST_COMPANY_ID);
    
    // 两个编号的数字部分可能相同（因为独立计数），但前缀不同
    expect(supplierCode.startsWith("SUP")).toBe(true);
    expect(productCode.startsWith("PRD")).toBe(true);
    console.log("不同类型的编号:", supplierCode, productCode);
  });

  it("当规则不存在时应该抛出错误", async () => {
    // 未知类型会触发自动初始化，初始化失败则抛出错误
    await expect(
      generateSkuCode("nonexistent_type", TEST_COMPANY_ID)
    ).rejects.toThrow(); // 会抛出错误（初始化失败或规则未找到）
  });
});
