import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { apolloCandidates, customerFollowUps } from "../../drizzle/schema";
import { eq, and, inArray, desc, sql, like } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import { createAttribute } from "../attributes";

/**
 * 确保属性值存在于属性管理系统中（查找或创建）
 */
async function ensureAttribute(
  name: string,
  category: string,
  subcategory: string | undefined,
  fieldName: string,
  erpCompanyId: number,
  createdBy: number
) {
  if (!name || !name.trim()) return;
  try {
    await createAttribute(
      { name: name.trim(), category, subcategory, fieldName, createdBy },
      erpCompanyId
    );
  } catch (err) {
    // 忽略错误，不影响主流程
    console.warn(`ensureAttribute failed for ${fieldName}=${name}:`, err);
  }
}

function createSmtpTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp-mail.outlook.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    tls: { rejectUnauthorized: false },
  });
}

const APOLLO_API_KEY = process.env.APOLLO_API_KEY || "";
const APOLLO_BASE = "https://api.apollo.io/api/v1";

/**
 * 规范化URL：去除重复的协议前缀，确保返回的是带https://的完整URL或null
 * 处理情况：
 *   "http://www.example.com"  -> "http://www.example.com"
 *   "https://www.example.com" -> "https://www.example.com"
 *   "www.example.com"         -> "https://www.example.com"
 *   "example.com"             -> "https://example.com"
 *   null / ""                 -> null
 */
function normalizeUrl(url: string | null | undefined): string | null {
  if (!url || url.trim() === "") return null;
  const trimmed = url.trim();
  // 如果已经有协议前缀，直接返回
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // 否则加上https://
  return `https://${trimmed}`;
}

// Map frontend industry values to Apollo keyword tags
const INDUSTRY_KEYWORD_MAP: Record<string, string[]> = {
  furniture_retail: ["furniture", "home furnishings", "furniture retail"],
  interior_design: ["interior design", "home decor", "interior decorating"],
  real_estate: ["real estate", "property development", "real estate developer"],
  home_decor: ["home decor", "home goods", "housewares"],
  hospitality: ["hotel", "hospitality", "restaurant", "food service"],
  wholesale: ["wholesale", "wholesale distributor", "import export"],
  ecommerce: ["e-commerce", "online retail", "ecommerce"],
  department_store: ["department store", "retail chain", "specialty retail"],
};

function mapIndustriesToKeywords(industries: string[]): string[] {
  const keywords: string[] = [];
  for (const ind of industries) {
    const mapped = INDUSTRY_KEYWORD_MAP[ind];
    if (mapped) keywords.push(...mapped);
    else keywords.push(ind); // fallback: use raw value
  }
  return Array.from(new Set(keywords));
}

// Apollo API helper with retry for 503 errors
async function apolloRequest(endpoint: string, body: Record<string, unknown>, retries = 3) {
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  let lastError: string = "";
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(`${APOLLO_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": APOLLO_API_KEY,
      },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();
    const text = await res.text();
    lastError = text;
    // Retry on 503 (temporary server unavailability) or 429 (rate limit)
    if ((res.status === 503 || res.status === 429) && attempt < retries) {
      await delay(attempt * 2000); // 2s, 4s backoff
      continue;
    }
    // 401 / 403: API key issue
    if (res.status === 401 || res.status === 403) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Apollo API 密钥无效，请检查配置" });
    }
    // Other errors
    break;
  }
  // If all retries exhausted on 503, give friendly message
  if (lastError.includes('503') || lastError.includes('no_shard_available')) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Apollo 服务暂时不可用（服务器繁忙），请稍后重试" });
  }
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Apollo API 请求失败，请稍后重试` });
}

// Map Apollo person to DB insert shape
function mapPersonToCandidate(
  p: Record<string, unknown>,
  erpCompanyId: number,
  batchId: string,
  userId: number,
  scene: "buyer_search" | "competitor_mining"
) {
  const org = (p.organization as Record<string, unknown>) || {};
  const primaryPhone = (org.primary_phone as Record<string, unknown>) || {};
  return {
    erpCompanyId,
    searchScene: scene,
    apolloPersonId: (p.id as string) || null,
    apolloOrgId: (org.id as string) || null,
    firstName: (p.first_name as string) || null,
    // Apollo search API returns last_name_obfuscated; full last_name only available via enrich
    lastName: ((p.last_name as string) || (p.last_name_obfuscated as string)) || null,
    fullName: (p.name as string) || (
      (p.first_name as string)
        ? `${p.first_name as string} ${(p.last_name as string) || (p.last_name_obfuscated as string) || ''}`.trim()
        : null
    ),
    jobTitle: (p.title as string) || null,
    email: (p.email as string) || null,
    linkedinUrl: (p.linkedin_url as string) || null,
    // Company info from search result
    companyName: (org.name as string) || null,
    companyDomain: normalizeUrl((org.website_url as string) || (org.primary_domain as string) || null),
    companyLinkedinUrl: (org.linkedin_url as string) || null,
    industry: (org.industry as string) || null,
    country: (p.country as string) || null,
    city: (p.city as string) || null,
    employeeCount: (org.estimated_num_employees as number) || null,
    annualRevenue: (org.annual_revenue_printed as string) || null,
    // Extended company fields from search result
    companyPhone: (primaryPhone.sanitized_number as string) || (org.sanitized_phone as string) || null,
    companyAddress: (org.raw_address as string) || null,
    companyDescription: (org.short_description as string) || null,
    companyFoundedYear: (org.founded_year as number) || null,
    companyLogoUrl: (org.logo_url as string) || null,
    companyState: (org.state as string) || null,
    companyPostalCode: (org.postal_code as string) || null,
    importStatus: "pending" as const,
    searchBatchId: batchId,
    createdBy: userId,
  };
}

// Enrich a single person via /people/match — returns full name, email, linkedin, phone
async function enrichPersonData(apolloPersonId: string): Promise<{
  firstName?: string; lastName?: string; fullName?: string;
  email?: string; linkedin?: string; phone?: string;
} | null> {
  try {
    const data = await apolloRequest("/people/match", { id: apolloPersonId });
    const person = (data as Record<string, unknown>).person as Record<string, unknown> | null;
    if (!person) return null;
    const phones = (person.phone_numbers as { sanitized_number?: string }[] | undefined) || [];
    return {
      firstName: (person.first_name as string) || undefined,
      lastName: (person.last_name as string) || undefined,
      fullName: (person.name as string) || undefined,
      email: (person.email as string) || undefined,
      linkedin: (person.linkedin_url as string) || undefined,
      phone: phones[0]?.sanitized_number || undefined,
    };
  } catch {
    return null;
  }
}

