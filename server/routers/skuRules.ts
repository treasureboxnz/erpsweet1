import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { skuRules, erpCompanies, products, companies, orders, suppliers, productVariants } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { initializeDefaultSkuRules } from "../skuRulesHelper.js";

export const skuRulesRouter = router({
  // 获取所有SKU规则
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const rules = await db
      .select()
      .from(skuRules)
      .where(eq(skuRules.erpCompanyId, ctx.user.erpCompanyId!));

    return rules;
  }),

  // 保存所有SKU规则
  saveAll: protectedProcedure
    .input(
      z.object({
        rules: z.array(
          z.object({
            ruleType: z.string(),
            prefix: z.string(),
            suffixLength: z.number().min(1).max(10),
            description: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const erpCompanyId = ctx.user.erpCompanyId!;

      // 为每个规则类型更新或插入
      for (const rule of input.rules) {
        const existing = await db
          .select()
          .from(skuRules)
          .where(
            and(
              eq(skuRules.erpCompanyId, erpCompanyId),
              eq(skuRules.ruleType, rule.ruleType)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          // 更新现有规则
          await db
            .update(skuRules)
            .set({
              prefix: rule.prefix,
              suffixLength: rule.suffixLength,
              description: rule.description,
            })
            .where(
              and(
                eq(skuRules.erpCompanyId, erpCompanyId),
                eq(skuRules.ruleType, rule.ruleType)
              )
            );
        } else {
          // 插入新规则
          await db.insert(skuRules).values({
            erpCompanyId,
            ruleType: rule.ruleType,
            prefix: rule.prefix,
            suffixLength: rule.suffixLength,
            description: rule.description,
            currentCounter: 0,
          });
        }
      }

      return { success: true };
    }),

  // 获取下一个编号预览（不增加计数器，但检查编号是否已存在）
  getNextCode: protectedProcedure
    .input(
      z.object({
        ruleType: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const erpCompanyId = ctx.user.erpCompanyId!;

      // 获取规则
      const rules = await db
        .select()
        .from(skuRules)
        .where(
          and(
            eq(skuRules.erpCompanyId, erpCompanyId),
            eq(skuRules.ruleType, input.ruleType)
          )
        )
        .limit(1);

      if (rules.length === 0) {
        throw new Error(`未找到规则类型: ${input.ruleType}`);
      }

      const rule = rules[0];

      // 根据ruleType选择对应的表来检查编号是否已存在
      const checkCodeExists = async (code: string): Promise<boolean> => {
        try {
          if (input.ruleType === 'product') {
            const existing = await db.select({ id: products.id }).from(products).where(eq(products.sku, code)).limit(1);
            return existing.length > 0;
          } else if (input.ruleType === 'customer') {
            const existing = await db.select({ id: companies.id }).from(companies).where(eq(companies.customerCode, code)).limit(1);
            return existing.length > 0;
          } else if (input.ruleType === 'order') {
            const existing = await db.select({ id: orders.id }).from(orders).where(eq(orders.orderNumber, code)).limit(1);
            return existing.length > 0;
          } else if (input.ruleType === 'supplier') {
            const existing = await db.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.supplierCode, code)).limit(1);
            return existing.length > 0;
          } else if (input.ruleType === 'variant') {
            const existing = await db.select({ id: productVariants.id }).from(productVariants).where(eq(productVariants.variantCode, code)).limit(1);
            return existing.length > 0;
          }
          return false;
        } catch {
          return false;
        }
      };

      // 循环查找下一个不冲突的编号（最多尝试100次）
      let counter = rule.currentCounter + 1;
      let code = '';
      for (let i = 0; i < 100; i++) {
        const suffix = String(counter).padStart(rule.suffixLength, "0");
        code = `${rule.prefix}${suffix}`;
        const exists = await checkCodeExists(code);
        if (!exists) break;
        counter++;
      }

      return code;
    }),

  // 获取编号规则示例
  getRuleExample: protectedProcedure
    .input(
      z.object({
        ruleType: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const erpCompanyId = ctx.user.erpCompanyId!;

      // 获取规则
      const rules = await db
        .select()
        .from(skuRules)
        .where(
          and(
            eq(skuRules.erpCompanyId, erpCompanyId),
            eq(skuRules.ruleType, input.ruleType)
          )
        )
        .limit(1);

      if (rules.length === 0) {
        throw new Error(`未找到规则类型: ${input.ruleType}`);
      }

      const rule = rules[0];

      // 生成示例编号（0001, 0002, 0003）
      const examples = [1, 2, 3].map((num) => {
        const suffix = String(num).padStart(rule.suffixLength, "0");
        return `${rule.prefix}${suffix}`;
      });

      return examples.join(", ") + " ...";
    }),

  // 生成下一个编号
  generateNext: protectedProcedure
    .input(
      z.object({
        ruleType: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const erpCompanyId = ctx.user.erpCompanyId!;

      // 获取规则
      const rules = await db
        .select()
        .from(skuRules)
        .where(
          and(
            eq(skuRules.erpCompanyId, erpCompanyId),
            eq(skuRules.ruleType, input.ruleType)
          )
        )
        .limit(1);

      if (rules.length === 0) {
        throw new Error(`未找到规则类型: ${input.ruleType}`);
      }

      const rule = rules[0];

      // 增加计数器
      const nextCounter = rule.currentCounter + 1;

      // 更新计数器
      await db
        .update(skuRules)
        .set({
          currentCounter: nextCounter,
        })
        .where(
          and(
            eq(skuRules.erpCompanyId, erpCompanyId),
            eq(skuRules.ruleType, input.ruleType)
          )
        );

      // 生成编号
      const suffix = String(nextCounter).padStart(rule.suffixLength, "0");
      const code = `${rule.prefix}${suffix}`;

      return { code, counter: nextCounter };
    }),

  // 批量初始化所有公司的SKU规则
  batchInitializeAllCompanies: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 查询所有ERP公司
    const companies = await db.select().from(erpCompanies);

    let successCount = 0;
    let failedCount = 0;
    let totalRulesCreated = 0;
    const errors: string[] = [];

    // 为每个公司初始化SKU规则
    for (const company of companies) {
      try {
        const result = await initializeDefaultSkuRules(company.id);
        successCount++;
        totalRulesCreated += result.createdRules.length;
      } catch (error) {
        failedCount++;
        errors.push(`公司 ${company.companyName} (ID: ${company.id}) 初始化失败: ${error}`);
      }
    }

    return {
      success: true,
      totalCompanies: companies.length,
      successCount,
      failedCount,
      totalRulesCreated,
      errors,
    };
  }),
});
