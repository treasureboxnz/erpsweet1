/**
 * ERP Company ID filtering utilities
 * 
 * These utilities help ensure data isolation between different ERP companies (tenants)
 */

import { SQL, and, eq } from "drizzle-orm";

/**
 * Add erpCompanyId filter to existing conditions
 * 
 * @param conditions - Existing query conditions (can be undefined)
 * @param table - The table object from Drizzle schema
 * @param erpCompanyId - The ERP company ID to filter by
 * @returns Combined conditions with erpCompanyId filter
 */
export function withErpCompanyId<T extends { erpCompanyId: any }>(
  conditions: SQL | undefined,
  table: T,
  erpCompanyId: number
): SQL {
  const erpFilter = eq(table.erpCompanyId, erpCompanyId);
  
  if (conditions) {
    return and(conditions, erpFilter)!;
  }
  
  return erpFilter;
}

/**
 * Add erpCompanyId to insert data
 * 
 * @param data - The data to insert
 * @param erpCompanyId - The ERP company ID to add
 * @returns Data with erpCompanyId added
 */
export function addErpCompanyId<T extends Record<string, any>>(
  data: T,
  erpCompanyId: number
): T & { erpCompanyId: number } {
  return {
    ...data,
    erpCompanyId,
  };
}
