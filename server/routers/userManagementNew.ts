/**
 * 用户管理 Router - 支持多租户和自建认证
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getUsersByCompanyId,
  createUser,
  deleteUser,
  updateUserPassword,
  getUserById,
} from "../db_auth.js";
import { hashPassword } from "../utils/password.js";

// 管理员权限检查
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "只有管理员可以执行此操作",
    });
  }
  return next({ ctx });
});

export const userManagementNewRouter = router({
  // 获取当前公司的所有用户
  list: adminProcedure.query(async ({ ctx }) => {
    if (!ctx.user.erpCompanyId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "用户未关联公司",
      });
    }
    return await getUsersByCompanyId(ctx.user.erpCompanyId);
  }),

  // 添加用户（管理员设定密码）
  create: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(1),
        password: z.string().min(6),
        role: z.enum(["operator", "admin", "super_admin"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 检查邮箱是否已存在
      const { getUserByEmail } = await import("../db_auth.js");
      const existingUser = await getUserByEmail(input.email);
      if (existingUser) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "该邮箱已被注册",
        });
      }

      // 加密密码
      const passwordHash = await hashPassword(input.password);

      // 创建用户
      if (!ctx.user.erpCompanyId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "用户未关联公司",
        });
      }
      const userId = await createUser({
        erpCompanyId: ctx.user.erpCompanyId,
        email: input.email,
        name: input.name,
        passwordHash,
        role: input.role || "operator",
        mustChangePassword: false, // 管理员设定的密码，不强制修改
      });

      return {
        success: true,
        userId,
      };
    }),

  // 重置用户密码（管理员操作）
  resetPassword: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        newPassword: z.string().min(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 检查用户是否存在且属于同一公司
      const user = await getUserById(input.userId);
      if (!user || !ctx.user.erpCompanyId || user.erpCompanyId !== ctx.user.erpCompanyId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "用户不存在",
        });
      }

      // 加密新密码
      const passwordHash = await hashPassword(input.newPassword);

      // 更新密码
      await updateUserPassword(input.userId, passwordHash);

      return { success: true };
    }),

  // 删除用户
  delete: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // 检查用户是否存在且属于同一公司
      const user = await getUserById(input.userId);
      if (!user || !ctx.user.erpCompanyId || user.erpCompanyId !== ctx.user.erpCompanyId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "用户不存在",
        });
      }

      // 不能删除自己
      if (user.id === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "不能删除自己",
        });
      }

      await deleteUser(input.userId);

      return { success: true };
    }),
});
