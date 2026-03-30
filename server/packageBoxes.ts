import { getDb } from "./db";
import { packageBoxes } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * 查询批次的所有外箱
 */
export async function getBoxesByVariantId(variantId: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const boxes = await db
    .select()
    .from(packageBoxes)
    .where(
      and(
        eq(packageBoxes.variantId, variantId),
        eq(packageBoxes.erpCompanyId, erpCompanyId)
      )
    )
    .orderBy(packageBoxes.sortOrder);
  
  return boxes;
}

/**
 * 添加新外箱
 * 注意：尺寸单位统一为 m，CBM = l × w × h（m³）
 */
export async function addBox(data: {
  variantId: number;
  erpCompanyId: number;
  length: number;
  width: number;
  height: number;
  cbm?: number; // 可选：手动输入的CBM值
  grossWeight?: number;
  netWeight?: number;
  packagingType?: string; // 包装类型：single/multi_box/multi_per_box
  piecesPerBox?: number;  // 每箱件数
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 如果传入了cbm参数，则使用传入的值；否则根据长宽高计算（单位：米，直接相乘得 m³）
  const cbm = data.cbm !== undefined 
    ? data.cbm 
    : (data.length * data.width * data.height);
  
  // 获取当前批次的外箱数量，确定新外箱的编号
  const existingBoxes = await getBoxesByVariantId(data.variantId, data.erpCompanyId);
  const boxNumber = existingBoxes.length + 1;
  const sortOrder = existingBoxes.length;
  
  await db.insert(packageBoxes).values({
    variantId: data.variantId,
    erpCompanyId: data.erpCompanyId,
    boxNumber,
    length: data.length.toString(),
    width: data.width.toString(),
    height: data.height.toString(),
    cbm: cbm.toFixed(6),
    grossWeight: data.grossWeight?.toString() || "0",
    netWeight: data.netWeight?.toString() || "0",
    packagingType: (data.packagingType as any) || "single",
    piecesPerBox: data.piecesPerBox ?? 1,
    sortOrder,
  });
  
  // 查询刚创建的外箱
  const boxes = await getBoxesByVariantId(data.variantId, data.erpCompanyId);
  return boxes[boxes.length - 1];
}

/**
 * 更新外箱尺寸
 * 注意：尺寸单位统一为 m，CBM = l × w × h（m³）
 * 手动CBM模式：传入 cbm 参数，length/width/height 传 0（仅灰色显示，不参与计算）
 */
export async function updateBox(
  boxId: number,
  erpCompanyId: number,
  data: {
    length?: number;
    width?: number;
    height?: number;
    cbm?: number; // 手动CBM模式下直接传入，不重新计算
    grossWeight?: number;
    netWeight?: number;
    packagingType?: string;
    piecesPerBox?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = { updatedAt: new Date() };
  
  if (data.cbm !== undefined) {
    // 手动CBM模式：直接写入cbm值，长宽高仅作参考显示（不参与计算）
    updateData.cbm = data.cbm.toFixed(6);
    if (data.length !== undefined) updateData.length = data.length.toString();
    if (data.width !== undefined) updateData.width = data.width.toString();
    if (data.height !== undefined) updateData.height = data.height.toString();
  } else if (data.length !== undefined && data.width !== undefined && data.height !== undefined) {
    // 自动计算模式：根据长宽高计算CBM
    const cbm = data.length * data.width * data.height;
    updateData.length = data.length.toString();
    updateData.width = data.width.toString();
    updateData.height = data.height.toString();
    updateData.cbm = cbm.toFixed(6);
  } else {
    if (data.length !== undefined) updateData.length = data.length.toString();
    if (data.width !== undefined) updateData.width = data.width.toString();
    if (data.height !== undefined) updateData.height = data.height.toString();
  }
  
  if (data.grossWeight !== undefined) updateData.grossWeight = data.grossWeight.toString();
  if (data.netWeight !== undefined) updateData.netWeight = data.netWeight.toString();
  if (data.packagingType !== undefined) updateData.packagingType = data.packagingType;
  if (data.piecesPerBox !== undefined) updateData.piecesPerBox = data.piecesPerBox;
  
  await db
    .update(packageBoxes)
    .set(updateData)
    .where(
      and(
        eq(packageBoxes.id, boxId),
        eq(packageBoxes.erpCompanyId, erpCompanyId)
      )
    );
  
  // 查询更新后的外箱
  const [updatedBox] = await db
    .select()
    .from(packageBoxes)
    .where(eq(packageBoxes.id, boxId))
    .limit(1);
  
  return updatedBox;
}

/**
 * 删除外箱
 */
export async function deleteBox(boxId: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 检查是否是最后一个外箱
  const box = await db
    .select()
    .from(packageBoxes)
    .where(
      and(
        eq(packageBoxes.id, boxId),
        eq(packageBoxes.erpCompanyId, erpCompanyId)
      )
    )
    .limit(1);
  
  if (box.length === 0) {
    throw new Error("外箱不存在");
  }
  
  const variantId = box[0].variantId;
  const allBoxes = await getBoxesByVariantId(variantId, erpCompanyId);
  
  if (allBoxes.length <= 1) {
    throw new Error("至少需要保留一个外箱");
  }
  
  // 删除外箱
  await db
    .delete(packageBoxes)
    .where(
      and(
        eq(packageBoxes.id, boxId),
        eq(packageBoxes.erpCompanyId, erpCompanyId)
      )
    );
  
  // 重新编号剩余外箱
  const remainingBoxes = await getBoxesByVariantId(variantId, erpCompanyId);
  for (let i = 0; i < remainingBoxes.length; i++) {
    await db
      .update(packageBoxes)
      .set({
        boxNumber: i + 1,
        sortOrder: i,
      })
      .where(eq(packageBoxes.id, remainingBoxes[i].id));
  }
  
  return true;
}

/**
 * 计算批次的总CBM
 */
export async function calculateTotalCBM(variantId: number, erpCompanyId: number) {
  const boxes = await getBoxesByVariantId(variantId, erpCompanyId);
  
  const totalCBM = boxes.reduce((sum: number, box: any) => {
    return sum + parseFloat(box.cbm);
  }, 0);
  
  return totalCBM;
}

/**
 * 计算批次的总重量（总毛重和总净重）
 */
export async function calculateTotalWeight(variantId: number, erpCompanyId: number) {
  const boxes = await getBoxesByVariantId(variantId, erpCompanyId);
  
  const totalGrossWeight = boxes.reduce((sum: number, box: any) => {
    return sum + parseFloat(box.grossWeight || "0");
  }, 0);
  
  const totalNetWeight = boxes.reduce((sum: number, box: any) => {
    return sum + parseFloat(box.netWeight || "0");
  }, 0);
  
  return {
    totalGrossWeight,
    totalNetWeight,
  };
}
