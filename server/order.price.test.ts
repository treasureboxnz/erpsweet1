/**
 * 测试订单创建时价格读取的fallback逻辑
 * 当 variantPricing.sellingPriceFobL1 为 null 时，应 fallback 到 productVariants.sellingPriceFOB
 */
import { describe, it, expect } from "vitest";

// 模拟 getAllVariants 返回的数据结构中的 mergedPricing 逻辑
function buildMergedPricing(
  pricingRecord: {
    sellingPriceFobL1?: string | null;
    sellingPriceFobL2?: string | null;
    sellingPriceFobL3?: string | null;
    sellingPriceRmbIncTax?: string | null;
  } | null,
  variantDirectPrices: {
    sellingPriceFOB?: string | null;
    sellingPriceRMB?: string | null;
  }
) {
  if (pricingRecord) {
    return {
      ...pricingRecord,
      sellingPriceFobL1:
        pricingRecord.sellingPriceFobL1 ?? variantDirectPrices.sellingPriceFOB ?? null,
      sellingPriceFobL2:
        pricingRecord.sellingPriceFobL2 ?? variantDirectPrices.sellingPriceFOB ?? null,
      sellingPriceFobL3:
        pricingRecord.sellingPriceFobL3 ?? variantDirectPrices.sellingPriceFOB ?? null,
      sellingPriceRmbIncTax:
        pricingRecord.sellingPriceRmbIncTax ?? variantDirectPrices.sellingPriceRMB ?? null,
    };
  } else {
    return {
      sellingPriceFobL1: variantDirectPrices.sellingPriceFOB ?? null,
      sellingPriceFobL2: variantDirectPrices.sellingPriceFOB ?? null,
      sellingPriceFobL3: variantDirectPrices.sellingPriceFOB ?? null,
      sellingPriceRmbIncTax: variantDirectPrices.sellingPriceRMB ?? null,
    };
  }
}

describe("订单价格 fallback 逻辑", () => {
  it("当 variantPricing.sellingPriceFobL1 为 null 时，应 fallback 到 variant.sellingPriceFOB", () => {
    const pricing = buildMergedPricing(
      { sellingPriceFobL1: null, sellingPriceFobL2: null, sellingPriceFobL3: null, sellingPriceRmbIncTax: null },
      { sellingPriceFOB: "57.00", sellingPriceRMB: "311.00" }
    );
    expect(pricing.sellingPriceFobL1).toBe("57.00");
    expect(pricing.sellingPriceFobL2).toBe("57.00");
    expect(pricing.sellingPriceFobL3).toBe("57.00");
    expect(pricing.sellingPriceRmbIncTax).toBe("311.00");
  });

  it("当 variantPricing.sellingPriceFobL1 有值时，应优先使用 pricing 表的值", () => {
    const pricing = buildMergedPricing(
      { sellingPriceFobL1: "65.00", sellingPriceFobL2: "60.00", sellingPriceFobL3: "55.00", sellingPriceRmbIncTax: "400.00" },
      { sellingPriceFOB: "57.00", sellingPriceRMB: "311.00" }
    );
    expect(pricing.sellingPriceFobL1).toBe("65.00");
    expect(pricing.sellingPriceFobL2).toBe("60.00");
    expect(pricing.sellingPriceFobL3).toBe("55.00");
    expect(pricing.sellingPriceRmbIncTax).toBe("400.00");
  });

  it("当 variantPricing 记录不存在（null）时，应直接使用 variant 表的价格", () => {
    const pricing = buildMergedPricing(null, { sellingPriceFOB: "57.00", sellingPriceRMB: "311.00" });
    expect(pricing.sellingPriceFobL1).toBe("57.00");
    expect(pricing.sellingPriceFobL2).toBe("57.00");
    expect(pricing.sellingPriceFobL3).toBe("57.00");
    expect(pricing.sellingPriceRmbIncTax).toBe("311.00");
  });

  it("当 variantPricing 和 variant 都没有价格时，应返回 null", () => {
    const pricing = buildMergedPricing(
      { sellingPriceFobL1: null },
      { sellingPriceFOB: null }
    );
    expect(pricing.sellingPriceFobL1).toBeNull();
  });

  it("当 variantPricing 部分字段有值时，只 fallback 为 null 的字段", () => {
    const pricing = buildMergedPricing(
      { sellingPriceFobL1: "65.00", sellingPriceFobL2: null, sellingPriceFobL3: null },
      { sellingPriceFOB: "57.00" }
    );
    expect(pricing.sellingPriceFobL1).toBe("65.00"); // 有值，不 fallback
    expect(pricing.sellingPriceFobL2).toBe("57.00"); // null，fallback
    expect(pricing.sellingPriceFobL3).toBe("57.00"); // null，fallback
  });
});
