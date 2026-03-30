import { getDb } from "./db";
import { materialTypes, materialSuppliers } from "../drizzle/schema";
import { eq, and, isNull, desc, sql } from "drizzle-orm";

/**
 * List all material types for a company with supplier count
 */
export async function listMaterialTypes(erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  // Get material types with supplier count
  const types = await db
    .select({
      id: materialTypes.id,
      erpCompanyId: materialTypes.erpCompanyId,
      name: materialTypes.name,
      icon: materialTypes.icon,
      sortOrder: materialTypes.sortOrder,
      createdAt: materialTypes.createdAt,
      updatedAt: materialTypes.updatedAt,
      deletedAt: materialTypes.deletedAt,
      supplierCount: sql<number>`COUNT(DISTINCT ${materialSuppliers.id})`.as('supplierCount'),
    })
    .from(materialTypes)
    .leftJoin(
      materialSuppliers,
      and(
        eq(materialSuppliers.materialTypeId, materialTypes.id),
        eq(materialSuppliers.erpCompanyId, erpCompanyId),
        eq(materialSuppliers.status, 'active')
      )
    )
    .where(
      and(
        eq(materialTypes.erpCompanyId, erpCompanyId),
        isNull(materialTypes.deletedAt)
      )
    )
    .groupBy(materialTypes.id)
    .orderBy(materialTypes.sortOrder, materialTypes.id);
  
  return types;
}

/**
 * Get a single material type by ID
 */
export async function getMaterialTypeById(id: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const [type] = await db
    .select()
    .from(materialTypes)
    .where(
      and(
        eq(materialTypes.id, id),
        eq(materialTypes.erpCompanyId, erpCompanyId),
        isNull(materialTypes.deletedAt)
      )
    );
  return type;
}

/**
 * Create a new material type
 */
export async function createMaterialType(data: {
  erpCompanyId: number;
  name: string;
  icon?: string;
  sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const [result] = await db.insert(materialTypes).values({
    erpCompanyId: data.erpCompanyId,
    name: data.name,
    icon: data.icon,
    sortOrder: data.sortOrder ?? 0,
  });

  return getMaterialTypeById(Number(result.insertId), data.erpCompanyId);
}

/**
 * Update a material type
 */
export async function updateMaterialType(
  id: number,
  erpCompanyId: number,
  data: {
    name?: string;
    icon?: string;
    sortOrder?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db
    .update(materialTypes)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(materialTypes.id, id),
        eq(materialTypes.erpCompanyId, erpCompanyId),
        isNull(materialTypes.deletedAt)
      )
    );

  return getMaterialTypeById(id, erpCompanyId);
}

/**
 * Delete a material type (soft delete)
 */
export async function deleteMaterialType(id: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db
    .update(materialTypes)
    .set({
      deletedAt: new Date(),
    })
    .where(
      and(
        eq(materialTypes.id, id),
        eq(materialTypes.erpCompanyId, erpCompanyId)
      )
    );

  return true;
}