// Enrich company via /organizations/enrich — returns full company details
async function enrichOrgData(domain: string): Promise<Record<string, unknown> | null> {
  try {
    const data = await apolloRequest("/organizations/enrich", { domain });
    return (data as Record<string, unknown>).organization as Record<string, unknown> | null;
  } catch {
    return null;
  }
}
// Find company by name via /organizations/search — returns org with logo_url, website_url, etc.
async function findOrgByName(companyName: string): Promise<Record<string, unknown> | null> {
  try {
    const data = await apolloRequest("/organizations/search", { q_organization_name: companyName, page: 1, per_page: 1 });
    const orgs = (data as Record<string, unknown>).organizations as Record<string, unknown>[] | undefined;
    return orgs?.[0] ?? null;
  } catch {
    return null;
  }
}

export const apolloRouter = router({
  // 场景一：精准买家搜索（搜索+自动保存到DB）
  searchBuyers: protectedProcedure
    .input(z.object({
      countries: z.array(z.string()).default([]),
      industries: z.array(z.string()).default([]),
      jobTitles: z.array(z.string()).default([]),
      employeeSizeMin: z.number().optional(),
      employeeSizeMax: z.number().optional(),
      employeeSizeRanges: z.array(z.string()).optional(),
      page: z.number().default(1),
      perPage: z.number().max(50).default(25),
    }))
    .mutation(async ({ input, ctx }) => {
      const erpCompanyId = ctx.user.erpCompanyId;
      if (!erpCompanyId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });

      // Search people directly with industry keyword tags + location + title filters
      const body: Record<string, unknown> = {
        page: input.page,
        per_page: input.perPage,
      };

      if (input.jobTitles.length > 0) body.person_titles = input.jobTitles;
      if (input.countries.length > 0) body.organization_locations = input.countries;
      if (input.industries.length > 0) {
        body.q_organization_keyword_tags = mapIndustriesToKeywords(input.industries);
      }
      if (input.employeeSizeRanges && input.employeeSizeRanges.length > 0) {
        body.organization_num_employees_ranges = input.employeeSizeRanges;
      } else if (input.employeeSizeMin || input.employeeSizeMax) {
        body.organization_num_employees_ranges = [
          `${input.employeeSizeMin || 1},${input.employeeSizeMax || 999999}`,
        ];
      }

      const data = await apolloRequest("/mixed_people/api_search", body);
      const people: Record<string, unknown>[] = data.people || [];
      const total = data.total_entries || data.pagination?.total_entries || 0;

      // 过滤已存在的apolloPersonId
      const personIds = people.filter(p => p.id).map(p => p.id as string);
      let existingIds: string[] = [];
      if (personIds.length > 0) {
        const existing = await db
          .select({ apolloPersonId: apolloCandidates.apolloPersonId })
          .from(apolloCandidates)
          .where(and(
            eq(apolloCandidates.erpCompanyId, erpCompanyId),
            inArray(apolloCandidates.apolloPersonId, personIds)
          ));
        existingIds = existing.map((e: { apolloPersonId: string | null }) => e.apolloPersonId as string).filter(Boolean);
      }

      const batchId = uuidv4();
      const toInsert = people
        .filter(p => !p.id || !existingIds.includes(p.id as string))
        .map(p => mapPersonToCandidate(p, erpCompanyId, batchId, ctx.user.id, "buyer_search"));

      if (toInsert.length > 0) {
        await db.insert(apolloCandidates).values(toInsert);
      }

      // 返回所有候选人（新插入 + 已存在），确保公司分组完整
      const allPersonIds = people.filter(p => p.id).map(p => p.id as string);
      let allCandidates: typeof apolloCandidates.$inferSelect[] = [];
      if (allPersonIds.length > 0) {
        allCandidates = await db
          .select()
          .from(apolloCandidates)
          .where(and(
            eq(apolloCandidates.erpCompanyId, erpCompanyId),
            inArray(apolloCandidates.apolloPersonId, allPersonIds)
          ));
      } else if (toInsert.length > 0) {
        // 如果没有apolloPersonId，只能通过batchId获取新插入的
        allCandidates = await db
          .select()
          .from(apolloCandidates)
          .where(and(
            eq(apolloCandidates.erpCompanyId, erpCompanyId),
            eq(apolloCandidates.searchBatchId, batchId)
          ));
      }

      // 同步富化新插入的候选人（并发5个，搜索完成后等待富化再返回，确保前端第一次显示就是完整信息）
      const newCandidatesToEnrich = allCandidates.filter(c =>
        toInsert.some(t => t.apolloPersonId === c.apolloPersonId) && c.apolloPersonId
      );
      if (newCandidatesToEnrich.length > 0) {
        const CONCURRENCY = 5;
        for (let i = 0; i < newCandidatesToEnrich.length; i += CONCURRENCY) {
          const batch = newCandidatesToEnrich.slice(i, i + CONCURRENCY);
          await Promise.all(batch.map(async (candidate) => {
            if (!candidate.apolloPersonId) return;
            try {
              const enriched = await enrichPersonData(candidate.apolloPersonId);
              if (enriched) {
                const updates: Record<string, unknown> = { enrichedAt: new Date() };
                if (enriched.fullName) updates.fullName = enriched.fullName;
                if (enriched.firstName) updates.firstName = enriched.firstName;
                if (enriched.lastName) updates.lastName = enriched.lastName;
                if (enriched.email) updates.email = enriched.email;
                if (enriched.linkedin) updates.linkedinUrl = enriched.linkedin;
                if (enriched.phone) updates.phone = enriched.phone;
                await db.update(apolloCandidates).set(updates).where(eq(apolloCandidates.id, candidate.id));
                // 同步更新内存中的候选人数据，确保返回给前端的是最新数据
                Object.assign(candidate, updates);
              }
            } catch { /* ignore individual failures */ }
          }));
        }
      }

      // 同步获取公司Logo（对新候选人按公司去重，并发15个）
      // 优先通过 domain 获取，如果 domain 为空则通过公司名搜索
      const companyNamesForLogo = Array.from(new Set(
        newCandidatesToEnrich
          .filter(c => !c.companyLogoUrl && c.companyName)
          .map(c => c.companyName as string)
      )).slice(0, 15);
      if (companyNamesForLogo.length > 0) {
        const logoByName: Record<string, { logoUrl: string; domain?: string }> = {};
        const LOGO_CONCURRENCY = 3;
        for (let i = 0; i < companyNamesForLogo.length; i += LOGO_CONCURRENCY) {
          const logoBatch = companyNamesForLogo.slice(i, i + LOGO_CONCURRENCY);
          await Promise.all(logoBatch.map(async (companyName) => {
            try {
              // Find a candidate with this company name to get domain
              const sample = newCandidatesToEnrich.find(c => c.companyName === companyName);
              const domain = sample?.companyDomain;
              let orgData: Record<string, unknown> | null = null;
              if (domain) {
                orgData = await enrichOrgData(domain);
              }
              if (!orgData?.logo_url) {
                // Fallback: search by company name
                orgData = await findOrgByName(companyName);
              }
              if (orgData?.logo_url) {
                logoByName[companyName] = {
                  logoUrl: orgData.logo_url as string,
                  domain: (orgData.website_url as string) || (orgData.primary_domain as string) || domain || undefined,
                };
              }
            } catch { /* skip */ }
          }));
        }
        for (const [companyName, info] of Object.entries(logoByName)) {
          const affected = allCandidates.filter(c => c.companyName === companyName);
          for (const c of affected) {
            const upd: Record<string, unknown> = { companyLogoUrl: info.logoUrl };
            if (!c.companyDomain && info.domain) upd.companyDomain = normalizeUrl(info.domain);
            await db.update(apolloCandidates).set(upd).where(eq(apolloCandidates.id, c.id));
            c.companyLogoUrl = info.logoUrl;
            if (!c.companyDomain && info.domain) c.companyDomain = normalizeUrl(info.domain);
          }
        }
      }

      return {
        people: allCandidates,
        totalCount: total,
        page: input.page,
        totalPages: Math.ceil(total / input.perPage),
        batchId,
      };
    }),

  // 场景二：竞品客户挖掘（搜索+自动保存到DB）
  searchCompetitorCustomers: protectedProcedure
    .input(z.object({
      competitorDomains: z.array(z.string()).min(1).max(5),
      jobTitles: z.array(z.string()).default(["CEO", "Purchasing Manager", "Procurement Manager", "Buyer"]),
      page: z.number().default(1),
      perPage: z.number().max(50).default(25),
    }))
    .mutation(async ({ input, ctx }) => {
      const erpCompanyId = ctx.user.erpCompanyId;
      if (!erpCompanyId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });

      const allPeople: Record<string, unknown>[] = [];
      const perDomain = Math.max(5, Math.floor(input.perPage / input.competitorDomains.length));

      for (const domain of input.competitorDomains) {
        try {
          // 富化竞争对手公司信息
          const orgData = await apolloRequest("/organizations/enrich", { domain });
          const org = orgData.organization;
          if (org) {
            const searchData = await apolloRequest("/mixed_people/api_search", {
              page: input.page,
              per_page: perDomain,
              person_titles: input.jobTitles,
              q_organization_keyword_tags: [org.industry || "Furniture", "Retail", "Home Furnishings"],
            });
            const people: Record<string, unknown>[] = searchData.people || [];
            allPeople.push(...people.map(p => ({ ...p, _sourceCompetitor: domain })));
          }
        } catch {
          // skip failed domains
        }
      }

      if (allPeople.length === 0) {
        return { people: [], totalCount: 0, batchId: "", page: input.page, totalPages: 1 };
      }

      // 过滤已存在
      const personIds = allPeople.filter(p => p.id).map(p => p.id as string);
      let existingIds: string[] = [];
      if (personIds.length > 0) {
        const existing = await db
          .select({ apolloPersonId: apolloCandidates.apolloPersonId })
          .from(apolloCandidates)
          .where(and(
            eq(apolloCandidates.erpCompanyId, erpCompanyId),
            inArray(apolloCandidates.apolloPersonId, personIds)
          ));
        existingIds = existing.map((e: { apolloPersonId: string | null }) => e.apolloPersonId as string).filter(Boolean);
      }

      const batchId = uuidv4();
      const toInsert = allPeople
        .filter(p => !p.id || !existingIds.includes(p.id as string))
        .map(p => mapPersonToCandidate(p, erpCompanyId, batchId, ctx.user.id, "competitor_mining"));

      if (toInsert.length > 0) {
        await db.insert(apolloCandidates).values(toInsert);
      }

      // 返回所有候选人（新插入 + 已存在），确保公司分组完整
      const allPersonIds = allPeople.filter(p => p.id).map(p => p.id as string);
      let allCandidates: typeof apolloCandidates.$inferSelect[] = [];
      if (allPersonIds.length > 0) {
        allCandidates = await db
          .select()
          .from(apolloCandidates)
          .where(and(
            eq(apolloCandidates.erpCompanyId, erpCompanyId),
            inArray(apolloCandidates.apolloPersonId, allPersonIds)
          ));
      } else if (toInsert.length > 0) {
        allCandidates = await db
          .select()
          .from(apolloCandidates)
          .where(and(
            eq(apolloCandidates.erpCompanyId, erpCompanyId),
            eq(apolloCandidates.searchBatchId, batchId)
          ));
      }

      // 同步富化新插入的候选人（并发5个，搜索完成后等待富化再返回）
      const newToEnrich2 = allCandidates.filter(c =>
        toInsert.some(t => t.apolloPersonId === c.apolloPersonId) && c.apolloPersonId
      );
      if (newToEnrich2.length > 0) {
        const CONCURRENCY2 = 5;
        for (let i = 0; i < newToEnrich2.length; i += CONCURRENCY2) {
          const batch2 = newToEnrich2.slice(i, i + CONCURRENCY2);
          await Promise.all(batch2.map(async (candidate) => {
            if (!candidate.apolloPersonId) return;
            try {
              const enriched = await enrichPersonData(candidate.apolloPersonId);
              if (enriched) {
                const updates: Record<string, unknown> = { enrichedAt: new Date() };
                if (enriched.fullName) updates.fullName = enriched.fullName;
                if (enriched.firstName) updates.firstName = enriched.firstName;
                if (enriched.lastName) updates.lastName = enriched.lastName;
                if (enriched.email) updates.email = enriched.email;
                if (enriched.linkedin) updates.linkedinUrl = enriched.linkedin;
                if (enriched.phone) updates.phone = enriched.phone;
                await db.update(apolloCandidates).set(updates).where(eq(apolloCandidates.id, candidate.id));
                Object.assign(candidate, updates);
              }
            } catch { /* ignore */ }
          }));
        }
      }

      return {
        people: allCandidates,
        totalCount: allPeople.length,
        batchId,
        page: input.page,
        totalPages: Math.ceil(allPeople.length / input.perPage),
      };
    }),
  // 获取候选人列表（分页））
  getCandidates: protectedProcedure
    .input(z.object({
      importStatus: z.enum(["pending", "imported", "skipped", "duplicate", "all"]).default("pending"),
      page: z.number().default(1),
      pageSize: z.number().default(20),
      industry: z.string().optional(),
      country: z.string().optional(),
      companyName: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const erpCompanyId = ctx.user.erpCompanyId;
      if (!erpCompanyId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });

      const conditions = [eq(apolloCandidates.erpCompanyId, erpCompanyId)];
      if (input.importStatus !== "all") {
        conditions.push(eq(apolloCandidates.importStatus, input.importStatus));
      }
      if (input.industry) {
        conditions.push(like(apolloCandidates.industry, `%${input.industry}%`));
      }
      if (input.country) {
        conditions.push(like(apolloCandidates.country, `%${input.country}%`));
      }
      if (input.companyName) {
        conditions.push(like(apolloCandidates.companyName, `%${input.companyName}%`));
      }

      const rows = await db
        .select()
        .from(apolloCandidates)
        .where(and(...conditions))
        .orderBy(desc(apolloCandidates.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      const countRows = await db
        .select({ id: apolloCandidates.id })
        .from(apolloCandidates)
        .where(and(...conditions));

      return {
        candidates: rows,
        total: countRows.length,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  // 获取候选人库筛选选项（行业/国家去重列表）
  getCandidateFilterOptions: protectedProcedure
    .query(async ({ ctx }) => {
      const erpCompanyId = ctx.user.erpCompanyId;
      if (!erpCompanyId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });

      const [industryRows, countryRows] = await Promise.all([
        db
          .selectDistinct({ value: apolloCandidates.industry })
          .from(apolloCandidates)
          .where(and(
            eq(apolloCandidates.erpCompanyId, erpCompanyId),
            sql`${apolloCandidates.industry} IS NOT NULL AND ${apolloCandidates.industry} != ''`
          ))
          .orderBy(apolloCandidates.industry),
        db
          .selectDistinct({ value: apolloCandidates.country })
          .from(apolloCandidates)
          .where(and(
            eq(apolloCandidates.erpCompanyId, erpCompanyId),
            sql`${apolloCandidates.country} IS NOT NULL AND ${apolloCandidates.country} != ''`
          ))
          .orderBy(apolloCandidates.country),
      ]);

      return {
        industries: industryRows.map(r => r.value).filter(Boolean) as string[],
        countries: countryRows.map(r => r.value).filter(Boolean) as string[],
      };
    }),

  // AI生成开发信
  generateOutreachEmail: protectedProcedure
    .input(z.object({
      candidateId: z.number(),
      senderCompanyName: z.string().optional(),
      senderProducts: z.string().optional(),
      language: z.enum(["en", "zh"]).default("en"),
    }))
    .mutation(async ({ input, ctx }) => {
      const erpCompanyId = ctx.user.erpCompanyId;
      if (!erpCompanyId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });

      const [candidate] = await db
        .select()
        .from(apolloCandidates)
        .where(and(
          eq(apolloCandidates.id, input.candidateId),
          eq(apolloCandidates.erpCompanyId, erpCompanyId)
        ));

      if (!candidate) throw new TRPCError({ code: "NOT_FOUND", message: "候选人不存在" });

      const senderName = input.senderCompanyName || "我们公司";
      const products = input.senderProducts || "高品质家具产品（沙发、餐椅、餐桌等）";
      const recipientName = candidate.fullName || `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim() || "there";

      const prompt = `You are an expert B2B sales email writer for a Chinese furniture manufacturer. Write a professional, personalized cold outreach email.

Recipient:
- Name: ${recipientName}
- Title: ${candidate.jobTitle || "Buyer"}
- Company: ${candidate.companyName || "their company"}
- Industry: ${candidate.industry || "Furniture/Home Furnishings"}
- Country: ${candidate.country || ""}

Sender:
- Company: ${senderName}
- Products: ${products}

Requirements:
- Under 200 words
- Personalize based on their industry and role
- Mention specific value proposition for furniture buyers
- Include a clear, low-pressure call to action
- Professional but warm tone
- Start with "Subject: ..." on the first line

Write only the email, no explanations.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are an expert B2B sales email writer specializing in furniture industry outreach." },
          { role: "user", content: prompt },
        ],
      });

      const emailContent = response.choices?.[0]?.message?.content || "";
      const emailStr = typeof emailContent === "string" ? emailContent : JSON.stringify(emailContent);

      await db
        .update(apolloCandidates)
        .set({ aiOutreachEmail: emailStr, aiGeneratedAt: new Date() })
        .where(eq(apolloCandidates.id, input.candidateId));

      return { email: emailStr };
    }),

  // 导入候选人到客户管理
  importCandidates: protectedProcedure
    .input(z.object({
      candidateIds: z.array(z.number()).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const erpCompanyId = ctx.user.erpCompanyId;
      if (!erpCompanyId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });

      const candidates = await db
        .select()
        .from(apolloCandidates)
        .where(and(
          eq(apolloCandidates.erpCompanyId, erpCompanyId),
          inArray(apolloCandidates.id, input.candidateIds),
          eq(apolloCandidates.importStatus, "pending")
        ));

      if (candidates.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "没有可导入的候选人（请确认状态为待处理）" });
      }

      const { getAllCompanies, createCompany, createContact, linkContactToCompany } = await import("../customerManagement");
      const importedResults: { candidateId: number; companyId: number; contactId?: number }[] = [];

      for (const candidate of candidates) {
        try {
          let companyId: number | null = null;

          if (candidate.companyName) {
            const existing = await getAllCompanies(erpCompanyId, {
              search: candidate.companyName,
              page: 1,
              pageSize: 1,
            });
            const existingList = (existing as { data?: { id: number; companyName: string }[] }).data || [];
            if (existingList.length > 0 && existingList[0].companyName === candidate.companyName) {
              companyId = existingList[0].id;
            } else {
              const candidateScale = candidate.employeeCount
                ? candidate.employeeCount < 50 ? "small"
                : candidate.employeeCount < 200 ? "medium"
                : candidate.employeeCount < 1000 ? "large" : "enterprise"
                : undefined;
              const newCompanyId = await createCompany({
                companyName: candidate.companyName,
                country: candidate.country || undefined,
                city: candidate.city || undefined,
                cooperationStatus: "developing" as "developing" | "cooperating" | "stopped",
                website: candidate.companyDomain || undefined,
                industryType: candidate.industry || undefined,
                companyScale: candidateScale as "small" | "medium" | "large" | "enterprise" | undefined,
                source: "Apollo",
                notes: (candidate.employeeCount || candidate.annualRevenue)
                  ? `通过Apollo智能开发导入。员工数：${candidate.employeeCount || "未知"}，年收入：${candidate.annualRevenue || "未知"}`
                  : undefined,
                createdBy: ctx.user.id,
              }, erpCompanyId);
              companyId = newCompanyId as number;
              // 自动确保属性值存在于属性管理系统中
              await ensureAttribute("Apollo", "客户管理", "客户信息", "客户来源", erpCompanyId, ctx.user.id);
              if (candidate.country) {
                await ensureAttribute(candidate.country, "客户管理", "客户信息", "客户国家", erpCompanyId, ctx.user.id);
              }
            }
          }

          let contactId: number | undefined;
          if (candidate.fullName || candidate.firstName) {
            const contactData = {
              erpCompanyId,
              fullName: candidate.fullName || `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim(),
              firstName: candidate.firstName || undefined,
              lastName: candidate.lastName || undefined,
              jobTitle: candidate.jobTitle || undefined,
              email: candidate.email || undefined,
              linkedin: candidate.linkedinUrl || undefined,
              mobile: candidate.phone || undefined,
              role: "decision_maker" as const,
              createdBy: ctx.user.id,
            };
            const insertedContactId = await createContact(contactData);
            if (companyId && insertedContactId) {
              await linkContactToCompany(companyId, insertedContactId, false);
              contactId = insertedContactId;
            }
          }

          await db
            .update(apolloCandidates)
            .set({
              importStatus: "imported",
              importedCompanyId: companyId || undefined,
              importedContactId: contactId,
              importedAt: new Date(),
              importedBy: ctx.user.id,
            })
            .where(eq(apolloCandidates.id, candidate.id));

          if (companyId) {
            importedResults.push({ candidateId: candidate.id, companyId, contactId });
          }
        } catch (err) {
          console.error(`Failed to import candidate ${candidate.id}:`, err);
        }
      }

      return {
        imported: importedResults.length,
        failed: candidates.length - importedResults.length,
        results: importedResults,
      };
    }),

  // 更新候选人状态（单个）
  updateCandidateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "imported", "skipped", "duplicate"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const erpCompanyId = ctx.user.erpCompanyId;
      if (!erpCompanyId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });

      await db
        .update(apolloCandidates)
        .set({ importStatus: input.status })
        .where(and(
          eq(apolloCandidates.id, input.id),
          eq(apolloCandidates.erpCompanyId, erpCompanyId)
        ));

      return { success: true };
    }),

  // 删除候选人（单个）
  deleteCandidate: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const erpCompanyId = ctx.user.erpCompanyId;
      if (!erpCompanyId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });

      await db
        .delete(apolloCandidates)
        .where(and(
          eq(apolloCandidates.id, input.id),
          eq(apolloCandidates.erpCompanyId, erpCompanyId)
        ));

      return { success: true };
    }),

  // 忽略公司（将该公司所有候选人标记为 skipped，记录忽略原因）
  ignoreCompany: protectedProcedure
    .input(z.object({
      companyName: z.string(),
      companyDomain: z.string().optional(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const erpCompanyId = ctx.user.erpCompanyId;
      if (!erpCompanyId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      // Mark all pending candidates from this company as skipped
      const result = await db
        .update(apolloCandidates)
        .set({
          importStatus: "skipped",
          notes: input.reason ? `[忽略公司] ${input.reason}` : "[忽略公司]",
          updatedAt: new Date(),
        })
        .where(and(
          eq(apolloCandidates.erpCompanyId, erpCompanyId),
          eq(apolloCandidates.companyName, input.companyName),
          eq(apolloCandidates.importStatus, "pending")
        ));
      return { affected: (result as { rowsAffected?: number }).rowsAffected || 0 };
    }),

  // 取消忽略公司（将该公司所有 skipped 候选人恢复为 pending）
  unignoreCompany: protectedProcedure
    .input(z.object({
      companyName: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const erpCompanyId = ctx.user.erpCompanyId;
      if (!erpCompanyId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const result = await db
        .update(apolloCandidates)
        .set({ importStatus: "pending", notes: null, updatedAt: new Date() })
        .where(and(
          eq(apolloCandidates.erpCompanyId, erpCompanyId),
          eq(apolloCandidates.companyName, input.companyName),
          eq(apolloCandidates.importStatus, "skipped")
        ));
      return { affected: (result as { rowsAffected?: number }).rowsAffected || 0 };
    }),

  // 获取已忽略公司列表（去重，按公司名分组）
  getIgnoredCompanies: protectedProcedure
    .query(async ({ ctx }) => {
      const erpCompanyId = ctx.user.erpCompanyId;
      if (!erpCompanyId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const rows = await db
        .select({
          companyName: apolloCandidates.companyName,
          companyDomain: apolloCandidates.companyDomain,
          industry: apolloCandidates.industry,
          country: apolloCandidates.country,
          employeeCount: apolloCandidates.employeeCount,
          notes: apolloCandidates.notes,
          updatedAt: apolloCandidates.updatedAt,
          count: sql<number>`COUNT(*)`,
        })
        .from(apolloCandidates)
        .where(and(
          eq(apolloCandidates.erpCompanyId, erpCompanyId),
          eq(apolloCandidates.importStatus, "skipped")
        ))
        .groupBy(
          apolloCandidates.companyName,
          apolloCandidates.companyDomain,
          apolloCandidates.industry,
          apolloCandidates.country,
          apolloCandidates.employeeCount,
          apolloCandidates.notes,
          apolloCandidates.updatedAt
        )
        .orderBy(desc(apolloCandidates.updatedAt));
      // Deduplicate by companyName
      const seen = new Set<string>();
      const unique: typeof rows = [];
      for (const row of rows) {
        const key = row.companyName || "";
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(row);
        }
      }
      return unique;
    }),

  // 按公司批量导入（导入该公司所有 pending 候选人）
  importByCompany: protectedProcedure
    .input(z.object({
      companyName: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const erpCompanyId = ctx.user.erpCompanyId;
      if (!erpCompanyId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const candidates = await db
        .select()
        .from(apolloCandidates)
        .where(and(
          eq(apolloCandidates.erpCompanyId, erpCompanyId),
          eq(apolloCandidates.companyName, input.companyName),
          eq(apolloCandidates.importStatus, "pending")
        ));
      if (candidates.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "该公司没有待处理的候选人" });
      }
      // Reuse importCandidates logic
      const ids = candidates.map(c => c.id);
      const { getAllCompanies, createCompany, createContact, linkContactToCompany } = await import("../customerManagement");
      const importedResults: { candidateId: number; companyId: number; contactId?: number }[] = [];
      let companyId: number | null = null;
      // Create/find company once for all candidates
      const firstCandidate = candidates[0];
      if (firstCandidate.companyName) {
        const existing = await getAllCompanies(erpCompanyId, { search: firstCandidate.companyName, page: 1, pageSize: 1 });
        const existingList = (existing as { data?: { id: number; companyName: string }[] }).data || [];
        if (existingList.length > 0 && existingList[0].companyName === firstCandidate.companyName) {
          companyId = existingList[0].id;
        } else {
          const companyScale = firstCandidate.employeeCount
            ? firstCandidate.employeeCount < 50 ? "small"
            : firstCandidate.employeeCount < 200 ? "medium"
            : firstCandidate.employeeCount < 1000 ? "large" : "enterprise"
            : undefined;
          // 尝试通过organizations/enrich获取完整公司信息
          let orgEnrichedByCompany: Record<string, unknown> | null = null;
          const domainForEnrichByCompany = firstCandidate.companyDomain
            ? firstCandidate.companyDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
            : null;
          if (domainForEnrichByCompany) {
            try { orgEnrichedByCompany = await enrichOrgData(domainForEnrichByCompany); } catch { /* skip */ }
          }
          const orgPhoneByCompany = orgEnrichedByCompany
            ? ((orgEnrichedByCompany.primary_phone as Record<string, unknown>)?.sanitized_number as string) || (orgEnrichedByCompany.sanitized_phone as string) || null
            : null;
          const newCompanyId = await createCompany({
            companyName: firstCandidate.companyName,
            country: firstCandidate.country || (orgEnrichedByCompany?.country as string) || undefined,
            state: firstCandidate.companyState || (orgEnrichedByCompany?.state as string) || undefined,
            city: firstCandidate.city || (orgEnrichedByCompany?.city as string) || undefined,
            address: firstCandidate.companyAddress || (orgEnrichedByCompany?.raw_address as string) || undefined,
            postalCode: firstCandidate.companyPostalCode || (orgEnrichedByCompany?.postal_code as string) || undefined,
            cooperationStatus: "developing" as const,
            website: firstCandidate.companyDomain || (orgEnrichedByCompany?.website_url as string) || undefined,
            industryType: firstCandidate.industry || (orgEnrichedByCompany?.industry as string) || undefined,
            companyScale: companyScale as "small" | "medium" | "large" | "enterprise" | undefined,
            linkedinUrl: firstCandidate.companyLinkedinUrl || (orgEnrichedByCompany?.linkedin_url as string) || undefined,
            phone: firstCandidate.companyPhone || orgPhoneByCompany || undefined,
            annualRevenue: firstCandidate.annualRevenue || (orgEnrichedByCompany?.annual_revenue_printed as string) || undefined,
            description: firstCandidate.companyDescription || (orgEnrichedByCompany?.short_description as string) || undefined,
            foundedYear: firstCandidate.companyFoundedYear || (orgEnrichedByCompany?.founded_year as number) || undefined,
            logoUrl: firstCandidate.companyLogoUrl || (orgEnrichedByCompany?.logo_url as string) || undefined,
            source: "Apollo",
            notes: `通过Apollo智能开发导入。员工数：${firstCandidate.employeeCount || "未知"}，年收入：${firstCandidate.annualRevenue || (orgEnrichedByCompany?.annual_revenue_printed as string) || "未知"}`,
            createdBy: ctx.user.id,
          }, erpCompanyId);
          companyId = newCompanyId as number;
          // 自动确保属性值存在于属性管理系统中
          await ensureAttribute("Apollo", "客户管理", "客户信息", "客户来源", erpCompanyId, ctx.user.id);
          const countryForAttr = firstCandidate.country || (orgEnrichedByCompany?.country as string) || null;
          if (countryForAttr) {
            await ensureAttribute(countryForAttr, "客户管理", "客户信息", "客户国家", erpCompanyId, ctx.user.id);
          }
        }
      }
      for (const candidate of candidates) {
        try {
          let contactId: number | undefined;
          if (candidate.fullName || candidate.firstName) {
            const contactData = {
              erpCompanyId,
              fullName: candidate.fullName || `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim(),
              firstName: candidate.firstName || undefined,
              lastName: candidate.lastName || undefined,
              jobTitle: candidate.jobTitle || undefined,
              email: candidate.email || undefined,
              linkedin: candidate.linkedinUrl || undefined,
              mobile: candidate.phone || undefined,
              role: "decision_maker" as const,
              createdBy: ctx.user.id,
            };
            const insertedContactId = await createContact(contactData);
            if (companyId && insertedContactId) {
              await linkContactToCompany(companyId, insertedContactId, false);
              contactId = insertedContactId;
            }
          }
          await db
            .update(apolloCandidates)
            .set({
              importStatus: "imported",
              importedCompanyId: companyId || undefined,
              importedContactId: contactId,
              importedAt: new Date(),
              importedBy: ctx.user.id,
            })
            .where(eq(apolloCandidates.id, candidate.id));
          if (companyId) {
            importedResults.push({ candidateId: candidate.id, companyId, contactId });
          }
        } catch (err) {
          console.error(`Failed to import candidate ${candidate.id}:`, err);
        }
      }
      return {
        imported: importedResults.length,
        failed: ids.length - importedResults.length,
        companyId,
        results: importedResults,
      };
    }),

  // 批量发送开发信（SMTP）
  batchSendEmails: protectedProcedure
    .input(z.object({
      candidateIds: z.array(z.number()).min(1).max(50),
      senderCompanyName: z.string().default("我们公司"),
      senderProducts: z.string().default("实木家具"),
      regenerateIfMissing: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const erpCompanyId = ctx.user.erpCompanyId;
      if (!erpCompanyId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });

      const candidates = await db.select().from(apolloCandidates)
        .where(and(eq(apolloCandidates.erpCompanyId, erpCompanyId), inArray(apolloCandidates.id, input.candidateIds)));
      if (candidates.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "未找到候选人" });

      const transporter = createSmtpTransporter();
      const results: { candidateId: number; success: boolean; emailSent: boolean; error?: string }[] = [];

      for (const candidate of candidates) {
        try {
          let emailContent = candidate.aiOutreachEmail;
          // Auto-generate if missing
          if (!emailContent && input.regenerateIfMissing) {
            const prompt = `You are a professional B2B sales expert specializing in furniture export from China.\nWrite a personalized cold outreach email for:\n- Name: ${candidate.firstName || ""} ${candidate.lastName || ""}\n- Title: ${candidate.jobTitle || "Purchasing Manager"}\n- Company: ${candidate.companyName || "their company"}\n- Industry: ${candidate.industry || "furniture/home furnishings"}\n- Country: ${candidate.country || ""}\n\nOur company: ${input.senderCompanyName}\nOur products: ${input.senderProducts}\n\nWrite a concise, professional email (150-200 words). First line must be: Subject: <subject>\nBe specific and personalized.`;
            const llmResult = await invokeLLM({ messages: [{ role: "user", content: prompt }] });
            const rawContent = llmResult.choices?.[0]?.message?.content;
            emailContent = typeof rawContent === "string" ? rawContent : null;
            if (emailContent) {
              await db.update(apolloCandidates).set({ aiOutreachEmail: emailContent, aiGeneratedAt: new Date() }).where(eq(apolloCandidates.id, candidate.id));
            }
          }

          if (!emailContent) { results.push({ candidateId: candidate.id, success: false, emailSent: false, error: "无开发信内容" }); continue; }

          // Record follow-up even if no email address
          if (!candidate.email) {
            if (candidate.importedCompanyId) {
              await db.insert(customerFollowUps).values({ erpCompanyId, customerId: candidate.importedCompanyId, content: `[Apollo开发信] 已生成开发信（无邮箱，未发送）\n\n${emailContent}`, followUpType: "email", followUpBy: ctx.user.id });
            }
            results.push({ candidateId: candidate.id, success: true, emailSent: false, error: "无邮箱地址" });
            continue;
          }

          // Parse subject line
          const lines = emailContent.split("\n");
          let subject = `Partnership Opportunity - ${input.senderCompanyName}`;
          let body = emailContent;
          if (lines[0].toLowerCase().startsWith("subject:")) {
            subject = lines[0].replace(/^subject:/i, "").trim();
            body = lines.slice(1).join("\n").trim();
          }

          await transporter.sendMail({
            from: `"${process.env.SMTP_FROM_NAME || input.senderCompanyName}" <${process.env.SMTP_FROM_EMAIL}>`,
            to: candidate.email,
            subject,
            text: body,
            html: `<div style="font-family:Arial,sans-serif;max-width:600px;line-height:1.6">${body.replace(/\n/g, "<br>")}</div>`,
          });

          // Record in customer follow-ups if imported
          if (candidate.importedCompanyId) {
            await db.insert(customerFollowUps).values({ erpCompanyId, customerId: candidate.importedCompanyId, content: `[Apollo开发信] 已发送至 ${candidate.email}\n\n主题：${subject}\n\n${body}`, followUpType: "email", followUpBy: ctx.user.id });
          }
          // Mark as sent in notes
          await db.update(apolloCandidates).set({ notes: `[已发送开发信] ${new Date().toISOString()} → ${candidate.email}` }).where(eq(apolloCandidates.id, candidate.id));
          results.push({ candidateId: candidate.id, success: true, emailSent: true });
        } catch (err) {
          console.error(`batchSendEmails: candidate ${candidate.id} failed:`, err);
          results.push({ candidateId: candidate.id, success: false, emailSent: false, error: (err as Error).message });
        }
      }

      return {
        sent: results.filter(r => r.emailSent).length,
        generated: results.filter(r => r.success && !r.emailSent).length,
        failed: results.filter(r => !r.success).length,
        results,
      };
    }),

  // 导入选定联系人（联系人级别，支持跨公司混合导入）
  importSelectedContacts: protectedProcedure
    .input(z.object({ candidateIds: z.array(z.number()).min(1) }))
    .mutation(async ({ input, ctx }) => {
      const erpCompanyId = ctx.user.erpCompanyId;
      if (!erpCompanyId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });

      const candidates = await db.select().from(apolloCandidates)
        .where(and(eq(apolloCandidates.erpCompanyId, erpCompanyId), inArray(apolloCandidates.id, input.candidateIds), eq(apolloCandidates.importStatus, "pending")));
      if (candidates.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "没有可导入的候选人" });

      const { getAllCompanies, createCompany, createContact, linkContactToCompany } = await import("../customerManagement");
      const importedResults: { candidateId: number; companyId: number; contactId?: number }[] = [];
      const companyIdCache = new Map<string, number>();

      // Group by company
      const byCompany = new Map<string, typeof candidates>();
      for (const c of candidates) {
        const key = c.companyName || "未知公司";
        if (!byCompany.has(key)) byCompany.set(key, []);
        byCompany.get(key)!.push(c);
      }

      for (const [companyName, group] of Array.from(byCompany.entries())) {
        let companyId: number | null = null;
        if (companyIdCache.has(companyName)) {
          companyId = companyIdCache.get(companyName)!;
        } else {
          const firstC = group[0];
          const existing = await getAllCompanies(erpCompanyId, { search: companyName, page: 1, pageSize: 1 });
          const existingList = (existing as { data?: { id: number; companyName: string }[] }).data || [];
          if (existingList.length > 0 && existingList[0].companyName === companyName) {
            companyId = existingList[0].id;
          } else {
            const scale = firstC.employeeCount ? (firstC.employeeCount < 50 ? "small" : firstC.employeeCount < 200 ? "medium" : firstC.employeeCount < 1000 ? "large" : "enterprise") : undefined;
            // 尝试通过organizations/enrich获取完整公司信息
            let orgEnrichedSel: Record<string, unknown> | null = null;
            const domainSel = firstC.companyDomain ? firstC.companyDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : null;
            if (domainSel) { try { orgEnrichedSel = await enrichOrgData(domainSel); } catch { /* skip */ } }
            const orgPhoneSel = orgEnrichedSel ? ((orgEnrichedSel.primary_phone as Record<string, unknown>)?.sanitized_number as string) || (orgEnrichedSel.sanitized_phone as string) || null : null;
            const newId = await createCompany({
              companyName, country: firstC.country || (orgEnrichedSel?.country as string) || undefined,
              state: firstC.companyState || (orgEnrichedSel?.state as string) || undefined,
              city: firstC.city || (orgEnrichedSel?.city as string) || undefined,
              address: firstC.companyAddress || (orgEnrichedSel?.raw_address as string) || undefined,
              postalCode: firstC.companyPostalCode || (orgEnrichedSel?.postal_code as string) || undefined,
              cooperationStatus: "developing" as const,
              website: firstC.companyDomain || (orgEnrichedSel?.website_url as string) || undefined,
              industryType: firstC.industry || (orgEnrichedSel?.industry as string) || undefined,
              companyScale: scale as "small" | "medium" | "large" | "enterprise" | undefined,
              linkedinUrl: firstC.companyLinkedinUrl || (orgEnrichedSel?.linkedin_url as string) || undefined,
              phone: firstC.companyPhone || orgPhoneSel || undefined,
              annualRevenue: firstC.annualRevenue || (orgEnrichedSel?.annual_revenue_printed as string) || undefined,
              description: firstC.companyDescription || (orgEnrichedSel?.short_description as string) || undefined,
              foundedYear: firstC.companyFoundedYear || (orgEnrichedSel?.founded_year as number) || undefined,
              logoUrl: firstC.companyLogoUrl || (orgEnrichedSel?.logo_url as string) || undefined,
              source: "Apollo",
              notes: `通过Apollo智能开发导入。员工数：${firstC.employeeCount || "未知"}，年收入：${firstC.annualRevenue || (orgEnrichedSel?.annual_revenue_printed as string) || "未知"}`,
              createdBy: ctx.user.id
            }, erpCompanyId);
            companyId = newId as number;
            // 自动确保属性值存在于属性管理系统中
            await ensureAttribute("Apollo", "客户管理", "客户信息", "客户来源", erpCompanyId, ctx.user.id);
            const countryForAttrSel = firstC.country || (orgEnrichedSel?.country as string) || null;
            if (countryForAttrSel) {
              await ensureAttribute(countryForAttrSel, "客户管理", "客户信息", "客户国家", erpCompanyId, ctx.user.id);
            }
          }
          if (companyId) companyIdCache.set(companyName, companyId);
        }

        for (const candidate of group) {
          try {
            let contactId: number | undefined;
            if (candidate.fullName || candidate.firstName) {
              const insertedContactId = await createContact({ erpCompanyId, fullName: candidate.fullName || `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim(), firstName: candidate.firstName || undefined, lastName: candidate.lastName || undefined, jobTitle: candidate.jobTitle || undefined, email: candidate.email || undefined, linkedin: candidate.linkedinUrl || undefined, mobile: candidate.phone || undefined, role: "decision_maker" as const, createdBy: ctx.user.id });
              if (companyId && insertedContactId) {
                await linkContactToCompany(companyId, insertedContactId, false);
                contactId = insertedContactId;
              }
            }
            await db.update(apolloCandidates).set({ importStatus: "imported", importedCompanyId: companyId || undefined, importedContactId: contactId, importedAt: new Date(), importedBy: ctx.user.id }).where(eq(apolloCandidates.id, candidate.id));
            if (companyId) importedResults.push({ candidateId: candidate.id, companyId, contactId });
          } catch (err) { console.error(`importSelectedContacts: candidate ${candidate.id} failed:`, err); }
        }
      }
      return { imported: importedResults.length, failed: candidates.length - importedResults.length, results: importedResults };
    }),

  // 富化候选人：通过 /people/match 获取完整姓名、邮箱、LinkedIn
  enrichCandidates: protectedProcedure
    .input(z.object({
      candidateIds: z.array(z.number()).optional(), // 不传则富化所有pending候选人
      limit: z.number().max(50).default(25),
    }))
    .mutation(async ({ input, ctx }) => {
      const erpCompanyId = ctx.user.erpCompanyId;
      if (!erpCompanyId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });

      // Fetch candidates to enrich
      let candidates;
      if (input.candidateIds && input.candidateIds.length > 0) {
        candidates = await db.select().from(apolloCandidates)
          .where(and(
            eq(apolloCandidates.erpCompanyId, erpCompanyId),
            inArray(apolloCandidates.id, input.candidateIds)
          ));
      } else {
        // Enrich pending candidates that have apolloPersonId but no email or obfuscated name
        candidates = await db.select().from(apolloCandidates)
          .where(and(
            eq(apolloCandidates.erpCompanyId, erpCompanyId),
            eq(apolloCandidates.importStatus, "pending")
          ))
          .limit(input.limit);
      }

      if (candidates.length === 0) {
        return { enriched: 0, failed: 0, results: [] };
      }

      const results: { id: number; success: boolean; name?: string; email?: string; error?: string }[] = [];
      const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

      for (const candidate of candidates) {
        if (!candidate.apolloPersonId) {
          results.push({ id: candidate.id, success: false, error: "no_apollo_id" });
          continue;
        }
        try {
          const matchBody: Record<string, unknown> = { id: candidate.apolloPersonId };
          const data = await apolloRequest("/people/match", matchBody);
          const person = (data as Record<string, unknown>).person as Record<string, unknown> | null;
          if (!person) {
            results.push({ id: candidate.id, success: false, error: "no_match" });
            continue;
          }
          // Build update payload
          const updates: Record<string, unknown> = {};
          const fullName = (person.name as string) || null;
          const firstName = (person.first_name as string) || null;
          const lastName = (person.last_name as string) || null;
          const email = (person.email as string) || null;
          const linkedin = (person.linkedin_url as string) || null;
          const phone = (person.phone_numbers as { sanitized_number?: string }[] | undefined)?.[0]?.sanitized_number || null;

          if (fullName) updates.fullName = fullName;
          if (firstName) updates.firstName = firstName;
          if (lastName) updates.lastName = lastName;
          if (email) updates.email = email;
          if (linkedin) updates.linkedinUrl = linkedin;

          // Store phone in notes if available (no phone field in apolloCandidates)
          if (phone && !candidate.notes?.includes(phone)) {
            updates.notes = candidate.notes
              ? `${candidate.notes}; 电话: ${phone}`
              : `电话: ${phone}`;
          }

          // Also get company domain + logo from person's organization in match response
          const personOrg = (person.organization as Record<string, unknown>) || {};
          const orgDomain = (personOrg.website_url as string) || (personOrg.primary_domain as string) || null;
          const orgLogoUrl = (personOrg.logo_url as string) || null;
          if (orgDomain && !candidate.companyDomain) updates.companyDomain = normalizeUrl(orgDomain);
          if (orgLogoUrl && !candidate.companyLogoUrl) updates.companyLogoUrl = orgLogoUrl;
          // If still no logo, try organizations/enrich by domain or findOrgByName as fallback
          if (!orgLogoUrl && !candidate.companyLogoUrl) {
            const domainToUse = orgDomain || candidate.companyDomain;
            if (domainToUse) {
              try {
                const cleanDomain = domainToUse.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
                const orgData = await enrichOrgData(cleanDomain);
                if (orgData?.logo_url) updates.companyLogoUrl = orgData.logo_url as string;
                if (!orgData?.logo_url && candidate.companyName) {
                  const orgByName = await findOrgByName(candidate.companyName);
                  if (orgByName?.logo_url) updates.companyLogoUrl = orgByName.logo_url as string;
                }
              } catch { /* skip */ }
            } else if (candidate.companyName) {
              try {
                const orgByName = await findOrgByName(candidate.companyName);
                if (orgByName?.logo_url) updates.companyLogoUrl = orgByName.logo_url as string;
                if (orgByName?.website_url && !candidate.companyDomain) updates.companyDomain = normalizeUrl(orgByName.website_url as string);
              } catch { /* skip */ }
            }
          }

          if (Object.keys(updates).length > 0) {
            updates.enrichedAt = new Date();
            await db.update(apolloCandidates).set(updates).where(eq(apolloCandidates.id, candidate.id));
          }

          results.push({ id: candidate.id, success: true, name: fullName || undefined, email: email || undefined });
          // Rate limit: avoid 429
          await delay(300);
        } catch (err) {
          results.push({ id: candidate.id, success: false, error: String(err) });
        }
      }

      return {
        enriched: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      };
    }),

  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const erpCompanyId = ctx.user.erpCompanyId;
      if (!erpCompanyId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const all = await db
        .select({
          id: apolloCandidates.id,
          importStatus: apolloCandidates.importStatus,
          aiOutreachEmail: apolloCandidates.aiOutreachEmail,
        })
        .from(apolloCandidates)
        .where(eq(apolloCandidates.erpCompanyId, erpCompanyId));
      return {
        total: all.length,
        pending: all.filter((r: { importStatus: string }) => r.importStatus === "pending").length,
        imported: all.filter((r: { importStatus: string }) => r.importStatus === "imported").length,
        skipped: all.filter((r: { importStatus: string }) => r.importStatus === "skipped").length,
        duplicate: all.filter((r: { importStatus: string }) => r.importStatus === "duplicate").length,
        withEmail: all.filter((r: { aiOutreachEmail: string | null }) => r.aiOutreachEmail).length,
      };
    }),
});
