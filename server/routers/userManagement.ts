import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { nanoid } from "nanoid";
import { getDb } from "../db";
import { positions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Admin or super_admin only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "只有管理员可以执行此操作",
    });
  }
  return next({ ctx });
});

// Super admin only procedure
const superAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "super_admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "只有超级管理员可以执行此操作",
    });
  }
  return next({ ctx });
});

export const userManagementRouter = router({
  // Get all users (admin+)
  list: adminProcedure.query(async () => {
    return await db.getAllUsers();
  }),

  // Get user by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const user = await db.getUserById(input.id);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
      }
      return user;
    }),

  // Update user profile (self or admin)
  // 普通用户可以更新自己的displayName，管理员可以更新任意用户的任意字段
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        displayName: z.string().optional(),
        role: z.enum(["operator", "admin", "super_admin"]).optional(),
        status: z.enum(["active", "suspended", "deleted"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      // 普通用户只能更新自己的profile，且不能修改角色和状态
      const isSelf = ctx.user.id === id;
      const isAdmin = ctx.user.role === "admin" || ctx.user.role === "super_admin";
      if (!isSelf && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "只能更新自己的账户信息",
        });
      }
      // 普通用户不能修改角色和状态
      if (isSelf && !isAdmin) {
        delete (data as any).role;
        delete (data as any).status;
      }

      // Check if user exists
      const existingUser = await db.getUserById(id);
      if (!existingUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "用户不存在",
        });
      }

      // Update user
      await db.updateUser(id, data);
      
      // Log the operation
      await db.createOperationLog({
        erpCompanyId: ctx.user.erpCompanyId,
        userId: ctx.user.id,
        userName: ctx.user.name || "Unknown",
        operationType: "update",
        module: "user",
        targetId: id,
        targetName: existingUser.name || "Unknown",
        details: `更新用户信息: ${existingUser.email}`,
        ipAddress: ctx.req.ip || ctx.req.headers["x-forwarded-for"] as string || "unknown",
      });
      
      return { success: true };
    }),

  // Update user role (super admin only)
  updateRole: superAdminProcedure
    .input(
      z.object({
        id: z.number(),
        role: z.enum(["operator", "admin", "super_admin"]),
      })
    )
    .mutation(async ({ input }) => {
      await db.updateUser(input.id, { role: input.role });
      return { success: true };
    }),

  // Delete user (super admin only) - soft delete
  delete: superAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteUser(input.id);
      
      // Log the operation
      const targetUser = await db.getUserById(input.id);
      await db.createOperationLog({
        erpCompanyId: ctx.user.erpCompanyId,
        userId: ctx.user.id,
        userName: ctx.user.displayName || ctx.user.name || "Unknown",
        operationType: "delete",
        module: "user",
        targetId: input.id,
        targetName: targetUser?.displayName || targetUser?.name || "Unknown",
        details: `删除用户: ${targetUser?.email}`,
        ipAddress: ctx.req.ip || ctx.req.headers["x-forwarded-for"] as string || "unknown",
      });
      
      return { success: true };
    }),

  // Suspend user (super admin only)
  suspend: superAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.suspendUser(input.id);
      
      // Log the operation
      const targetUser = await db.getUserById(input.id);
      await db.createOperationLog({
        erpCompanyId: ctx.user.erpCompanyId,
        userId: ctx.user.id,
        userName: ctx.user.displayName || ctx.user.name || "Unknown",
        operationType: "suspend",
        module: "user",
        targetId: input.id,
        targetName: targetUser?.displayName || targetUser?.name || "Unknown",
        details: `暂停用户: ${targetUser?.email}`,
        ipAddress: ctx.req.ip || ctx.req.headers["x-forwarded-for"] as string || "unknown",
      });
      
      return { success: true };
    }),

  // Activate user (super admin only)
  activate: superAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.activateUser(input.id);
      
      // Log the operation
      const targetUser = await db.getUserById(input.id);
      await db.createOperationLog({
        erpCompanyId: ctx.user.erpCompanyId,
        userId: ctx.user.id,
        userName: ctx.user.displayName || ctx.user.name || "Unknown",
        operationType: "activate",
        module: "user",
        targetId: input.id,
        targetName: targetUser?.displayName || targetUser?.name || "Unknown",
        details: `激活用户: ${targetUser?.email}`,
        ipAddress: ctx.req.ip || ctx.req.headers["x-forwarded-for"] as string || "unknown",
      });
      
      return { success: true };
    }),

  // Invite user (admin+)
  invite: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        positionId: z.number(),
        origin: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get position to determine role
      const database = await getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }
      
      const [position] = await database
        .select()
        .from(positions)
        .where(eq(positions.id, input.positionId))
        .limit(1);
        
      if (!position) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "岗位不存在",
        });
      }
      
      // Determine role based on position name
      let role: "operator" | "admin" | "super_admin" = "operator";
      if (position.name === "super_admin") {
        role = "super_admin";
      } else if (position.name === "admin") {
        role = "admin";
      }
      // Check if user already exists
      const existingUser = await db.getUserByEmail(input.email);
      if (existingUser) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "该邮箱已被注册",
        });
      }

      // Check if there's a pending invitation
      const existingInvitations = await db.getInvitationsByEmail(input.email);
      const pendingInvitation = existingInvitations.find(
        (inv) => inv.status === "pending"
      );

      if (pendingInvitation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "该邮箱已有待处理的邀请",
        });
      }

      // Only super_admin can invite admin or super_admin
      if (
        (role === "admin" || role === "super_admin") &&
        ctx.user.role !== "super_admin"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "只有超级管理员可以邀请管理员",
        });
      }

      // Create invitation
      const token = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      await db.createInvitation({
        email: input.email,
        erpCompanyId: ctx.user.erpCompanyId,
        role: role,
        invitedBy: ctx.user.id,
        token,
        status: "pending",
        expiresAt,
        positionId: input.positionId,
      });

      // TODO: Send invitation email
      // For now, return the invitation link
      const inviteUrl = `${input.origin || process.env.VITE_APP_URL || "http://localhost:3000"}/invite/${token}`;

      return {
        success: true,
        inviteUrl,
        message: "邀请已创建，请将邀请链接发送给用户",
      };
    }),

  // Get all invitations (admin+)
  listInvitations: adminProcedure.query(async () => {
    return await db.getAllInvitations();
  }),

  // Get invitation by token (public)
  getInvitationByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const invitation = await db.getInvitationByToken(input.token);
      
      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "邀请不存在",
        });
      }
      
      // Check if expired
      if (new Date() > new Date(invitation.expiresAt) && invitation.status === "pending") {
        await db.updateInvitationStatus(invitation.id, "expired");
        return { ...invitation, status: "expired" as const };
      }
      
      return invitation;
    }),

  // Accept invitation (public)
  acceptInvitation: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const invitation = await db.getInvitationByToken(input.token);

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "邀请不存在或已失效",
        });
      }

      if (invitation.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "邀请已被使用或已过期",
        });
      }

      if (new Date() > new Date(invitation.expiresAt)) {
        await db.updateInvitationStatus(invitation.id, "expired");
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "邀请已过期",
        });
      }

      // Mark invitation as accepted
      // The actual user creation and role assignment will happen during OAuth login
      await db.updateInvitationStatus(invitation.id, "accepted");

      return {
        success: true,
        message: "邀请已接受，请使用 " + invitation.email + " 登录系统",
        email: invitation.email,
      };
    }),
});
