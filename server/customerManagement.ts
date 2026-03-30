import { and, asc, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import {
  companies,
  companyContacts,
  contacts,
  followUpRecords,
  type Company,
  type Contact,
  type FollowUpRecord,
  type InsertCompany,
  type InsertContact,
  type InsertFollowUpRecord,
} from "../drizzle/schema";
import { getDb } from "./db";

/**
 * Company (客户公司) Management
 */

export async function getAllCompanies(erpCompanyId: number, filters?: {
  cooperationStatus?: string;
  country?: string;
  assignedTo?: number;
  search?: string;
  customerNature?: string;
  customerCategory?: string[];
  cooperationLevel?: string;
  createdBy?: number;
  overdueFollowUp?: boolean;
  overdueDays?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const db = await getDb();
  if (!db) return { data: [], total: 0, page: 1, pageSize: 20 };

  const conditions = [eq(companies.erpCompanyId, erpCompanyId)];
  if (filters?.cooperationStatus) {
    conditions.push(eq(companies.cooperationStatus, filters.cooperationStatus as any));
  }
  if (filters?.country) {
    conditions.push(eq(companies.country, filters.country));
  }
  if (filters?.assignedTo) {
    conditions.push(eq(companies.assignedTo, filters.assignedTo));
  }
  if (filters?.customerNature) {
    conditions.push(eq(companies.customerNature, filters.customerNature));
  }
  if (filters?.customerCategory && filters.customerCategory.length > 0) {
    // For array filters, use JSON_CONTAINS to check if any value matches
    const categoryConditions = filters.customerCategory.map(cat => 
      sql`JSON_CONTAINS(${companies.customerCategory}, JSON_QUOTE(${cat}))`
    );
    conditions.push(or(...categoryConditions)!);
  }
  if (filters?.cooperationLevel) {
    conditions.push(eq(companies.cooperationLevel, filters.cooperationLevel));
  }
  if (filters?.createdBy) {
    conditions.push(eq(companies.createdBy, filters.createdBy));
  }
  if (filters?.search) {
    conditions.push(
      or(
        like(companies.companyName, `%${filters.search}%`),
        like(companies.customerCode, `%${filters.search}%`)
      )!
    );
  }

  // Overdue follow-up filter: customers with no follow-up or last follow-up > overdueDays ago
  if (filters?.overdueFollowUp) {
    const { customerFollowUps } = await import('../drizzle/schema');
    const overdueDays = filters.overdueDays || 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - overdueDays);
    const latestFollowUps = await db
      .select({
        customerId: customerFollowUps.customerId,
        latestAt: sql<Date>`MAX(${customerFollowUps.createdAt})`,
      })
      .from(customerFollowUps)
      .groupBy(customerFollowUps.customerId);
    const latestMap: Record<number, Date> = {};
    latestFollowUps.forEach(r => { latestMap[r.customerId] = r.latestAt; });
    const allCompanyIds = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.erpCompanyId, erpCompanyId));
    const overdueIds = allCompanyIds
      .filter(r => {
        const latest = latestMap[r.id];
        return !latest || latest < cutoff;
      })
      .map(r => r.id);
    if (overdueIds.length > 0) {
      conditions.push(inArray(companies.id, overdueIds));
    } else {
      conditions.push(sql`1=0`);
    }
  }

  // Get total count
  const whereClause = conditions.length > 0 ? and(...conditions)! : undefined;
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(companies)
    .where(whereClause);
  const total = Number(countResult[0]?.count || 0);

  // Get paginated data
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let query = db.select().from(companies);
  if (whereClause) {
    query = query.where(whereClause) as any;
  }

  // Apply sorting
  const sortBy = filters?.sortBy || 'createdAt';
  const sortOrder = filters?.sortOrder || 'desc';
  
  const sortColumn = {
    companyName: companies.companyName,
    customerCode: companies.customerCode,
    customerNature: companies.customerNature,
    country: companies.country,
    cooperationLevel: companies.cooperationLevel,
    cooperationStatus: companies.cooperationStatus,
    createdAt: companies.createdAt,
  }[sortBy] || companies.createdAt;

  const data = await query
    .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
    .limit(pageSize)
    .offset(offset);

  return { data, total, page, pageSize };
}

