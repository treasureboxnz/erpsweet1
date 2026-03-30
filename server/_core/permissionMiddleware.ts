import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { permissions, positions } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Permission types
 */
export type PermissionAction = "read" | "write" | "download" | "delete" | "all";

/**
 * Module names
 */
export type ModuleName =
  | "customer_management"
  | "product_management"
  | "order_management"
  | "report_center"
  | "user_management"
  | "operation_logs";

/**
 * Check if user has specific permission for a module
 */
export async function hasPermission(
  userId: number,
  userRole: string,
  positionId: number | null,
  module: ModuleName,
  action: PermissionAction
): Promise<boolean> {
  // Super admin has all permissions
  if (userRole === "super_admin") {
    return true;
  }

  // Admin has all permissions except user_management (only super_admin can manage users)
  if (userRole === "admin") {
    if (module === "user_management") {
      return action === "read"; // Admin can only read user management
    }
    return true;
  }

  // If user has no position, deny access
  if (!positionId) {
    return false;
  }

  const db = await getDb();
  if (!db) {
    return false;
  }

  // Query permission from database
  const result = await db
    .select({
      permissionType: permissions.permissionType,
    })
    .from(permissions)
    .where(
      and(
        eq(permissions.positionId, positionId),
        eq(permissions.module, module),
        eq(permissions.permissionType, action)
      )
    )
    .limit(1);

  if (result.length > 0) {
    return true;
  }

  // Check if user has "all" permission for this module
  const allPermissionResult = await db
    .select({
      permissionType: permissions.permissionType,
    })
    .from(permissions)
    .where(
      and(
        eq(permissions.positionId, positionId),
        eq(permissions.module, module),
        eq(permissions.permissionType, "all")
      )
    )
    .limit(1);

  if (allPermissionResult.length > 0) {
    return true;
  }

  return false;
}

/**
 * Permission middleware factory
 * Creates a middleware that checks if user has required permission
 */
export function requirePermission(module: ModuleName, action: PermissionAction) {
  return async ({ ctx, next }: any) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const allowed = await hasPermission(
      ctx.user.id,
      ctx.user.role,
      ctx.user.positionId,
      module,
      action
    );

    if (!allowed) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `You don't have permission to ${action} ${module}`,
      });
    }

    return next({ ctx });
  };
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(
  userId: number,
  userRole: string,
  positionId: number | null
): Promise<Record<ModuleName, PermissionAction[]>> {
  // Super admin has all permissions
  if (userRole === "super_admin") {
    return {
      customer_management: ["read", "write", "download", "delete", "all"],
      product_management: ["read", "write", "download", "delete", "all"],
      order_management: ["read", "write", "download", "delete", "all"],
      report_center: ["read", "write", "download", "delete", "all"],
      user_management: ["read", "write", "download", "delete", "all"],
      operation_logs: ["read", "write", "download", "delete", "all"],
    };
  }

  // Admin has most permissions
  if (userRole === "admin") {
    return {
      customer_management: ["read", "write", "download", "delete", "all"],
      product_management: ["read", "write", "download", "delete", "all"],
      order_management: ["read", "write", "download", "delete", "all"],
      report_center: ["read", "write", "download", "delete", "all"],
      user_management: ["read"], // Admin can only read user management
      operation_logs: ["read", "write", "download", "delete", "all"],
    };
  }

  // If user has no position, return empty permissions
  if (!positionId) {
    return {
      customer_management: [],
      product_management: [],
      order_management: [],
      report_center: [],
      user_management: [],
      operation_logs: [],
    };
  }

  const db = await getDb();
  if (!db) {
    return {
      customer_management: [],
      product_management: [],
      order_management: [],
      report_center: [],
      user_management: [],
      operation_logs: [],
    };
  }

  // Query all permissions for this position
  const result = await db
    .select({
      module: permissions.module,
      permissionType: permissions.permissionType,
    })
    .from(permissions)
    .where(eq(permissions.positionId, positionId));

  // Group permissions by module
  const userPermissions: Record<ModuleName, PermissionAction[]> = {
    customer_management: [],
    product_management: [],
    order_management: [],
    report_center: [],
    user_management: [],
    operation_logs: [],
  };

  for (const row of result) {
    const module = row.module as ModuleName;
    const action = row.permissionType as PermissionAction;
    if (!userPermissions[module].includes(action)) {
      userPermissions[module].push(action);
    }
  }

  return userPermissions;
}
