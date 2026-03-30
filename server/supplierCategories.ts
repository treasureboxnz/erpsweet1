import { eq, isNull, and, sql } from "drizzle-orm";
import { getDb } from "./db";
import { supplierCategories } from "../drizzle/schema";

/**
 * Get all supplier categories with supplier count
 */
export async function getAllSupplierCategories(erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const categories = await db
    .select({
      id: supplierCategories.id,
      name: supplierCategories.name,
      description: supplierCategories.description,
      parentId: supplierCategories.parentId,
      sortOrder: supplierCategories.sortOrder,
      isActive: supplierCategories.isActive,
      createdAt: supplierCategories.createdAt,
      updatedAt: supplierCategories.updatedAt,
    })
    .from(supplierCategories)
    .where(eq(supplierCategories.erpCompanyId, erpCompanyId))
    .orderBy(supplierCategories.sortOrder);
  
  return categories;
}

/**
 * Get supplier category by ID
 */
export async function getSupplierCategoryById(id: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [category] = await db
    .select()
    .from(supplierCategories)
    .where(
      and(
        eq(supplierCategories.id, id),
        eq(supplierCategories.erpCompanyId, erpCompanyId)
      )
    )
    .limit(1);
  
  return category;
}

/**
 * Create a new supplier category
 */
export async function createSupplierCategory(data: {
  name: string;
  description?: string;
  parentId?: number;
}, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get the max sortOrder for the same parent (within company)
  const [maxOrder] = await db
    .select({ maxOrder: sql<number>`COALESCE(MAX(${supplierCategories.sortOrder}), 0)` })
    .from(supplierCategories)
    .where(
      and(
        eq(supplierCategories.erpCompanyId, erpCompanyId),
        data.parentId
          ? eq(supplierCategories.parentId, data.parentId)
          : isNull(supplierCategories.parentId)
      )
    );
  
  const [newCategory] = await db
    .insert(supplierCategories)
    .values({
      name: data.name,
      description: data.description,
      parentId: data.parentId,
      sortOrder: (maxOrder?.maxOrder || 0) + 1,
      isActive: true,
      erpCompanyId,
    })
    .$returningId();
  
  return newCategory;
}

/**
 * Update supplier category
 */
export async function updateSupplierCategory(
  id: number,
  data: {
    name?: string;
    description?: string;
    isActive?: boolean;
  },
  erpCompanyId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(supplierCategories)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(supplierCategories.id, id),
        eq(supplierCategories.erpCompanyId, erpCompanyId)
      )
    );
  
  return { success: true };
}

/**
 * Delete supplier category
 */
export async function deleteSupplierCategory(id: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if category has children (within company)
  const children = await db
    .select()
    .from(supplierCategories)
    .where(
      and(
        eq(supplierCategories.parentId, id),
        eq(supplierCategories.erpCompanyId, erpCompanyId)
      )
    )
    .limit(1);
  
  if (children.length > 0) {
    throw new Error("Cannot delete category with subcategories");
  }
  
  await db
    .delete(supplierCategories)
    .where(
      and(
        eq(supplierCategories.id, id),
        eq(supplierCategories.erpCompanyId, erpCompanyId)
      )
    );
  
  return { success: true };
}

/**
 * Move supplier category to a new parent or reorder
 */
export async function moveSupplierCategory(
  categoryId: number,
  newParentId: number | null,
  newSortOrder: number,
  erpCompanyId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if moving to own descendant (prevent circular reference)
  if (newParentId) {
    const descendants = await getDescendantIds(categoryId, erpCompanyId);
    if (descendants.includes(newParentId)) {
      throw new Error("Cannot move category to its own descendant");
    }
  }
  
  // Update the category
  await db
    .update(supplierCategories)
    .set({
      parentId: newParentId,
      sortOrder: newSortOrder,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(supplierCategories.id, categoryId),
        eq(supplierCategories.erpCompanyId, erpCompanyId)
      )
    );
  
  // Reorder siblings
  const siblings = await db
    .select()
    .from(supplierCategories)
    .where(
      and(
        newParentId
          ? eq(supplierCategories.parentId, newParentId)
          : isNull(supplierCategories.parentId),
        sql`${supplierCategories.id} != ${categoryId}`
      )
    )
    .orderBy(supplierCategories.sortOrder);
  
  let order = 1;
  for (const sibling of siblings) {
    if (order === newSortOrder) {
      order++;
    }
    if (sibling.sortOrder !== order) {
      await db
        .update(supplierCategories)
        .set({ sortOrder: order })
        .where(eq(supplierCategories.id, sibling.id));
    }
    order++;
  }
  
  return { success: true };
}

/**
 * Get all descendant IDs of a category (recursive)
 */
async function getDescendantIds(categoryId: number, erpCompanyId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const children = await db
    .select({ id: supplierCategories.id })
    .from(supplierCategories)
    .where(
      and(
        eq(supplierCategories.parentId, categoryId),
        eq(supplierCategories.erpCompanyId, erpCompanyId)
      )
    );
  
  let descendants: number[] = children.map((c) => c.id);
  
  for (const child of children) {
    const childDescendants = await getDescendantIds(child.id, erpCompanyId);
    descendants = [...descendants, ...childDescendants];
  }
  
  return descendants;
}
