import { getDb } from "./db.js";
import { companySettings, companyBankAccounts } from "../drizzle/schema.js";
import { eq, and, desc } from "drizzle-orm";

/**
 * 获取公司信息设置
 * 如果不存在，返回null
 */
export async function getCompanySettings(erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const settings = await db
    .select()
    .from(companySettings)
    .where(eq(companySettings.erpCompanyId, erpCompanyId))
    .limit(1);
  
  return settings.length > 0 ? settings[0] : null;
}

/**
 * 更新或创建公司信息设置
 */
export async function updateCompanySettings(
  erpCompanyId: number,
  data: {
    companyName?: string;
    companyLogo?: string;
    contactPhone?: string;
    contactEmail?: string;
    companyAddress?: string;
    postalCode?: string;
    invoiceCompanyName?: string;
    taxNumber?: string;
    brandName?: string;
    brandSlogan?: string;
    websiteUrl?: string;
    defaultCurrency?: string;
    timezone?: string;
    language?: string;
    // 邮件营销信息
    marketingCompanyName?: string;
    marketingEmail?: string;
    marketingAddress?: string;
    marketingPhone?: string;
    marketingWebsite?: string;
    // 汇率设置
    exchangeRateUsdCny?: number;
    exchangeRateEurCny?: number;
    exchangeRateGbpCny?: number;
    // 利润率设置
    defaultProfitMarginLevel1?: number;
    defaultProfitMarginLevel2?: number;
    defaultProfitMarginLevel3?: number;
    defaultRmbProfitMargin?: number;
    defaultTaxRate?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 检查是否已存在记录
  const existing = await getCompanySettings(erpCompanyId);
  
  if (existing) {
    // 更新现有记录
    // Convert exchange rate numbers to strings for decimal columns
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.exchangeRateUsdCny !== undefined) updateData.exchangeRateUsdCny = String(data.exchangeRateUsdCny);
    if (data.exchangeRateEurCny !== undefined) updateData.exchangeRateEurCny = String(data.exchangeRateEurCny);
    if (data.exchangeRateGbpCny !== undefined) updateData.exchangeRateGbpCny = String(data.exchangeRateGbpCny);
    if (data.defaultProfitMarginLevel1 !== undefined) updateData.defaultProfitMarginLevel1 = String(data.defaultProfitMarginLevel1);
    if (data.defaultProfitMarginLevel2 !== undefined) updateData.defaultProfitMarginLevel2 = String(data.defaultProfitMarginLevel2);
    if (data.defaultProfitMarginLevel3 !== undefined) updateData.defaultProfitMarginLevel3 = String(data.defaultProfitMarginLevel3);
    if (data.defaultRmbProfitMargin !== undefined) updateData.defaultRmbProfitMargin = String(data.defaultRmbProfitMargin);
    if (data.defaultTaxRate !== undefined) updateData.defaultTaxRate = String(data.defaultTaxRate);
    
    await db
      .update(companySettings)
      .set(updateData)
      .where(eq(companySettings.erpCompanyId, erpCompanyId));
    
    // 返回更新后的记录
    return await getCompanySettings(erpCompanyId);
  } else {
    // 创建新记录
    const result = await db.insert(companySettings).values({
      erpCompanyId,
      companyName: data.companyName || "",
      companyLogo: data.companyLogo,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail,
      companyAddress: data.companyAddress,
      postalCode: data.postalCode,
      invoiceCompanyName: data.invoiceCompanyName,
      taxNumber: data.taxNumber,
      brandName: data.brandName,
      brandSlogan: data.brandSlogan,
      websiteUrl: data.websiteUrl,
      defaultCurrency: data.defaultCurrency || "USD",
      timezone: data.timezone || "UTC",
      language: data.language || "zh-CN",
      // 邮件营销信息
      marketingCompanyName: data.marketingCompanyName,
      marketingEmail: data.marketingEmail,
      marketingAddress: data.marketingAddress,
      marketingPhone: data.marketingPhone,
      marketingWebsite: data.marketingWebsite,
      // 汇率设置
      exchangeRateUsdCny: data.exchangeRateUsdCny ? String(data.exchangeRateUsdCny) : "7.2000",
      exchangeRateEurCny: data.exchangeRateEurCny ? String(data.exchangeRateEurCny) : undefined,
      exchangeRateGbpCny: data.exchangeRateGbpCny ? String(data.exchangeRateGbpCny) : undefined,
    });
    
    // 返回新创建的记录
    return await getCompanySettings(erpCompanyId);
  }
}

