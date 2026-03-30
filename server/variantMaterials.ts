import { eq, desc, asc } from "drizzle-orm";
import { getDb } from "./db";
import { variantMaterials, materialColors, materialBoards, materialSuppliers } from "../drizzle/schema";

/**
 * 获取批次的所有材料（按sortOrder排序）
 * @param variantId 批次ID
 * @param limit 可选：限制返回数量（用于订单显示前3个）
 */
export async function getVariantMaterials(variantId: number, limit?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let query = db
    .select({
      id: variantMaterials.id,
      variantId: variantMaterials.variantId,
      materialColorId: variantMaterials.materialColorId,
      sortOrder: variantMaterials.sortOrder,
      materialType: variantMaterials.materialType,
      createdAt: variantMaterials.createdAt,
      // 关联材料颜色信息
      color: materialColors,
      // 关联布板信息
      board: materialBoards,
      // 关联供应商信息
      supplier: materialSuppliers,
    })
    .from(variantMaterials)
    .leftJoin(
      materialColors,
      eq(variantMaterials.materialColorId, materialColors.id)
    )
    .leftJoin(
      materialBoards,
      eq(materialColors.boardId, materialBoards.id)
    )
    .leftJoin(
      materialSuppliers,
      eq(materialBoards.supplierId, materialSuppliers.id)
    )
    .where(eq(variantMaterials.variantId, variantId))
    .orderBy(asc(variantMaterials.sortOrder));

  if (limit) {
    query = query.limit(limit) as any;
  }

  return await query;
}

/**
 * 添加材料到批次
 */
export async function addVariantMaterial(data: {
  variantId: number;
  materialColorId: number;
  materialType: string;
  sortOrder?: number;
  erpCompanyId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 如果没有指定sortOrder，自动计算为最大值+1
  if (data.sortOrder === undefined) {
    const existing = await db
      .select({ sortOrder: variantMaterials.sortOrder })
      .from(variantMaterials)
      .where(eq(variantMaterials.variantId, data.variantId))
      .orderBy(desc(variantMaterials.sortOrder))
      .limit(1);

    data.sortOrder = existing.length > 0 ? (existing[0].sortOrder || 0) + 1 : 0;
  }

  const [result] = await db.insert(variantMaterials).values({ ...data, erpCompanyId: data.erpCompanyId || 1 });
  return result;
}

/**
 * 更新材料信息
 */
export async function updateVariantMaterial(
  id: number,
  data: {
    materialColorId?: number;
    materialType?: string;
    sortOrder?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(variantMaterials).set(data).where(eq(variantMaterials.id, id));
}

/**
 * 删除材料
 * 注意：sortOrder=0的默认颜色材料不可删除
 */
export async function deleteVariantMaterial(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 检查是否为默认颜色材料（sortOrder=0）
  const [material] = await db
    .select()
    .from(variantMaterials)
    .where(eq(variantMaterials.id, id));

  if (!material) {
    throw new Error("Material not found");
  }

  if (material.sortOrder === 0) {
    throw new Error("默认颜色材料不可删除，但可以编辑更换为其他颜色");
  }

  await db.delete(variantMaterials).where(eq(variantMaterials.id, id));
}

/**
 * 调整材料顺序
 * @param id 材料ID
 * @param direction 'up' 或 'down'
 */
export async function reorderVariantMaterial(
  id: number,
  direction: "up" | "down"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 获取当前材料
  const [current] = await db
    .select()
    .from(variantMaterials)
    .where(eq(variantMaterials.id, id));

  if (!current) {
    throw new Error("Material not found");
  }

  // 获取同一批次的所有材料
  const allMaterials = await db
    .select()
    .from(variantMaterials)
    .where(eq(variantMaterials.variantId, current.variantId))
    .orderBy(asc(variantMaterials.sortOrder));

  const currentIndex = allMaterials.findIndex((m) => m.id === id);

  if (currentIndex === -1) {
    throw new Error("Material not found in list");
  }

  // 计算目标位置
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= allMaterials.length) {
    // 已经在边界，无法移动
    return;
  }

  // 交换sortOrder
  const target = allMaterials[targetIndex];
  const currentOrder = current.sortOrder || 0;
  const targetOrder = target.sortOrder || 0;

  await db
    .update(variantMaterials)
    .set({ sortOrder: targetOrder })
    .where(eq(variantMaterials.id, current.id));

  await db
    .update(variantMaterials)
    .set({ sortOrder: currentOrder })
    .where(eq(variantMaterials.id, target.id));
}

/**
 * 批量设置批次材料（用于批次创建/编辑）
 * @param variantId 批次ID
 * @param materials 材料列表
 */
export async function setVariantMaterials(
  variantId: number,
  materials: Array<{
    materialColorId: number;
    materialType: string;
    sortOrder: number;
  }>,
  erpCompanyId: number = 1
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 删除现有材料
  await db.delete(variantMaterials).where(eq(variantMaterials.variantId, variantId));

  // 批量插入新材料
  if (materials.length > 0) {
    await db.insert(variantMaterials).values(
      materials.map((m: { materialColorId: number; materialType: string; sortOrder: number }) => ({
        erpCompanyId,
        variantId,
        materialColorId: m.materialColorId,
        materialType: m.materialType,
        sortOrder: m.sortOrder,
      }))
    );
  }
}
