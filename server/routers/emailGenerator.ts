import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";
import { products, emailTemplates } from "../../drizzle/schema";
import { eq, and, or, like, inArray, isNull, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

export const emailGeneratorRouter = router({
  // 搜索产品（支持类目、SKU、名称筛选）
  searchProducts: protectedProcedure
    .input(
      z.object({
        keyword: z.string().optional(),
        categoryIds: z.array(z.number()).optional(),
        page: z.number().default(1),
        pageSize: z.number().default(20),
      })
    )
    .query(async ({ input, ctx }: { input: any; ctx: any }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { keyword, categoryIds, page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      // 构建查询条件
      const conditions = [
        eq(products.erpCompanyId, ctx.user.erpCompanyId),
        eq(products.status, "active"),
        isNull(products.deletedAt),
      ];

      if (keyword) {
        conditions.push(
          or(
            like(products.sku, `%${keyword}%`),
            like(products.name, `%${keyword}%`)
          )!
        );
      }

      if (categoryIds && categoryIds.length > 0) {
        conditions.push(inArray(products.categoryId, categoryIds));
      }

      // 查询产品
      const productList = await db
        .select({
          id: products.id,
          sku: products.sku,
          name: products.name,
          description: products.description,
          fobLevel1: products.fobLevel1,
          fobLevel2: products.fobLevel2,
          fobLevel3: products.fobLevel3,
          imageUrl: products.imageUrl,
          categoryId: products.categoryId,
        })
        .from(products)
        .where(and(...conditions))
        .orderBy(desc(products.createdAt))
        .limit(pageSize)
        .offset(offset);

      // 获取总数
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(and(...conditions));

      const total = countResult[0]?.count || 0;

      return {
        products: productList,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  // 生成邮件HTML
  generateEmail: protectedProcedure
    .input(
      z.object({
        productIds: z.array(z.number()).min(1, "请至少选择一个产品"),
        displayConfig: z.object({
          showImage: z.boolean().default(true),
          showName: z.boolean().default(true),
          showSku: z.boolean().default(true),
          showPrice: z.boolean().default(true),
          priceTypes: z.array(z.enum(["fobLevel1", "fobLevel2", "fobLevel3"])).default(["fobLevel1"]),
          showMoq: z.boolean().default(false),
          showDescription: z.boolean().default(false),
          showSpecs: z.boolean().default(false),
        }),
        customContent: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { productIds, displayConfig, customContent } = input;

      // 获取公司信息（用于邮件底部）
      const { erpCompanies } = await import("../../drizzle/schema.js");
      const companyInfo = await db
        .select()
        .from(erpCompanies)
        .where(eq(erpCompanies.id, ctx.user.erpCompanyId))
        .limit(1);
      
      const company = companyInfo[0];
      if (!company) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "未找到公司信息",
        });
      }

      // 获取产品详细信息
      const productList = await db
        .select()
        .from(products)
        .where(
          and(
            inArray(products.id, productIds),
            eq(products.erpCompanyId, ctx.user.erpCompanyId)
          )
        );

      if (productList.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "未找到选中的产品",
        });
      }

      // 构建AI Prompt
      const productInfo = productList
        .map((p) => {
          let info = `- 产品名称: ${p.name}\n`;
          if (displayConfig.showSku) info += `  SKU: ${p.sku}\n`;
          if (displayConfig.showPrice && displayConfig.priceTypes.length > 0) {
            const prices = displayConfig.priceTypes
              .map((type: any) => {
                const price = (p as any)[type];
                return price ? `USD ${price}` : null;
              })
              .filter(Boolean);
            if (prices.length > 0) {
              info += `  价格: ${prices.join(" / ")}\n`;
            }
          }
          if (displayConfig.showDescription && p.description) {
            info += `  描述: ${p.description}\n`;
          }
          if (p.imageUrl) {
            info += `  图片URL: ${p.imageUrl}\n`;
          }
          return info;
        })
        .join("\n");

      const prompt = `你是一位专业的外贸B2B营销文案专家。请根据以下信息生成一封产品推广邮件的HTML代码。

**选中的产品**:
${productInfo}

**显示字段配置**:
- 显示产品图片: ${displayConfig.showImage ? "是" : "否"}
- 显示产品名称: ${displayConfig.showName ? "是" : "否"}
- 显示SKU: ${displayConfig.showSku ? "是" : "否"}
- 显示价格: ${displayConfig.showPrice ? "是（标题为HOT PRICE）" : "否"}
- 显示产品描述: ${displayConfig.showDescription ? "是" : "否"}

**用户自定义要求**:
${customContent || "无特殊要求，生成专业的商务邮件即可"}

**公司信息（用于邮件底部）**:
- 公司名称: ${company.marketingCompanyName || company.companyName || "[Your Company Name]"}
- 公司地址: ${company.marketingAddress || company.address || "[Your Company Address]"}
- 联系电话: ${company.marketingPhone || company.phone || "[Your Phone Number]"}
- 联系邮箱: ${company.marketingEmail || company.email || "[Your Email]"}
- 公司网站: ${company.marketingWebsite || ""}

**生成要求**:
1. 生成完整的HTML邮件代码（包括<!DOCTYPE html>标签）
2. 使用响应式设计，兼容PC和移动端
3. 使用table布局确保邮件客户端兼容性（Gmail、Outlook、Apple Mail）
4. 所有样式使用内联CSS
5. 产品图片要清晰展示，桌面端多列布局，移动端单列布局
6. 价格统一使用"HOT PRICE"作为标题
7. 文案要专业、简洁、有说服力
8. 包含明确的CTA（Call-to-Action）按钮，如"立即询价"或"Contact Us"
9. 整体设计要美观、现代、符合B2B商务风格
10. 使用media queries实现响应式布局
11. 只返回HTML代码，不要有任何解释文字

请直接输出HTML代码:`;

      // 调用LLM生成邮件
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "你是一位专业的外贸B2B营销文案专家和HTML邮件开发专家。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.choices[0].message.content;
      let generatedHtml = typeof content === 'string' ? content : "";

      // 清理可能的markdown代码块标记
      generatedHtml = generatedHtml.replace(/```html\n?/g, "").replace(/```\n?/g, "").trim();

      // 保存到数据库
      await db.insert(emailTemplates).values({
        erpCompanyId: ctx.user.erpCompanyId,
        userId: ctx.user.id,
        selectedProducts: productIds,
        displayConfig: displayConfig,
        customContent: customContent,
        generatedHtml: generatedHtml,
      });

      return {
        html: generatedHtml,
        products: productList,
      };
    }),

  // 获取历史邮件列表
  getHistory: protectedProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(10),
      })
    )
    .query(async ({ input, ctx }: { input: { page: number; pageSize: number }; ctx: any }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      const templateList = await db
        .select({
          id: emailTemplates.id,
          templateName: emailTemplates.templateName,
          customContent: emailTemplates.customContent,
          createdAt: emailTemplates.createdAt,
        })
        .from(emailTemplates)
        .where(eq(emailTemplates.erpCompanyId, ctx.user.erpCompanyId))
        .orderBy(desc(emailTemplates.createdAt))
        .limit(pageSize)
        .offset(offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(emailTemplates)
        .where(eq(emailTemplates.erpCompanyId, ctx.user.erpCompanyId));

      const total = countResult[0]?.count || 0;

      return {
        templates: templateList,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  // 获取单个历史邮件详情
  // 优化邮件（对话式修改）
  optimizeEmail: protectedProcedure
    .input(
      z.object({
        currentHtml: z.string(),
        optimizationRequest: z.string(),
      })
    )
    .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
      const { currentHtml, optimizationRequest } = input;

      // 构建AI Prompt
      const prompt = `你是一位专业的外贸B2B营销文案专家和HTML邮件开发专家。

**当前邮件HTML代码**:
\`\`\`html
${currentHtml}
\`\`\`

**用户的优化要求**:
${optimizationRequest}

**任务**:
请根据用户的优化要求，修改上面的HTML邮件代码。

**要求**:
1. 保持响应式设计，兼容PC和移动端
2. 使用table布局确保邮件客户端兼容性
3. 所有样式使用内联CSS
4. 只返回完整的HTML代码，不要有任何解释文字
5. 确保修改后的邮件仍然专业、美观、符合B2B商务风格

请直接输出优化后的HTML代码:`;

      // 调用LLM优化邮件
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "你是一位专业的外贸B2B营销文案专家和HTML邮件开发专家。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.choices[0].message.content;
      let optimizedHtml = typeof content === 'string' ? content : "";

      // 清理可能的markdown代码块标记
      optimizedHtml = optimizedHtml.replace(/```html\n?/g, "").replace(/```\n?/g, "").trim();

      return {
        html: optimizedHtml,
      };
    }),

  getTemplateById: protectedProcedure.input(z.number()).query(async ({ input, ctx }: { input: number; ctx: any }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, input),
          eq(emailTemplates.erpCompanyId, ctx.user.erpCompanyId)
        )
      )
      .limit(1);

    if (!template) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "邮件模板不存在",
      });
    }

    return template;
  }),
});
