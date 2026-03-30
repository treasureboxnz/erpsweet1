import { eq, sql, count, sum, desc, and, inArray, isNull, gte, lte, isNotNull, asc, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../drizzle/schema";
import { InsertUser, users, customers, products, orders, productCategories, userInvitations, InsertUserInvitation, operationLogs, InsertOperationLog, companies, productSuppliers, suppliers, productVariants, variantPricing, customerPriceHistory, quotations, followUpRecords, orderTracking, inspections, orderFinance, orderItems } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL, { schema, mode: "default" });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
      erpCompanyId: user.erpCompanyId || 1, // Default to company 1 for OAuth users
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'super_admin';
      updateSet.role = 'super_admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Dashboard queries
export async function getDashboardStats(erpCompanyId: number) {
  const db = await getDb();
  if (!db) return { totalCustomers: 0, totalProducts: 0, totalOrders: 0, totalSales: 0, totalQuotations: 0, monthNewCustomers: 0, monthNewOrders: 0, monthSales: 0, pendingOrders: 0, processingOrders: 0, overdueFollowUpCount: 0, quotationConversionRate: 0 };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // 基础统计
  const [customerCount] = await db.select({ count: count() }).from(companies).where(eq(companies.erpCompanyId, erpCompanyId));
  const [productCount] = await db.select({ count: count() }).from(products).where(eq(products.erpCompanyId, erpCompanyId));
  const [orderCount] = await db.select({ count: count() }).from(orders).where(and(eq(orders.erpCompanyId, erpCompanyId), isNull(orders.deletedAt)));
  const [salesSum] = await db.select({ total: sum(orders.totalAmount) }).from(orders).where(and(eq(orders.erpCompanyId, erpCompanyId), isNull(orders.deletedAt)));

  // 本月新增客户
  const [monthCustomers] = await db.select({ count: count() }).from(companies).where(and(eq(companies.erpCompanyId, erpCompanyId), gte(companies.createdAt, monthStart)));
  // 上月新增客户
  const [lastMonthCustomers] = await db.select({ count: count() }).from(companies).where(and(eq(companies.erpCompanyId, erpCompanyId), gte(companies.createdAt, lastMonthStart), lte(companies.createdAt, lastMonthEnd)));

  // 本月新增订单
  const [monthOrders] = await db.select({ count: count() }).from(orders).where(and(eq(orders.erpCompanyId, erpCompanyId), isNull(orders.deletedAt), gte(orders.createdAt, monthStart)));
  // 上月新增订单
  const [lastMonthOrders] = await db.select({ count: count() }).from(orders).where(and(eq(orders.erpCompanyId, erpCompanyId), isNull(orders.deletedAt), gte(orders.createdAt, lastMonthStart), lte(orders.createdAt, lastMonthEnd)));

  // 本月销售额
  const [monthSalesSum] = await db.select({ total: sum(orders.totalAmount) }).from(orders).where(and(eq(orders.erpCompanyId, erpCompanyId), isNull(orders.deletedAt), gte(orders.createdAt, monthStart)));
  // 上月销售额
  const [lastMonthSalesSum] = await db.select({ total: sum(orders.totalAmount) }).from(orders).where(and(eq(orders.erpCompanyId, erpCompanyId), isNull(orders.deletedAt), gte(orders.createdAt, lastMonthStart), lte(orders.createdAt, lastMonthEnd)));

  // 待处理订单
  const [pendingCount] = await db.select({ count: count() }).from(orders).where(and(eq(orders.erpCompanyId, erpCompanyId), isNull(orders.deletedAt), eq(orders.status, 'pending')));
  // 处理中订单
  const [processingCount] = await db.select({ count: count() }).from(orders).where(and(eq(orders.erpCompanyId, erpCompanyId), isNull(orders.deletedAt), eq(orders.status, 'processing')));

  // 报价单总数
  const [quotationCount] = await db.select({ count: count() }).from(quotations).where(eq(quotations.erpCompanyId, erpCompanyId));
  // 已接受报价数
  const [acceptedQuotations] = await db.select({ count: count() }).from(quotations).where(and(eq(quotations.erpCompanyId, erpCompanyId), eq(quotations.status, 'accepted')));

  // 报价转化率
  const totalQuotationsNum = quotationCount?.count || 0;
  const acceptedNum = acceptedQuotations?.count || 0;
  const conversionRate = totalQuotationsNum > 0 ? Math.round((acceptedNum / totalQuotationsNum) * 100) : 0;

  // 计算环比变化
  const calcChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const pct = ((current - previous) / previous * 100).toFixed(1);
    return Number(pct) >= 0 ? `+${pct}%` : `${pct}%`;
  };

  return {
    totalCustomers: customerCount?.count || 0,
    totalProducts: productCount?.count || 0,
    totalOrders: orderCount?.count || 0,
    totalSales: Number(salesSum?.total || 0),
    totalQuotations: totalQuotationsNum,
    monthNewCustomers: monthCustomers?.count || 0,
    monthNewOrders: monthOrders?.count || 0,
    monthSales: Number(monthSalesSum?.total || 0),
    lastMonthCustomers: lastMonthCustomers?.count || 0,
    lastMonthOrders: lastMonthOrders?.count || 0,
    lastMonthSales: Number(lastMonthSalesSum?.total || 0),
    pendingOrders: pendingCount?.count || 0,
    processingOrders: processingCount?.count || 0,
    quotationConversionRate: conversionRate,
    customerChange: calcChange(monthCustomers?.count || 0, lastMonthCustomers?.count || 0),
    orderChange: calcChange(monthOrders?.count || 0, lastMonthOrders?.count || 0),
    salesChange: calcChange(Number(monthSalesSum?.total || 0), Number(lastMonthSalesSum?.total || 0)),
  };
}

