import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { userManagementRouter } from "./routers/userManagement";
import { userManagementNewRouter } from "./routers/userManagementNew";
import { operationLogsRouter } from "./routers/operationLogs";
import { customerManagementRouter } from "./routers/customerManagement";
import { positionsRouter, permissionsRouter } from "./routers/permissionManagement";
import { productVariantsRouter } from "./routers/productVariants";
import { variantSuppliersRouter } from "./routers/variantSuppliers";
import { mediaLibraryRouter } from "./routers/mediaLibrary";
import { categoriesRouter } from "./routers/categories";
import { tagsRouter } from "./routers/tags";
import { productImagesRouter } from "./routers/productImages";
import { suppliersRouter } from "./routers/suppliers";
import { supplierCategoriesRouter } from "./routers/supplierCategories";
import { ordersRouter } from "./routers/orders";
import { quotationsRouter } from "./routers/quotations";
import { quotationApprovalsRouter } from "./routers/quotationApprovals";
import { quotationTemplatesRouter } from "./routers/quotationTemplates";
import { quotationVersionsRouter } from "./routers/quotationVersions";
import { batchPdfExportRouter } from "./routers/batchPdfExport";
import { attributesRouter } from "./routers/attributes";
import { systemSettingsRouter } from "./routers/systemSettings";
import { materialsRouter } from "./routers/materials";
import { variantMaterialsRouter } from "./routers/variantMaterials";
import { materialTypesRouter } from "./routers/materialTypes";
import { companySettingsRouter } from "./routers/companySettings";
import { bankAccountsRouter } from "./routers/bankAccounts";
import { packageBoxesRouter } from "./routers/packageBoxes";
import { skuRulesRouter } from "./routers/skuRules";
import { orderTrackingRouter } from "./routers/orderTracking";
import { orderFinanceRouter } from "./routers/orderFinance";
import { uploadInspectionReportRouter } from "./routers/uploadInspectionReport";
import { inspectionRouter } from "./routers/inspection";
import { emailGeneratorRouter } from "./routers/emailGenerator";
import { invoiceRouter } from "./routers/invoice";
import { invoiceTermsRouter } from "./routers/invoiceTerms";
import { invoiceTemplateConfigRouter } from "./routers/invoiceTemplateConfig";
import { notificationsRouter } from "./routers/notifications";
import { apolloRouter } from "./routers/apollo";


