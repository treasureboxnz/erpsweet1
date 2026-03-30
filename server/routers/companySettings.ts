import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import {
  getCompanySettings,
  updateCompanySettings,
  getBankAccounts,
  addBankAccount,
  updateBankAccount,
  deleteBankAccount,
} from "../companySettings.js";

export const companySettingsRouter = router({
  // 获取公司信息设置
  get: protectedProcedure.query(async ({ ctx }) => {
    return await getCompanySettings(ctx.user.erpCompanyId);
  }),

  // 更新公司信息设置
  update: protectedProcedure
    .input(
      z.object({
        companyName: z.string().optional(),
        companyLogo: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().optional(),
        companyAddress: z.string().optional(),
        postalCode: z.string().optional(),
        invoiceCompanyName: z.string().optional(),
        taxNumber: z.string().optional(),
        brandName: z.string().optional(),
        brandSlogan: z.string().optional(),
        websiteUrl: z.string().optional(),
        defaultCurrency: z.string().optional(),
        timezone: z.string().optional(),
        language: z.string().optional(),
        // 邮件营销信息
        marketingCompanyName: z.string().optional(),
        marketingEmail: z.string().optional(),
        marketingAddress: z.string().optional(),
        marketingPhone: z.string().optional(),
        marketingWebsite: z.string().optional(),
        // 汇率设置
        exchangeRateUsdCny: z.number().optional(),
        exchangeRateEurCny: z.number().optional(),
        exchangeRateGbpCny: z.number().optional(),
        // 利润率设置
        defaultProfitMarginLevel1: z.number().optional(),
        defaultProfitMarginLevel2: z.number().optional(),
        defaultProfitMarginLevel3: z.number().optional(),
        defaultRmbProfitMargin: z.number().optional(),
        defaultTaxRate: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await updateCompanySettings(ctx.user.erpCompanyId, input);
    }),
});

export const bankAccountsRouter = router({
  // 获取银行账户列表
  list: protectedProcedure.query(async ({ ctx }) => {
    return await getBankAccounts(ctx.user.erpCompanyId);
  }),

  // 添加银行账户
  add: protectedProcedure
    .input(
      z.object({
        bankName: z.string(),
        accountName: z.string(),
        accountNumber: z.string(),
        currency: z.string(),
        swiftCode: z.string().optional(),
        iban: z.string().optional(),
        routingNumber: z.string().optional(),
        bankAddress: z.string().optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await addBankAccount(ctx.user.erpCompanyId, input);
    }),

  // 更新银行账户
  update: protectedProcedure
    .input(
      z.object({
        accountId: z.number(),
        bankName: z.string().optional(),
        accountName: z.string().optional(),
        accountNumber: z.string().optional(),
        currency: z.string().optional(),
        swiftCode: z.string().optional(),
        iban: z.string().optional(),
        routingNumber: z.string().optional(),
        bankAddress: z.string().optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId, ...data } = input;
      return await updateBankAccount(ctx.user.erpCompanyId, accountId, data);
    }),

  // 删除银行账户
  delete: protectedProcedure
    .input(z.object({ accountId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await deleteBankAccount(ctx.user.erpCompanyId, input.accountId);
    }),
});
