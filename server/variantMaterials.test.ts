import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import {
  getVariantMaterials,
  addVariantMaterial,
  updateVariantMaterial,
  deleteVariantMaterial,
  reorderVariantMaterial,
  setVariantMaterials,
} from "./variantMaterials";
import { productVariants, variantMaterials, materialColors } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Variant Materials Management", () => {
  let testVariantId: number;
  let testMaterialColorId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 查找一个测试批次（假设数据库中已有批次）
    const variants = await db.select().from(productVariants).limit(1);
    if (variants.length === 0) {
      throw new Error("No test variant found in database");
    }
    testVariantId = variants[0].id;

    // 查找一个测试材料颜色
    const colors = await db.select().from(materialColors).limit(1);
    if (colors.length === 0) {
      throw new Error("No test material color found in database");
    }
    testMaterialColorId = colors[0].id;

    // 清理测试数据
    await db.delete(variantMaterials).where(eq(variantMaterials.variantId, testVariantId));
  });

  it("should add material to variant", async () => {
    const result = await addVariantMaterial({
      variantId: testVariantId,
      materialColorId: testMaterialColorId,
      materialType: "fabric",
      sortOrder: 0,
    });

    expect(result).toBeDefined();
    expect(result.insertId).toBeGreaterThan(0);
  });

  it("should get variant materials sorted by sortOrder", async () => {
    // 添加多个材料
    await addVariantMaterial({
      variantId: testVariantId,
      materialColorId: testMaterialColorId,
      materialType: "leg",
      sortOrder: 1,
    });

    await addVariantMaterial({
      variantId: testVariantId,
      materialColorId: testMaterialColorId,
      materialType: "armrest",
      sortOrder: 2,
    });

    const materials = await getVariantMaterials(testVariantId);
    expect(materials.length).toBeGreaterThanOrEqual(3);
    expect(materials[0].sortOrder).toBe(0);
    expect(materials[1].sortOrder).toBe(1);
    expect(materials[2].sortOrder).toBe(2);
  });

  it("should limit materials when limit parameter is provided", async () => {
    const materials = await getVariantMaterials(testVariantId, 2);
    expect(materials.length).toBeLessThanOrEqual(2);
  });

  it("should update material info", async () => {
    const materials = await getVariantMaterials(testVariantId);
    const firstMaterial = materials[0];

    await updateVariantMaterial(firstMaterial.id, {
      materialType: "fabric_updated",
    });

    const updated = await getVariantMaterials(testVariantId);
    const updatedMaterial = updated.find((m) => m.id === firstMaterial.id);
    expect(updatedMaterial?.materialType).toBe("fabric_updated");
  });

  it("should reorder materials", async () => {
    const materials = await getVariantMaterials(testVariantId);
    const secondMaterial = materials[1];
    const originalOrder = secondMaterial.sortOrder;

    // 向上移动
    await reorderVariantMaterial(secondMaterial.id, "up");

    const reordered = await getVariantMaterials(testVariantId);
    const movedMaterial = reordered.find((m) => m.id === secondMaterial.id);
    expect(movedMaterial?.sortOrder).toBeLessThan(originalOrder || 0);
  });

  it("should batch set materials", async () => {
    await setVariantMaterials(testVariantId, [
      { materialColorId: testMaterialColorId, materialType: "fabric", sortOrder: 0 },
      { materialColorId: testMaterialColorId, materialType: "leg", sortOrder: 1 },
    ]);

    const materials = await getVariantMaterials(testVariantId);
    expect(materials.length).toBe(2);
    expect(materials[0].materialType).toBe("fabric");
    expect(materials[1].materialType).toBe("leg");
  });

  it("should delete material", async () => {
    const materials = await getVariantMaterials(testVariantId);
    const lastMaterial = materials[materials.length - 1];

    await deleteVariantMaterial(lastMaterial.id);

    const remaining = await getVariantMaterials(testVariantId);
    expect(remaining.length).toBe(materials.length - 1);
  });
});