export async function getSalesTrend(erpCompanyId: number) {
  const db = await getDb();
  if (!db) return [];

  // 获取最近12个月的销售趋势（真实数据）
  const result = await db.execute(sql`
    SELECT 
      DATE_FORMAT(orderDate, '%Y-%m') as yearMonth,
      DATE_FORMAT(orderDate, '%c月') as month,
      COALESCE(SUM(totalAmount), 0) as sales,
      COUNT(*) as orderCount
    FROM orders 
    WHERE erpCompanyId = ${erpCompanyId}
      AND deletedAt IS NULL
      AND orderDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY yearMonth, month
    ORDER BY yearMonth ASC
  `);

  const rows = (result as any)[0] || [];
  
  // 如果没有数据，返回最近6个月的空数据
  if (!Array.isArray(rows) || rows.length === 0) {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ month: `${d.getMonth() + 1}月`, sales: 0, orderCount: 0 });
    }
    return months;
  }

  return rows.map((r: any) => ({
    month: r.month,
    sales: Number(r.sales),
    orderCount: Number(r.orderCount),
  }));
}

export async function getOrderStatusDistribution(erpCompanyId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      status: orders.status,
      count: count(),
    })
    .from(orders)
    .where(eq(orders.erpCompanyId, erpCompanyId))
    .groupBy(orders.status);

  const statusMap: Record<string, string> = {
    pending: "待处理",
    confirmed: "已确认",
    processing: "处理中",
    shipped: "已发货",
    delivered: "已送达",
    cancelled: "已取消",
  };

  return result.map((item) => ({
    name: statusMap[item.status] || item.status,
    value: item.count,
  }));
}

export async function getProductCategoryStats(erpCompanyId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      categoryName: productCategories.name,
      count: count(),
    })
    .from(products)
    .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
    .where(eq(products.erpCompanyId, erpCompanyId))
    .groupBy(productCategories.name);

  return result.map((item) => ({
    category: item.categoryName || "未分类",
    count: item.count,
  }));
}

// Customer queries
export async function getAllCustomers() {
  const db = await getDb();
  if (!db) return [];

  // Return companies table data (customer companies)
  return await db.select().from(companies).orderBy(desc(companies.createdAt));
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result[0];
}

// Product queries
export async function getAllProducts(erpCompanyId: number) {
  const db = await getDb();
  if (!db) return [];

  // First, get all products with categories (only non-deleted)
  const productsWithCategories = await db
    .select({
      product: products,
      category: productCategories,
    })
    .from(products)
    .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
    .where(
      and(
        eq(products.erpCompanyId, erpCompanyId),
        isNull(products.deletedAt)
      )
    )
    .orderBy(desc(products.createdAt));

  // Then, for each product, get the first image and default variant info
  const { productImages, packageBoxes } = await import('../drizzle/schema');
  const productsWithDetails = await Promise.all(
    productsWithCategories.map(async (item) => {
      // Get first image
      const firstImage = await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, item.product.id))
        .orderBy(productImages.sortOrder)
        .limit(1);
      
      // Get default variant with package boxes info
      const defaultVariant = await db
        .select({
          variant: productVariants,
          totalCbm: sql<number>`COALESCE(SUM(${packageBoxes.cbm}), 0)`,
          totalGrossWeight: sql<number>`COALESCE(SUM(${packageBoxes.grossWeight}), 0)`,
          totalNetWeight: sql<number>`COALESCE(SUM(${packageBoxes.netWeight}), 0)`,
        })
        .from(productVariants)
        .leftJoin(packageBoxes, eq(packageBoxes.variantId, productVariants.id))
        .where(
          and(
            eq(productVariants.productId, item.product.id),
            eq(productVariants.isDefault, true)
          )
        )
        .groupBy(productVariants.id)
        .limit(1);

      // Get primary supplier
      const primarySupplier = await db
        .select({
          supplierId: productSuppliers.supplierId,
          supplierName: suppliers.supplierName,
        })
        .from(productSuppliers)
        .leftJoin(suppliers, eq(suppliers.id, productSuppliers.supplierId))
        .where(
          and(
            eq(productSuppliers.productId, item.product.id),
            eq(productSuppliers.isPrimary, true)
          )
        )
        .limit(1);

      // Get attribute names for shippingPort and packagingMethod
      const { attributes } = await import('../drizzle/schema');
      let shippingPortName: string | null = null;
      let packagingMethodName: string | null = null;
      if (item.product.shippingPortId) {
        const attr = await db.select({ name: attributes.name }).from(attributes).where(eq(attributes.id, item.product.shippingPortId)).limit(1);
        shippingPortName = attr[0]?.name || null;
      }
      if (item.product.packagingMethodId) {
        const attr = await db.select({ name: attributes.name }).from(attributes).where(eq(attributes.id, item.product.packagingMethodId)).limit(1);
        packagingMethodName = attr[0]?.name || null;
      }
      
      return {
        ...item,
        firstImage: firstImage[0] || null,
        defaultVariant: defaultVariant[0] || null,
        primarySupplier: primarySupplier[0] || null,
        shippingPortName,
        packagingMethodName,
      };
    })
  );

  return productsWithDetails;
}

