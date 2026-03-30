import { getDb } from "./db";
import { orders, orderItems, orderStatusHistory, customers, users, companies, productVariants, products, customerPriceHistory, materialColors, variantMaterials, materialTypes, packageBoxes } from "../drizzle/schema";
import { eq, desc, and, or, like, sql, gte, lte, isNull } from "drizzle-orm";
import type { InsertOrder, InsertOrderItem, InsertOrderStatusHistory } from "../drizzle/schema";

/**
 * Get all orders with pagination and filtering
 */
export async function getAllOrders(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  paymentStatus?: string;
  searchTerm?: string;
  startDate?: Date;
  endDate?: Date;
  showDeleted?: boolean;
  erpCompanyId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { page = 1, pageSize = 20, status, paymentStatus, searchTerm, startDate, endDate, showDeleted = false, erpCompanyId } = params;
  const offset = (page - 1) * pageSize;

  let conditions = [eq(orders.erpCompanyId, erpCompanyId)];
  
  // 默认不显示已删除订单
  if (!showDeleted) {
    conditions.push(isNull(orders.deletedAt));
  }
  
  if (status) {
    conditions.push(eq(orders.status, status as any));
  }
  
  if (paymentStatus) {
    conditions.push(eq(orders.paymentStatus, paymentStatus as any));
  }
  
  if (searchTerm) {
    const searchCondition = or(
      like(orders.orderNumber, `%${searchTerm}%`),
      like(orders.customerName, `%${searchTerm}%`)
    );
    if (searchCondition) conditions.push(searchCondition);
  }
  
  if (startDate) {
    conditions.push(gte(orders.orderDate, startDate));
  }
  
  if (endDate) {
    conditions.push(lte(orders.orderDate, endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [orderList, totalCount] = await Promise.all([
    db.select().from(orders).where(whereClause).orderBy(desc(orders.createdAt)).limit(pageSize).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(orders).where(whereClause)
  ]);

  // 为每个订单计算总毛重和总CBM
  const ordersWithWeight = await Promise.all(orderList.map(async (order) => {
    // 查询订单明细的重量和CBM数据
    const items = await db
      .select({
        grossWeight: orderItems.grossWeight,
        netWeight: orderItems.netWeight,
        cbm: orderItems.cbm,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    
    // 计算总重量和总CBM（单个外箱重量/CBM × 数量）
    let totalGrossWeight = 0;
    let totalNetWeight = 0;
    let totalCBM = 0;
    
    items.forEach(item => {
      const grossWeight = Number(item.grossWeight) || 0;
      const netWeight = Number(item.netWeight) || 0;
      const cbm = Number(item.cbm) || 0;
      const quantity = Number(item.quantity) || 0;
      
      totalGrossWeight += grossWeight * quantity;
      totalNetWeight += netWeight * quantity;
      totalCBM += cbm * quantity;
    });
    
    return {
      ...order,
      totalGrossWeight,
      totalNetWeight,
      totalCBM,
    };
  }));

  return {
    orders: ordersWithWeight,
    total: Number(totalCount[0]?.count || 0),
    page,
    pageSize,
    totalPages: Math.ceil(Number(totalCount[0]?.count || 0) / pageSize),
  };
}

/**
 * Get order by ID with items
 */
export async function getOrderById(id: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [order] = await db.select().from(orders).where(and(eq(orders.id, id), eq(orders.erpCompanyId, erpCompanyId)));
  if (!order) return null;

  // Get order items with variant and product details
  const items = await db
    .select({
      item: orderItems,
      variant: productVariants,
      product: products,
      materialColor: materialColors, // 旧的单材料字段（fallback）
    })
    .from(orderItems)
    .leftJoin(productVariants, eq(orderItems.variantId, productVariants.id))
    .leftJoin(products, eq(orderItems.productId, products.id))
    .leftJoin(materialColors, eq(productVariants.materialColorId, materialColors.id))
    .where(eq(orderItems.orderId, id));

  // 为每个订单项加载多个材料（优先使用variant_materials表）
  const flattenedItems = await Promise.all(items.map(async (row: any) => {
    let materials = null;
    let materialCount = 0;
    
    // 使用order_items表中保存的重量和CBM数据，乘以数量得到总重量和总CBM
    const grossWeight = Number(row.item.grossWeight) || 0;
    const netWeight = Number(row.item.netWeight) || 0;
    const cbm = Number(row.item.cbm) || 0;
    const quantity = Number(row.item.quantity) || 0;
    
    const totalGrossWeight = grossWeight * quantity;
    const totalNetWeight = netWeight * quantity;
    const totalCBM = cbm * quantity;
    
    if (row.variant?.id) {
      
      // 先查询材料总数
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(variantMaterials)
        .where(eq(variantMaterials.variantId, row.variant.id));
      const totalMaterialCount = countResult[0]?.count || 0;
      
      // 从variant_materials表加载材料（按sortOrder排序，最多3个用于显示）
      const variantMats = await db
        .select({
          id: variantMaterials.id,
          materialType: variantMaterials.materialType,
          materialTypeId: variantMaterials.materialTypeId,
          materialTypeName: materialTypes.name,
          materialTypeIcon: materialTypes.icon,
          sortOrder: variantMaterials.sortOrder,
          colorCode: materialColors.colorCode,
          colorName: materialColors.colorName,
          imageUrl: materialColors.imageUrl,
        })
        .from(variantMaterials)
        .leftJoin(materialColors, eq(variantMaterials.materialColorId, materialColors.id))
        .leftJoin(materialTypes, eq(variantMaterials.materialTypeId, materialTypes.id))
        .where(eq(variantMaterials.variantId, row.variant.id))
        .orderBy(sql`${variantMaterials.sortOrder} ASC`)
        .limit(3);
      
      if (variantMats.length > 0) {
        materials = variantMats;
        materialCount = totalMaterialCount;
      } else if (row.materialColor) {
        // Fallback: 如果variant_materials表没有数据，使用旧的materialColorId字段
        materials = [{
          id: 0,
          materialType: 'fabric',
          sortOrder: 0,
          colorCode: row.materialColor.colorCode,
          colorName: row.materialColor.colorName,
          imageUrl: row.materialColor.imageUrl,
        }];
        materialCount = 1;
      }
    }
    
    return {
      ...row.item,
      productName: row.product?.name || "",
      productSku: row.product?.sku || "",
      productImageUrl: row.product?.imageUrl || null,
      variantCode: row.variant?.variantCode || null,
      variant: row.variant,
      product: row.product,
      materials: materials, // 多个材料（最多3个）
      materialCount: materialCount, // 材料总数（用于显示"+N"）
      materialColor: row.materialColor, // 保留旧字段用于兼容性
      totalGrossWeight: totalGrossWeight, // 订单项总毛重（单个外箱毛重 × 数量）
      totalNetWeight: totalNetWeight, // 订单项总净重（单个外箱净重 × 数量）
      totalCBM: totalCBM, // 订单项总CBM（单个外箱CBM × 数量）
    };
  }));

  const history = await db
    .select()
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, id))
    .orderBy(desc(orderStatusHistory.changedAt));

  return {
    ...order,
    items: flattenedItems,
    statusHistory: history,
  };
}

/**
 * Create new order
 */
export async function createOrder(orderData: InsertOrder, items: InsertOrderItem[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get customer name if not provided
  let finalOrderData = orderData;
  if (!orderData.customerName && orderData.customerId) {
    const [company] = await db.select().from(companies).where(eq(companies.id, orderData.customerId));
    if (company) {
      finalOrderData = { ...orderData, customerName: company.companyName };
    }
  }

  const [newOrder] = await db.insert(orders).values(finalOrderData).$returningId();
  
  if (items && items.length > 0) {
    // Enrich items with weight and CBM data from variants
    const itemsWithOrderId = await Promise.all(
      items.map(async (item) => {
        let grossWeight = null;
        let netWeight = null;
        let cbm = null;
        
        // If variantId exists, fetch weight, CBM, and SKU from variant and package_boxes
        let supplierSku = null;
        let customerSku = null;
        
        if (item.variantId) {
          // Fetch SKU from product_variants
          const [variant] = await db
            .select()
            .from(productVariants)
            .where(eq(productVariants.id, item.variantId))
            .limit(1);
          
          if (variant) {
            supplierSku = variant.supplierSku;
            customerSku = variant.customerSku;
          }
          
          // Fetch weight and CBM from package_boxes
          const [packageBox] = await db
            .select()
            .from(packageBoxes)
            .where(eq(packageBoxes.variantId, item.variantId))
            .limit(1);
          
          if (packageBox) {
            grossWeight = packageBox.grossWeight;
            netWeight = packageBox.netWeight;
            cbm = packageBox.cbm;
          }
        }
        
        return {
          ...item,
          orderId: newOrder.id,
          supplierSku,
          customerSku,
          grossWeight,
          netWeight,
          cbm,
        };
      })
    );
    
    await db.insert(orderItems).values(itemsWithOrderId);
    
    // Note: customer price history is recorded when order status changes to 'confirmed', not at creation
  }

  // Record initial status
  await db.insert(orderStatusHistory).values({
    erpCompanyId: orderData.erpCompanyId,
    orderId: newOrder.id,
    fromStatus: null,
    toStatus: orderData.status || "pending",
    notes: "Order created",
    changedBy: orderData.createdBy,
  });

  return newOrder.id;
}

/**
 * Update order
 */
export async function updateOrder(
  id: number,
  orderData: Partial<InsertOrder>,
  items?: InsertOrderItem[],
  userId?: number,
  erpCompanyId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const whereClause = erpCompanyId ? and(eq(orders.id, id), eq(orders.erpCompanyId, erpCompanyId)) : eq(orders.id, id);
  const [existing] = await db.select().from(orders).where(whereClause);
  if (!existing) throw new Error("Order not found");

  // If items are provided, delete old items and insert new ones
  if (items && items.length > 0) {
    // Delete existing order items
    await db.delete(orderItems).where(eq(orderItems.orderId, id));

    // Insert new order items - 处理FOB和批次模式的字段差异，同时从variant/package_boxes获取SKU和重量数据
    const newItems = await Promise.all(items.map(async (item) => {
      let supplierSku = item.supplierSku || null;
      let customerSku = item.customerSku || null;
      let grossWeight = item.grossWeight || null;
      let netWeight = item.netWeight || null;
      let cbm = item.cbm || null;
      let piecesPerBox = item.piecesPerBox || 1;

      // 如果有variantId且SKU/重量数据为空，从variant和package_boxes获取
      if (item.variantId && (!supplierSku || !grossWeight)) {
        const [variant] = await db
          .select()
          .from(productVariants)
          .where(eq(productVariants.id, item.variantId))
          .limit(1);
        if (variant) {
          if (!supplierSku) supplierSku = variant.supplierSku;
          if (!customerSku) customerSku = variant.customerSku;
        }
        const [packageBox] = await db
          .select()
          .from(packageBoxes)
          .where(eq(packageBoxes.variantId, item.variantId))
          .limit(1);
        if (packageBox) {
          if (!grossWeight) grossWeight = packageBox.grossWeight;
          if (!netWeight) netWeight = packageBox.netWeight;
          if (!cbm) cbm = packageBox.cbm;
          piecesPerBox = packageBox.piecesPerBox || 1;
        }
      }

      const baseItem: any = {
        orderId: id,
        productId: item.productId,
        variantId: item.variantId || null,
        productName: item.productName,
        productSku: item.productSku,
        sku: item.sku || item.productSku || null,
        orderMode: item.orderMode || 'batch_selection',
        quantity: item.quantity || 0,
        unitPrice: item.unitPrice || "0",
        subtotal: item.subtotal || "0",
        fobQuantity: item.fobQuantity || null,
        fobUnitPrice: item.fobUnitPrice || null,
        fobTotalPrice: item.fobTotalPrice || null,
        supplierSku,
        customerSku,
        grossWeight,
        netWeight,
        cbm,
        piecesPerBox,
        notes: item.notes || null,
      };
      return baseItem;
    }));
    await db.insert(orderItems).values(newItems);

    // Recalculate total amount (支持混合模式)
    const totalAmount = items.reduce((sum, item) => {
      if (item.orderMode === 'fob_only') {
        // FOB模式：使用fobTotalPrice
        return sum + parseFloat(item.fobTotalPrice || "0");
      } else {
        // 批次模式：使用subtotal
        return sum + parseFloat(item.subtotal || "0");
      }
    }, 0).toFixed(2);

    orderData.totalAmount = totalAmount;
  }

  // Track status change
  if (orderData.status && orderData.status !== existing.status) {
    await db.insert(orderStatusHistory).values({
      erpCompanyId: existing.erpCompanyId,
      orderId: id,
      fromStatus: existing.status,
      toStatus: orderData.status,
      changedBy: userId,
    });
  }

  await db.update(orders).set(orderData).where(whereClause);
  return true;
}

/**
 * Delete order
 */
export async function deleteOrder(id: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(orders).where(and(eq(orders.id, id), eq(orders.erpCompanyId, erpCompanyId)));
  return true;
}

/**
 * Get order statistics
 */
export async function getOrderStats(erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [stats] = await db
    .select({
      totalOrders: sql<number>`count(*)`,
      totalAmount: sql<number>`sum(${orders.totalAmount})`,
      pendingCount: sql<number>`sum(case when ${orders.status} = 'pending' then 1 else 0 end)`,
      confirmedCount: sql<number>`sum(case when ${orders.status} = 'confirmed' then 1 else 0 end)`,
      processingCount: sql<number>`sum(case when ${orders.status} = 'processing' then 1 else 0 end)`,
      shippedCount: sql<number>`sum(case when ${orders.status} = 'shipped' then 1 else 0 end)`,
      deliveredCount: sql<number>`sum(case when ${orders.status} = 'delivered' then 1 else 0 end)`,
      cancelledCount: sql<number>`sum(case when ${orders.status} = 'cancelled' then 1 else 0 end)`,
    })
    .from(orders)
    .where(and(eq(orders.erpCompanyId, erpCompanyId), isNull(orders.deletedAt)));

  return stats;
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: number,
  newStatus: string,
  notes?: string,
  userId?: number,
  erpCompanyId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [existing] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!existing) throw new Error("Order not found");

  await db.update(orders).set({ status: newStatus as any }).where(eq(orders.id, orderId));

  await db.insert(orderStatusHistory).values({
    erpCompanyId: existing.erpCompanyId,
    orderId,
    fromStatus: existing.status,
    toStatus: newStatus,
    notes,
    changedBy: userId,
  });

  // When order is confirmed, record customer price history
  if (newStatus === 'confirmed' && existing.customerId) {
    const orderItemsList = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    const priceHistoryRecords = await Promise.all(
      orderItemsList
        .filter(item => item.variantId && item.unitPrice)
        .map(async (item) => {
          const [variant] = await db
            .select()
            .from(productVariants)
            .where(eq(productVariants.id, item.variantId!))
            .limit(1);
          if (variant && variant.productId) {
            return {
              customerId: existing.customerId!,
              productId: variant.productId,
              unitPrice: item.unitPrice,
              currency: (existing.currency || 'USD') as 'USD' | 'RMB',
              orderId,
              transactionDate: new Date(),
              createdBy: userId,
            };
          }
          return null;
        })
    );

    const validRecords = priceHistoryRecords.filter(Boolean);
    if (validRecords.length > 0) {
      await db.insert(customerPriceHistory).values(validRecords as any);
      console.log(`[Price History] Recorded ${validRecords.length} price history entries on order ${orderId} confirmed`);
    }
  }

  return true;
}

/**
 * Get orders by status
 */
export async function getOrdersByStatus(status: string, page = 1, pageSize = 20, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const offset = (page - 1) * pageSize;

  const [orderList, totalCount] = await Promise.all([
    db.select().from(orders).where(eq(orders.status, status as any)).orderBy(desc(orders.createdAt)).limit(pageSize).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.status, status as any))
  ]);

  return {
    orders: orderList,
    total: Number(totalCount[0]?.count || 0),
    page,
    pageSize,
    totalPages: Math.ceil(Number(totalCount[0]?.count || 0) / pageSize),
  };
}
