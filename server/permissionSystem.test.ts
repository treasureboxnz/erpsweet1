import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { hasPermission, getUserPermissions } from "./_core/permissionMiddleware";
import { getDb } from "./db";
import { positions, permissions } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Permission System", () => {
  let testPositionId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 清理可能残留的测试岗位数据
    const existingPos = await db.select().from(positions).where(eq(positions.name, "test_position_vitest"));
    if (existingPos.length > 0) {
      await db.delete(permissions).where(eq(permissions.positionId, existingPos[0].id));
      await db.delete(positions).where(eq(positions.id, existingPos[0].id));
    }

    // 创建测试岗位
    const [position] = await db.insert(positions).values({
      name: "test_position_vitest",
      displayName: "测试岗位",
      description: "用于测试的岗位",
      isSystem: false,
      erpCompanyId: 1,
    });
    testPositionId = (position as any).insertId;

    // 为测试岗位添加权限
    await db.insert(permissions).values([
      {
        positionId: testPositionId,
        module: "customer_management",
        permissionType: "read",
        erpCompanyId: 1,
      },
      {
        positionId: testPositionId,
        module: "customer_management",
        permissionType: "write",
        erpCompanyId: 1,
      },
      {
        positionId: testPositionId,
        module: "product_management",
        permissionType: "read",
        erpCompanyId: 1,
      },
    ]);
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;
    // 清理测试数据
    if (testPositionId) {
      await db.delete(permissions).where(eq(permissions.positionId, testPositionId));
      await db.delete(positions).where(eq(positions.id, testPositionId));
    }
  });

  describe("hasPermission", () => {
    it("should grant all permissions to super_admin", async () => {
      const result = await hasPermission(1, "super_admin", null, "customer_management", "delete");
      expect(result).toBe(true);
    });

    it("should grant most permissions to admin except user_management write", async () => {
      const result1 = await hasPermission(2, "admin", null, "customer_management", "delete");
      expect(result1).toBe(true);

      const result2 = await hasPermission(2, "admin", null, "user_management", "write");
      expect(result2).toBe(false);

      const result3 = await hasPermission(2, "admin", null, "user_management", "read");
      expect(result3).toBe(true);
    });

    it("should check permissions from database for custom positions", async () => {
      // 有read和write权限
      const result1 = await hasPermission(3, "operator", testPositionId, "customer_management", "read");
      expect(result1).toBe(true);

      const result2 = await hasPermission(3, "operator", testPositionId, "customer_management", "write");
      expect(result2).toBe(true);

      // 没有delete权限
      const result3 = await hasPermission(3, "operator", testPositionId, "customer_management", "delete");
      expect(result3).toBe(false);

      // product_management只有read权限
      const result4 = await hasPermission(3, "operator", testPositionId, "product_management", "read");
      expect(result4).toBe(true);

      const result5 = await hasPermission(3, "operator", testPositionId, "product_management", "write");
      expect(result5).toBe(false);
    });

    it("should deny all permissions if user has no position", async () => {
      const result = await hasPermission(4, "operator", null, "customer_management", "read");
      expect(result).toBe(false);
    });
  });

  describe("getUserPermissions", () => {
    it("should return all permissions for super_admin", async () => {
      const perms = await getUserPermissions(1, "super_admin", null);
      expect(perms.customer_management).toContain("all");
      expect(perms.product_management).toContain("all");
      expect(perms.user_management).toContain("all");
    });

    it("should return most permissions for admin", async () => {
      const perms = await getUserPermissions(2, "admin", null);
      expect(perms.customer_management).toContain("all");
      expect(perms.product_management).toContain("all");
      expect(perms.user_management).toEqual(["read"]);
    });

    it("should return position-based permissions for custom positions", async () => {
      const perms = await getUserPermissions(3, "operator", testPositionId);
      expect(perms.customer_management).toContain("read");
      expect(perms.customer_management).toContain("write");
      expect(perms.customer_management).not.toContain("delete");
      expect(perms.product_management).toContain("read");
      expect(perms.product_management).not.toContain("write");
    });

    it("should return empty permissions if user has no position", async () => {
      const perms = await getUserPermissions(4, "operator", null);
      expect(perms.customer_management).toEqual([]);
      expect(perms.product_management).toEqual([]);
    });
  });
});