export async function getProductById(id: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select({
      product: products,
      category: productCategories,
    })
    .from(products)
    .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
    .where(and(eq(products.id, id), eq(products.erpCompanyId, erpCompanyId)))
    .limit(1);

  return result[0];
}

export async function getProductBySku(sku: string, erpCompanyId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(products)
    .where(and(eq(products.sku, sku), eq(products.erpCompanyId, erpCompanyId), isNull(products.deletedAt)))
    .limit(1);

  return result[0];
}

// 软删除单个产品
export async function softDeleteProduct(id: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) return { success: false, message: 'Database not available' };

  try {
    await db
      .update(products)
      .set({ deletedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.erpCompanyId, erpCompanyId)));
    return { success: true };
  } catch (error) {
    console.error('[Database] Failed to soft delete product:', error);
    throw error;
  }
}

// 批量软删除产品
export async function batchSoftDeleteProducts(productIds: number[], erpCompanyId: number) {
  const db = await getDb();
  if (!db) return { success: false, message: 'Database not available' };

  try {
    await db
      .update(products)
      .set({ deletedAt: new Date() })
      .where(
        and(
          inArray(products.id, productIds),
          eq(products.erpCompanyId, erpCompanyId)
        )
      );
    return { success: true, deletedCount: productIds.length };
  } catch (error) {
    console.error('[Database] Failed to batch soft delete products:', error);
    throw error;
  }
}

// 恢复已删除的产品
export async function restoreProduct(id: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) return { success: false, message: 'Database not available' };

  try {
    await db
      .update(products)
      .set({ deletedAt: null })
      .where(and(eq(products.id, id), eq(products.erpCompanyId, erpCompanyId)));
    return { success: true };
  } catch (error) {
    console.error('[Database] Failed to restore product:', error);
    throw error;
  }
}

// 获取已删除的产品列表
export async function getDeletedProducts(erpCompanyId: number) {
  const db = await getDb();
  if (!db) return [];

  // First, get all deleted products with categories
  const deletedProductsWithCategories = await db
    .select({
      product: products,
      category: productCategories,
    })
    .from(products)
    .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
    .where(
      and(
        eq(products.erpCompanyId, erpCompanyId),
        sql`${products.deletedAt} IS NOT NULL`
      )
    )
    .orderBy(desc(products.deletedAt));

  // Then, for each product, get the first image and default variant info
  const { productImages, packageBoxes } = await import('../drizzle/schema');
  const deletedProductsWithDetails = await Promise.all(
    deletedProductsWithCategories.map(async (item) => {
      // Get first image
      const firstImage = await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, item.product.id))
        .orderBy(productImages.sortOrder)
        .limit(1);
      
      // Get default variant with package boxes info
      const defaultVariant = await db
        .select({
          variant: productVariants,
          totalCbm: sql<number>`COALESCE(SUM(${packageBoxes.cbm}), 0)`,
          totalGrossWeight: sql<number>`COALESCE(SUM(${packageBoxes.grossWeight}), 0)`,
          totalNetWeight: sql<number>`COALESCE(SUM(${packageBoxes.netWeight}), 0)`,
        })
        .from(productVariants)
        .leftJoin(packageBoxes, eq(packageBoxes.variantId, productVariants.id))
        .where(
          and(
            eq(productVariants.productId, item.product.id),
            eq(productVariants.isDefault, true)
          )
        )
        .groupBy(productVariants.id)
        .limit(1);
      
      return {
        ...item,
        firstImage: firstImage[0] || null,
        defaultVariant: defaultVariant[0] || null,
      };
    })
  );

  return deletedProductsWithDetails;
}

// 保留原有的硬删除函数（仅供系统管理员使用）
export async function batchDeleteProducts(productIds: number[]) {
  const db = await getDb();
  if (!db) return { success: false, message: 'Database not available' };

  try {
    await db.delete(products).where(inArray(products.id, productIds));
    return { success: true, deletedCount: productIds.length };
  } catch (error) {
    console.error('[Database] Failed to batch delete products:', error);
    throw error;
  }
}

export async function batchUpdateProductStatus(productIds: number[], status: string, erpCompanyId?: number) {
  const db = await getDb();
  if (!db) return { success: false, message: 'Database not available' };

  try {
    const conditions = [inArray(products.id, productIds)];
    if (erpCompanyId) conditions.push(eq(products.erpCompanyId, erpCompanyId));
    await db.update(products)
      .set({ status: status as any })
      .where(and(...conditions));
    return { success: true, updatedCount: productIds.length };
  } catch (error) {
    console.error('[Database] Failed to batch update product status:', error);
    throw error;
  }
}

// Order queries
export async function getAllOrders() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      order: orders,
      customer: customers,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .orderBy(desc(orders.createdAt));
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select({
      order: orders,
      customer: customers,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(eq(orders.id, id))
    .limit(1);

  return result[0];
}


// User management queries
export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function updateUser(id: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set(data).where(eq(users.id, id));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) return;

  // Soft delete - set status to deleted
  await db.update(users).set({ status: "deleted" }).where(eq(users.id, id));
}

export async function suspendUser(id: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ status: "suspended" }).where(eq(users.id, id));
}

export async function activateUser(id: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ status: "active" }).where(eq(users.id, id));
}

// User invitation queries
export async function createInvitation(invitation: InsertUserInvitation) {
  const db = await getDb();
  if (!db) return;

  await db.insert(userInvitations).values(invitation);
}

export async function getInvitationByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(userInvitations)
    .where(eq(userInvitations.token, token))
    .limit(1);

  return result[0];
}