export async function getCompanyById(id: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(companies).where(and(eq(companies.id, id), eq(companies.erpCompanyId, erpCompanyId))).limit(1);
  return result[0] || null;
}

export async function getCompanyByCode(customerCode: string, erpCompanyId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(companies).where(and(eq(companies.customerCode, customerCode), eq(companies.erpCompanyId, erpCompanyId))).limit(1);
  return result[0] || null;
}

export async function createCompany(data: Omit<InsertCompany, 'erpCompanyId'>, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Add erpCompanyId to the data
  data = { ...data, erpCompanyId } as InsertCompany;

  // Auto-generate customer code if not provided
  if (!data.customerCode) {
    // Get the maximum customer code number
    const maxCodeResult = await db
      .select({ customerCode: companies.customerCode })
      .from(companies)
      .where(sql`${companies.customerCode} LIKE 'CV-G%'`)
      .orderBy(sql`CAST(SUBSTRING(${companies.customerCode}, 5) AS UNSIGNED) DESC`)
      .limit(1);
    
    let nextNumber = 1000; // Start from CV-G1000
    if (maxCodeResult.length > 0 && maxCodeResult[0].customerCode) {
      const match = maxCodeResult[0].customerCode.match(/CV-G(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    
    data.customerCode = `CV-G${nextNumber}`;
  } else {
    // Check if manually entered customer code already exists
    const existing = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.customerCode, data.customerCode))
      .limit(1);
    
    if (existing.length > 0) {
      throw new Error(`客户编号 ${data.customerCode} 已存在，请使用其他编号`);
    }
  }

  // Filter out undefined values to prevent SQL errors
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  ) as InsertCompany;

  const result = await db.insert(companies).values(cleanData);
  return result[0].insertId;
}

export async function updateCompany(id: number, data: Partial<InsertCompany>, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verify the company belongs to the ERP company
  const existing = await getCompanyById(id, erpCompanyId);
  if (!existing) {
    throw new Error("Company not found or access denied");
  }

  // Check if customer code is being updated and if it already exists
  if (data.customerCode) {
    const existing = await db
      .select({ id: companies.id })
      .from(companies)
      .where(and(
        eq(companies.customerCode, data.customerCode),
        sql`${companies.id} != ${id}`
      ))
      .limit(1);
    
    if (existing.length > 0) {
      throw new Error(`客户编号 ${data.customerCode} 已存在，请使用其他编号`);
    }
  }

  // Filter out undefined values to prevent SQL errors
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );

  if (Object.keys(cleanData).length > 0) {
    await db.update(companies).set(cleanData).where(eq(companies.id, id));
  }
}

export async function deleteCompany(id: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verify the company belongs to the ERP company
  const existing = await getCompanyById(id, erpCompanyId);
  if (!existing) {
    throw new Error("Company not found or access denied");
  }

  // 先删除关联的跟进记录
  await db.delete(followUpRecords).where(eq(followUpRecords.companyId, id));
  
  // 删除公司-联系人关联
  await db.delete(companyContacts).where(eq(companyContacts.companyId, id));
  
  // 删除公司记录
  await db.delete(companies).where(eq(companies.id, id));
}

/**
 * Contact (联系人) Management
 */

export async function getAllContacts(filters?: { status?: string; search?: string }) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(contacts);

  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(contacts.status, filters.status as any));
  }
  if (filters?.search) {
    conditions.push(
      or(
        like(contacts.fullName, `%${filters.search}%`),
        like(contacts.email, `%${filters.search}%`),
        like(contacts.mobile, `%${filters.search}%`)
      )!
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)!) as any;
  }

  return query.orderBy(desc(contacts.createdAt));
}

export async function getContactById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  return result[0] || null;
}

