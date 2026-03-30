/**
 * Session 管理工具
 * 使用 JWT 进行 Session 管理
 */

import jwt from "jsonwebtoken";
import { ENV } from "../_core/env.js";

/**
 * Session 数据接口
 */
export interface SessionData {
  userId: number;
  erpCompanyId: number;
  email: string;
  role: string;
}

/**
 * 创建 Session Token
 * @param data Session 数据
 * @returns JWT Token
 */
export function createSession(data: SessionData): string {
  return jwt.sign(data, ENV.cookieSecret, {
    expiresIn: "7d", // 7天过期
  });
}

/**
 * 验证并解析 Session Token
 * @param token JWT Token
 * @returns Session 数据，如果无效则返回 null
 */
export function verifySession(token: string): SessionData | null {
  try {
    const decoded = jwt.verify(token, ENV.cookieSecret) as SessionData;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * 从 Cookie 中提取 Token
 * @param cookieHeader Cookie 头
 * @returns Token，如果不存在则返回 null
 */
export function extractTokenFromCookie(cookieHeader?: string): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith("session="));

  if (!sessionCookie) return null;

  return sessionCookie.split("=")[1];
}
