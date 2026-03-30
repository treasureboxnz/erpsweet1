import { getDb } from "./db";
import { tags, productTagLinks, type Tag, type InsertTag } from "../drizzle/schema";
import { eq, like, and } from "drizzle-orm";

/**
 * Get all tags
 */
export async function getAllTags(erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(tags).where(eq(tags.erpCompanyId, erpCompanyId));
}

/**
 * Search tags by name
 */
export async function searchTags(query: string, erpCompanyId: number) {
  if (!query.trim()) {
    return await getAllTags(erpCompanyId);
  }
  
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(tags)
    .where(
      and(
        eq(tags.erpCompanyId, erpCompanyId),
        like(tags.name, `%${query}%`)
      )
    );
}

/**
 * Get tag by ID
 */
export async function getTagById(id: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(tags)
    .where(
      and(
        eq(tags.id, id),
        eq(tags.erpCompanyId, erpCompanyId)
      )
    )
    .limit(1);
  
  return result[0] || null;
}

/**
 * Get tag by name
 */
export async function getTagByName(name: string, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(tags)
    .where(
      and(
        eq(tags.name, name),
        eq(tags.erpCompanyId, erpCompanyId)
      )
    )
    .limit(1);
  
  return result[0] || null;
}

/**
 * Create a new tag
 */
export async function createTag(data: Omit<InsertTag, 'erpCompanyId'>, erpCompanyId: number) {
  // Check if tag with same name already exists (within company)
  const existing = await getTagByName(data.name, erpCompanyId);
  if (existing) {
    throw new Error(`标签 "${data.name}" 已存在`);
  }
  
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tags).values({ ...data, erpCompanyId });
  return await getTagById(result[0].insertId, erpCompanyId);
}

/**
 * Update tag
 */
export async function updateTag(id: number, data: Partial<InsertTag>, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tags).set(data).where(
    and(
      eq(tags.id, id),
      eq(tags.erpCompanyId, erpCompanyId)
    )
  );
  return await getTagById(id, erpCompanyId);
}

/**
 * Delete tag
 */
export async function deleteTag(id: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(tags).where(
    and(
      eq(tags.id, id),
      eq(tags.erpCompanyId, erpCompanyId)
    )
  );
}

/**
 * Get tags for a product
 */
export async function getProductTags(productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const links = await db
    .select({
      tag: tags,
    })
    .from(productTagLinks)
    .innerJoin(tags, eq(productTagLinks.tagId, tags.id))
    .where(eq(productTagLinks.productId, productId));
  
  return links.map((link: any) => link.tag);
}

/**
 * Link a product to a tag
 */
export async function linkProductToTag(productId: number, tagId: number, erpCompanyId: number = 1) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(productTagLinks).values({
    erpCompanyId,
    productId,
    tagId,
  });
}

/**
 * Unlink a product from a tag
 */
export async function unlinkProductFromTag(productId: number, tagId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(productTagLinks)
    .where(
      eq(productTagLinks.productId, productId) &&
      eq(productTagLinks.tagId, tagId)
    );
}

/**
 * Set product tags (replace all existing)
 */
export async function setProductTags(productId: number, tagIds: number[], erpCompanyId: number = 1) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete all existing links
  await db.delete(productTagLinks).where(eq(productTagLinks.productId, productId));
  
  // Create new links
  if (tagIds.length > 0) {
    await db.insert(productTagLinks).values(
      tagIds.map(tagId => ({
        erpCompanyId,
        productId,
        tagId,
      }))
    );
  }
}
