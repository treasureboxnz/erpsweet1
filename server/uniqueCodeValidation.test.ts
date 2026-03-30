import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { products, quotations, orders, suppliers, companies, productVariants } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("编号唯一性验证测试", () => {
  const TEST_ERP_COMPANY_ID = 1; // 测试租户ID
  let testProductId: number;
  let testQuotationId: number;
  let testOrderId: number;
  let testSupplierId: number;
  let testCustomerId: number;
  let testVariantId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 清理可能残留的测试数据
    await db.delete(products).where(eq(products.sku, "TEST-UNIQUE-001"));
    await db.delete(quotations).where(eq(quotations.quotationNumber, "QUO-TEST-001"));
    await db.delete(orders).where(eq(orders.orderNumber, "ORD-TEST-001"));
    await db.delete(suppliers).where(eq(suppliers.supplierCode, "SUP-TEST-001"));
    await db.delete(companies).where(eq(companies.customerCode, "CUS-TEST-001"));

    // 创建测试产品
    const [productResult] = await db.insert(products).values({
      name: "Test Product for Unique Validation",
      sku: "TEST-UNIQUE-001",
      erpCompanyId: TEST_ERP_COMPANY_ID,
      costPrice: "0",
      sellingPrice: "0",
      status: "active",
    });
    testProductId = (productResult as any).insertId;

    // 创建测试批次（需要先有产品）
    const [variantResult] = await db.insert(productVariants).values({
      productId: testProductId,
      variantCode: "VAR-TEST-001",
      variantName: "Test Variant",
      erpCompanyId: TEST_ERP_COMPANY_ID,
      productionStatus: "completed",
    });
    testVariantId = (variantResult as any).insertId;

    // 创建测试客户公司
    const [customerResult] = await db.insert(companies).values({
      companyName: "Test Customer",
      customerCode: "CUS-TEST-001",
      erpCompanyId: TEST_ERP_COMPANY_ID,
    });
    testCustomerId = (customerResult as any).insertId;

    // 创建测试供应商
    const [supplierResult] = await db.insert(suppliers).values({
      supplierName: "Test Supplier",
      supplierCode: "SUP-TEST-001",
      erpCompanyId: TEST_ERP_COMPANY_ID,
    });
    testSupplierId = (supplierResult as any).insertId;

    // 创建测试订单
    const [orderResult] = await db.insert(orders).values({
      orderNumber: "ORD-TEST-001",
      erpCompanyId: TEST_ERP_COMPANY_ID,
      customerId: testCustomerId,
      totalAmount: "0",
      currency: "USD",
    });
    testOrderId = (orderResult as any).insertId;

    // 创建测试报价单
    const [quotationResult] = await db.insert(quotations).values({
      quotationNumber: "QUO-TEST-001",
      erpCompanyId: TEST_ERP_COMPANY_ID,
      customerId: testCustomerId,
      customerName: "Test Customer",
      currency: "USD",
      createdBy: 1,
    });
    testQuotationId = (quotationResult as any).insertId;
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // 清理测试数据（按依赖顺序）
    if (testQuotationId) await db.delete(quotations).where(eq(quotations.id, testQuotationId));
    if (testOrderId) await db.delete(orders).where(eq(orders.id, testOrderId));
    if (testVariantId) await db.delete(productVariants).where(eq(productVariants.id, testVariantId));
    if (testProductId) await db.delete(products).where(eq(products.id, testProductId));
    if (testCustomerId) await db.delete(companies).where(eq(companies.id, testCustomerId));
    if (testSupplierId) await db.delete(suppliers).where(eq(suppliers.id, testSupplierId));
  });

  it("应该能检测到重复的产品SKU", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const existingProduct = await db.query.products.findFirst({
      where: eq(products.sku, "TEST-UNIQUE-001"),
    });
    expect(existingProduct).toBeDefined();
    expect(existingProduct?.sku).toBe("TEST-UNIQUE-001");
  });

  it("应该能检测到重复的报价单编号", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const existingQuotation = await db.query.quotations.findFirst({
      where: eq(quotations.quotationNumber, "QUO-TEST-001"),
    });
    expect(existingQuotation).toBeDefined();
    expect(existingQuotation?.quotationNumber).toBe("QUO-TEST-001");
  });

  it("应该能检测到重复的订单编号", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const existingOrder = await db.query.orders.findFirst({
      where: eq(orders.orderNumber, "ORD-TEST-001"),
    });
    expect(existingOrder).toBeDefined();
    expect(existingOrder?.orderNumber).toBe("ORD-TEST-001");
  });

  it("应该能检测到重复的供应商编号", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const existingSupplier = await db.query.suppliers.findFirst({
      where: eq(suppliers.supplierCode, "SUP-TEST-001"),
    });
    expect(existingSupplier).toBeDefined();
    expect(existingSupplier?.supplierCode).toBe("SUP-TEST-001");
  });

  it("应该能检测到重复的客户编号", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const existingCustomer = await db.query.companies.findFirst({
      where: eq(companies.customerCode, "CUS-TEST-001"),
    });
    expect(existingCustomer).toBeDefined();
    expect(existingCustomer?.customerCode).toBe("CUS-TEST-001");
  });

  it("应该能检测到重复的批次编号", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const existingVariant = await db.query.productVariants.findFirst({
      where: eq(productVariants.variantCode, "VAR-TEST-001"),
    });
    expect(existingVariant).toBeDefined();
    expect(existingVariant?.variantCode).toBe("VAR-TEST-001");
  });

  it("不应该检测到不存在的产品SKU", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const nonExistingProduct = await db.query.products.findFirst({
      where: eq(products.sku, "NON-EXISTING-SKU-999"),
    });
    expect(nonExistingProduct).toBeUndefined();
  });

  it("不应该检测到不存在的报价单编号", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const nonExistingQuotation = await db.query.quotations.findFirst({
      where: eq(quotations.quotationNumber, "QUO-NON-EXISTING-999"),
    });
    expect(nonExistingQuotation).toBeUndefined();
  });

  it("不应该检测到不存在的订单编号", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const nonExistingOrder = await db.query.orders.findFirst({
      where: eq(orders.orderNumber, "ORD-NON-EXISTING-999"),
    });
    expect(nonExistingOrder).toBeUndefined();
  });

  it("不应该检测到不存在的供应商编号", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const nonExistingSupplier = await db.query.suppliers.findFirst({
      where: eq(suppliers.supplierCode, "SUP-NON-EXISTING-999"),
    });
    expect(nonExistingSupplier).toBeUndefined();
  });
});
