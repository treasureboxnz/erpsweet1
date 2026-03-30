import { getDb } from "./db";
import { mediaLibrary } from "../drizzle/schema";
import { eq, desc, like, or, and, sql } from "drizzle-orm";

/**
 * 上传文件到媒体库
 */
export async function uploadMediaFile(data: { fileName: string; fileSize: number; imageData: string; mimeType: string; uploadedBy: number; erpCompanyId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 解析base64数据
  const base64Data = data.imageData.split(",")[1];
  const buffer = Buffer.from(base64Data, "base64");

  // 生成文件key（添加随机后缀防止枚举）
  const randomSuffix = Math.random().toString(36).substring(2, 15);
  const fileExt = data.fileName.split(".").pop();
  const fileKey = `media-library/${Date.now()}-${randomSuffix}.${fileExt}`;

  // 上传到S3
  const { storagePut } = await import("./storage");
  const { url } = await storagePut(fileKey, buffer, data.mimeType);

  // 保存文件记录
  const [result] = await db.insert(mediaLibrary).values({
    fileName: data.fileName,
    fileUrl: url,
    fileKey: fileKey,
    fileSize: data.fileSize,
    mimeType: data.mimeType,
    title: data.fileName, // 默认使用文件名作为标题
    uploadedBy: data.uploadedBy,
    erpCompanyId: data.erpCompanyId,
  });

  return Number(result.insertId);
}

/**
 * 获取媒体文件列表（支持分页和搜索）
 */
export async function getMediaFiles(params: { page: number; pageSize: number; search?: string; mimeType?: string; erpCompanyId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;

  // 构建查询条件
  const conditions = [];
  conditions.push(eq(mediaLibrary.erpCompanyId, params.erpCompanyId));
  
  if (params.search) {
    conditions.push(
      or(
        like(mediaLibrary.fileName, `%${params.search}%`),
        like(mediaLibrary.title, `%${params.search}%`)
      )
    );
  }

  if (params.mimeType) {
    conditions.push(like(mediaLibrary.mimeType, `${params.mimeType}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // 获取总数
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(mediaLibrary)
    .where(whereClause);

  const total = countResult?.count || 0;

  // 获取文件列表
  const files = await db
    .select()
    .from(mediaLibrary)
    .where(whereClause)
    .orderBy(desc(mediaLibrary.createdAt))
    .limit(pageSize)
    .offset(offset);

  return {
    files,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 更新媒体文件信息
 */
export async function updateMediaFile(
  id: number,
  data: {
    title?: string;
    altText?: string;
  },
  erpCompanyId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(mediaLibrary)
    .set(data)
    .where(and(eq(mediaLibrary.id, id), eq(mediaLibrary.erpCompanyId, erpCompanyId)));

  return true;
}

/**
 * 删除媒体文件
 */
export async function deleteMediaFile(id: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 获取文件信息
  const [file] = await db
    .select()
    .from(mediaLibrary)
    .where(and(eq(mediaLibrary.id, id), eq(mediaLibrary.erpCompanyId, erpCompanyId)))
    .limit(1);

  if (!file) {
    throw new Error("File not found");
  }

  // 删除数据库记录
  await db.delete(mediaLibrary).where(and(eq(mediaLibrary.id, id), eq(mediaLibrary.erpCompanyId, erpCompanyId)));

  // 注意：S3文件不删除，保留历史记录

  return true;
}

/**
 * 根据ID获取媒体文件
 */
export async function getMediaFileById(id: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [file] = await db
    .select()
    .from(mediaLibrary)
    .where(and(eq(mediaLibrary.id, id), eq(mediaLibrary.erpCompanyId, erpCompanyId)))
    .limit(1);

  return file;
}
