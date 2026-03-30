/**
 * 新公司初始化默认数据
 * 在新公司注册时调用，创建默认材料类型和系统默认供应商
 */
import { getDb } from "./db.js";
import { materialTypes, materialSuppliers, systemSettings } from "../drizzle/schema.js";
import { eq, and, isNull } from "drizzle-orm";

/**
 * 默认材料类型列表（颜色永远排第一，sortOrder=0）
 */
const DEFAULT_MATERIAL_TYPES = [
  { name: "颜色", icon: "🎨", sortOrder: 0 },
  { name: "布料", icon: "🧵", sortOrder: 1 },
  { name: "木腿", icon: "🪑", sortOrder: 2 },
  { name: "扶手", icon: "🛋️", sortOrder: 3 },
  { name: "填充物", icon: "🧶", sortOrder: 4 },
  { name: "坐垫", icon: "💺", sortOrder: 5 },
  { name: "靠背", icon: "🪑", sortOrder: 6 },
  { name: "框架", icon: "🔲", sortOrder: 7 },
  { name: "配件", icon: "🔧", sortOrder: 8 },
  { name: "其他", icon: "📦", sortOrder: 9 },
];

/**
 * 初始化公司默认数据
 * 包括：默认材料类型（颜色排第一）、系统默认供应商
 */
export async function initializeCompanyDefaults(erpCompanyId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[initCompanyDefaults] Database not available, skipping initialization");
    return;
  }

  try {
    // 1. 检查是否已有材料类型（避免重复初始化）
    const existingTypes = await db
      .select({ id: materialTypes.id })
      .from(materialTypes)
      .where(
        and(
          eq(materialTypes.erpCompanyId, erpCompanyId),
          isNull(materialTypes.deletedAt)
        )
      )
      .limit(1);

    if (existingTypes.length > 0) {
      // 已有材料类型，只确保"颜色"类型存在且排第一
      await ensureColorTypeFirst(db, erpCompanyId);
      return;
    }

    // 2. 插入默认材料类型
    let colorTypeId: number | null = null;
    for (const typeData of DEFAULT_MATERIAL_TYPES) {
      const [result] = await db.insert(materialTypes).values({
        erpCompanyId,
        name: typeData.name,
        icon: typeData.icon,
        sortOrder: typeData.sortOrder,
      });
        // @ts-ignore
      const insertId = Number(result.insertId);
      if (typeData.name === "颜色") {
        colorTypeId = insertId;
      }
    }

    // 3. 创建系统默认供应商（关联颜色类型）
    if (colorTypeId) {
      await db.insert(materialSuppliers).values({
        erpCompanyId,
        name: "系统默认",
        code: `SYS-${erpCompanyId}`,
        contactPerson: "系统",
        notes: "系统默认供应商，用于默认布料颜色",
        status: "active",
        materialTypeId: colorTypeId,
        isLocked: true,
      });
    }

    // 4. 初始化默认系统设置
    await initializeDefaultSystemSettings(db, erpCompanyId);

    console.log(`[initCompanyDefaults] Company ${erpCompanyId} initialized with default material types, SYS supplier, and system settings`);
  } catch (error) {
    console.error(`[initCompanyDefaults] Failed to initialize company ${erpCompanyId}:`, error);
    // 不抛出错误，避免影响公司注册流程
  }
}

/**
 * 确保"颜色"材料类型存在且 sortOrder=0（排第一）
 * 用于已有材料类型的公司的迁移
 */
async function ensureColorTypeFirst(db: Awaited<ReturnType<typeof getDb>>, erpCompanyId: number): Promise<void> {
  if (!db) return;

  // 检查是否已有颜色类型
  const existingColor = await db
    .select({ id: materialTypes.id })
    .from(materialTypes)
    .where(
      and(
        eq(materialTypes.erpCompanyId, erpCompanyId),
        eq(materialTypes.name, "颜色"),
        isNull(materialTypes.deletedAt)
      )
    )
    .limit(1);

  if (existingColor.length === 0) {
    // 没有颜色类型，创建一个（sortOrder=0）
    const [result] = await db.insert(materialTypes).values({
      erpCompanyId,
      name: "颜色",
      icon: "🎨",
      sortOrder: 0,
    });
      // @ts-ignore
      const colorTypeId = Number(result.insertId);

    // 更新SYS供应商的materialTypeId
    await db
      .update(materialSuppliers)
      .set({ materialTypeId: colorTypeId })
      .where(
        and(
          eq(materialSuppliers.erpCompanyId, erpCompanyId),
          eq(materialSuppliers.isLocked, true)
        )
      );
  } else {
    // 已有颜色类型，确保sortOrder=0
    await db
      .update(materialTypes)
      .set({ sortOrder: 0 })
      .where(eq(materialTypes.id, existingColor[0].id));
  }
}

/**
 * 默认系统设置
 */
const DEFAULT_SYSTEM_SETTINGS = [
  { key: "quotationMode", value: "fob_only", description: "报价模式" },
  { key: "exchangeRate", value: "7.2", description: "默认汇率（USD/RMB）" },
  { key: "profitRate", value: "30", description: "默认利润率（%）" },
  { key: "defaultCurrency", value: "USD", description: "默认货币" },
  { key: "companyNameCn", value: "", description: "公司中文名称" },
  { key: "companyNameEn", value: "", description: "公司英文名称" },
];

/**
 * 初始化公司默认系统设置
 */
async function initializeDefaultSystemSettings(db: Awaited<ReturnType<typeof getDb>>, erpCompanyId: number): Promise<void> {
  if (!db) return;

  // 检查是否已有系统设置
  const existingSettings = await db
    .select({ id: systemSettings.id })
    .from(systemSettings)
    .where(eq(systemSettings.erpCompanyId, erpCompanyId))
    .limit(1);

  if (existingSettings.length > 0) {
    return; // 已有设置，跳过
  }

  // 插入默认设置
  for (const setting of DEFAULT_SYSTEM_SETTINGS) {
    await db.insert(systemSettings).values({
      erpCompanyId,
      settingKey: setting.key,
      settingValue: setting.value,
      description: setting.description,
    });
  }

  console.log(`[initCompanyDefaults] Initialized ${DEFAULT_SYSTEM_SETTINGS.length} default system settings for company ${erpCompanyId}`);
}
