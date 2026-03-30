import { getDb } from "./db";
import { skuRules, type SkuRule } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";

/**
 * Default SKU rule configurations
 */
const DEFAULT_SKU_RULES = [
  { ruleType: "supplier", prefix: "SUP", suffixLength: 4, description: "供应商编号" },
  { ruleType: "product", prefix: "PRD", suffixLength: 4, description: "产品编号" },
  { ruleType: "variant", prefix: "VAR", suffixLength: 4, description: "批次编号" },
  { ruleType: "customer", prefix: "CUS", suffixLength: 4, description: "客户编号" },
  { ruleType: "order", prefix: "ORD", suffixLength: 5, description: "订单编号" },
  { ruleType: "quotation", prefix: "QUO", suffixLength: 4, description: "报价单编号" },
  { ruleType: "inspection", prefix: "INS", suffixLength: 4, description: "报关单编号" },
];

/**
 * Initialize default SKU rules for a company
 * @param erpCompanyId - ERP company ID
 * @returns Object containing created rules
 */
export async function initializeDefaultSkuRules(erpCompanyId: number): Promise<{
  createdRules: string[];
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check existing rules
  const existingRules = await db
    .select()
    .from(skuRules)
    .where(eq(skuRules.erpCompanyId, erpCompanyId));

  const existingRuleTypes = new Set(existingRules.map(r => r.ruleType));

  // Insert missing rules
  const missingRules = DEFAULT_SKU_RULES.filter(
    rule => !existingRuleTypes.has(rule.ruleType)
  );

  if (missingRules.length > 0) {
    await db.insert(skuRules).values(
      missingRules.map(rule => ({
        erpCompanyId,
        ruleType: rule.ruleType,
        prefix: rule.prefix,
        suffixLength: rule.suffixLength,
        currentCounter: 0,
        description: rule.description,
      }))
    );
  }

  return {
    createdRules: missingRules.map(r => r.ruleType),
  };
}

/**
 * Generate SKU code from a rule
 * @param rule - SKU rule
 * @param db - Database instance
 * @param erpCompanyId - ERP company ID
 * @param ruleType - Rule type
 * @returns Generated code
 */
async function generateSkuCodeFromRule(
  rule: SkuRule,
  db: MySql2Database<any>,
  erpCompanyId: number,
  ruleType: string
): Promise<string> {
  // Increment counter
  const nextCounter = rule.currentCounter + 1;

  // Update counter
  await db
    .update(skuRules)
    .set({
      currentCounter: nextCounter,
    })
    .where(
      and(
        eq(skuRules.erpCompanyId, erpCompanyId),
        eq(skuRules.ruleType, ruleType)
      )
    );

  // Generate code
  const suffix = String(nextCounter).padStart(rule.suffixLength, "0");
  const code = `${rule.prefix}${suffix}`;

  return code;
}

/**
 * Generate next SKU code based on rules
 * @param ruleType - Type of rule: 'supplier', 'product', 'variant', 'customer', 'order', 'quotation', 'inspection'
 * @param erpCompanyId - ERP company ID
 * @returns Generated code (e.g., "SUP0001", "PRD0002")
 */
export async function generateSkuCode(
  ruleType: string,
  erpCompanyId: number
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get rule
  const rules = await db
    .select()
    .from(skuRules)
    .where(
      and(
        eq(skuRules.erpCompanyId, erpCompanyId),
        eq(skuRules.ruleType, ruleType)
      )
    )
    .limit(1);

  if (rules.length === 0) {
    // Auto-initialize default SKU rules if not found
    await initializeDefaultSkuRules(erpCompanyId);
    
    // Retry getting the rule
    const retryRules = await db
      .select()
      .from(skuRules)
      .where(
        and(
          eq(skuRules.erpCompanyId, erpCompanyId),
          eq(skuRules.ruleType, ruleType)
        )
      )
      .limit(1);
    
    if (retryRules.length === 0) {
      throw new Error(`SKU规则初始化失败: ${ruleType}`);
    }
    
    return generateSkuCodeFromRule(retryRules[0], db, erpCompanyId, ruleType);
  }

  const rule = rules[0];
  return generateSkuCodeFromRule(rule, db, erpCompanyId, ruleType);
}
