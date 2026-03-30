import { getDb } from "./db";
import { productCategories, products, productCategoryLinks, type ProductCategory, type InsertProductCategory } from "../drizzle/schema";
import { eq, like, or, sql, isNull, and } from "drizzle-orm";

/**
 * List all categories with product count
 */
export async function listCategoriesWithCount(erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get all categories for this company
  const allCategories = await db
    .select()
    .from(productCategories)
    .where(eq(productCategories.erpCompanyId, erpCompanyId));
  
  // Get product counts for each category
  const categoriesWithCount = await Promise.all(
    allCategories.map(async (category) => {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(
          and(
            eq(products.categoryId, category.id),
            eq(products.erpCompanyId, erpCompanyId)
          )
        );
      
      return {
        ...category,
        productCount: Number(count[0]?.count || 0),
      };
    })
  );
  
  return categoriesWithCount;
}

/**
 * Get all categories
 */
export async function getAllCategories(erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(productCategories)
    .where(eq(productCategories.erpCompanyId, erpCompanyId));
}

/**
 * Search categories by name
 */
export async function searchCategories(query: string, erpCompanyId: number) {
  if (!query.trim()) {
    return await getAllCategories(erpCompanyId);
  }
  
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(productCategories)
    .where(
      and(
        like(productCategories.name, `%${query}%`),
        eq(productCategories.erpCompanyId, erpCompanyId)
      )
    );
}

/**
 * Get category by ID
 */
export async function getCategoryById(id: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(productCategories)
    .where(
      and(
        eq(productCategories.id, id),
        eq(productCategories.erpCompanyId, erpCompanyId)
      )
    )
    .limit(1);
  
  return result[0] || null;
}

/**
 * Get category by name
 */
export async function getCategoryByName(name: string, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(productCategories)
    .where(
      and(
        eq(productCategories.name, name),
        eq(productCategories.erpCompanyId, erpCompanyId)
      )
    )
    .limit(1);
  
  return result[0] || null;
}

/**
 * Create a new category
 */
export async function createCategory(data: Omit<InsertProductCategory, 'erpCompanyId'>, erpCompanyId: number) {
  // Check if category with same name already exists in this company
  const existing = await getCategoryByName(data.name, erpCompanyId);
  if (existing) {
    throw new Error(`类目 "${data.name}" 已存在`);
  }
  
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(productCategories).values({
    ...data,
    erpCompanyId,
  });
  return await getCategoryById(result[0].insertId, erpCompanyId);
}

/**
 * Update category
 */
export async function updateCategory(id: number, data: Partial<InsertProductCategory>, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(productCategories)
    .set(data)
    .where(
      and(
        eq(productCategories.id, id),
        eq(productCategories.erpCompanyId, erpCompanyId)
      )
    );
  return await getCategoryById(id, erpCompanyId);
}

/**
 * Delete category
 */
export async function deleteCategory(id: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(productCategories)
    .where(
      and(
        eq(productCategories.id, id),
        eq(productCategories.erpCompanyId, erpCompanyId)
      )
    );
}

/**
 * Get categories for a product
 */
export async function getProductCategories(productId: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const links = await db
    .select({
      category: productCategories,
    })
    .from(productCategoryLinks)
    .innerJoin(productCategories, eq(productCategoryLinks.categoryId, productCategories.id))
    .where(
      and(
        eq(productCategoryLinks.productId, productId),
        eq(productCategories.erpCompanyId, erpCompanyId)
      )
    );
  
  return links.map((link: any) => link.category);
}

/**
 * Link a product to a category
 */
export async function linkProductToCategory(productId: number, categoryId: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verify category belongs to the same company
  const category = await getCategoryById(categoryId, erpCompanyId);
  if (!category) {
    throw new Error("类目不存在或不属于当前公司");
  }
  
  await db.insert(productCategoryLinks).values({
    productId,
    categoryId,
    erpCompanyId,
  });
}

/**
 * Unlink a product from a category
 */
export async function unlinkProductFromCategory(productId: number, categoryId: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verify category belongs to the same company
  const category = await getCategoryById(categoryId, erpCompanyId);
  if (!category) {
    throw new Error("类目不存在或不属于当前公司");
  }
  
  await db
    .delete(productCategoryLinks)
    .where(
      and(
        eq(productCategoryLinks.productId, productId),
        eq(productCategoryLinks.categoryId, categoryId)
      )
    );
}

/**
 * Set product categories (replace all existing)
 */
export async function setProductCategories(productId: number, categoryIds: number[], erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verify all categories belong to the same company
  for (const categoryId of categoryIds) {
    const category = await getCategoryById(categoryId, erpCompanyId);
    if (!category) {
      throw new Error(`类目 ${categoryId} 不存在或不属于当前公司`);
    }
  }
  
  // Delete all existing links
  await db.delete(productCategoryLinks).where(eq(productCategoryLinks.productId, productId));
  
  // Create new links
  if (categoryIds.length > 0) {
    await db.insert(productCategoryLinks).values(
      categoryIds.map(categoryId => ({
        productId,
        categoryId,
        erpCompanyId,
      }))
    );
  }
}

/**
 * Move category to a new parent or reorder
 */
export async function moveCategory(
  categoryId: number,
  newParentId: number | null,
  newSortOrder: number,
  erpCompanyId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get the category to move
  const category = await getCategoryById(categoryId, erpCompanyId);
  if (!category) {
    throw new Error("类目不存在");
  }
  
  // Validate: cannot move a category to be a child of itself or its descendants
  if (newParentId !== null) {
    const newParent = await getCategoryById(newParentId, erpCompanyId);
    if (!newParent) {
      throw new Error("目标父类目不存在");
    }
    
    const isDescendant = await isDescendantOf(categoryId, newParentId, erpCompanyId);
    if (categoryId === newParentId || isDescendant) {
      throw new Error("不能将类目移动到自己或其子类目下");
    }
  }
  
  // Update the category
  await db
    .update(productCategories)
    .set({
      parentId: newParentId,
      sortOrder: newSortOrder,
    })
    .where(
      and(
        eq(productCategories.id, categoryId),
        eq(productCategories.erpCompanyId, erpCompanyId)
      )
    );
  
  return await getCategoryById(categoryId, erpCompanyId);
}

/**
 * Check if targetId is a descendant of categoryId
 */
async function isDescendantOf(categoryId: number, targetId: number, erpCompanyId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const target = await getCategoryById(targetId, erpCompanyId);
  if (!target) return false;
  
  // If target has no parent, it's not a descendant
  if (target.parentId === null) return false;
  
  // If target's parent is the category, it's a direct child (descendant)
  if (target.parentId === categoryId) return true;
  
  // Recursively check if target's parent is a descendant
  return await isDescendantOf(categoryId, target.parentId, erpCompanyId);
}
