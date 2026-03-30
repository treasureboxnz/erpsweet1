import { eq, and, desc, like, or, sql } from "drizzle-orm";
import { getDb } from "./db";
import { attributes, type InsertAttribute } from "../drizzle/schema";

/**
 * 获取所有属性（支持筛选）
 */
export async function getAttributes(params: {
  category?: string;
  subcategory?: string;
  fieldName?: string;
  search?: string;
  erpCompanyId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { category, subcategory, fieldName, search, erpCompanyId } = params;

  const conditions = [];
  // 租户隔离
  conditions.push(eq(attributes.erpCompanyId, erpCompanyId));
  if (category) conditions.push(eq(attributes.category, category));
  if (subcategory) conditions.push(eq(attributes.subcategory, subcategory));
  if (fieldName) conditions.push(eq(attributes.fieldName, fieldName));
  if (search) {
    conditions.push(like(attributes.name, `%${search}%`));
  }

  let query = db
    .select()
    .from(attributes)
    .orderBy(desc(attributes.createdAt));

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return await query;
}

/**
 * 按根目录分组获取属性
 */
export async function getAttributesGroupedByCategory(erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const allAttributes = await db
    .select()
    .from(attributes)
    .where(eq(attributes.erpCompanyId, erpCompanyId))
    .orderBy(attributes.category, attributes.subcategory, attributes.fieldName);

  // 按 category 分组
  const grouped: Record<string, typeof allAttributes> = {};
  
  for (const attr of allAttributes) {
    if (!grouped[attr.category]) {
      grouped[attr.category] = [];
    }
    grouped[attr.category].push(attr);
  }

  return grouped;
}

/**
 * 创建属性
 */
export async function createAttribute(data: Omit<InsertAttribute, 'erpCompanyId'>, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 检查是否已存在相同的属性（同一公司内）
  const existing = await db
    .select()
    .from(attributes)
    .where(
      and(
        eq(attributes.name, data.name),
        eq(attributes.category, data.category),
        eq(attributes.fieldName, data.fieldName),
        eq(attributes.erpCompanyId, erpCompanyId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0]; // 返回已存在的属性
  }

  const [result] = await db.insert(attributes).values({ ...data, erpCompanyId });
  
  // 返回新创建的属性
  const newAttribute = await db
    .select()
    .from(attributes)
    .where(eq(attributes.id, result.insertId))
    .limit(1);

  return newAttribute[0];
}

/**
 * 更新属性
 */
export async function updateAttribute(id: number, data: Partial<InsertAttribute>, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(attributes)
    .set(data)
    .where(
      and(
        eq(attributes.id, id),
        eq(attributes.erpCompanyId, erpCompanyId)
      )
    );

  return id;
}

/**
 * 删除属性
 */
export async function deleteAttribute(id: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(attributes).where(
    and(
      eq(attributes.id, id),
      eq(attributes.erpCompanyId, erpCompanyId)
    )
  );

  return true;
}

/**
 * 批量创建属性
 */
export async function bulkCreateAttributes(data: Array<Omit<InsertAttribute, 'erpCompanyId'>>, erpCompanyId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return [];
  const dataWithCompany = data.map(d => ({ ...d, erpCompanyId: erpCompanyId || 1 }));
  await db.insert(attributes).values(dataWithCompany);
  return true;
}
