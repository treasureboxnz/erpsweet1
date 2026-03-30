/**
 * 认证相关的数据库查询函数
 */

import { eq } from "drizzle-orm";
import { users, erpCompanies } from "../drizzle/schema.js";
import { getDb } from "./db.js";

/**
 * 根据公司代码查询公司
 */
export async function getErpCompanyByCode(companyCode: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get company: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(erpCompanies)
    .where(eq(erpCompanies.companyCode, companyCode.toUpperCase()))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * 根据邮箱查询用户（包含公司信息）
 */
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * 根据用户ID查询用户
 */
export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * 更新用户密码
 */
export async function updateUserPassword(
  userId: number,
  passwordHash: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update password: database not available");
    return;
  }

  await db
    .update(users)
    .set({
      passwordHash,
      mustChangePassword: false, // 修改密码后，取消强制修改密码标记
    })
    .where(eq(users.id, userId));
}

/**
 * 创建用户（管理员操作）
 */
export async function createUser(data: {
  erpCompanyId: number;
  email: string;
  name: string;
  passwordHash: string;
  role?: "operator" | "admin" | "super_admin";
  mustChangePassword?: boolean;
}): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create user: database not available");
    throw new Error("Database not available");
  }

  const result = await db.insert(users).values({
    erpCompanyId: data.erpCompanyId,
    openId: null, // 明确设置为null，避免唯一约束问题
    email: data.email,
    name: data.name,
    passwordHash: data.passwordHash,
    role: data.role || "operator",
    mustChangePassword: data.mustChangePassword ?? true,
  });

  // @ts-ignore - insertId exists on MySql2 result
  return Number(result[0].insertId);
}

/**
 * 获取公司的所有用户
 */
export async function getUsersByCompanyId(erpCompanyId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get users: database not available");
    return [];
  }

  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      status: users.status,
      lastSignedIn: users.lastSignedIn,
      mustChangePassword: users.mustChangePassword,
    })
    .from(users)
    .where(eq(users.erpCompanyId, erpCompanyId));
}

/**
 * 删除用户
 */
export async function deleteUser(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete user: database not available");
    return;
  }

  await db.delete(users).where(eq(users.id, userId));
}
