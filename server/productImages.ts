import { getDb } from "./db";
import { productImages, type InsertProductImage } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * 获取产品的所有图片（按排序顺序）
 */
export async function getProductImages(productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(productImages.sortOrder);
}

/**
 * 添加图片到产品
 */
export async function addProductImage(data: InsertProductImage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [image] = await db.insert(productImages).values(data);
  return image;
}

/**
 * 批量添加图片到产品
 */
export async function addProductImages(images: InsertProductImage[]) {
  if (images.length === 0) return [];
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(productImages).values(images);
  return images;
}

/**
 * 更新产品图片排序
 */
export async function updateProductImageOrder(
  productId: number,
  imageOrders: { id: number; sortOrder: number; isPrimary: boolean }[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // 使用事务更新所有图片的排序
  for (const order of imageOrders) {
    await db
      .update(productImages)
      .set({
        sortOrder: order.sortOrder,
        isPrimary: order.isPrimary,
      })
      .where(
        and(
          eq(productImages.id, order.id),
          eq(productImages.productId, productId)
        )
      );
  }
  
  return await getProductImages(productId);
}

/**
 * 删除产品图片
 */
export async function deleteProductImage(productId: number, imageId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(productImages)
    .where(
      and(
        eq(productImages.id, imageId),
        eq(productImages.productId, productId)
      )
    );
  return true;
}

/**
 * 删除产品的所有图片
 */
export async function deleteAllProductImages(productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(productImages)
    .where(eq(productImages.productId, productId));
  return true;
}

/**
 * 设置主图
 */
export async function setPrimaryImage(productId: number, imageId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 获取指定图片的URL
  const [targetImage] = await db
    .select()
    .from(productImages)
    .where(
      and(
        eq(productImages.id, imageId),
        eq(productImages.productId, productId)
      )
    )
    .limit(1);
  
  if (!targetImage) {
    throw new Error("图片不存在");
  }
  
  // 先将所有图片的isPrimary设为false
  await db
    .update(productImages)
    .set({ isPrimary: false })
    .where(eq(productImages.productId, productId));
  
  // 再将指定图片的isPrimary设为true
  await db
    .update(productImages)
    .set({ isPrimary: true })
    .where(
      and(
        eq(productImages.id, imageId),
        eq(productImages.productId, productId)
      )
    );
  
  // 同步更新products表中的imageUrl字段
  const { products } = await import("../drizzle/schema");
  await db
    .update(products)
    .set({ imageUrl: targetImage.imageUrl })
    .where(eq(products.id, productId));
  
  return await getProductImages(productId);
}
