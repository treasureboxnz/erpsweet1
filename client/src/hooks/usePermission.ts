import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

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
 * Permission hook
 * Provides permission checking functionality for the current user
 */
export function usePermission() {
  const { user } = useAuth();

  // Fetch user permissions from backend
  const { data: permissions, isLoading } = trpc.permissionManagement.permissions.getUserPermissions.useQuery(
    undefined,
    {
      enabled: !!user,
    }
  );

  /**
   * Check if user has specific permission for a module
   */
  const hasPermission = useMemo(() => {
    return (module: ModuleName, action: PermissionAction): boolean => {
      if (!user) {
        return false;
      }

      // Super admin has all permissions
      if (user.role === "super_admin") {
        return true;
      }

      // Admin has all permissions except user_management
      if (user.role === "admin") {
        if (module === "user_management") {
          return action === "read"; // Admin can only read user management
        }
        return true;
      }

      // Check permissions from backend
      if (!permissions) {
        return false;
      }

      const modulePermissions = permissions[module] || [];
      return modulePermissions.includes(action) || modulePermissions.includes("all");
    };
  }, [user, permissions]);

  /**
   * Check if user can read a module
   */
  const canRead = useMemo(() => {
    return (module: ModuleName): boolean => hasPermission(module, "read");
  }, [hasPermission]);

  /**
   * Check if user can write to a module
   */
  const canWrite = useMemo(() => {
    return (module: ModuleName): boolean => hasPermission(module, "write");
  }, [hasPermission]);

  /**
   * Check if user can download from a module
   */
  const canDownload = useMemo(() => {
    return (module: ModuleName): boolean => hasPermission(module, "download");
  }, [hasPermission]);

  /**
   * Check if user can delete from a module
   */
  const canDelete = useMemo(() => {
    return (module: ModuleName): boolean => hasPermission(module, "delete");
  }, [hasPermission]);

  /**
   * Check if user is admin or super admin
   */
  const isAdmin = useMemo(() => {
    return user?.role === "admin" || user?.role === "super_admin";
  }, [user]);

  /**
   * Check if user is super admin
   */
  const isSuperAdmin = useMemo(() => {
    return user?.role === "super_admin";
  }, [user]);

  return {
    hasPermission,
    canRead,
    canWrite,
    canDownload,
    canDelete,
    isAdmin,
    isSuperAdmin,
    permissions,
    isLoading,
  };
}
