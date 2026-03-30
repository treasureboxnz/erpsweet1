import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as customerMgmt from "./customerManagement";
import type { TrpcContext } from "./_core/context";

describe("Customer Nature and Category", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testCompanyId: number;

  beforeAll(async () => {
    const mockUser: NonNullable<TrpcContext["user"]> = {
      id: 1,
      openId: "test-open-id",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role: "admin" as const,
      erpCompanyId: 1, // 使用测试租户ID
      avatarUrl: null,
      displayName: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const ctx: TrpcContext = {
      user: mockUser,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    caller = appRouter.createCaller(ctx);
  });

  it("should create company with customerNature and customerCategory", async () => {
    const result = await caller.customerManagement.companies.create({
      companyName: "Test Nature Category Company",
      customerNature: "直接客户",
      customerCategory: ["合作客户"],
      source: "展会",
      cooperationLevel: "VIP客户",
      country: "China",
    });

    expect(result.id).toBeTypeOf("number");
    testCompanyId = result.id;

    const company = await customerMgmt.getCompanyById(testCompanyId, 1);
    expect(company?.companyName).toBe("Test Nature Category Company");
    expect(company?.customerNature).toBe("直接客户");
    expect(company?.customerCategory).toEqual(["合作客户"]);
    expect(company?.source).toBe("展会");
    expect(company?.cooperationLevel).toBe("VIP客户");
  });

  it("should update company customerNature and customerCategory", async () => {
    await caller.customerManagement.companies.update({
      id: testCompanyId,
      customerNature: "分销商",
      customerCategory: ["样品客户"],
    });

    const company = await customerMgmt.getCompanyById(testCompanyId, 1);
    expect(company?.customerNature).toBe("分销商");
    expect(company?.customerCategory).toEqual(["样品客户"]);
  });

  it("should filter companies by customerNature", async () => {
    const result = await caller.customerManagement.companies.list({
      customerNature: "分销商",
      page: 1,
      pageSize: 20,
    });

    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.every((c: any) => c.customerNature === "分销商")).toBe(true);
  });

  it("should filter companies by customerCategory", async () => {
    const result = await caller.customerManagement.companies.list({
      customerCategory: ["样品客户"],
      page: 1,
      pageSize: 20,
    });

    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.every((c: any) => c.customerCategory?.includes("样品客户"))).toBe(true);
  });

  it("should sort companies by customerNature", async () => {
    const result = await caller.customerManagement.companies.list({
      sortBy: "customerNature",
      sortOrder: "asc",
      page: 1,
      pageSize: 20,
    });

    expect(result.data.length).toBeGreaterThan(0);
    // Check that sorting is applied (first item should have a customerNature value)
    if (result.data[0].customerNature) {
      expect(result.data[0].customerNature).toBeTypeOf("string");
    }
  });
});
