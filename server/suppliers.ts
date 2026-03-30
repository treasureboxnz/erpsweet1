import { getDb } from "./db";
import { suppliers, type Supplier, type InsertSupplier } from "../drizzle/schema";
import { eq, like, or, sql, desc, and } from "drizzle-orm";

/**
 * Get all suppliers
 */
export async function getAllSuppliers(erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.erpCompanyId, erpCompanyId))
    .orderBy(desc(suppliers.createdAt));
}

/**
 * Get supplier by ID
 */
export async function getSupplierById(id: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(suppliers)
    .where(and(eq(suppliers.id, id), eq(suppliers.erpCompanyId, erpCompanyId)))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Get supplier by code
 */
export async function getSupplierByCode(supplierCode: string, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(suppliers)
    .where(and(eq(suppliers.supplierCode, supplierCode), eq(suppliers.erpCompanyId, erpCompanyId)))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Search suppliers by name or code
 */
export async function searchSuppliers(query: string, erpCompanyId: number) {
  if (!query.trim()) {
    return await getAllSuppliers(erpCompanyId);
  }
  
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(suppliers)
    .where(
      and(
        eq(suppliers.erpCompanyId, erpCompanyId),
        or(
          like(suppliers.supplierName, `%${query}%`),
          like(suppliers.supplierCode, `%${query}%`),
          like(suppliers.contactPerson, `%${query}%`)
        )
      )
    )
    .orderBy(desc(suppliers.createdAt));
}

/**
 * Create a new supplier
 */
export async function createSupplier(data: InsertSupplier & { erpCompanyId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(suppliers).values(data);
  return await getSupplierById(result[0].insertId, data.erpCompanyId);
}

/**
 * Update supplier
 */
export async function updateSupplier(id: number, erpCompanyId: number, data: Partial<InsertSupplier>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(suppliers)
    .set(data)
    .where(and(eq(suppliers.id, id), eq(suppliers.erpCompanyId, erpCompanyId)));
  return await getSupplierById(id, erpCompanyId);
}

/**
 * Delete supplier
 */
export async function deleteSupplier(id: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(suppliers)
    .where(and(eq(suppliers.id, id), eq(suppliers.erpCompanyId, erpCompanyId)));
}

/**
 * Get supplier statistics
 */
export async function getSupplierStats(erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const totalCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(suppliers)
    .where(eq(suppliers.erpCompanyId, erpCompanyId));
  
  const activeCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(suppliers)
    .where(and(
      eq(suppliers.erpCompanyId, erpCompanyId),
      eq(suppliers.status, "active")
    ));
  
  const inactiveCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(suppliers)
    .where(and(
      eq(suppliers.erpCompanyId, erpCompanyId),
      eq(suppliers.status, "inactive")
    ));
  
  return {
    total: Number(totalCount[0]?.count || 0),
    active: Number(activeCount[0]?.count || 0),
    inactive: Number(inactiveCount[0]?.count || 0),
  };
}
