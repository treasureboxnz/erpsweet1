import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { extractTokenFromCookie, verifySession } from "../utils/session.js";
import { getUserById } from "../db_auth.js";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: (User & { erpCompanyId: number }) | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: (User & { erpCompanyId: number }) | null = null;

  try {
    // 先尝试自建认证（Session Token）
    const token = extractTokenFromCookie(opts.req.headers.cookie);
    if (token) {
      const sessionData = verifySession(token);
      if (sessionData) {
        const dbUser = await getUserById(sessionData.userId);
        if (dbUser && dbUser.erpCompanyId && dbUser.status === "active") {
          user = dbUser as User & { erpCompanyId: number };
        }
      }
    }

    // 如果自建认证失败，尝试 Manus OAuth（兼容旧系统）
    if (!user) {
      const oauthUser = await sdk.authenticateRequest(opts.req);
      if (oauthUser && oauthUser.status === "active") {
        user = oauthUser as User & { erpCompanyId: number };
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
