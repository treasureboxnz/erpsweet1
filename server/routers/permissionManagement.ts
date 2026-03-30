import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import { positions, permissions, users, operationLogs } from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";

// 权限类型枚举
const permissionTypeEnum = z.enum(["read", "write", "download", "delete", "all"]);

// 模块枚举
const moduleEnum = z.enum([
  "customer_management",
  "product_management",
  "order_management",
  "report_center",
  "user_management",
  "operation_logs",
]);

// 只有管理员和超级管理员可以访问
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "只有管理员和超级管理员可以访问此功能",
    });
  }
  return next({ ctx });
});

export const positionsRouter = router({
  // 获取所有岗位
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const conditions = ctx.user.erpCompanyId ? [eq(positions.erpCompanyId, ctx.user.erpCompanyId)] : [];
    const allPositions = conditions.length > 0
      ? await db.select().from(positions).where(and(...conditions)).orderBy(positions.id)
      : await db.select().from(positions).orderBy(positions.id);
    return allPositions;
  }),

  // 创建岗位（仅管理员/超级管理员）
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        displayName: z.string().min(1).max(100),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // 检查岗位名称是否已存在
      const existing = await db
        .select()
        .from(positions)
        .where(eq(positions.name, input.name))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "岗位名称已存在",
        });
      }

      const [result] = await db.insert(positions).values({
        erpCompanyId: ctx.user.erpCompanyId,
        name: input.name,
        displayName: input.displayName,
        description: input.description,
        isSystem: false,
      });

      // 记录操作日志
      await db.insert(operationLogs).values({
        erpCompanyId: ctx.user.erpCompanyId,
        userId: ctx.user.id,
        userName: ctx.user.name || ctx.user.displayName || "未知用户",
        operationType: "create",
        module: "user",
        targetId: Number(result.insertId),
        targetName: input.displayName,
        details: `创建岗位: ${input.displayName}`,
      });

      return { id: result.insertId };
    }),

  // 更新岗位（仅管理员/超级管理员）
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        displayName: z.string().min(1).max(100),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // 检查岗位是否存在
      const [position] = await db
        .select()
        .from(positions)
        .where(eq(positions.id, input.id))
        .limit(1);

      if (!position) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "岗位不存在",
        });
      }

      // 系统岗位不允许修改名称
      if (position.isSystem) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "系统岗位不允许修改",
        });
      }

      await db
        .update(positions)
        .set({
          displayName: input.displayName,
          description: input.description,
        })
        .where(eq(positions.id, input.id));

      // 记录操作日志
      await db.insert(operationLogs).values({
        erpCompanyId: ctx.user.erpCompanyId,
        userId: ctx.user.id,
        userName: ctx.user.name || ctx.user.displayName || "未知用户",
        operationType: "update",
        module: "user",
        targetId: input.id,
        targetName: input.displayName,
        details: `更新岗位: ${input.displayName}`,
      });

      return { success: true };
    }),

  // 删除岗位（仅管理员/超级管理员）
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // 检查岗位是否存在
      const [position] = await db
        .select()
        .from(positions)
        .where(eq(positions.id, input.id))
        .limit(1);

      if (!position) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "岗位不存在",
        });
      }

      // 系统岗位不允许删除
      if (position.isSystem) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "系统岗位不允许删除",
        });
      }

      // 检查是否有用户使用此岗位
      const usersWithPosition = await db
        .select()
        .from(users)
        .where(eq(users.positionId, input.id))
        .limit(1);

      if (usersWithPosition.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "该岗位下还有用户，无法删除",
        });
      }

      // 删除岗位（会级联删除相关权限）
      await db.delete(positions).where(eq(positions.id, input.id));

      // 记录操作日志
      await db.insert(operationLogs).values({
        erpCompanyId: ctx.user.erpCompanyId,
        userId: ctx.user.id,
        userName: ctx.user.name || ctx.user.displayName || "未知用户",
        operationType: "delete",
        module: "user",
        targetId: input.id,
        targetName: position.displayName,
        details: `删除岗位: ${position.displayName}`,
      });

      return { success: true };
    }),
});

