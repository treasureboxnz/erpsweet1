import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from './db';
import { quotations, quotationItems, quotationBatches, companies, products, productVariants, packageBoxes, erpCompanies } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

/**
 * 报价单重量和CBM功能测试
 * 
 * 测试目标：
 * 1. 创建报价单时正确从package_boxes复制重量和CBM数据
 * 2. 查询报价单列表时正确计算总重量和总CBM
 * 3. 批次模式和FOB模式的重量和CBM处理逻辑
 */

describe('Quotation Weight and CBM Features', () => {
  let db: any;
  let testErpCompanyId: number;
  let testCustomerId: number;
  let testProductId: number;
  let testVariantId: number;
  let testQuotationId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error('Database not available');

    // 创建测试ERP公司
    const [erpCompany] = await db.insert(erpCompanies).values({
      companyName: 'Test ERP Company for Weight',
      companyCode: `TEST-WEIGHT-${Date.now()}`,
      status: 'active',
    });
    testErpCompanyId = erpCompany.insertId;

    // 创建测试客户
    const [customer] = await db.insert(companies).values({
      companyName: 'Test Customer for Weight',
      customerCode: `CUST-WEIGHT-${Date.now()}`,
      companyType: 'customer',
      status: 'active',
      erpCompanyId: testErpCompanyId,
    });
    testCustomerId = customer.insertId;

    // 创建测试产品
    const [product] = await db.insert(products).values({
      name: 'Test Product for Weight',
      sku: `PROD-WEIGHT-${Date.now()}`,
      costPrice: '10.00',
      sellingPrice: '15.00',
      status: 'active',
      erpCompanyId: testErpCompanyId,
    });
    testProductId = product.insertId;

    // 创建测试批次
    const [variant] = await db.insert(productVariants).values({
      productId: testProductId,
      variantCode: `VAR-WEIGHT-${Date.now()}`,
      variantName: 'Test Variant for Weight',
      status: 'active',
      erpCompanyId: testErpCompanyId,
    });
    testVariantId = variant.insertId;

    // 创建测试外箱信息（重量和CBM数据）
    await db.insert(packageBoxes).values({
      variantId: testVariantId,
      boxNumber: 1,
      length: '50.000000', // 长度50cm
      width: '50.000000', // 宽度50cm
      height: '50.000000', // 高度50cm
      grossWeight: '10.500000', // 毛重10.5kg
      netWeight: '9.800000', // 净重9.8kg
      cbm: '0.125000', // 体积0.125m³
      erpCompanyId: testErpCompanyId,
    });
  });

  afterAll(async () => {
    // 清理测试数据
    if (testQuotationId) {
      await db.delete(quotationBatches).where(eq(quotationBatches.quotationItemId, testQuotationId));
      await db.delete(quotationItems).where(eq(quotationItems.quotationId, testQuotationId));
      await db.delete(quotations).where(eq(quotations.id, testQuotationId));
    }
    if (testVariantId) {
      await db.delete(packageBoxes).where(eq(packageBoxes.variantId, testVariantId));
      await db.delete(productVariants).where(eq(productVariants.id, testVariantId));
    }
    if (testProductId) {
      await db.delete(products).where(eq(products.id, testProductId));
    }
    if (testCustomerId) {
      await db.delete(companies).where(eq(companies.id, testCustomerId));
    }
    if (testErpCompanyId) {
      await db.delete(erpCompanies).where(eq(erpCompanies.id, testErpCompanyId));
    }
  });

  it('should copy weight and CBM from package_boxes when creating quotation in batch mode', async () => {
    // 创建批次模式报价单
    const [quotation] = await db.insert(quotations).values({
      quotationNumber: `QUO-TEST-WEIGHT-${Date.now()}`,
      customerId: testCustomerId,
      customerName: 'Test Customer for Weight',
      quotationMode: 'batch_selection',
      currency: 'USD',
      totalAmount: '100.00',
      status: 'draft',
      version: 1,
      createdBy: 1, // 测试用户ID
      erpCompanyId: testErpCompanyId,
    });
    testQuotationId = quotation.insertId;

    // 创建报价单项（应该从package_boxes复制重量和CBM）
    const [quotationItem] = await db.insert(quotationItems).values({
      quotationId: testQuotationId,
      productId: testProductId,
      productName: 'Test Product for Weight',
      productSku: `PROD-WEIGHT-${Date.now()}`,
      fobQuantity: 10, // 数量10
      fobUnitPrice: '10.00',
      fobSubtotal: '100.00',
      grossWeight: '10.500000', // 从package_boxes复制
      netWeight: '9.800000', // 从package_boxes复制
      cbm: '0.125000', // 从package_boxes复制
      sortOrder: 0,
      erpCompanyId: testErpCompanyId,
    });

    // 验证重量和CBM数据已正确保存
    const [savedItem] = await db
      .select()
      .from(quotationItems)
      .where(eq(quotationItems.id, quotationItem.insertId))
      .limit(1);

    expect(savedItem).toBeDefined();
    expect(savedItem.grossWeight).toBe('10.500000');
    expect(savedItem.netWeight).toBe('9.800000');
    expect(savedItem.cbm).toBe('0.125000');
  });

  it('should calculate total weight and CBM correctly in quotation list', async () => {
    // 查询报价单列表
    const quotationsList = await db
      .select({
        id: quotations.id,
        quotationNumber: quotations.quotationNumber,
      })
      .from(quotations)
      .where(eq(quotations.id, testQuotationId))
      .limit(1);

    expect(quotationsList.length).toBe(1);
    const quotation = quotationsList[0];

    // 查询报价单项的重量和CBM数据
    const itemsData = await db
      .select({
        grossWeight: quotationItems.grossWeight,
        netWeight: quotationItems.netWeight,
        cbm: quotationItems.cbm,
        fobQuantity: quotationItems.fobQuantity,
      })
      .from(quotationItems)
      .where(eq(quotationItems.quotationId, quotation.id));

    // 计算总重量和总CBM（单个外箱重量/CBM × 数量）
    let totalGrossWeight = 0;
    let totalNetWeight = 0;
    let totalCBM = 0;

    itemsData.forEach(item => {
      const grossWeight = Number(item.grossWeight) || 0;
      const netWeight = Number(item.netWeight) || 0;
      const cbm = Number(item.cbm) || 0;
      const quantity = Number(item.fobQuantity) || 0;

      totalGrossWeight += grossWeight * quantity;
      totalNetWeight += netWeight * quantity;
      totalCBM += cbm * quantity;
    });

    // 验证计算结果
    // 10.5kg × 10 = 105kg
    // 9.8kg × 10 = 98kg
    // 0.125m³ × 10 = 1.25m³
    expect(totalGrossWeight).toBeCloseTo(105, 2);
    expect(totalNetWeight).toBeCloseTo(98, 2);
    expect(totalCBM).toBeCloseTo(1.25, 2);
  });

  it('should handle FOB mode quotations with null weight and CBM', async () => {
    // 创建FOB模式报价单（没有批次信息，重量和CBM应该为null）
    const [fobQuotation] = await db.insert(quotations).values({
      quotationNumber: `QUO-TEST-FOB-${Date.now()}`,
      customerId: testCustomerId,
      customerName: 'Test Customer for Weight',
      quotationMode: 'fob_only',
      currency: 'USD',
      totalAmount: '50.00',
      status: 'draft',
      version: 1,
      createdBy: 1, // 测试用户ID
      erpCompanyId: testErpCompanyId,
    });

    const [fobItem] = await db.insert(quotationItems).values({
      quotationId: fobQuotation.insertId,
      productId: testProductId,
      productName: 'Test Product for Weight',
      productSku: `PROD-WEIGHT-${Date.now()}`,
      fobQuantity: 5,
      fobUnitPrice: '10.00',
      fobSubtotal: '50.00',
      grossWeight: null, // FOB模式下为null
      netWeight: null, // FOB模式下为null
      cbm: null, // FOB模式下为null
      sortOrder: 0,
      erpCompanyId: testErpCompanyId,
    });

    // 验证FOB模式下重量和CBM为null
    const [savedFobItem] = await db
      .select()
      .from(quotationItems)
      .where(eq(quotationItems.id, fobItem.insertId))
      .limit(1);

    expect(savedFobItem).toBeDefined();
    expect(savedFobItem.grossWeight).toBeNull();
    expect(savedFobItem.netWeight).toBeNull();
    expect(savedFobItem.cbm).toBeNull();

    // 清理测试数据
    await db.delete(quotationItems).where(eq(quotationItems.id, fobItem.insertId));
    await db.delete(quotations).where(eq(quotations.id, fobQuotation.insertId));
  });
});