export async function getContactsByCompany(companyId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      contact: contacts,
      relationship: companyContacts,
    })
    .from(companyContacts)
    .innerJoin(contacts, eq(companyContacts.contactId, contacts.id))
    .where(eq(companyContacts.companyId, companyId))
    .orderBy(desc(companyContacts.isPrimary), desc(companyContacts.createdAt));

  return result.map((r) => ({
    ...r.contact,
    isPrimary: r.relationship.isPrimary,
    relationshipType: r.relationship.relationshipType,
  }));
}

export async function createContact(data: InsertContact) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Filter out undefined values to prevent SQL errors
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  ) as InsertContact;

  const result = await db.insert(contacts).values(cleanData);
  return result[0].insertId;
}

export async function updateContact(id: number, data: Partial<InsertContact>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Filter out undefined values to prevent SQL errors
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );

  if (Object.keys(cleanData).length > 0) {
    await db.update(contacts).set(cleanData).where(eq(contacts.id, id));
  }
}

export async function deleteContact(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Soft delete
  await db.update(contacts).set({ status: "inactive" }).where(eq(contacts.id, id));
}

/**
 * Company-Contact Relationship
 */

export async function linkContactToCompany(
  companyId: number,
  contactId: number,
  isPrimary: boolean = false,
  relationshipType?: string,
  erpCompanyId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // If setting as primary, unset other primary contacts
  if (isPrimary) {
    await db
      .update(companyContacts)
      .set({ isPrimary: false })
      .where(eq(companyContacts.companyId, companyId));
  }

  await db.insert(companyContacts).values({
    erpCompanyId: erpCompanyId || 1,
    companyId,
    contactId,
    isPrimary,
    relationshipType,
  });
}

export async function unlinkContactFromCompany(companyId: number, contactId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(companyContacts)
    .where(
      and(eq(companyContacts.companyId, companyId), eq(companyContacts.contactId, contactId))!
    );
}

/**
 * Follow-up Records (跟进记录)
 */

export async function getFollowUpsByCompany(companyId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(followUpRecords)
    .where(eq(followUpRecords.companyId, companyId))
    .orderBy(desc(followUpRecords.createdAt));
}

export async function createFollowUpRecord(data: InsertFollowUpRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Filter out undefined values to prevent SQL errors
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  ) as InsertFollowUpRecord;

  const result = await db.insert(followUpRecords).values(cleanData);
  return result[0].insertId;
}

export async function updateFollowUpRecord(id: number, data: Partial<InsertFollowUpRecord>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Filter out undefined values to prevent SQL errors
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );

  if (Object.keys(cleanData).length > 0) {
    await db.update(followUpRecords).set(cleanData).where(eq(followUpRecords.id, id));
  }
}

export async function deleteFollowUpRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(followUpRecords).where(eq(followUpRecords.id, id));
}

/**
 * Statistics
 */