export const permissionsRouter = router({
  // 获取指定岗位的权限
  getByPosition: protectedProcedure
    .input(z.object({ positionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const positionPermissions = await db
        .select()
        .from(permissions)
        .where(eq(permissions.positionId, input.positionId));
      return positionPermissions;
    }),

  // 获取权限矩阵（所有岗位的所有权限）
  getMatrix: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    
    const posConditions = ctx.user.erpCompanyId ? [eq(positions.erpCompanyId, ctx.user.erpCompanyId)] : [];
    const allPositions = posConditions.length > 0
      ? await db.select().from(positions).where(and(...posConditions)).orderBy(positions.id)
      : await db.select().from(positions).orderBy(positions.id);
    const permConditions = ctx.user.erpCompanyId ? [eq(permissions.erpCompanyId, ctx.user.erpCompanyId)] : [];
    const allPermissions = permConditions.length > 0
      ? await db.select().from(permissions).where(and(...permConditions))
      : await db.select().from(permissions);

    // 构建权限矩阵
    const matrix = allPositions.map((position: typeof positions.$inferSelect) => ({
      position,
      permissions: allPermissions.filter((p: typeof permissions.$inferSelect) => p.positionId === position.id),
    }));

    return matrix;
  }),

  // 更新权限矩阵（仅管理员/超级管理员）
  updateMatrix: adminProcedure
    .input(
      z.object({
        positionId: z.number(),
        module: moduleEnum,
        permissionTypes: z.array(permissionTypeEnum),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // 删除该岗位在该模块的所有权限
      await db
        .delete(permissions)
        .where(
          and(
            eq(permissions.positionId, input.positionId),
            eq(permissions.module, input.module)
          )
        );

      // 插入新的权限
      if (input.permissionTypes.length > 0) {
        const permissionsToInsert = input.permissionTypes.map((type) => ({
          erpCompanyId: ctx.user.erpCompanyId,
          positionId: input.positionId,
          module: input.module,
          permissionType: type,
        }));

        await db.insert(permissions).values(permissionsToInsert);
      }

      // 记录操作日志
      await db.insert(operationLogs).values({
        erpCompanyId: ctx.user.erpCompanyId,
        userId: ctx.user.id,
        userName: ctx.user.name || ctx.user.displayName || "未知用户",
        operationType: "update",
        module: "user",
        targetId: input.positionId,
        targetName: input.module,
        details: `更新权限: 岗位ID ${input.positionId}, 模块 ${input.module}`,
      });

      return { success: true };
    }),

  // 检查当前用户是否有指定权限
  check: protectedProcedure
    .input(
      z.object({
        module: moduleEnum,
        permissionType: permissionTypeEnum,
      })
    )
    .query(async ({ input, ctx }) => {
      // 超级管理员拥有所有权限
      if (ctx.user.role === "super_admin") {
        return { hasPermission: true };
      }

      // 如果用户没有岗位，则无权限
      if (!ctx.user.positionId) {
        return { hasPermission: false };
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // 查询用户岗位的权限
      const userPermissions = await db
        .select()
        .from(permissions)
        .where(
          and(
            eq(permissions.positionId, ctx.user.positionId),
            eq(permissions.module, input.module)
          )
        );

      // 检查是否有对应权限或all权限
      const hasPermission = userPermissions.some(
        (p: typeof permissions.$inferSelect) => p.permissionType === input.permissionType || p.permissionType === "all"
      );

      return { hasPermission };
    }),

  // 获取用户权限（按模块分组）
  getUserPermissions: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    // 超级管理员拥有所有权限
    if (ctx.user.role === "super_admin") {
      return {
        customer_management: ["read", "write", "download", "delete", "all"],
        product_management: ["read", "write", "download", "delete", "all"],
        order_management: ["read", "write", "download", "delete", "all"],
        report_center: ["read", "write", "download", "delete", "all"],
        user_management: ["read", "write", "download", "delete", "all"],
        operation_logs: ["read", "write", "download", "delete", "all"],
      };
    }

    // 管理员拥有大部分权限
    if (ctx.user.role === "admin") {
      return {
        customer_management: ["read", "write", "download", "delete", "all"],
        product_management: ["read", "write", "download", "delete", "all"],
        order_management: ["read", "write", "download", "delete", "all"],
        report_center: ["read", "write", "download", "delete", "all"],
        user_management: ["read"],
        operation_logs: ["read", "write", "download", "delete", "all"],
      };
    }

    // 如果用户没有岗位，则无权限
    if (!ctx.user.positionId) {
      return {
        customer_management: [],
        product_management: [],
        order_management: [],
        report_center: [],
        user_management: [],
        operation_logs: [],
      };
    }

    // 查询用户岗位的所有权限
    const userPermissions = await db
      .select()
      .from(permissions)
      .where(eq(permissions.positionId, ctx.user.positionId));

    // 按模块分组
    const groupedPermissions: Record<string, string[]> = {
      customer_management: [],
      product_management: [],
      order_management: [],
      report_center: [],
      user_management: [],
      operation_logs: [],
    };

    for (const p of userPermissions) {
      if (!groupedPermissions[p.module]) {
        groupedPermissions[p.module] = [];
      }
      groupedPermissions[p.module].push(p.permissionType);
    }

    return groupedPermissions;
  }),

  // 获取当前用户的所有权限
  getCurrentUserPermissions: protectedProcedure.query(async ({ ctx }) => {
    // 超级管理员拥有所有权限
    if (ctx.user.role === "super_admin") {
      const modules = [
        "customer_management",
        "product_management",
        "order_management",
        "report_center",
        "user_management",
        "operation_logs",
      ];
      return modules.map((module) => ({
        module,
        permissionType: "all" as const,
      }));
    }

    // 如果用户没有岗位，则无权限
    if (!ctx.user.positionId) {
      return [];
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    // 查询用户岗位的所有权限
    const userPermissions = await db
      .select()
      .from(permissions)
      .where(eq(permissions.positionId, ctx.user.positionId));

    return userPermissions.map((p: typeof permissions.$inferSelect) => ({
      module: p.module,
      permissionType: p.permissionType,
    }));
  }),
});
