import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "admin",
    erpCompanyId: 1, // 使用测试租户ID
    avatarUrl: null,
    displayName: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("dashboard queries", () => {
  it("should return dashboard stats", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.dashboard.getStats();

    expect(stats).toBeDefined();
    expect(stats).toHaveProperty("totalCustomers");
    expect(stats).toHaveProperty("totalProducts");
    expect(stats).toHaveProperty("totalOrders");
    expect(stats).toHaveProperty("totalSales");
    expect(typeof stats.totalCustomers).toBe("number");
    expect(typeof stats.totalProducts).toBe("number");
    expect(typeof stats.totalOrders).toBe("number");
    expect(typeof stats.totalSales).toBe("number");
  });

  it("should return sales trend data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const salesTrend = await caller.dashboard.getSalesTrend();

    expect(Array.isArray(salesTrend)).toBe(true);
    if (salesTrend.length > 0) {
      expect(salesTrend[0]).toHaveProperty("month");
      expect(salesTrend[0]).toHaveProperty("sales");
    }
  });

  it("should return order status distribution", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const orderStatus = await caller.dashboard.getOrderStatus();

    expect(Array.isArray(orderStatus)).toBe(true);
    if (orderStatus.length > 0) {
      expect(orderStatus[0]).toHaveProperty("name");
      expect(orderStatus[0]).toHaveProperty("value");
    }
  });

  it("should return product category stats", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const productCategories = await caller.dashboard.getProductCategories();

    expect(Array.isArray(productCategories)).toBe(true);
    if (productCategories.length > 0) {
      expect(productCategories[0]).toHaveProperty("category");
      expect(productCategories[0]).toHaveProperty("count");
    }
  });
});

describe("customer queries", () => {
  it("should return customer list", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // customers.list is not a direct route; use customerManagement.companies.list instead
    const result = await caller.customerManagement.companies.list();

    // list returns paginated object {data, total, page, pageSize}
    expect(result).toHaveProperty("data");
    expect(Array.isArray(result.data)).toBe(true);
  });
});

describe("product queries", () => {
  it("should return product list", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const products = await caller.products.list({});

    // products.list returns an array directly
    expect(Array.isArray(products)).toBe(true);
  });
});

describe("order queries", () => {
  it("should return order list", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const orders = await caller.orders.list({});

    // orders.list returns {orders, total, page, pageSize}
    expect(orders).toHaveProperty("orders");
    expect(Array.isArray(orders.orders)).toBe(true);
  });
});
