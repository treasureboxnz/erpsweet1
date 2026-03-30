import { describe, it, expect } from "vitest";
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
    erpCompanyId: 1,
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

describe("Customer Module UI Audit - Backend Validation", () => {
  describe("Company CRUD after Drawer refactor", () => {
    it("should create a company with all Drawer form fields", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const timestamp = Date.now();
      const result = await caller.customerManagement.companies.create({
        companyName: `Drawer Test ${timestamp}`,
        customerCode: `DRW${timestamp.toString().slice(-4)}`,
        customerNature: "制造商",
        customerCategory: ["家具"],
        source: "展会",
        cooperationLevel: "VIP客户",
        cooperationStatus: "developing",
        country: "China",
        city: "深圳",
        website: "https://example.com",
        notes: "Drawer测试",
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it("should return stats with all required fields", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customerManagement.companies.stats();

      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("developing");
      expect(result).toHaveProperty("cooperating");
      expect(result).toHaveProperty("stopped");
      expect(typeof result.total).toBe("number");
    });
  });

  describe("Contact CRUD after Drawer refactor", () => {
    it("should create a contact with all Drawer form fields", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const companies = await caller.customerManagement.companies.list();
      if (companies.data.length === 0) return;

      const companyId = companies.data[0].id;
      const result = await caller.customerManagement.contacts.create({
        companyId,
        fullName: "Drawer Contact Test",
        jobTitle: "采购经理",
        role: "purchaser",
        importance: "key",
        email: "test@example.com",
        mobile: "+86 138 0000 0000",
        phone: "021-12345678",
        wechat: "test_wechat",
        skype: "test_skype",
        linkedin: "https://linkedin.com/in/test",
        notes: "Drawer测试联系人",
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it("should list contacts for a company", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const companies = await caller.customerManagement.companies.list();
      if (companies.data.length === 0) return;

      const companyId = companies.data[0].id;
      const contacts = await caller.customerManagement.contacts.getByCompany(companyId);

      expect(Array.isArray(contacts)).toBe(true);
    });
  });

  describe("Filter operations with refactored search UI", () => {
    it("should filter by cooperation status", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customerManagement.companies.list({
        cooperationStatus: "developing",
      });

      expect(result).toHaveProperty("data");
      result.data.forEach((company: any) => {
        expect(company.cooperationStatus).toBe("developing");
      });
    });

    it("should search by keyword", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customerManagement.companies.list({
        search: "Test",
      });

      expect(result).toHaveProperty("data");
      expect(Array.isArray(result.data)).toBe(true);
    });
  });
});
