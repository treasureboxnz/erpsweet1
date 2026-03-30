/**
 * 批次价格统一逻辑单元测试
 *
 * 验证：
 * 1. 批次模式订单创建/编辑时，直接读取 productVariants.sellingPriceFOB/sellingPriceRMB
 * 2. 订单保存时，非零单价同步回写到批次表
 */
import { describe, it, expect } from "vitest";

// ============================================================
// 模拟数据
// ============================================================
const mockVariant = {
  id: 101,
  sellingPriceFOB: "57.00",
  sellingPriceRMB: "399.00",
};

const mockVariantPricing = {
  variantId: 101,
  sellingPriceFobL1: null,   // 定价Tab未填写
  sellingPriceFobL2: null,
  sellingPriceFobL3: null,
  sellingPriceRmbIncTax: null,
};

// ============================================================
// 工具函数：模拟前端价格读取逻辑
// ============================================================
function getBatchPrice(variantData: { variant: typeof mockVariant }, currency: "USD" | "RMB"): string {
  // 批次模式直接读取批次自身的价格字段（修复后的逻辑）
  return currency === "USD"
    ? variantData.variant.sellingPriceFOB?.toString() || "0"
    : variantData.variant.sellingPriceRMB?.toString() || "0";
}

// 旧逻辑（修复前，读取定价表字段）
function getBatchPriceOld(variantData: { pricing: typeof mockVariantPricing }, currency: "USD" | "RMB"): string {
  return currency === "USD"
    ? variantData.pricing.sellingPriceFobL1?.toString() || "0"
    : variantData.pricing.sellingPriceRmbIncTax?.toString() || "0";
}

// ============================================================
// 模拟服务端同步回写逻辑
// ============================================================
interface OrderItem {
  orderMode?: "batch_selection" | "fob_only";
  variantId?: number;
  unitPrice?: string;
}

function simulateBatchPriceSync(
  items: OrderItem[],
  currency: string,
  db: Map<number, { sellingPriceFOB: string; sellingPriceRMB: string }>
): void {
  for (const item of items) {
    if (
      item.orderMode === "batch_selection" &&
      item.variantId &&
      item.unitPrice &&
      parseFloat(item.unitPrice) > 0
    ) {
      const priceField = currency === "RMB" ? "sellingPriceRMB" : "sellingPriceFOB";
      const variant = db.get(item.variantId);
      if (variant) {
        variant[priceField as keyof typeof variant] = item.unitPrice;
      }
    }
  }
}

// ============================================================
// 测试用例
// ============================================================
describe("批次价格统一逻辑", () => {
  describe("前端价格读取", () => {
    it("USD 批次模式：应读取 sellingPriceFOB（修复后）", () => {
      const variantData = { variant: mockVariant, pricing: mockVariantPricing };
      const price = getBatchPrice(variantData, "USD");
      expect(price).toBe("57.00");
    });

    it("RMB 批次模式：应读取 sellingPriceRMB（修复后）", () => {
      const variantData = { variant: mockVariant, pricing: mockVariantPricing };
      const price = getBatchPrice(variantData, "RMB");
      expect(price).toBe("399.00");
    });

    it("旧逻辑（修复前）：定价表为null时返回0（验证bug存在）", () => {
      const variantData = { variant: mockVariant, pricing: mockVariantPricing };
      const price = getBatchPriceOld(variantData, "USD");
      expect(price).toBe("0"); // 旧逻辑返回0，这就是bug
    });

    it("批次价格为0时应返回'0'", () => {
      const zeroVariant = { ...mockVariant, sellingPriceFOB: "0", sellingPriceRMB: "0" };
      const variantData = { variant: zeroVariant, pricing: mockVariantPricing };
      const price = getBatchPrice(variantData, "USD");
      expect(price).toBe("0");
    });
  });

  describe("服务端价格同步回写", () => {
    it("批次模式订单保存时，USD 单价同步回写到 sellingPriceFOB", () => {
      const db = new Map([[101, { sellingPriceFOB: "0", sellingPriceRMB: "0" }]]);
      const items: OrderItem[] = [
        { orderMode: "batch_selection", variantId: 101, unitPrice: "65.00" },
      ];
      simulateBatchPriceSync(items, "USD", db);
      expect(db.get(101)?.sellingPriceFOB).toBe("65.00");
    });

    it("批次模式订单保存时，RMB 单价同步回写到 sellingPriceRMB", () => {
      const db = new Map([[101, { sellingPriceFOB: "0", sellingPriceRMB: "0" }]]);
      const items: OrderItem[] = [
        { orderMode: "batch_selection", variantId: 101, unitPrice: "450.00" },
      ];
      simulateBatchPriceSync(items, "RMB", db);
      expect(db.get(101)?.sellingPriceRMB).toBe("450.00");
    });

    it("单价为0时不应同步回写", () => {
      const db = new Map([[101, { sellingPriceFOB: "57.00", sellingPriceRMB: "399.00" }]]);
      const items: OrderItem[] = [
        { orderMode: "batch_selection", variantId: 101, unitPrice: "0" },
      ];
      simulateBatchPriceSync(items, "USD", db);
      // 原价格不应被覆盖为0
      expect(db.get(101)?.sellingPriceFOB).toBe("57.00");
    });

    it("FOB 模式订单项不应触发批次价格同步", () => {
      const db = new Map([[101, { sellingPriceFOB: "57.00", sellingPriceRMB: "399.00" }]]);
      const items: OrderItem[] = [
        { orderMode: "fob_only", variantId: 101, unitPrice: "99.00" },
      ];
      simulateBatchPriceSync(items, "USD", db);
      // FOB模式不应修改批次价格
      expect(db.get(101)?.sellingPriceFOB).toBe("57.00");
    });

    it("混合订单：批次项同步，FOB项不同步", () => {
      const db = new Map([
        [101, { sellingPriceFOB: "57.00", sellingPriceRMB: "399.00" }],
        [102, { sellingPriceFOB: "80.00", sellingPriceRMB: "560.00" }],
      ]);
      const items: OrderItem[] = [
        { orderMode: "batch_selection", variantId: 101, unitPrice: "65.00" },
        { orderMode: "fob_only", variantId: 102, unitPrice: "99.00" },
      ];
      simulateBatchPriceSync(items, "USD", db);
      expect(db.get(101)?.sellingPriceFOB).toBe("65.00"); // 批次项已同步
      expect(db.get(102)?.sellingPriceFOB).toBe("80.00"); // FOB项未修改
    });
  });
});
