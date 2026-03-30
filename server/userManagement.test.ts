import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { users, operationLogs } from "../drizzle/schema";
import { eq } from "drizzle-orm";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createSuperAdminContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "super-admin-openid",
    email: "admin@example.com",
    name: "Super Admin",
    loginMethod: "manus",
    role: "super_admin",
    avatarUrl: null,
    displayName: null,
    erpCompanyId: 1,
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

function createOperatorContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "operator-openid",
    email: "operator@example.com",
    name: "Operator",
    loginMethod: "manus",
    role: "operator",
    avatarUrl: null,
    displayName: null,
    erpCompanyId: 1,
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

describe("user management", () => {
  beforeAll(async () => {
    // 创建测试operator用户（id=2）
    const db = await getDb();
    if (db) {
      // 先删除关联的operation_logs，再删除用户
      await db.delete(operationLogs).where(eq(operationLogs.userId, 2));
      await db.delete(users).where(eq(users.id, 2));
      await db.insert(users).values({
        id: 2,
        openId: "operator-openid",
        email: "operator@example.com",
        name: "Operator",
        loginMethod: "manus",
        role: "operator",
        erpCompanyId: 1,
      } as any);
    }
  });

  afterAll(async () => {
    // 清理测试用户（先删除关联的operation_logs，再删除用户）
    const db = await getDb();
    if (db) {
      await db.delete(operationLogs).where(eq(operationLogs.userId, 2));
      await db.delete(users).where(eq(users.id, 2));
    }
  });

  it("super admin can list all users", async () => {
    const { ctx } = createSuperAdminContext();
    const caller = appRouter.createCaller(ctx);

    const users = await caller.users.list();

    expect(Array.isArray(users)).toBe(true);
  });

  it("operator cannot list users", async () => {
    const { ctx } = createOperatorContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.users.list()).rejects.toThrow();
  });

  it("user can update their own profile", async () => {
    const { ctx } = createOperatorContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.users.update({
      id: 2,
      displayName: "Updated Name",
    });

    expect(result.success).toBe(true);
  });

  it("user cannot update another user's profile", async () => {
    const { ctx } = createOperatorContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.update({
        id: 1,
        displayName: "Hacked Name",
      })
    ).rejects.toThrow();
  });

  it("only super admin can update roles", async () => {
    const { ctx } = createSuperAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.users.updateRole({
      id: 2,
      role: "admin",
    });

    expect(result.success).toBe(true);
  });
});
