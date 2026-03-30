import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./db";
import {
  companyBankAccounts,
  supplierBankAccounts,
  type InsertCompanyBankAccount,
  type InsertSupplierBankAccount,
} from "../drizzle/schema";

/**
 * Company Bank Accounts Operations
 */

export async function getCompanyBankAccounts(erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(companyBankAccounts)
    .where(eq(companyBankAccounts.erpCompanyId, erpCompanyId))
    .orderBy(desc(companyBankAccounts.sortOrder), desc(companyBankAccounts.isDefault));
}

export async function getCompanyBankAccountById(id: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [account] = await db
    .select()
    .from(companyBankAccounts)
    .where(
      and(
        eq(companyBankAccounts.id, id),
        eq(companyBankAccounts.erpCompanyId, erpCompanyId)
      )
    );
  return account;
}

export async function createCompanyBankAccount(data: InsertCompanyBankAccount) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // If this is set as default, unset other defaults for the same currency
  if (data.isDefault) {
    await db
      .update(companyBankAccounts)
      .set({ isDefault: false })
      .where(
        and(
          eq(companyBankAccounts.erpCompanyId, data.erpCompanyId),
          eq(companyBankAccounts.currency, data.currency)
        )
      );
  }

  const [result] = await db.insert(companyBankAccounts).values(data);
  return result.insertId;
}

export async function updateCompanyBankAccount(
  id: number,
  erpCompanyId: number,
  data: Partial<InsertCompanyBankAccount>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // If this is set as default, unset other defaults for the same currency
  if (data.isDefault && data.currency) {
    await db
      .update(companyBankAccounts)
      .set({ isDefault: false })
      .where(
        and(
          eq(companyBankAccounts.erpCompanyId, erpCompanyId),
          eq(companyBankAccounts.currency, data.currency),
          eq(companyBankAccounts.id, id) // Don't unset the current one
        )
      );
  }

  await db
    .update(companyBankAccounts)
    .set(data)
    .where(
      and(
        eq(companyBankAccounts.id, id),
        eq(companyBankAccounts.erpCompanyId, erpCompanyId)
      )
    );
}

export async function deleteCompanyBankAccount(id: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(companyBankAccounts)
    .where(
      and(
        eq(companyBankAccounts.id, id),
        eq(companyBankAccounts.erpCompanyId, erpCompanyId)
      )
    );
}

/**
 * Supplier Bank Accounts Operations
 */

export async function getSupplierBankAccounts(supplierId: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(supplierBankAccounts)
    .where(
      and(
        eq(supplierBankAccounts.supplierId, supplierId),
        eq(supplierBankAccounts.erpCompanyId, erpCompanyId)
      )
    )
    .orderBy(desc(supplierBankAccounts.sortOrder), desc(supplierBankAccounts.isDefault));
}

export async function getSupplierBankAccountById(id: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [account] = await db
    .select()
    .from(supplierBankAccounts)
    .where(
      and(
        eq(supplierBankAccounts.id, id),
        eq(supplierBankAccounts.erpCompanyId, erpCompanyId)
      )
    );
  return account;
}

export async function createSupplierBankAccount(data: InsertSupplierBankAccount) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // If this is set as default, unset other defaults for the same currency
  if (data.isDefault) {
    await db
      .update(supplierBankAccounts)
      .set({ isDefault: false })
      .where(
        and(
          eq(supplierBankAccounts.supplierId, data.supplierId),
          eq(supplierBankAccounts.currency, data.currency)
        )
      );
  }

  const [result] = await db.insert(supplierBankAccounts).values(data);
  return result.insertId;
}

export async function updateSupplierBankAccount(
  id: number,
  erpCompanyId: number,
  data: Partial<InsertSupplierBankAccount>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // If this is set as default, unset other defaults for the same currency
  if (data.isDefault && data.currency) {
    const account = await getSupplierBankAccountById(id, erpCompanyId);
    if (account) {
      await db
        .update(supplierBankAccounts)
        .set({ isDefault: false })
        .where(
          and(
            eq(supplierBankAccounts.supplierId, account.supplierId),
            eq(supplierBankAccounts.currency, data.currency)
          )
        );
    }
  }

  await db
    .update(supplierBankAccounts)
    .set(data)
    .where(
      and(
        eq(supplierBankAccounts.id, id),
        eq(supplierBankAccounts.erpCompanyId, erpCompanyId)
      )
    );
}

export async function deleteSupplierBankAccount(id: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(supplierBankAccounts)
    .where(
      and(
        eq(supplierBankAccounts.id, id),
        eq(supplierBankAccounts.erpCompanyId, erpCompanyId)
      )
    );
}
