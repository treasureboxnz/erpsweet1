import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-admin",
    email: "admin@example.com",
    name: "Test Admin",
    loginMethod: "manus",
    role: "admin",
    erpCompanyId: 1, // 使用测试租户ID
    avatarUrl: null,
    displayName: null,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("customerManagement", () => {
  describe("companies", () => {
    it("should list all companies", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customerManagement.companies.list();

      // list returns paginated object {data, total, page, pageSize}
      expect(result).toHaveProperty("data");
      expect(Array.isArray(result.data)).toBe(true);
      expect(result).toHaveProperty("total");
    });

    it("should get company stats", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customerManagement.companies.stats();

      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("developing");
      expect(result).toHaveProperty("cooperating");
      expect(result).toHaveProperty("stopped");
      expect(typeof result.total).toBe("number");
    });

    it("should create a new company", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customerManagement.companies.create({
        companyName: `Test Company Ltd ${Date.now()}`,
        country: "United States",
        city: "New York",
      });

      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("number");
    });
  });

  describe("contacts", () => {
    it("should list all contacts", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customerManagement.contacts.list();

      // contacts.list returns an array directly (not paginated)
      expect(Array.isArray(result)).toBe(true);
    });

    it("should create a new contact", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customerManagement.contacts.create({
        fullName: "John Doe",
        jobTitle: "Purchasing Manager",
        email: "john@example.com",
        mobile: "+1234567890",
      });

      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("number");
    });
  });

  describe("followUps", () => {
    it("should create a follow-up record", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // First create a company
      const company = await caller.customerManagement.companies.create({
        companyName: "Follow-up Test Company",
      });

      // Then create a follow-up record
      const result = await caller.customerManagement.followUps.create({
        companyId: company.id,
        type: "call",
        content: "Initial contact call",
        result: "positive",
      });

      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("number");
    });
  });
});
