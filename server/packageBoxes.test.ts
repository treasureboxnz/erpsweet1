import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { addBox, getBoxesByVariantId } from "./packageBoxes";
import { createVariant } from "./productVariants";
import { getDb } from "./db";
import { productVariants, packageBoxes as packageBoxesTable } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Package Boxes - CBM Calculation and Storage", () => {
  let testErpCompanyId: number;
  let testProductId: number;
  let testVariantId: number;

  beforeAll(async () => {
    // 使用测试公司ID（假设ID为1）
    testErpCompanyId = 1;
    testProductId = 60016; // 使用现有的产品ID

    // 创建测试批次
    testVariantId = await createVariant({
      erpCompanyId: testErpCompanyId,
      productId: testProductId,
      variantName: "包装尺寸测试批次",
      variantCode: "TEST-PKG-" + Date.now(),
      variantType: "universal",
      status: "designing",
      supplierId: 1,
    });
  });

  afterAll(async () => {
    // 清理测试数据
    if (testVariantId) {
      const db = await getDb();
      if (!db) return;
      // 删除外箱数据
      await db.delete(packageBoxesTable).where(eq(packageBoxesTable.variantId, testVariantId));
      // 删除批次
      await db.delete(productVariants).where(eq(productVariants.id, testVariantId));
    }
  });

  describe("场景一：输入长宽高自动计算CBM", () => {
    it("应该根据长宽高自动计算CBM并保存", async () => {
      // 输入0.5m、0.4m、0.3m（单位：米）
      const boxData = {
        erpCompanyId: testErpCompanyId,
        variantId: testVariantId,
        length: 0.5,
        width: 0.4,
        height: 0.3,
        grossWeight: 25,
        netWeight: 22,
      };

      const result = await addBox(boxData);

      // 验证返回的外箱对象存在
      expect(result).toBeDefined();
      expect(result!.id).toBeGreaterThan(0);

      // 查询数据库验证CBM自动计算
      const boxes = await getBoxesByVariantId(testVariantId, testErpCompanyId);
      expect(boxes).toHaveLength(1);

      const box = boxes[0];
      expect(box).toBeDefined();
      
      // 验证尺寸数据
      expect(parseFloat(box!.length)).toBe(0.5);
      expect(parseFloat(box!.width)).toBe(0.4);
      expect(parseFloat(box!.height)).toBe(0.3);

      // 验证CBM自动计算：0.5 * 0.4 * 0.3 = 0.06
      const expectedCBM = 0.5 * 0.4 * 0.3;
      expect(parseFloat(box!.cbm)).toBeCloseTo(expectedCBM, 6);

      // 验证重量数据
      expect(parseFloat(box!.grossWeight || "0")).toBe(25);
      expect(parseFloat(box!.netWeight || "0")).toBe(22);
    });
  });

  describe("场景二：手动输入CBM（不输入长宽高）", () => {
    it("应该使用手动输入的CBM值而不是自动计算", async () => {
      // 创建新的测试批次
      const manualTestVariantId = await createVariant({
        erpCompanyId: testErpCompanyId,
        productId: testProductId,
        variantName: "手动CBM测试批次",
        variantCode: "TEST-MANUAL-CBM-" + Date.now(),
        variantType: "universal",
        status: "designing",
        supplierId: 1,
      });

      try {
        // 手动输入CBM 0.08，长宽高为0
        const boxData = {
          erpCompanyId: testErpCompanyId,
          variantId: manualTestVariantId,
          length: 0,
          width: 0,
          height: 0,
          cbm: 0.08, // 手动输入CBM
          grossWeight: 20,
          netWeight: 18,
        };

        const addResult = await addBox(boxData);

        // 验证返回的外箱对象存在
        expect(addResult).toBeDefined();
        expect(addResult!.id).toBeGreaterThan(0);

        // 查询数据库验证手动输入的CBM
        const boxes = await getBoxesByVariantId(manualTestVariantId, testErpCompanyId);
        expect(boxes).toHaveLength(1);

        const box = boxes[0];
        expect(box).toBeDefined();

        // 验证长宽高为0
        expect(parseFloat(box!.length)).toBe(0);
        expect(parseFloat(box!.width)).toBe(0);
        expect(parseFloat(box!.height)).toBe(0);

        // 验证CBM使用手动输入的值
        expect(parseFloat(box!.cbm)).toBeCloseTo(0.08, 6);

        // 验证重量数据
        expect(parseFloat(box!.grossWeight || "0")).toBe(20);
        expect(parseFloat(box!.netWeight || "0")).toBe(18);
      } finally {
        // 清理测试数据
        const db = await getDb();
        if (db) {
          await db.delete(packageBoxesTable).where(eq(packageBoxesTable.variantId, manualTestVariantId));
          await db.delete(productVariants).where(eq(productVariants.id, manualTestVariantId));
        }
      }
    });
  });

  describe("CBM计算逻辑验证", () => {
    it("当cbm参数为undefined时，应该根据长宽高自动计算", async () => {
      // 创建新的测试批次
      const autoTestVariantId = await createVariant({
        erpCompanyId: testErpCompanyId,
        productId: testProductId,
        variantName: "自动CBM计算测试",
        variantCode: "TEST-AUTO-CBM-" + Date.now(),
        variantType: "universal",
        status: "designing",
        supplierId: 1,
      });

      try {
        // 不传递cbm参数（单位：米）
        const boxData = {
          erpCompanyId: testErpCompanyId,
          variantId: autoTestVariantId,
          length: 0.6,
          width: 0.5,
          height: 0.4,
          grossWeight: 30,
          netWeight: 27,
        };

        await addBox(boxData);

        // 查询数据库验证CBM自动计算
        const boxes = await getBoxesByVariantId(autoTestVariantId, testErpCompanyId);
        const box = boxes[0];

        // 验证CBM自动计算：0.6 * 0.5 * 0.4 = 0.12
        const expectedCBM = 0.6 * 0.5 * 0.4;
        expect(parseFloat(box!.cbm)).toBeCloseTo(expectedCBM, 6);
      } finally {
        // 清理测试数据
        const db = await getDb();
        if (db) {
          await db.delete(packageBoxesTable).where(eq(packageBoxesTable.variantId, autoTestVariantId));
          await db.delete(productVariants).where(eq(productVariants.id, autoTestVariantId));
        }
      }
    });

    it("当cbm参数为0时，应该使用0而不是自动计算", async () => {
      // 创建新的测试批次
      const zeroTestVariantId = await createVariant({
        erpCompanyId: testErpCompanyId,
        productId: testProductId,
        variantName: "CBM为0测试",
        variantCode: "TEST-ZERO-CBM-" + Date.now(),
        variantType: "universal",
        status: "designing",
        supplierId: 1,
      });

      try {
        // 传递cbm=0（单位：米）
        const boxData = {
          erpCompanyId: testErpCompanyId,
          variantId: zeroTestVariantId,
          length: 0.6,
          width: 0.5,
          height: 0.4,
          cbm: 0, // 显式传递0
          grossWeight: 30,
          netWeight: 27,
        };

        await addBox(boxData);

        // 查询数据库验证CBM为0
        const boxes = await getBoxesByVariantId(zeroTestVariantId, testErpCompanyId);
        const box = boxes[0];

        // 验证CBM使用传入的0，而不是自动计算
        expect(parseFloat(box!.cbm)).toBe(0);
      } finally {
        // 清理测试数据
        const db = await getDb();
        if (db) {
          await db.delete(packageBoxesTable).where(eq(packageBoxesTable.variantId, zeroTestVariantId));
          await db.delete(productVariants).where(eq(productVariants.id, zeroTestVariantId));
        }
      }
    });
  });
});