/**
 * 获取公司所有银行账户列表
 * 按sortOrder排序
 */
export async function getBankAccounts(erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .select()
    .from(companyBankAccounts)
    .where(eq(companyBankAccounts.erpCompanyId, erpCompanyId))
    .orderBy(companyBankAccounts.sortOrder);
}

/**
 * 添加银行账户
 */
export async function addBankAccount(
  erpCompanyId: number,
  data: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    currency: string;
    swiftCode?: string;
    iban?: string;
    routingNumber?: string;
    bankAddress?: string;
    isDefault?: boolean;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 查询当前最大sortOrder
  const maxSortOrderResult = await db
    .select({
      max: companyBankAccounts.sortOrder,
    })
    .from(companyBankAccounts)
    .where(eq(companyBankAccounts.erpCompanyId, erpCompanyId))
    .orderBy(desc(companyBankAccounts.sortOrder))
    .limit(1);
  
  const newSortOrder = (maxSortOrderResult[0]?.max || 0) + 1;
  
  // 如果设置为默认账户，取消同货币的其他默认账户
  if (data.isDefault) {
    await db
      .update(companyBankAccounts)
      .set({ isDefault: false })
      .where(
        and(
          eq(companyBankAccounts.erpCompanyId, erpCompanyId),
          eq(companyBankAccounts.currency, data.currency)
        )
      );
  }
  
  // 插入新账户
  const result = await db.insert(companyBankAccounts).values({
    erpCompanyId,
    bankName: data.bankName,
    accountName: data.accountName,
    accountNumber: data.accountNumber,
    currency: data.currency,
    swiftCode: data.swiftCode,
    iban: data.iban,
    routingNumber: data.routingNumber,
    bankAddress: data.bankAddress,
    isDefault: data.isDefault || false,
    sortOrder: newSortOrder,
  });
  
  // 返回新创建的账户
  const newAccount = await db
    .select()
    .from(companyBankAccounts)
    // @ts-ignore - insertId exists on MySql2 result
    .where(eq(companyBankAccounts.id, Number(result.insertId)))
    .limit(1);
  
  return newAccount[0];
}

/**
 * 更新银行账户
 */
export async function updateBankAccount(
  erpCompanyId: number,
  accountId: number,
  data: {
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    currency?: string;
    swiftCode?: string;
    iban?: string;
    routingNumber?: string;
    bankAddress?: string;
    isDefault?: boolean;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 验证账户属于当前公司
  const account = await db
    .select()
    .from(companyBankAccounts)
    .where(
      and(
        eq(companyBankAccounts.id, accountId),
        eq(companyBankAccounts.erpCompanyId, erpCompanyId)
      )
    )
    .limit(1);
  
  if (account.length === 0) {
    throw new Error("Bank account not found or access denied");
  }
  
  // 如果设置为默认账户，取消同货币的其他默认账户
  if (data.isDefault) {
    const currency = data.currency || account[0].currency;
    await db
      .update(companyBankAccounts)
      .set({ isDefault: false })
      .where(
        and(
          eq(companyBankAccounts.erpCompanyId, erpCompanyId),
          eq(companyBankAccounts.currency, currency)
        )
      );
  }
  
  // 更新账户
  await db
    .update(companyBankAccounts)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(companyBankAccounts.id, accountId));
  
  // 返回更新后的账户
  const updatedAccount = await db
    .select()
    .from(companyBankAccounts)
    .where(eq(companyBankAccounts.id, accountId))
    .limit(1);
  
  return updatedAccount[0];
}

/**
 * 删除银行账户
 */
export async function deleteBankAccount(
  erpCompanyId: number,
  accountId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 验证账户属于当前公司
  const account = await db
    .select()
    .from(companyBankAccounts)
    .where(
      and(
        eq(companyBankAccounts.id, accountId),
        eq(companyBankAccounts.erpCompanyId, erpCompanyId)
      )
    )
    .limit(1);
  
  if (account.length === 0) {
    throw new Error("Bank account not found or access denied");
  }
  
  // 删除账户
  await db
    .delete(companyBankAccounts)
    .where(eq(companyBankAccounts.id, accountId));
  
  return { success: true };
}
