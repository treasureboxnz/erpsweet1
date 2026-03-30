import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from './db';
import { supplierCategories } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Supplier Categories API', () => {
  let testCategoryId: number;

  beforeAll(async () => {
    // 清理测试数据
    const db = await getDb();
    if (db) {
      await db.delete(supplierCategories).execute();
    }
  });

  afterAll(async () => {
    // 清理测试数据
    const db = await getDb();
    if (db) {
      await db.delete(supplierCategories).execute();
    }
  });

  it('should create a root supplier category', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    await db.insert(supplierCategories).values({
      erpCompanyId: 1,
      name: '测试分类',
      description: '这是一个测试分类',
      parentId: null,
      sortOrder: 0,
      isActive: true,
    });

    // 查询验证
    const categories = await db.select().from(supplierCategories).where(eq(supplierCategories.name, '测试分类'));
    expect(categories.length).toBe(1);
    expect(categories[0].name).toBe('测试分类');
    expect(categories[0].parentId).toBeNull();
    testCategoryId = categories[0].id;
  });

  it('should create a child supplier category', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    await db.insert(supplierCategories).values({
      erpCompanyId: 1,
      name: '子分类',
      description: '这是一个子分类',
      parentId: testCategoryId,
      sortOrder: 0,
      isActive: true,
    });

    // 查询验证
    const categories = await db.select().from(supplierCategories).where(eq(supplierCategories.name, '子分类'));
    expect(categories.length).toBe(1);
    expect(categories[0].name).toBe('子分类');
    expect(categories[0].parentId).toBe(testCategoryId);
  });

  it('should list all supplier categories', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const categories = await db.select().from(supplierCategories);
    expect(categories.length).toBeGreaterThanOrEqual(2);
  });

  it('should update a supplier category', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    await db
      .update(supplierCategories)
      .set({ name: '更新后的分类' })
      .where(eq(supplierCategories.id, testCategoryId));

    // 查询验证
    const categories = await db.select().from(supplierCategories).where(eq(supplierCategories.id, testCategoryId));
    expect(categories[0].name).toBe('更新后的分类');
  });

  it('should move a category (update parentId and sortOrder)', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // 创建一个新的父分类
    await db.insert(supplierCategories).values({
      erpCompanyId: 1,
      name: '新父分类',
      description: '用于测试移动',
      parentId: null,
      sortOrder: 1,
      isActive: true,
    });

    const newParents = await db.select().from(supplierCategories).where(eq(supplierCategories.name, '新父分类'));
    const newParentId = newParents[0].id;

    // 移动子分类到新父分类下
    await db
      .update(supplierCategories)
      .set({ parentId: newParentId, sortOrder: 0 })
      .where(eq(supplierCategories.id, testCategoryId));

    // 查询验证
    const moved = await db.select().from(supplierCategories).where(eq(supplierCategories.id, testCategoryId));
    expect(moved[0].parentId).toBe(newParentId);
    expect(moved[0].sortOrder).toBe(0);
  });

  it('should delete a supplier category', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    await db
      .delete(supplierCategories)
      .where(eq(supplierCategories.id, testCategoryId));

    // 验证已删除
    const found = await db
      .select()
      .from(supplierCategories)
      .where(eq(supplierCategories.id, testCategoryId));

    expect(found.length).toBe(0);
  });
});