export async function getCompanyStats(erpCompanyId: number) {
  const db = await getDb();
  if (!db) return { total: 0, developing: 0, cooperating: 0, stopped: 0 };

  const stats = await db
    .select({
      cooperationStatus: companies.cooperationStatus,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(companies)
    .where(eq(companies.erpCompanyId, erpCompanyId))
    .groupBy(companies.cooperationStatus);

  const result = {
    total: 0,
    developing: 0,
    cooperating: 0,
    stopped: 0,
  };

  stats.forEach((stat) => {
    result.total += Number(stat.count);
    if (stat.cooperationStatus === "developing") result.developing = Number(stat.count);
    if (stat.cooperationStatus === "cooperating") result.cooperating = Number(stat.count);
    if (stat.cooperationStatus === "stopped") result.stopped = Number(stat.count);
  });

  return result;
}

// ============================================
// Company Assignees Management
// ============================================

/**
 * Get all assignees for a company with user details
 */
export async function getCompanyAssignees(companyId: number) {
  const db = await getDb();
  if (!db) return [];

  const { companyAssignees, users } = await import("../drizzle/schema");
  
  const assignees = await db
    .select({
      id: companyAssignees.id,
      userId: companyAssignees.userId,
      userName: users.name,
      userEmail: users.email,
      userRole: users.role,
      isPrimary: companyAssignees.isPrimary,
      assignedBy: companyAssignees.assignedBy,
      assignedAt: companyAssignees.assignedAt,
    })
    .from(companyAssignees)
    .leftJoin(users, eq(companyAssignees.userId, users.id))
    .where(eq(companyAssignees.companyId, companyId))
    .orderBy(desc(companyAssignees.isPrimary), companyAssignees.assignedAt);

  return assignees;
}

/**
 * Add an assignee to a company
 */
export async function addCompanyAssignee(data: {
  companyId: number;
  userId: number;
  isPrimary: boolean;
  assignedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { companyAssignees } = await import("../drizzle/schema");

  // If setting as primary, unset other primary assignees first
  if (data.isPrimary) {
    await db
      .update(companyAssignees)
      .set({ isPrimary: false })
      .where(eq(companyAssignees.companyId, data.companyId));
  }

  const result = await db.insert(companyAssignees).values({
    erpCompanyId: (data as any).erpCompanyId || 1,
    companyId: data.companyId,
    userId: data.userId,
    isPrimary: data.isPrimary,
    assignedBy: data.assignedBy,
  });

  return result[0].insertId;
}

/**
 * Remove an assignee from a company
 */
export async function removeCompanyAssignee(companyId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { companyAssignees } = await import("../drizzle/schema");

  await db
    .delete(companyAssignees)
    .where(
      and(
        eq(companyAssignees.companyId, companyId),
        eq(companyAssignees.userId, userId)
      )
    );
}

/**
 * Set a user as the primary assignee for a company
 */
export async function setPrimaryAssignee(companyId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { companyAssignees } = await import("../drizzle/schema");

  // First, unset all primary assignees for this company
  await db
    .update(companyAssignees)
    .set({ isPrimary: false })
    .where(eq(companyAssignees.companyId, companyId));

  // Then set the specified user as primary
  await db
    .update(companyAssignees)
    .set({ isPrimary: true })
    .where(
      and(
        eq(companyAssignees.companyId, companyId),
        eq(companyAssignees.userId, userId)
      )
    );
}

// ==================== Attachment Management ====================

/**
 * Get attachment categories for a company
 */
export async function getAttachmentCategories(companyId: number) {
  const db = await getDb();
  if (!db) return [];

  const { companyAttachmentCategories } = await import("../drizzle/schema");
  return await db
    .select()
    .from(companyAttachmentCategories)
    .where(eq(companyAttachmentCategories.companyId, companyId))
    .orderBy(companyAttachmentCategories.displayOrder, companyAttachmentCategories.id);
}

/**
 * Create attachment category
 */
export async function createAttachmentCategory(data: {
  companyId: number;
  name: string;
  isDefault: boolean;
  createdBy: number;
  erpCompanyId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { companyAttachmentCategories } = await import("../drizzle/schema");
  const result = await db.insert(companyAttachmentCategories).values({ ...data, erpCompanyId: data.erpCompanyId || 1 });
  return { id: result[0].insertId };
}

/**
 * Rename attachment category
 */
export async function renameAttachmentCategory(categoryId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { companyAttachmentCategories } = await import("../drizzle/schema");
  await db
    .update(companyAttachmentCategories)
    .set({ name })
    .where(eq(companyAttachmentCategories.id, categoryId));
  return { success: true };
}

/**
 * Delete attachment category
 */
export async function deleteAttachmentCategory(categoryId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { companyAttachmentCategories } = await import("../drizzle/schema");
  await db
    .delete(companyAttachmentCategories)
    .where(eq(companyAttachmentCategories.id, categoryId));
  return { success: true };
}

/**
 * Get attachments for a company
 */
export async function getAttachments(companyId: number, includeDeleted: boolean = false) {
  const db = await getDb();
  if (!db) return [];

  const { companyAttachments, companyAttachmentCategories, users } = await import("../drizzle/schema");
  
  const conditions = [eq(companyAttachments.companyId, companyId)];
  if (!includeDeleted) {
    conditions.push(eq(companyAttachments.isDeleted, false));
  }

  return await db
    .select({
      id: companyAttachments.id,
      companyId: companyAttachments.companyId,
      categoryId: companyAttachments.categoryId,
      categoryName: companyAttachmentCategories.name,
      fileName: companyAttachments.fileName,
      fileUrl: companyAttachments.fileUrl,
      fileKey: companyAttachments.fileKey,
      fileSize: companyAttachments.fileSize,
      mimeType: companyAttachments.mimeType,
      displayOrder: companyAttachments.displayOrder,
      isDeleted: companyAttachments.isDeleted,
      deletedBy: companyAttachments.deletedBy,
      deletedAt: companyAttachments.deletedAt,
      deletedByName: users.name,
      uploadedBy: companyAttachments.uploadedBy,
      uploadedAt: companyAttachments.uploadedAt,
    })
    .from(companyAttachments)
    .leftJoin(companyAttachmentCategories, eq(companyAttachments.categoryId, companyAttachmentCategories.id))
    .leftJoin(users, eq(companyAttachments.deletedBy, users.id))
    .where(and(...conditions)!)
    .orderBy(companyAttachments.displayOrder, companyAttachments.id);
}

/**
 * Upload attachment
 */
export async function uploadAttachment(data: {
  companyId: number;
  categoryId?: number;
  fileName: string;
  fileUrl: string;
  fileKey: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy: number;
  erpCompanyId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { companyAttachments } = await import("../drizzle/schema");
  const result = await db.insert(companyAttachments).values({ ...data, erpCompanyId: data.erpCompanyId || 1 });
  return { id: result[0].insertId };
}

/**
 * Soft delete attachment
 */
export async function softDeleteAttachment(attachmentId: number, deletedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { companyAttachments } = await import("../drizzle/schema");
  await db
    .update(companyAttachments)
    .set({
      isDeleted: true,
      deletedBy,
      deletedAt: new Date(),
    })
    .where(eq(companyAttachments.id, attachmentId));
  return { success: true };
}

/**
 * Restore attachment (admin only)
 */
export async function restoreAttachment(attachmentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { companyAttachments } = await import("../drizzle/schema");
  await db
    .update(companyAttachments)
    .set({
      isDeleted: false,
      deletedBy: null,
      deletedAt: null,
    })
    .where(eq(companyAttachments.id, attachmentId));
  return { success: true };
}

/**
 * Get customer's price history for all products
 */
export async function getCustomerPriceHistory(customerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { customerPriceHistory, products } = await import("../drizzle/schema");
  
  // Get all price history records for this customer, grouped by product
  const history = await db
    .select({
      id: customerPriceHistory.id,
      productId: customerPriceHistory.productId,
      productTitle: products.name,
      productSku: products.sku,
      productImage: products.imageUrl,
      unitPrice: customerPriceHistory.unitPrice,
      orderId: customerPriceHistory.orderId,
      createdAt: customerPriceHistory.createdAt,
    })
    .from(customerPriceHistory)
    .leftJoin(products, eq(customerPriceHistory.productId, products.id))
    .where(eq(customerPriceHistory.customerId, customerId))
    .orderBy(desc(customerPriceHistory.createdAt));

  // Group by product and get the latest price for each
  const productMap = new Map<number, {
    productId: number;
    productTitle: string | null;
    productSku: string | null;
    productImage: string | null;
    lastPrice: string;
    lastOrderId: number | null;
    lastTransactionDate: Date | null;
    priceHistory: Array<{
      id: number;
      unitPrice: string;
      orderId: number | null;
      createdAt: Date | null;
    }>;
  }>();

  for (const record of history) {
    if (!productMap.has(record.productId)) {
      productMap.set(record.productId, {
        productId: record.productId,
        productTitle: record.productTitle,
        productSku: record.productSku,
        productImage: record.productImage,
        lastPrice: record.unitPrice,
        lastOrderId: record.orderId,
        lastTransactionDate: record.createdAt,
        priceHistory: [],
      });
    }
    
    const product = productMap.get(record.productId)!;
    product.priceHistory.push({
      id: record.id,
      unitPrice: record.unitPrice,
      orderId: record.orderId,
      createdAt: record.createdAt,
    });
  }

  return Array.from(productMap.values());
}

/**
 * Company Letterhead Management
 */

export async function getCompanyLetterhead(companyId: number) {
  const db = await getDb();
  if (!db) return null;

  const { companyLetterheads } = await import("../drizzle/schema");
  
  const result = await db
    .select()
    .from(companyLetterheads)
    .where(eq(companyLetterheads.companyId, companyId))
    .limit(1);
  
  return result[0] || null;
}

export async function upsertCompanyLetterhead(
  companyId: number,
  data: {
    companyNameEn?: string;
    tradeAs?: string;
    contactPersonEn?: string;
    contactPhone?: string;
    contactEmail?: string;
    addressEn?: string;
    cityEn?: string;
    stateEn?: string;
    postalCode?: string;
    countryEn?: string;
    notes?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { companyLetterheads } = await import("../drizzle/schema");
  
  // Check if letterhead exists
  const existing = await getCompanyLetterhead(companyId);
  
  if (existing) {
    // Update existing letterhead
    await db
      .update(companyLetterheads)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(companyLetterheads.companyId, companyId));
  } else {
    // Insert new letterhead
    await db.insert(companyLetterheads).values({
      companyId,
      ...data,
    });
  }
  
  return await getCompanyLetterhead(companyId);
}


/**
 * Customer Follow-Up Progress (客户跟进进度)
 * Uses customerFollowUps table with stage tracking
 */
export async function getCustomerFollowUpProgress(customerId: number) {
  const db = await getDb();
  if (!db) return [];
  const { customerFollowUps, attributes, users } = await import("../drizzle/schema");

  const records = await db
    .select({
      id: customerFollowUps.id,
      customerId: customerFollowUps.customerId,
      content: customerFollowUps.content,
      followUpType: customerFollowUps.followUpType,
      followUpBy: customerFollowUps.followUpBy,
      currentStageId: customerFollowUps.currentStageId,
      nextPlanStageId: customerFollowUps.nextPlanStageId,
      nextPlanDate: customerFollowUps.nextPlanDate,
      quotationFiles: customerFollowUps.quotationFiles,
      quotationDate: customerFollowUps.quotationDate,
      images: customerFollowUps.images,
      createdAt: customerFollowUps.createdAt,
      updatedAt: customerFollowUps.updatedAt,
      followUpByName: users.name,
    })
    .from(customerFollowUps)
    .leftJoin(users, eq(customerFollowUps.followUpBy, users.id))
    .where(eq(customerFollowUps.customerId, customerId))
    .orderBy(desc(customerFollowUps.createdAt));

  // Fetch stage names for currentStageId and nextPlanStageId
  const stageIds = new Set<number>();
  records.forEach(r => {
    if (r.currentStageId) stageIds.add(r.currentStageId);
    if (r.nextPlanStageId) stageIds.add(r.nextPlanStageId);
  });

  let stageMap: Record<number, string> = {};
  if (stageIds.size > 0) {
    const stageList = await db
      .select({ id: attributes.id, name: attributes.name })
      .from(attributes)
      .where(sql`${attributes.id} IN (${Array.from(stageIds).join(",")})`);
    stageList.forEach(s => { stageMap[s.id] = s.name; });
  }

  return records.map(r => ({
    ...r,
    currentStageName: r.currentStageId ? (stageMap[r.currentStageId] || null) : null,
    nextPlanStageName: r.nextPlanStageId ? (stageMap[r.nextPlanStageId] || null) : null,
    quotationFilesList: r.quotationFiles ? JSON.parse(r.quotationFiles) as Array<{url: string; name: string; type: string}> : [],
    imagesList: r.images ? JSON.parse(r.images) as Array<{url: string; name: string}> : [],
  }));
}

export async function createCustomerFollowUpProgress(data: {
  customerId: number;
  erpCompanyId?: number;
  content: string;
  followUpType: "call" | "email" | "meeting" | "visit" | "other";
  followUpBy: number;
  currentStageId?: number;
  nextPlanStageId?: number;
  nextPlanDate?: Date;
  quotationFiles?: string;
  quotationDate?: Date;
  images?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { customerFollowUps } = await import("../drizzle/schema");

  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
  const result = await db.insert(customerFollowUps).values(cleanData as any);
  return result[0].insertId;
}

export async function updateCustomerFollowUpProgress(id: number, data: {
  content?: string;
  followUpType?: "call" | "email" | "meeting" | "visit" | "other";
  currentStageId?: number | null;
  nextPlanStageId?: number | null;
  nextPlanDate?: Date | null;
  quotationFiles?: string;
  quotationDate?: Date | null;
  images?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { customerFollowUps } = await import("../drizzle/schema");

  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
  if (Object.keys(cleanData).length > 0) {
    await db.update(customerFollowUps).set(cleanData as any).where(eq(customerFollowUps.id, id));
  }
}

export async function deleteCustomerFollowUpProgress(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { customerFollowUps } = await import("../drizzle/schema");
  await db.delete(customerFollowUps).where(eq(customerFollowUps.id, id));
}

export async function getLatestFollowUpTime(customerId: number): Promise<Date | null> {
  const db = await getDb();
  if (!db) return null;
  const { customerFollowUps } = await import("../drizzle/schema");

  const result = await db
    .select({ createdAt: customerFollowUps.createdAt })
    .from(customerFollowUps)
    .where(eq(customerFollowUps.customerId, customerId))
    .orderBy(desc(customerFollowUps.createdAt))
    .limit(1);

  return result[0]?.createdAt || null;
}

export async function getOverdueFollowUpCustomers(erpCompanyId: number, days: number = 30) {
  const db = await getDb();
  if (!db) return [];
  const { customerFollowUps, companies, users } = await import("../drizzle/schema");

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  // Get latest follow-up time per customer
  const latestFollowUps = await db
    .select({
      customerId: customerFollowUps.customerId,
      latestAt: sql<Date>`MAX(${customerFollowUps.createdAt})`,
    })
    .from(customerFollowUps)
    .groupBy(customerFollowUps.customerId);

  // Get customers with no follow-up or overdue follow-up, join with assignedTo user
  const allCustomers = await db
    .select({
      id: companies.id,
      companyName: companies.companyName,
      country: companies.country,
      cooperationStatus: companies.cooperationStatus,
      assignedToName: users.name,
    })
    .from(companies)
    .leftJoin(users, eq(companies.assignedTo, users.id))
    .where(eq(companies.erpCompanyId, erpCompanyId));

  const latestMap: Record<number, Date> = {};
  latestFollowUps.forEach(r => { latestMap[r.customerId] = r.latestAt; });

  return allCustomers
    .filter(c => {
      const latest = latestMap[c.id];
      return !latest || latest < cutoff;
    })
    .map(c => ({
      customerId: c.id,
      companyName: c.companyName,
      country: c.country,
      cooperationStatus: c.cooperationStatus,
      assignedToName: c.assignedToName,
      lastFollowUpAt: latestMap[c.id] || null,
      daysSinceLastFollowUp: latestMap[c.id]
        ? Math.floor((Date.now() - latestMap[c.id].getTime()) / 86400000)
        : null,
    }))
    .sort((a, b) => {
      // Sort: never followed up first, then by days desc
      if (a.lastFollowUpAt === null && b.lastFollowUpAt !== null) return -1;
      if (a.lastFollowUpAt !== null && b.lastFollowUpAt === null) return 1;
      return (b.daysSinceLastFollowUp || 0) - (a.daysSinceLastFollowUp || 0);
    });
}