export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    // 验证公司代码
    verifyCompany: publicProcedure
      .input(z.object({ companyCode: z.string() }))
      .mutation(async ({ input }) => {
        const { getErpCompanyByCode } = await import("./db_auth.js");
        const company = await getErpCompanyByCode(input.companyCode);
        if (!company) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "公司代码不存在",
          });
        }
        if (company.status !== "active") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "公司账号已被停用",
          });
        }
        return {
          companyId: company.id,
          companyName: company.companyName,
        };
      }),

    // 邮箱密码登录
    login: publicProcedure
      .input(
        z.object({
          companyCode: z.string(),
          email: z.string().email(),
          password: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { getErpCompanyByCode, getUserByEmail } = await import(
          "./db_auth.js"
        );
        const { verifyPassword } = await import("./utils/password.js");
        const { createSession } = await import("./utils/session.js");

        // 验证公司代码
        const company = await getErpCompanyByCode(input.companyCode);
        if (!company || company.status !== "active") {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "公司代码或邮箱密码错误",
          });
        }

        // 验证用户
        const user = await getUserByEmail(input.email);
        if (!user || user.erpCompanyId !== company.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "公司代码或邮箱密码错误",
          });
        }

        // 验证密码
        if (!user.passwordHash) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "该账号未设置密码，请联系管理员",
          });
        }

        const isPasswordValid = await verifyPassword(
          input.password,
          user.passwordHash
        );
        if (!isPasswordValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "公司代码或邮箱密码错误",
          });
        }

        // 创建 Session
        const token = createSession({
          userId: user.id,
          erpCompanyId: company.id,
          email: user.email!,
          role: user.role,
        });

        // 设置 Cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
        });

        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            mustChangePassword: user.mustChangePassword,
          },
        };
      }),

    // 获取当前用户
    me: publicProcedure.query(({ ctx }) => ctx.user),

    // 修改密码
    changePassword: protectedProcedure
      .input(
        z.object({
          oldPassword: z.string(),
          newPassword: z.string().min(6),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { getUserById, updateUserPassword } = await import(
          "./db_auth.js"
        );
        const { verifyPassword, hashPassword } = await import(
          "./utils/password.js"
        );

        const user = await getUserById(ctx.user!.id);
        if (!user || !user.passwordHash) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "用户不存在",
          });
        }

        // 验证旧密码
        const isOldPasswordValid = await verifyPassword(
          input.oldPassword,
          user.passwordHash
        );
        if (!isOldPasswordValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "旧密码错误",
          });
        }

        // 更新密码
        const newPasswordHash = await hashPassword(input.newPassword);
        await updateUserPassword(user.id, newPasswordHash);

        return { success: true };
      }),

    // 登出
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  dashboard: router({
    getStats: protectedProcedure.query(async ({ ctx }) => {
      return await db.getDashboardStats(ctx.user.erpCompanyId);
    }),
    getSalesTrend: protectedProcedure.query(async ({ ctx }) => {
      return await db.getSalesTrend(ctx.user.erpCompanyId);
    }),
    getOrderStatus: protectedProcedure.query(async ({ ctx }) => {
      return await db.getOrderStatusDistribution(ctx.user.erpCompanyId);
    }),
    getProductCategories: protectedProcedure.query(async ({ ctx }) => {
      return await db.getProductCategoryStats(ctx.user.erpCompanyId);
    }),
    getRecentActivities: protectedProcedure.query(async ({ ctx }) => {
      return await db.getRecentActivities(ctx.user.erpCompanyId, 10);
    }),
    getReportStats: protectedProcedure
      .input(z.object({
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getReportStats(ctx.user.erpCompanyId, input?.dateFrom, input?.dateTo);
      }),
  }),

  customers: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllCustomers();
    }),
  }),

  products: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getAllProducts(ctx.user.erpCompanyId);
    }),
    create: protectedProcedure
      .input(z.object({
        sku: z.string(), // 仅SKU必填
        name: z.string().optional(),
        description: z.string().optional(),
        categoryId: z.number().optional(),
        status: z.enum(['active', 'developing', 'discontinued']).optional(),
        productionMode: z.enum(['make_to_order', 'ready_stock']).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check if SKU already exists
        const existingProduct = await db.getProductBySku(input.sku, ctx.user.erpCompanyId);
        if (existingProduct) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `产品SKU "${input.sku}" 已存在，请使用其他编号`,
          });
        }
        
        return await db.createProduct({ ...input, erpCompanyId: ctx.user.erpCompanyId });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        sku: z.string().optional(),
        status: z.enum(['active', 'developing', 'discontinued']).optional(),
        productionMode: z.enum(['made_to_order', 'ready_stock']).optional(),
        remainingStock: z.number().nullable().optional(),
        type: z.string().optional(),
        vendor: z.string().optional(),
        // 包装体积字段
        packageLength: z.number().nullable().optional(),
        packageWidth: z.number().nullable().optional(),
        packageHeight: z.number().nullable().optional(),
        packageCbm: z.number().nullable().optional(),
        volumeUnit: z.enum(["cm", "m", "mm"]).optional(),
        // 新增字段
        moq: z.number().nullable().optional(),
        shippingPortId: z.number().nullable().optional(),
        packagingMethodId: z.number().nullable().optional(),
        containerLoad: z.string().nullable().optional(),
        supplyRegionId: z.number().nullable().optional(),
        addedDate: z.string().nullable().optional(),
        selectionLogicId: z.number().nullable().optional(),
        styleSourceId: z.number().nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        return await db.updateProduct(id, ctx.user.erpCompanyId, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return await db.softDeleteProduct(input.id, ctx.user.erpCompanyId);
      }),
    batchDelete: protectedProcedure
      .input(z.object({ productIds: z.array(z.number()) }))
      .mutation(async ({ input, ctx }) => {
        return await db.batchSoftDeleteProducts(input.productIds, ctx.user.erpCompanyId);
      }),
    restore: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return await db.restoreProduct(input.id, ctx.user.erpCompanyId);
      }),
    getDeleted: protectedProcedure.query(async ({ ctx }) => {
      return await db.getDeletedProducts(ctx.user.erpCompanyId);
    }),
    batchUpdateStatus: protectedProcedure
      .input(z.object({
        productIds: z.array(z.number()),
        status: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.batchUpdateProductStatus(input.productIds, input.status, ctx.user.erpCompanyId);
      }),
    // 价格管理API
    getPricing: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input, ctx }) => {
        return await db.getProductPricing(input.productId, ctx.user.erpCompanyId);
      }),
    updatePricing: protectedProcedure
      .input(z.object({
        productId: z.number(),
        exchangeRate: z.number().optional(), // 当次使用的汇率
        note: z.string().optional(), // 成本快照备注
        pricing: z.object({
          factoryPriceRmbExcludingTax: z.number().nullable().optional(),
          factoryPriceRmbIncludingTax: z.number().nullable().optional(),
          factoryPriceUsdFob: z.number().nullable().optional(),
          myCostRmb: z.number().nullable().optional(),
          myCostUsd: z.number().nullable().optional(),
          fobFeeRmb: z.number().nullable().optional(),
          sellingPriceRmbIncludingTax: z.number().nullable().optional(),
          fobLevel1: z.number().nullable().optional(),
          fobLevel2: z.number().nullable().optional(),
          fobLevel3: z.number().nullable().optional(),
          rmbTaxRate: z.number().nullable().optional(),
        }),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.updateProductPricing(input.productId, input.pricing, ctx.user?.id, ctx.user.erpCompanyId);
        // 自动创建成本快照
        if (input.exchangeRate) {
          await db.createCostSnapshot(
            input.productId,
            input.pricing,
            input.exchangeRate,
            ctx.user?.id,
            ctx.user?.erpCompanyId,
            input.note
          );
        }
        return result;
      }),
    // 成本快照历史API
    getCostSnapshots: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input, ctx }) => {
        return await db.getCostSnapshots(input.productId, ctx.user.erpCompanyId);
      }),
    getPriceHistory: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input, ctx }) => {
        return await db.getProductPriceHistory(input.productId, ctx.user.erpCompanyId);
      }),
    // 产品-供应商关联API
    getSuppliers: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input, ctx }) => {
        return await db.getProductSuppliers(input.productId, ctx.user.erpCompanyId);
      }),
    addSupplier: protectedProcedure
      .input(z.object({
        productId: z.number(),
        supplierId: z.number(),
        isPrimary: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.addProductSupplier({ ...input, erpCompanyId: ctx.user.erpCompanyId });
      }),
    removeSupplier: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return await db.removeProductSupplier(input.id, ctx.user.erpCompanyId);
      }),
    setPrimarySupplier: protectedProcedure
      .input(z.object({
        productId: z.number(),
        supplierId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.setPrimarySupplier(input.productId, input.supplierId, ctx.user.erpCompanyId);
      }),
    // AI生成产品英文标题
    generateTitle: protectedProcedure
      .input(z.object({
        imageUrl: z.string().optional(),
        categories: z.array(z.string()).optional(),
        subCategories: z.array(z.string()).optional(),
        currentTitle: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { invokeLLM } = await import("./_core/llm");
        
        const parentCategoryInfo = input.categories && input.categories.length > 0
          ? `Parent categories (room/area): ${input.categories.join(", ")}`
          : "";
        
        const subCategoryInfo = input.subCategories && input.subCategories.length > 0
          ? `Sub-categories (product type): ${input.subCategories.join(", ")}`
          : "";
        
        const subCategoryRule = input.subCategories && input.subCategories.length > 0
          ? `\n7. CRITICAL REQUIREMENT - The title MUST include the sub-category type word as a COMPLETE, UNSPLIT word. Sub-categories: ${input.subCategories.map(s => `"${s}"`).join(", ")}. Convert to singular form and use as ONE word: "armchairs" → "Armchair" (ONE word, NOT "Arm Chair" or "Arm Dining Chair"), "sofas" → "Sofa", "coffee tables" → "Coffee Table", "bookcases" → "Bookcase". The sub-category must be the LAST word(s) of the title. Example: "Modern Upholstered Armchair" NOT "Modern Arm Dining Chair".`
          : "";
        
        const messages: any[] = [
          {
            role: "system" as const,
            content: `You are a professional furniture product naming expert for B2B export trade. Generate a concise English product title for the given product.

Rules:
1. The title MUST NOT contain any color words (no "gray", "blue", "white", "black", "red", "green", "brown", "beige", "cream", "navy", "charcoal", "walnut", "oak", "natural", etc.)
2. The title should describe the product type, style, and key material/feature
3. Format: 3-6 words, Title Case, like "Modern Upholstered Dining Chair" or "Solid Wood Rectangular Dining Table"
4. Focus on: furniture type, design style, material, and functional features
5. Do NOT include brand names, model numbers, or dimensions
6. Return ONLY the title text, nothing else${subCategoryRule}`
          }
        ];
        
        // Build user message with optional image
        const userContent: any[] = [];
        
        if (input.imageUrl) {
          userContent.push({
            type: "image_url",
            image_url: { url: input.imageUrl, detail: "low" }
          });
        }
        
        let textPrompt = "Generate an English product title (no color words).";
        if (parentCategoryInfo) textPrompt += ` ${parentCategoryInfo}.`;
        if (subCategoryInfo) textPrompt += ` ${subCategoryInfo}. The sub-category word(s) MUST appear in the title.`;
        if (input.currentTitle) textPrompt += ` Current title for reference: "${input.currentTitle}".`;
        
        userContent.push({ type: "text", text: textPrompt });
        
        messages.push({ role: "user" as const, content: userContent });
        
        const result = await invokeLLM({ messages });
        const title = result.choices[0]?.message?.content;
        let titleText = typeof title === "string" ? title.trim().replace(/^"|"$/g, "") : "";
        
        // Post-process: ensure sub-category word appears as complete word in title
        if (titleText && input.subCategories && input.subCategories.length > 0) {
          for (const subCat of input.subCategories) {
            // Convert plural to singular: "armchairs" -> "Armchair", "sofas" -> "Sofa"
            let singular = subCat.trim();
            if (singular.endsWith('s') && !singular.endsWith('ss')) {
              singular = singular.slice(0, -1);
            }
            // Capitalize first letter of each word
            const capitalizedSingular = singular.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            // Check if the sub-category word appears in the title (case insensitive)
            const titleLower = titleText.toLowerCase();
            const singularLower = capitalizedSingular.toLowerCase();
            if (!titleLower.includes(singularLower)) {
              // Sub-category not found as complete word, append it to the end
              titleText = titleText + ' ' + capitalizedSingular;
            }
          }
        }
        
        return { title: titleText };
      }),
  }),

  users: userManagementRouter,
  userManagementNew: userManagementNewRouter,
  operationLogs: operationLogsRouter,
  customerManagement: customerManagementRouter,

  permissionManagement: router({
    positions: positionsRouter,
    permissions: permissionsRouter,
  }),
  productVariants: productVariantsRouter,
  variantSuppliers: variantSuppliersRouter,
  mediaLibrary: mediaLibraryRouter,
  categories: categoriesRouter,
  tags: tagsRouter,
  suppliers: suppliersRouter,
  supplierCategories: supplierCategoriesRouter,
  orders: ordersRouter,
  quotations: quotationsRouter,
  quotationApprovals: quotationApprovalsRouter,
  quotationTemplates: quotationTemplatesRouter,
  quotationVersions: quotationVersionsRouter,
  batchPdfExport: batchPdfExportRouter,
  materials: materialsRouter,
  materialTypes: materialTypesRouter,
  variantMaterials: variantMaterialsRouter,
  productImages: productImagesRouter,
  attributes: attributesRouter,
  systemSettings: systemSettingsRouter,
  companySettings: companySettingsRouter,
  bankAccounts: bankAccountsRouter,
  packageBoxes: packageBoxesRouter,
  skuRules: skuRulesRouter,
  orderTracking: orderTrackingRouter,
  orderFinance: orderFinanceRouter,
  uploadInspectionReport: uploadInspectionReportRouter,
  inspection: inspectionRouter,
  emailGenerator: emailGeneratorRouter,
  invoice: invoiceRouter,
  invoiceTerms: invoiceTermsRouter,
  invoiceTemplateConfig: invoiceTemplateConfigRouter,
  notifications: notificationsRouter,
  apollo: apolloRouter,
});

export type AppRouter = typeof appRouter;