export async function getInvitationsByEmail(email: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(userInvitations)
    .where(eq(userInvitations.email, email))
    .orderBy(desc(userInvitations.createdAt));
}

export async function getAcceptedInvitationByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(userInvitations)
    .where(
      and(
        eq(userInvitations.email, email),
        eq(userInvitations.status, "accepted")
      )
    )
    .orderBy(desc(userInvitations.createdAt))
    .limit(1);

  return result[0] || null;
}

export async function getAllInvitations() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      invitation: userInvitations,
      inviter: users,
    })
    .from(userInvitations)
    .leftJoin(users, eq(userInvitations.invitedBy, users.id))
    .orderBy(desc(userInvitations.createdAt));
}

export async function updateInvitationStatus(
  id: number,
  status: "pending" | "accepted" | "expired"
) {
  const db = await getDb();
  if (!db) return;

  await db.update(userInvitations).set({ status }).where(eq(userInvitations.id, id));
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

// Operation log queries
export async function createOperationLog(log: InsertOperationLog) {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(operationLogs).values(log);
  } catch (error) {
    console.error("[Database] Failed to create operation log:", error);
  }
}

export async function getAllOperationLogs(filters?: {
  userId?: number;
  module?: string;
  operationType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  erpCompanyId?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select({
      log: operationLogs,
      user: users,
    })
    .from(operationLogs)
    .leftJoin(users, eq(operationLogs.userId, users.id))
    .$dynamic();

  const conditions = [];
  if (filters?.erpCompanyId) {
    conditions.push(eq(operationLogs.erpCompanyId, filters.erpCompanyId));
  }
  if (filters?.userId) {
    conditions.push(eq(operationLogs.userId, filters.userId));
  }
  if (filters?.module) {
    conditions.push(eq(operationLogs.module, filters.module as any));
  }
  if (filters?.operationType) {
    conditions.push(eq(operationLogs.operationType, filters.operationType as any));
  }
  if (filters?.startDate) {
    conditions.push(sql`${operationLogs.createdAt} >= ${filters.startDate}`);
  }
  if (filters?.endDate) {
    conditions.push(sql`${operationLogs.createdAt} <= ${filters.endDate}`);
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  query = query.orderBy(desc(operationLogs.createdAt));

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  return await query;
}

export async function getOperationLogsByModule(module: string, limit: number = 100, erpCompanyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(operationLogs.module, module as any)];
  if (erpCompanyId) conditions.push(eq(operationLogs.erpCompanyId, erpCompanyId));
  return await db
    .select({
      log: operationLogs,
      user: users,
    })
    .from(operationLogs)
    .leftJoin(users, eq(operationLogs.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(operationLogs.createdAt))
    .limit(limit);
}

export async function createProduct(data: {
  sku: string;
  name?: string;
  description?: string;
  categoryId?: number;
  status?: 'active' | 'developing' | 'discontinued';
  productionMode?: 'make_to_order' | 'ready_stock';
  erpCompanyId: number;
}) {
  const db = await getDb();
  if (!db) return { success: false, message: 'Database not available' };

  try {
    const [{ id: newId }] = await db.insert(products).values({
      name: data.name || '',
      sku: data.sku,
      description: data.description || '',
      categoryId: data.categoryId || null,
      status: data.status || 'active',
      productionMode: data.productionMode || 'make_to_order',
      erpCompanyId: data.erpCompanyId,
    }).$returningId();

    // Get the newly created product
    const newProduct = await db.select().from(products).where(eq(products.id, newId)).limit(1);
    
    // Auto-generate default batch for the new product
    const defaultVariantCode = `${data.sku}-DEFAULT`;
    const [{ id: defaultVariantId }] = await db.insert(productVariants).values({
      productId: newId,
      variantCode: defaultVariantCode,
      variantName: '原版',
      otherChanges: 'Auto-generated default batch',
      isDefault: true,
      variantType: 'universal', // Universal batch - can be sold to any customer
      status: 'active',
      productionStatus: 'completed',
      erpCompanyId: data.erpCompanyId,
      // No customer binding - universal batch
    }).$returningId();
    
    // Create default pricing with FOB L1/L2/L3 prices (all set to 0 initially)
    await db.insert(variantPricing).values({
      variantId: defaultVariantId,
      erpCompanyId: data.erpCompanyId,
      sellingPriceFobL1: '0.00',
      sellingPriceFobL2: '0.00',
      sellingPriceFobL3: '0.00',
      effectiveDate: new Date(),
      isCurrent: true,
    });
    
    console.log(`[Product Creation] Auto-generated default batch ${defaultVariantCode} for product ${data.sku}`);
    
    return newProduct[0];
  } catch (error) {
    console.error('[Database] Failed to create product:', error);
    throw new Error('Failed to create product');
  }
}

export async function updateProduct(id: number, erpCompanyId: number, data: {
  title?: string;
  description?: string;
  sku?: string;
  status?: 'active' | 'developing' | 'discontinued';
  productionMode?: 'made_to_order' | 'ready_stock';
  remainingStock?: number | null;
  type?: string;
  vendor?: string;
  packageLength?: number | null;
  packageWidth?: number | null;
  packageHeight?: number | null;
  packageCbm?: number | null;
  volumeUnit?: 'cm' | 'm' | 'mm';
  // 新增字段
  moq?: number | null;
  shippingPortId?: number | null;
  packagingMethodId?: number | null;
  containerLoad?: string | null;
  supplyRegionId?: number | null;
  addedDate?: string | null;
  selectionLogicId?: number | null;
  styleSourceId?: number | null;
}) {
  const db = await getDb();
  if (!db) return { success: false, message: 'Database not available' };

  try {
    const updateData: any = {};
    if (data.title !== undefined) updateData.name = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.productionMode !== undefined) updateData.productionMode = data.productionMode;
    if (data.remainingStock !== undefined) updateData.remainingStock = data.remainingStock;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.vendor !== undefined) updateData.vendor = data.vendor;
    // 包装体积字段
    if (data.packageLength !== undefined) updateData.packageLength = data.packageLength;
    if (data.packageWidth !== undefined) updateData.packageWidth = data.packageWidth;
    if (data.packageHeight !== undefined) updateData.packageHeight = data.packageHeight;
    if (data.packageCbm !== undefined) updateData.packageCbm = data.packageCbm;
    if (data.volumeUnit !== undefined) updateData.volumeUnit = data.volumeUnit;
    // 新增字段
    if (data.moq !== undefined) updateData.moq = data.moq;
    if (data.shippingPortId !== undefined) updateData.shippingPortId = data.shippingPortId;
    if (data.packagingMethodId !== undefined) updateData.packagingMethodId = data.packagingMethodId;
    if (data.containerLoad !== undefined) updateData.containerLoad = data.containerLoad;
    if (data.supplyRegionId !== undefined) updateData.supplyRegionId = data.supplyRegionId;
    if (data.addedDate !== undefined) updateData.addedDate = data.addedDate ? new Date(data.addedDate) : null;
    if (data.selectionLogicId !== undefined) updateData.selectionLogicId = data.selectionLogicId;
    if (data.styleSourceId !== undefined) updateData.styleSourceId = data.styleSourceId;

    await db.update(products).set(updateData).where(and(eq(products.id, id), eq(products.erpCompanyId, erpCompanyId)));
    return { success: true };
  } catch (error) {
    console.error('Error updating product:', error);
    return { success: false, message: 'Failed to update product' };
  }
}

// ==================== 价格管理相关函数 ====================

/**
 * 获取产品的价格信息
 */
export async function getProductPricing(productId: number, erpCompanyId?: number) {
  const db = await getDb();
  if (!db) return null;
  const conditions = [eq(products.id, productId)];
  if (erpCompanyId) conditions.push(eq(products.erpCompanyId, erpCompanyId));
  const result = await db
    .select({
      id: products.id,
      factoryPriceRmbExcludingTax: products.factoryPriceRmbExcludingTax,
      factoryPriceRmbIncludingTax: products.factoryPriceRmbIncludingTax,
      factoryPriceUsdFob: products.factoryPriceUsdFob,
      myCostRmb: products.myCostRmb,
      myCostUsd: products.myCostUsd,
      fobFeeRmb: products.fobFeeRmb,
      sellingPriceRmbIncludingTax: products.sellingPriceRmbIncludingTax,
      fobLevel1: products.fobLevel1,
      fobLevel2: products.fobLevel2,
      fobLevel3: products.fobLevel3,
      rmbTaxRate: products.rmbTaxRate,
    })
    .from(products)
    .where(and(...conditions))
    .limit(1);
  return result[0] || null;
}

/**
 * 同步FOB价格到默认批次
 */
async function syncFobPricesToDefaultBatch(
  productId: number,
  fobPrices: {
    fobLevel1?: number | null;
    fobLevel2?: number | null;
    fobLevel3?: number | null;
  }
) {
  const db = await getDb();
  if (!db) return;

  try {
    // 查找默认批次
    const defaultVariants = await db
      .select()
      .from(productVariants)
      .where(
        and(
          eq(productVariants.productId, productId),
          eq(productVariants.isDefault, true)
        )
      )
      .limit(1);

    if (defaultVariants.length === 0) {
      console.log(`[FOB Sync] No default batch found for product ${productId}`);
      return;
    }

    const defaultVariant = defaultVariants[0];

    // 更新默认批次的价格
    const updateData: any = {};
    if (fobPrices.fobLevel1 !== undefined) updateData.sellingPriceFobL1 = fobPrices.fobLevel1 ? String(fobPrices.fobLevel1) : '0';
    if (fobPrices.fobLevel2 !== undefined) updateData.sellingPriceFobL2 = fobPrices.fobLevel2 ? String(fobPrices.fobLevel2) : '0';
    if (fobPrices.fobLevel3 !== undefined) updateData.sellingPriceFobL3 = fobPrices.fobLevel3 ? String(fobPrices.fobLevel3) : '0';

    if (Object.keys(updateData).length > 0) {
      await db
        .update(variantPricing)
        .set(updateData)
        .where(
          and(
            eq(variantPricing.variantId, defaultVariant.id),
            eq(variantPricing.isCurrent, true)
          )
        );

      console.log(`[FOB Sync] Updated default batch ${defaultVariant.variantCode} with FOB prices:`, updateData);
    }
  } catch (error) {
    console.error('[FOB Sync] Failed to sync FOB prices to default batch:', error);
  }
}

/**
 * 更新产品价格并记录历史
 */
export async function updateProductPricing(
  productId: number,
  pricing: {
    factoryPriceRmbExcludingTax?: number | null;
    factoryPriceRmbIncludingTax?: number | null;
    factoryPriceUsdFob?: number | null;
    myCostRmb?: number | null;
    myCostUsd?: number | null;
    fobFeeRmb?: number | null;
    sellingPriceRmbIncludingTax?: number | null;
    fobLevel1?: number | null;
    fobLevel2?: number | null;
    fobLevel3?: number | null;
    rmbTaxRate?: number | null;
  },
  userId?: number,
  erpCompanyId: number = 1
) {
  const db = await getDb();
  if (!db) return { success: false, message: 'Database not available' };

  try {
    // 获取当前价格用于对比
    const currentPricing = await getProductPricing(productId);
    
    // 更新产品价格
    const updateData: any = {};
    if (pricing.factoryPriceRmbExcludingTax !== undefined) updateData.factoryPriceRmbExcludingTax = pricing.factoryPriceRmbExcludingTax;
    if (pricing.factoryPriceRmbIncludingTax !== undefined) updateData.factoryPriceRmbIncludingTax = pricing.factoryPriceRmbIncludingTax;
    if (pricing.factoryPriceUsdFob !== undefined) updateData.factoryPriceUsdFob = pricing.factoryPriceUsdFob;
    if (pricing.myCostRmb !== undefined) updateData.myCostRmb = pricing.myCostRmb;
    if (pricing.myCostUsd !== undefined) updateData.myCostUsd = pricing.myCostUsd;
    if (pricing.fobFeeRmb !== undefined) updateData.fobFeeRmb = pricing.fobFeeRmb;
    if (pricing.sellingPriceRmbIncludingTax !== undefined) updateData.sellingPriceRmbIncludingTax = pricing.sellingPriceRmbIncludingTax;
    if (pricing.fobLevel1 !== undefined) updateData.fobLevel1 = pricing.fobLevel1;
    if (pricing.fobLevel2 !== undefined) updateData.fobLevel2 = pricing.fobLevel2;
    if (pricing.fobLevel3 !== undefined) updateData.fobLevel3 = pricing.fobLevel3;
    if (pricing.rmbTaxRate !== undefined) updateData.rmbTaxRate = pricing.rmbTaxRate;
    
    await db.update(products)
      .set(updateData)
      .where(eq(products.id, productId));

    // 记录价格变更历史
    const { priceHistory } = await import('../drizzle/schema');
    const priceFields = [
      { key: 'factoryPriceRmbExcludingTax', label: '工厂 RMB 成本不含税' },
      { key: 'factoryPriceRmbIncludingTax', label: '工厂 RMB 成本含税' },
      { key: 'factoryPriceUsdFob', label: '工厂 FOB 美金' },
      { key: 'myCostRmb', label: '我的人民币成本含税' },
      { key: 'myCostUsd', label: '我的美金成本含税' },
      { key: 'fobFeeRmb', label: 'FOB 费用 RMB' },
      { key: 'sellingPriceRmbIncludingTax', label: 'RMB含税价' },
      { key: 'fobLevel1', label: 'FOB Level1' },
      { key: 'fobLevel2', label: 'FOB Level2' },
      { key: 'fobLevel3', label: 'FOB Level3' },
      { key: 'rmbTaxRate', label: 'RMB税率' },
    ];

    for (const field of priceFields) {
      const newValue = pricing[field.key as keyof typeof pricing];
      const oldValue = currentPricing?.[field.key as keyof typeof currentPricing];
      
      // 只记录有变化的字段
      if (newValue !== undefined && newValue !== oldValue) {
        await db.insert(priceHistory).values({
          erpCompanyId,
          productId,
          fieldName: field.key,
          fieldLabel: field.label,
          oldValue: oldValue ? String(oldValue) : null,
          newValue: newValue ? String(newValue) : null,
          changedBy: userId,
          changedAt: new Date(),
        });
      }
    }

    // 如果FOB价格有更新，同步到默认批次
    if (pricing.fobLevel1 !== undefined || pricing.fobLevel2 !== undefined || pricing.fobLevel3 !== undefined) {
      await syncFobPricesToDefaultBatch(productId, {
        fobLevel1: pricing.fobLevel1,
        fobLevel2: pricing.fobLevel2,
        fobLevel3: pricing.fobLevel3,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('[Database] Failed to update product pricing:', error);
    throw error;
  }
}

/**
 * 获取产品价格变更历史
 */
export async function getProductPriceHistory(productId: number, erpCompanyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const { priceHistory } = await import('../drizzle/schema');
  
  const conditions = [eq(priceHistory.productId, productId)];
  if (erpCompanyId) conditions.push(eq(priceHistory.erpCompanyId, erpCompanyId));
  const result = await db
    .select({
      id: priceHistory.id,
      fieldName: priceHistory.fieldName,
      fieldLabel: priceHistory.fieldLabel,
      oldValue: priceHistory.oldValue,
      newValue: priceHistory.newValue,
      changedAt: priceHistory.changedAt,
      changedBy: priceHistory.changedBy,
      userName: users.name,
    })
    .from(priceHistory)
    .leftJoin(users, eq(priceHistory.changedBy, users.id))
    .where(and(...conditions))
    .orderBy(desc(priceHistory.changedAt));
  return result;
}

// ==================== 成本快照管理函数 ====================

/**
 * 创建成本快照（每次保存成本时自动调用）
 */
export async function createCostSnapshot(
  productId: number,
  pricing: {
    factoryPriceRmbExcludingTax?: number | null;
    factoryPriceRmbIncludingTax?: number | null;
    factoryPriceUsdFob?: number | null;
    myCostRmb?: number | null;
    myCostUsd?: number | null;
    fobFeeRmb?: number | null;
    sellingPriceRmbIncludingTax?: number | null;
    fobLevel1?: number | null;
    fobLevel2?: number | null;
    fobLevel3?: number | null;
    rmbTaxRate?: number | null;
  },
  exchangeRate: number,
  userId?: number,
  erpCompanyId?: number,
  note?: string
) {
  const db = await getDb();
  if (!db) return null;

  try {
    const { costSnapshots } = await import('../drizzle/schema');
    
    const toStr = (v: number | null | undefined) => v != null ? String(v) : null;
    
    await db.insert(costSnapshots).values({
      erpCompanyId: erpCompanyId || 1,
      productId,
      factoryPriceRmbExcludingTax: toStr(pricing.factoryPriceRmbExcludingTax),
      factoryPriceRmbIncludingTax: toStr(pricing.factoryPriceRmbIncludingTax),
      factoryPriceUsdFob: toStr(pricing.factoryPriceUsdFob),
      myCostRmb: toStr(pricing.myCostRmb),
      myCostUsd: toStr(pricing.myCostUsd),
      fobFeeRmb: toStr(pricing.fobFeeRmb),
      sellingPriceRmbIncludingTax: toStr(pricing.sellingPriceRmbIncludingTax),
      fobLevel1: toStr(pricing.fobLevel1),
      fobLevel2: toStr(pricing.fobLevel2),
      fobLevel3: toStr(pricing.fobLevel3),
      rmbTaxRate: toStr(pricing.rmbTaxRate),
      exchangeRate: String(exchangeRate),
      note: note || null,
      createdBy: userId,
      createdAt: new Date(),
    });
    
    return { success: true };
  } catch (error) {
    console.error('[Database] Failed to create cost snapshot:', error);
    return null;
  }
}

/**
 * 获取产品的成本快照历史
 */
export async function getCostSnapshots(productId: number, erpCompanyId?: number) {
  const db = await getDb();
  if (!db) return [];

  const { costSnapshots } = await import('../drizzle/schema');
  
  const conditions = [eq(costSnapshots.productId, productId)];
  if (erpCompanyId) conditions.push(eq(costSnapshots.erpCompanyId, erpCompanyId));
  const result = await db
    .select({
      id: costSnapshots.id,
      factoryPriceRmbExcludingTax: costSnapshots.factoryPriceRmbExcludingTax,
      factoryPriceRmbIncludingTax: costSnapshots.factoryPriceRmbIncludingTax,
      factoryPriceUsdFob: costSnapshots.factoryPriceUsdFob,
      myCostRmb: costSnapshots.myCostRmb,
      myCostUsd: costSnapshots.myCostUsd,
      fobFeeRmb: costSnapshots.fobFeeRmb,
      sellingPriceRmbIncludingTax: costSnapshots.sellingPriceRmbIncludingTax,
      fobLevel1: costSnapshots.fobLevel1,
      fobLevel2: costSnapshots.fobLevel2,
      fobLevel3: costSnapshots.fobLevel3,
      rmbTaxRate: costSnapshots.rmbTaxRate,
      exchangeRate: costSnapshots.exchangeRate,
      note: costSnapshots.note,
      createdBy: costSnapshots.createdBy,
      createdAt: costSnapshots.createdAt,
      userName: users.name,
    })
    .from(costSnapshots)
    .leftJoin(users, eq(costSnapshots.createdBy, users.id))
    .where(and(...conditions))
    .orderBy(desc(costSnapshots.createdAt));

  return result;
}

// ==================== 产品-供应商关联管理函数 ====================

/**
 * 获取产品的供应商列表
 */
export async function getProductSuppliers(productId: number, erpCompanyId?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(productSuppliers.productId, productId)];
  if (erpCompanyId) conditions.push(eq(productSuppliers.erpCompanyId, erpCompanyId));
  const result = await db
    .select({
      id: productSuppliers.id,
      productId: productSuppliers.productId,
      supplierId: productSuppliers.supplierId,
      isPrimary: productSuppliers.isPrimary,
      supplierName: suppliers.supplierName,
      contactPerson: suppliers.contactPerson,
      email: suppliers.email,
      phone: suppliers.phone,
      createdAt: productSuppliers.createdAt,
    })
    .from(productSuppliers)
    .leftJoin(suppliers, eq(productSuppliers.supplierId, suppliers.id))
    .where(and(...conditions))
    .orderBy(desc(productSuppliers.isPrimary));

  return result;
}

/**
 * 添加产品-供应商关联
 */
export async function addProductSupplier(data: {
  productId: number;
  supplierId: number;
  isPrimary?: boolean;
  erpCompanyId?: number;
}) {
  const db = await getDb();
  if (!db) return { success: false, message: 'Database not available' };

  try {
    // 如果设置为主供应商，先将其他供应商的isPrimary设为false
    if (data.isPrimary) {
      await db
        .update(productSuppliers)
        .set({ isPrimary: false })
        .where(eq(productSuppliers.productId, data.productId));
    }

    await db.insert(productSuppliers).values({
      productId: data.productId,
      supplierId: data.supplierId,
      isPrimary: data.isPrimary || false,
      erpCompanyId: data.erpCompanyId || 1,
    });

    return { success: true };
  } catch (error) {
    console.error('[Database] Failed to add product supplier:', error);
    throw error;
  }
}

/**
 * 移除产品-供应商关联
 */
export async function removeProductSupplier(id: number, erpCompanyId?: number) {
  const db = await getDb();
  if (!db) return { success: false, message: 'Database not available' };

  try {
    const conditions = [eq(productSuppliers.id, id)];
    if (erpCompanyId) conditions.push(eq(productSuppliers.erpCompanyId, erpCompanyId));
    await db.delete(productSuppliers).where(and(...conditions));
    return { success: true };
  } catch (error) {
    console.error('[Database] Failed to remove product supplier:', error);
    throw error;
  }
}

/**
 * 设置主供应商
 */
export async function setPrimarySupplier(productId: number, supplierId: number, erpCompanyId?: number) {
  const db = await getDb();
  if (!db) return { success: false, message: 'Database not available' };

  try {
    // 先将所有供应商的isPrimary设为false
    const resetConditions = [eq(productSuppliers.productId, productId)];
    if (erpCompanyId) resetConditions.push(eq(productSuppliers.erpCompanyId, erpCompanyId));
    await db
      .update(productSuppliers)
      .set({ isPrimary: false })
      .where(and(...resetConditions));

    // 再将指定供应商设为主供应商
    const setConditions = [
      eq(productSuppliers.productId, productId),
      eq(productSuppliers.supplierId, supplierId),
    ];
    if (erpCompanyId) setConditions.push(eq(productSuppliers.erpCompanyId, erpCompanyId));
    await db
      .update(productSuppliers)
      .set({ isPrimary: true })
      .where(and(...setConditions));

    return { success: true };
  } catch (error) {
    console.error('[Database] Failed to set primary supplier:', error);
    throw error;
  }
}

/**
 * Get customer's last transaction price for a specific product
 */
export async function getCustomerLastPrice(customerId: number, productId: number, currency?: "USD" | "RMB"): Promise<string | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const conditions = [
    eq(customerPriceHistory.customerId, customerId),
    eq(customerPriceHistory.productId, productId)
  ];
  
  // 如果指定了货币类型，则只查询对应货币的历史价格
  if (currency) {
    conditions.push(eq(customerPriceHistory.currency, currency));
  }
  
  const [lastPrice] = await db
    .select()
    .from(customerPriceHistory)
    .where(and(...conditions))
    .orderBy(desc(customerPriceHistory.transactionDate))
    .limit(1);
  
  return lastPrice ? lastPrice.unitPrice : null;
}


// ========== 报表中心真实数据查询 ==========

export async function getReportStats(erpCompanyId: number, dateFrom?: Date, dateTo?: Date) {
  const db = await getDb();
  if (!db) return { totalSales: 0, totalOrders: 0, activeCustomers: 0, avgProfitRate: 0 };

  const conditions = [eq(orders.erpCompanyId, erpCompanyId), isNull(orders.deletedAt)];
  if (dateFrom) conditions.push(gte(orders.orderDate, dateFrom));
  if (dateTo) conditions.push(lte(orders.orderDate, dateTo));

  // 总销售额和订单数
  const [salesData] = await db.select({
    totalSales: sum(orders.totalAmount),
    totalOrders: count(),
  }).from(orders).where(and(...conditions));

  // 活跃客户数（在日期范围内有订单的客户）
  const activeCustomerResult = await db.execute(sql`
    SELECT COUNT(DISTINCT customerId) as activeCount
    FROM orders
    WHERE erpCompanyId = ${erpCompanyId}
      AND deletedAt IS NULL
      ${dateFrom ? sql`AND orderDate >= ${dateFrom}` : sql``}
      ${dateTo ? sql`AND orderDate <= ${dateTo}` : sql``}
  `);
  const activeCustomers = ((activeCustomerResult as any)[0]?.[0]?.activeCount) || 0;

  // 如果没有日期范围，使用全部客户数
  let totalActiveCustomers = activeCustomers;
  if (!dateFrom && !dateTo) {
    const [allCustomers] = await db.select({ count: count() }).from(companies).where(eq(companies.erpCompanyId, erpCompanyId));
    totalActiveCustomers = allCustomers?.count || 0;
  }

  return {
    totalSales: Number(salesData?.totalSales || 0),
    totalOrders: salesData?.totalOrders || 0,
    activeCustomers: totalActiveCustomers,
    avgProfitRate: 0, // 利润率需要成本数据，暂时返回0
  };
}

// ========== 最近活动查询（真实数据） ==========

export async function getRecentActivities(erpCompanyId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  // 从操作日志获取最近活动
  const logs = await db.select({
    id: operationLogs.id,
    operationType: operationLogs.operationType,
    module: operationLogs.module,
    targetName: operationLogs.targetName,
    userName: operationLogs.userName,
    createdAt: operationLogs.createdAt,
  })
  .from(operationLogs)
  .where(eq(operationLogs.erpCompanyId, erpCompanyId))
  .orderBy(desc(operationLogs.createdAt))
  .limit(limit);

  const operationMap: Record<string, string> = {
    create: "新增",
    update: "更新",
    delete: "删除",
    suspend: "停用",
    activate: "启用",
  };

  const moduleMap: Record<string, string> = {
    customer: "客户",
    product: "产品",
    order: "订单",
    user: "用户",
    price: "价格",
  };

  return logs.map((log) => {
    const action = `${operationMap[log.operationType] || log.operationType}${moduleMap[log.module] || log.module}`;
    const timeAgo = getTimeAgo(log.createdAt);
    return {
      action,
      name: log.targetName || "",
      time: timeAgo,
      type: log.module,
      userName: log.userName,
    };
  });
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "刚刚";
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 30) return `${diffDays}天前`;
  return `${Math.floor(diffDays / 30)}个月前`;
}
