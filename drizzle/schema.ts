import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, unique, index, json } from "drizzle-orm/mysql-core";

/**
 * ERP Companies table - 多租户架构：ERP系统使用公司表
 */
export const erpCompanies = mysqlTable("erp_companies", {
  id: int("id").autoincrement().primaryKey(),
  companyCode: varchar("companyCode", { length: 50 }).notNull().unique(), // 公司代码（登录用）
  companyName: varchar("companyName", { length: 200 }).notNull(), // 公司名称（中文）
  companyNameEn: varchar("companyNameEn", { length: 200 }), // 公司名称（英文）
  logo: text("logo"), // 公司Logo
  address: text("address"), // 公司地址
  email: varchar("email", { length: 320 }), // 公司邮箱
  phone: varchar("phone", { length: 50 }), // 公司电话
  
  // 邮件推广专用信息（用于营销邮件）
  marketingCompanyName: varchar("marketingCompanyName", { length: 200 }), // 营销公司名称
  marketingEmail: varchar("marketingEmail", { length: 320 }), // 营销邮箱
  marketingAddress: text("marketingAddress"), // 营销地址
  marketingPhone: varchar("marketingPhone", { length: 50 }), // 营销电话
  marketingWebsite: varchar("marketingWebsite", { length: 500 }), // 营销网站
  
  status: mysqlEnum("status", ["active", "suspended", "deleted"]).default("active").notNull(),
  plan: mysqlEnum("plan", ["free", "basic", "pro", "enterprise"]).default("free").notNull(), // 订阅计划
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ErpCompany = typeof erpCompanies.$inferSelect;
export type InsertErpCompany = typeof erpCompanies.$inferInsert;

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  openId: varchar("openId", { length: 64 }).unique(), // 保留以兼容Manus OAuth，但不再强制要求
  email: varchar("email", { length: 320 }).unique(), // 邮箱（登录账号，唯一）
  passwordHash: varchar("passwordHash", { length: 255 }), // 密码哈希
  mustChangePassword: boolean("mustChangePassword").default(true), // 首次登录必须修改密码
  name: text("name"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["operator", "admin", "super_admin"]).default("operator").notNull(),
  positionId: int("positionId").references(() => positions.id), // 关联岗位
  status: mysqlEnum("status", ["active", "suspended", "deleted"]).default("active").notNull(),
  avatarUrl: text("avatarUrl"),
  displayName: varchar("displayName", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Positions table (岗位表)
 */
export const positions = mysqlTable("positions", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  name: varchar("name", { length: 100 }).notNull().unique(), // 岗位名称（英文标识）
  displayName: varchar("displayName", { length: 100 }).notNull(), // 岗位显示名称（中文）
  description: text("description"), // 岗位描述
  isSystem: boolean("isSystem").default(false).notNull(), // 是否系统预设岗位（不可删除）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Position = typeof positions.$inferSelect;
export type InsertPosition = typeof positions.$inferInsert;

/**
 * Permissions table (权限表)
 */
export const permissions = mysqlTable(
  "permissions",
  {
    id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
    positionId: int("positionId").notNull().references(() => positions.id, { onDelete: "cascade" }), // 岗位ID
    module: varchar("module", { length: 100 }).notNull(), // 模块标识
    permissionType: mysqlEnum("permissionType", ["read", "write", "download", "delete", "all"]).notNull(), // 权限类型
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    uniquePermission: unique().on(table.positionId, table.module, table.permissionType),
  })
);

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = typeof permissions.$inferInsert;

/**
 * Product categories table (产品类目表 - 支持无限层级树形结构)
 */
export const productCategories = mysqlTable("product_categories", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  name: varchar("name", { length: 100 }).notNull(), // 类目名称
  parentId: int("parentId"), // 父类目id，null表示根类目
  description: text("description"), // 类目描述
  sortOrder: int("sortOrder").default(0).notNull(), // 排序值，同级类目按此排序
  isEnabled: boolean("isEnabled").default(true).notNull(), // 是否启用
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductCategory = typeof productCategories.$inferSelect;
export type InsertProductCategory = typeof productCategories.$inferInsert;

/**
 * Products table
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  name: varchar("name", { length: 200 }).default(""), // 产品名称（英文），可选
  sku: varchar("sku", { length: 100 }).notNull().unique(),
  description: text("description"),
  categoryId: int("categoryId").references(() => productCategories.id),
  
  // 成本价格字段（Cost）
  factoryPriceRmbExcludingTax: decimal("factoryPriceRmbExcludingTax", { precision: 10, scale: 2 }), // 工厂RMB不含税
  factoryPriceRmbIncludingTax: decimal("factoryPriceRmbIncludingTax", { precision: 10, scale: 2 }), // 工厂RMB含税
  factoryPriceUsdFob: decimal("factoryPriceUsdFob", { precision: 10, scale: 2 }), // 工厂USD FOB
  myCostRmb: decimal("myCostRmb", { precision: 10, scale: 2 }), // 我的成本RMB
  myCostUsd: decimal("myCostUsd", { precision: 10, scale: 2 }), // 我的成本USD
  fobFeeRmb: decimal("fobFeeRmb", { precision: 10, scale: 2 }), // FOB费用RMB
  
  // 销售价格字段（Selling）
  sellingPriceRmbIncludingTax: decimal("sellingPriceRmbIncludingTax", { precision: 10, scale: 2 }), // RMB含税价（旧单一字段，保留兼容）
  fobLevel1: decimal("fobLevel1", { precision: 10, scale: 2 }), // FOB Level1
  fobLevel2: decimal("fobLevel2", { precision: 10, scale: 2 }), // FOB Level2
  fobLevel3: decimal("fobLevel3", { precision: 10, scale: 2 }), // FOB Level3
  
  // RMB定价
  rmbTaxRate: decimal("rmbTaxRate", { precision: 5, scale: 2 }).default("13"), // RMB定价税率（默认13%）
  
  // 保留旧字段用于兼容（可以后续迁移数据后删除）
  costPrice: decimal("costPrice", { precision: 10, scale: 2 }).default("0"), // 成本价，可选
  sellingPrice: decimal("sellingPrice", { precision: 10, scale: 2 }).default("0"), // 销售价，可选
  
  remainingStock: int("remainingStock").default(0), // 尾货库存（工厂仓库中的剩余货物，可选）
  unit: varchar("unit", { length: 50 }).default("pcs").notNull(), // 单位（默认pcs）
  productionMode: mysqlEnum("productionMode", ["make_to_order", "ready_stock"]).default("make_to_order").notNull(), // 生产模式：接单生产/现货销售
  
  // 包装体积字段
  packageLength: decimal("packageLength", { precision: 10, scale: 3 }), // 长
  packageWidth: decimal("packageWidth", { precision: 10, scale: 3 }), // 宽
  packageHeight: decimal("packageHeight", { precision: 10, scale: 3 }), // 高
  packageCbm: decimal("packageCbm", { precision: 10, scale: 6 }), // CBM（立方米）
  volumeUnit: mysqlEnum("volumeUnit", ["cm", "m", "mm"]).default("cm").notNull(), // 体积单位，默认cm
  
  // 新增产品字段
  moq: int("moq"), // 最小起订量 MOQ
  shippingPortId: int("shippingPortId"), // 出货港口（属性ID）
  packagingMethodId: int("packagingMethodId"), // 包装方式（属性ID）
  containerLoad: varchar("containerLoad", { length: 100 }), // 装柜量
  supplyRegionId: int("supplyRegionId"), // 供货地区（属性ID）
  addedDate: timestamp("addedDate").defaultNow(), // 产品加入日期（系统自动记录）
  selectionLogicId: int("selectionLogicId"), // 选品逻辑（属性ID）
  styleSourceId: int("styleSourceId"), // 款式来源（属性ID）
  
  imageUrl: text("imageUrl"),
  status: mysqlEnum("status", ["active", "discontinued", "developing"]).default("active").notNull(), // 状态：在售/停产/开发中
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"), // 软删除时间戳，NULL表示未删除
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Product images table (产品图片表)
 */
export const productImages = mysqlTable("product_images", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  productId: int("productId").references(() => products.id, { onDelete: "cascade" }).notNull(), // 产品ID
  imageUrl: varchar("imageUrl", { length: 500 }).notNull(), // 图片URL
  imageKey: varchar("imageKey", { length: 500 }).notNull(), // S3存储键
  sortOrder: int("sortOrder").default(0).notNull(), // 排序顺序（数字越小越靠前）
  isPrimary: boolean("isPrimary").default(false).notNull(), // 是否为主图（第一张图片）
  createdAt: timestamp("createdAt").defaultNow().notNull(), // 创建时间
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), // 更新时间
});

export type ProductImage = typeof productImages.$inferSelect;
export type InsertProductImage = typeof productImages.$inferInsert;

/**
 * Price history table - 记录产品价格变更历史
 */
export const priceHistory = mysqlTable("price_history", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  productId: int("productId").references(() => products.id, { onDelete: "cascade" }).notNull(),
  fieldName: varchar("fieldName", { length: 100 }).notNull(), // 字段名称（如factoryPriceRmbExcludingTax）
  fieldLabel: varchar("fieldLabel", { length: 100 }).notNull(), // 字段显示名（如"工厂RMB不含税"）
  oldValue: decimal("oldValue", { precision: 10, scale: 2 }), // 旧值
  newValue: decimal("newValue", { precision: 10, scale: 2 }), // 新值
  changedBy: int("changedBy").references(() => users.id),
  changedAt: timestamp("changedAt").defaultNow().notNull(), // 变更时间
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = typeof priceHistory.$inferInsert;

/**
 * Companies table - 客户公司主体信息
 */
export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  companyName: varchar("companyName", { length: 200 }).notNull(),
  customerCode: varchar("customerCode", { length: 50 }).unique(),
  customerNature: varchar("customerNature", { length: 100 }), // 客户性质（原customerType）
  customerCategory: json("customerCategory").$type<string[]>(), // 客户分类（多选）
  industryType: varchar("industryType", { length: 100 }),
  country: varchar("country", { length: 100 }),
  state: varchar("state", { length: 100 }),
  city: varchar("city", { length: 100 }),
  address: text("address"),
  postalCode: varchar("postalCode", { length: 20 }),
  businessLicense: varchar("businessLicense", { length: 100 }),
  taxNumber: varchar("taxNumber", { length: 100 }),
  website: varchar("website", { length: 200 }),
  logoUrl: text("logoUrl"),
  linkedinUrl: varchar("linkedinUrl", { length: 500 }),
  phone: varchar("phone", { length: 50 }),
  annualRevenue: varchar("annualRevenue", { length: 50 }),
  description: text("description"),
  foundedYear: int("foundedYear"),
  companyScale: mysqlEnum("companyScale", ["small", "medium", "large", "enterprise"]),
  mainProducts: text("mainProducts"),
  annualPurchaseVolume: decimal("annualPurchaseVolume", { precision: 15, scale: 2 }),
  cooperationStatus: mysqlEnum("cooperationStatus", ["developing", "cooperating", "stopped"]).default("developing").notNull(),
  assignedTo: int("assignedTo").references(() => users.id),
  source: varchar("source", { length: 100 }), // 客户来源
  cooperationLevel: varchar("cooperationLevel", { length: 100 }), // 合作级别（原volumeLevel字段）
  notes: text("notes"),
  defaultFobLevel: mysqlEnum("defaultFobLevel", ["level1", "level2", "level3"]).default("level1").notNull(), // 客户默认FOB价格级别
  paymentTerms: text("paymentTerms"), // 付款条款/方式（用于Invoice）
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  // 添加索引以提升查询性能
  cooperationStatusIdx: index("cooperation_status_idx").on(table.cooperationStatus),
  countryIdx: index("country_idx").on(table.country),
  customerNatureIdx: index("customer_nature_idx").on(table.customerNature),
  // customerCategoryIdx removed: JSON columns cannot be indexed
  cooperationLevelIdx: index("cooperation_level_idx").on(table.cooperationLevel),
  assignedToIdx: index("assigned_to_idx").on(table.assignedTo),
  createdByIdx: index("created_by_idx").on(table.createdBy),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
  companyNameIdx: index("company_name_idx").on(table.companyName),
}));

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

/**
 * Contacts table - 联系人信息
 */
export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  fullName: varchar("fullName", { length: 100 }).notNull(),
  firstName: varchar("firstName", { length: 50 }),
  lastName: varchar("lastName", { length: 50 }),
  jobTitle: varchar("jobTitle", { length: 100 }),
  department: varchar("department", { length: 100 }),
  role: mysqlEnum("role", ["decision_maker", "purchaser", "finance", "technical", "sales", "other"]),
  mobile: varchar("mobile", { length: 50 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  wechat: varchar("wechat", { length: 100 }),
  skype: varchar("skype", { length: 100 }),
  linkedin: varchar("linkedin", { length: 200 }),
  whatsapp: varchar("whatsapp", { length: 50 }),
  importance: mysqlEnum("importance", ["key", "normal", "secondary"]).default("normal"),
  preferredLanguage: varchar("preferredLanguage", { length: 50 }),
  bestContactTime: varchar("bestContactTime", { length: 100 }),
  timezone: varchar("timezone", { length: 50 }),
  notes: text("notes"),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

/**
 * Company-Contact relationship table
 */
export const companyContacts = mysqlTable("company_contacts", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  companyId: int("companyId").references(() => companies.id).notNull(),
  contactId: int("contactId").references(() => contacts.id).notNull(),
  isPrimary: boolean("isPrimary").default(false),
  relationshipType: varchar("relationshipType", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CompanyContact = typeof companyContacts.$inferSelect;
export type InsertCompanyContact = typeof companyContacts.$inferInsert;

/**
 * Follow-up records table
 */
export const followUpRecords = mysqlTable("follow_up_records", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  companyId: int("companyId").references(() => companies.id).notNull(),
  contactId: int("contactId").references(() => contacts.id),
  type: mysqlEnum("type", ["call", "email", "meeting", "visit", "quote", "sample", "other"]).notNull(),
  subject: varchar("subject", { length: 200 }),
  content: text("content").notNull(),
  result: mysqlEnum("result", ["positive", "neutral", "negative", "pending"]),
  nextFollowUpDate: timestamp("nextFollowUpDate"),
  attachments: text("attachments"),
  images: text("images"), // 跟进截图（JSON存储图片URL列表）
  relatedOrderId: int("relatedOrderId"),
  followUpBy: int("followUpBy").references(() => users.id).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type FollowUpRecord = typeof followUpRecords.$inferSelect;
export type InsertFollowUpRecord = typeof followUpRecords.$inferInsert;

// Keep old customers table for backward compatibility during migration
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  companyName: varchar("companyName", { length: 200 }).notNull(),
  contactPerson: varchar("contactPerson", { length: 100 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  country: varchar("country", { length: 100 }),
  region: varchar("region", { length: 100 }),
  tags: text("tags"),
  status: mysqlEnum("status", ["active", "inactive", "potential"]).default("potential").notNull(),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  // Migration flag
  migratedToCompanyId: int("migratedToCompanyId").references(() => companies.id),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

export const customerFollowUps = mysqlTable("customer_follow_ups", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  customerId: int("customerId").references(() => companies.id).notNull(),
  content: text("content").notNull(),
  followUpType: mysqlEnum("followUpType", ["call", "email", "meeting", "visit", "other"]).notNull(),
  followUpBy: int("followUpBy").references(() => users.id).notNull(),
  // 跟进阶段（属性管理）
  currentStageId: int("currentStageId"), // 现跟进阶段（引用attributes.id）
  nextPlanStageId: int("nextPlanStageId"), // 下部工作计划（引用attributes.id）
  nextPlanDate: timestamp("nextPlanDate"), // 下部工作计划完成时间
  quotationFiles: text("quotationFiles"), // 报价记录（JSON存储文件URL列表）
  quotationDate: timestamp("quotationDate"), // 报价日期
  images: text("images"), // 跟进截图（JSON存储图片URL列表）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomerFollowUp = typeof customerFollowUps.$inferSelect;
export type InsertCustomerFollowUp = typeof customerFollowUps.$inferInsert;

/**
 * Orders table
 */
export const orders: any = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  orderNumber: varchar("orderNumber", { length: 100 }).notNull().unique(),
  customerId: int("customerId").references(() => companies.id).notNull(),
  customerName: varchar("customerName", { length: 200 }), // 客户名称（冗余字段，方便查询）
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  orderMode: mysqlEnum("orderMode", ["fob", "batch"]).default("fob").notNull(), // 订单模式：FOB模式或批次模式
  createdFromQuotationId: int("createdFromQuotationId").references(() => quotations.id), // 来源报价ID
  createdFromQuotationNumber: varchar("createdFromQuotationNumber", { length: 50 }), // 来源报价单号（冗余）
  currency: varchar("currency", { length: 10 }).default("USD"), // 货币
  exchangeRate: decimal("exchangeRate", { precision: 10, scale: 4 }), // 汇率
  status: mysqlEnum("status", ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]).default("pending").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["unpaid", "partial", "paid", "refunded"]).default("unpaid"), // 付款状态
  paymentMethod: varchar("paymentMethod", { length: 50 }), // 付款方式
  paymentTerms: varchar("paymentTerms", { length: 200 }), // 付款条款
  orderDate: timestamp("orderDate").defaultNow().notNull(),
  expectedDeliveryDate: timestamp("expectedDeliveryDate"), // 预计交货日期
  actualDeliveryDate: timestamp("actualDeliveryDate"), // 实际交货日期
  shippingMethod: varchar("shippingMethod", { length: 100 }), // 物流方式
  trackingNumber: varchar("trackingNumber", { length: 200 }), // 物流跟踪号
  shippingAddress: text("shippingAddress"),
  billingAddress: text("billingAddress"), // 账单地址
  contactPerson: varchar("contactPerson", { length: 100 }), // 联系人
  contactPhone: varchar("contactPhone", { length: 50 }), // 联系电话
  contactEmail: varchar("contactEmail", { length: 320 }), // 联系邮箱
  notes: text("notes"), // 备注（通用）
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"]).default("normal"), // 优先级
  source: varchar("source", { length: 100 }), // 订单来源
  customStatus: varchar("customStatus", { length: 100 }), // 自定义订单状态（从属性管理读取）
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"), // 软删除标记，null表示未删除
  deletedBy: int("deletedBy").references(() => users.id), // 删除操作人
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Order items table
 */
export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  orderId: int("orderId").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  productId: int("productId").references(() => products.id),
  variantId: int("variantId").references(() => productVariants.id), // 产品批次
  supplierSku: varchar("supplierSku", { length: 100 }), // 供应商SKU（从批次复制）
  customerSku: varchar("customerSku", { length: 100 }), // 客户SKU（从批次复制）
  productName: varchar("productName", { length: 200 }), // 产品名称（冗余字段）
  productSku: varchar("productSku", { length: 100 }), // 产品SKU（冗余字段）
  sku: varchar("sku", { length: 100 }), // SKU
  orderMode: mysqlEnum("orderMode", ["batch_selection", "fob_only"]).default("batch_selection").notNull(), // 订单模式：批次选择或FOB模式
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"), // 折扣
  taxRate: decimal("taxRate", { precision: 5, scale: 2 }).default("0"), // 税率
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  // FOB模式字段
  fobQuantity: int("fobQuantity"), // FOB模式数量
  fobUnitPrice: decimal("fobUnitPrice", { precision: 10, scale: 2 }), // FOB模式单价
  fobTotalPrice: decimal("fobTotalPrice", { precision: 12, scale: 2 }), // FOB模式总价
  // 外箱重量和立方数字段（从批次引用）
  grossWeight: decimal("grossWeight", { precision: 10, scale: 3 }), // 毛重（千克）
  netWeight: decimal("netWeight", { precision: 10, scale: 3 }), // 净重（千克）
  cbm: decimal("cbm", { precision: 10, scale: 3 }), // 立方数（立方米）
  piecesPerBox: int("piecesPerBox").default(1), // 每箱件数（用于计算外箱数量）
  notes: text("notes"), // 备注
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * User invitations table
 */
export const userInvitations = mysqlTable("user_invitations", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  email: varchar("email", { length: 320 }).notNull(),
  role: mysqlEnum("role", ["operator", "admin", "super_admin"]).notNull(),
  invitedBy: int("invitedBy").references(() => users.id).notNull(),
  positionId: int("positionId").references(() => positions.id), // 关联岗位
  token: varchar("token", { length: 100 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "accepted", "expired"]).default("pending").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserInvitation = typeof userInvitations.$inferSelect;
export type InsertUserInvitation = typeof userInvitations.$inferInsert;

/**
 * Operation logs table - tracks all important system operations
 */
export const operationLogs = mysqlTable("operation_logs", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  userId: int("userId").references(() => users.id).notNull(),
  userName: varchar("userName", { length: 100 }).notNull(),
  operationType: mysqlEnum("operationType", ["create", "update", "delete", "suspend", "activate"]).notNull(),
  module: mysqlEnum("module", ["customer", "product", "order", "user", "price"]).notNull(),
  targetId: int("targetId"),
  targetName: varchar("targetName", { length: 200 }),
  details: text("details"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OperationLog = typeof operationLogs.$inferSelect;
export type InsertOperationLog = typeof operationLogs.$inferInsert;

/**
 * Product-Suppliers link table (产品-供应商关联表)
 */
export const productSuppliers = mysqlTable("product_suppliers", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  productId: int("productId").references(() => products.id, { onDelete: "cascade" }).notNull(),
  supplierId: int("supplierId").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
  isPrimary: boolean("isPrimary").default(false).notNull(), // 是否为主供应商
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProductSupplier = typeof productSuppliers.$inferSelect;
export type InsertProductSupplier = typeof productSuppliers.$inferInsert;

/**
 * Product variants table (产品批次表)
 */
export const productVariants = mysqlTable("product_variants", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  productId: int("productId").references(() => products.id, { onDelete: "cascade" }).notNull(),
  variantCode: varchar("variantCode", { length: 50 }).notNull().unique(),
  variantName: varchar("variantName", { length: 200 }).notNull(),
  fabricChange: varchar("fabricChange", { length: 200 }),
  legTypeChange: varchar("legTypeChange", { length: 200 }),
  heightChange: varchar("heightChange", { length: 200 }),
  packagingChange: varchar("packagingChange", { length: 200 }),
  otherChanges: text("otherChanges"),
  productLength: decimal("productLength", { precision: 10, scale: 2 }),
  productWidth: decimal("productWidth", { precision: 10, scale: 2 }),
  productHeight: decimal("productHeight", { precision: 10, scale: 2 }),
  packageLength: decimal("packageLength", { precision: 10, scale: 2 }),
  packageWidth: decimal("packageWidth", { precision: 10, scale: 2 }),
  packageHeight: decimal("packageHeight", { precision: 10, scale: 2 }),
  cbm: decimal("cbm", { precision: 10, scale: 6 }),
  variantType: mysqlEnum("variantType", ["universal", "exclusive"]).default("universal").notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  productionStatus: mysqlEnum("productionStatus", ["designing", "sampling", "production", "completed"]).default("designing").notNull(),
  isDefault: boolean("isDefault").default(false).notNull(), // 是否为默认批次（用于FOB报价模式）
  supplierId: int("supplierId").references(() => suppliers.id), // 批次关联的供应商
  supplierSku: varchar("supplierSku", { length: 100 }), // 供应商SKU（工厂自己的SKU编号）
  customerId: int("customerId").references(() => companies.id), // 批次关联的客户
  customerSku: varchar("customerSku", { length: 100 }), // 客户SKU（客户系统的SKU编号）
  materialColorId: int("materialColorId").references(() => materialColors.id), // 批次关联的布料颜色 (@deprecated 使用variant_materials表代替，支持多材料)
  sellingPriceRMB: decimal("sellingPriceRMB", { precision: 10, scale: 2 }), // 售价：RMB含税
  sellingPriceFOB: decimal("sellingPriceFOB", { precision: 10, scale: 2 }), // 售价：美金FOB
  costPriceRMB: decimal("costPriceRMB", { precision: 10, scale: 2 }), // 成本：RMB含税
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductVariant = typeof productVariants.$inferSelect;
export type InsertProductVariant = typeof productVariants.$inferInsert;

/**
 * Variant-Customer links table (批次-客户关联表)
 */
export const variantCustomerLinks = mysqlTable("variant_customer_links", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  variantId: int("variantId").references(() => productVariants.id, { onDelete: "cascade" }).notNull(),
  customerId: int("customerId").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VariantCustomerLink = typeof variantCustomerLinks.$inferSelect;
export type InsertVariantCustomerLink = typeof variantCustomerLinks.$inferInsert;

/**
 * Variant pricing table (批次定价表)
 */
export const variantPricing = mysqlTable("variant_pricing", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  variantId: int("variantId").references(() => productVariants.id, { onDelete: "cascade" }).notNull(),
  factoryCostRmbExTax: decimal("factoryCostRmbExTax", { precision: 10, scale: 2 }),
  factoryCostRmbIncTax: decimal("factoryCostRmbIncTax", { precision: 10, scale: 2 }),
  factoryCostUsdFob: decimal("factoryCostUsdFob", { precision: 10, scale: 2 }),
  myCostRmb: decimal("myCostRmb", { precision: 10, scale: 2 }),
  myCostUsd: decimal("myCostUsd", { precision: 10, scale: 2 }),
  fobFeeRmb: decimal("fobFeeRmb", { precision: 10, scale: 2 }),
  sellingPriceRmbIncTax: decimal("sellingPriceRmbIncTax", { precision: 10, scale: 2 }),
  sellingPriceFobL1: decimal("sellingPriceFobL1", { precision: 10, scale: 2 }),
  sellingPriceFobL2: decimal("sellingPriceFobL2", { precision: 10, scale: 2 }),
  sellingPriceFobL3: decimal("sellingPriceFobL3", { precision: 10, scale: 2 }),
  effectiveDate: timestamp("effectiveDate").notNull(),
  isCurrent: boolean("isCurrent").default(true).notNull(),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VariantPricing = typeof variantPricing.$inferSelect;
export type InsertVariantPricing = typeof variantPricing.$inferInsert;

/**
 * Variant pricing history table (批次定价历史表)
 */
export const variantPricingHistory = mysqlTable("variant_pricing_history", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  variantId: int("variantId").references(() => productVariants.id, { onDelete: "cascade" }).notNull(),
  fieldName: varchar("fieldName", { length: 100 }).notNull(),
  oldValue: varchar("oldValue", { length: 50 }),
  newValue: varchar("newValue", { length: 50 }),
  remarks: text("remarks"),
  modifiedBy: int("modifiedBy").references(() => users.id),
  modifiedAt: timestamp("modifiedAt").defaultNow().notNull(),
});

export type VariantPricingHistory = typeof variantPricingHistory.$inferSelect;
export type InsertVariantPricingHistory = typeof variantPricingHistory.$inferInsert;

/**
 * Variant images table (批次图片表)
 */
export const variantImages = mysqlTable("variant_images", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  variantId: int("variantId").references(() => productVariants.id, { onDelete: "cascade" }).notNull(),
  imageUrl: varchar("imageUrl", { length: 500 }).notNull(),
  imageKey: varchar("imageKey", { length: 500 }).notNull(),
  fileName: varchar("fileName", { length: 200 }).notNull(),
  fileSize: int("fileSize").notNull(),
  sortOrder: int("sortOrder").notNull(),
  isPrimary: boolean("isPrimary").default(false).notNull(),
  uploadedBy: int("uploadedBy").references(() => users.id),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

export type VariantImage = typeof variantImages.$inferSelect;
export type InsertVariantImage = typeof variantImages.$inferInsert;

/**
 * Suppliers table (供应商表)
 */
export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  supplierName: varchar("supplierName", { length: 200 }).notNull(),
  supplierCode: varchar("supplierCode", { length: 50 }).unique(),
  contactPerson: varchar("contactPerson", { length: 100 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  province: varchar("province", { length: 100 }),
  country: varchar("country", { length: 100 }),
  postalCode: varchar("postalCode", { length: 20 }),
  website: varchar("website", { length: 500 }),
  logoUrl: text("logoUrl"), // 供应商logo图片URL
  taxId: varchar("taxId", { length: 100 }), // 税号
  businessLicense: varchar("businessLicense", { length: 100 }), // 营业执照号
  categoryId: int("categoryId"), // 供应商分类
  rating: int("rating").default(0), // 评级 (0-5)
  paymentTerms: varchar("paymentTerms", { length: 200 }), // 付款条款
  currency: varchar("currency", { length: 10 }).default("CNY"), // 默认货币
  notes: text("notes"), // 备注
  defaultShippingPort: varchar("defaultShippingPort", { length: 200 }), // 默认出货港口
  status: mysqlEnum("status", ["active", "inactive", "suspended"]).default("active").notNull(),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

/**
 * Supplier categories table (供应商分类表)
 */
export const supplierCategories = mysqlTable("supplier_categories", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  parentId: int("parentId"),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SupplierCategory = typeof supplierCategories.$inferSelect;
export type InsertSupplierCategory = typeof supplierCategories.$inferInsert;

/**
 * Variant suppliers table (批次-供应商版本表)
 */
export const variantSuppliers = mysqlTable("variant_suppliers", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  variantId: int("variantId").references(() => productVariants.id, { onDelete: "cascade" }).notNull(),
  supplierId: int("supplierId").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
  factoryItemCode: varchar("factoryItemCode", { length: 100 }),
  factoryQuote: decimal("factoryQuote", { precision: 10, scale: 2 }),
  moq: int("moq"),
  leadTimeDays: int("leadTimeDays"),
  isDefault: boolean("isDefault").default(false).notNull(), // 是否默认供应商
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VariantSupplier = typeof variantSuppliers.$inferSelect;
export type InsertVariantSupplier = typeof variantSuppliers.$inferInsert;

/**
 * Media Library table (媒体库表)
 */
export const mediaLibrary = mysqlTable("media_library", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  fileName: varchar("fileName", { length: 255 }).notNull(), // 文件名
  fileUrl: text("fileUrl").notNull(), // S3文件URL
  fileKey: text("fileKey").notNull(), // S3文件key
  fileSize: int("fileSize").notNull(), // 文件大小（字节）
  mimeType: varchar("mimeType", { length: 100 }).notNull(), // MIME类型
  title: varchar("title", { length: 255 }), // 文件标题（可编辑）
  altText: text("altText"), // 图片alt文本（可编辑）
  uploadedBy: int("uploadedBy").notNull().references(() => users.id), // 上传人
  createdAt: timestamp("createdAt").defaultNow().notNull(), // 上传时间
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), // 更新时间
});

export type MediaLibraryItem = typeof mediaLibrary.$inferSelect;
export type InsertMediaLibraryItem = typeof mediaLibrary.$inferInsert;

/**
 * Categories table (产品分类表)
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  name: varchar("name", { length: 100 }).notNull().unique(), // 分类名称（唯一）
  description: text("description"), // 分类描述
  createdBy: int("createdBy").references(() => users.id), // 创建人
  createdAt: timestamp("createdAt").defaultNow().notNull(), // 创建时间
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), // 更新时间
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Tags table (产品标签表)
 */
export const tags = mysqlTable("tags", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  name: varchar("name", { length: 50 }).notNull().unique(), // 标签名称（唯一）
  color: varchar("color", { length: 20 }).notNull().default("#3b82f6"), // 标签颜色
  description: text("description"), // 标签描述
  createdBy: int("createdBy").references(() => users.id), // 创建人
  createdAt: timestamp("createdAt").defaultNow().notNull(), // 创建时间
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), // 更新时间
});

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

/**
 * Product-Category association table (产品-分类关联表)
 * Note: This is different from the existing productCategories table which stores category definitions
 */
export const productCategoryLinks = mysqlTable("product_category_links", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  productId: int("productId").references(() => products.id, { onDelete: "cascade" }).notNull(),
  categoryId: int("categoryId").references(() => productCategories.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProductCategoryLink = typeof productCategoryLinks.$inferSelect;
export type InsertProductCategoryLink = typeof productCategoryLinks.$inferInsert;

/**
 * Product-Tag association table (产品-标签关联表)
 */
export const productTagLinks = mysqlTable("product_tag_links", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  productId: int("productId").references(() => products.id, { onDelete: "cascade" }).notNull(),
  tagId: int("tagId").references(() => tags.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProductTagLink = typeof productTagLinks.$inferSelect;
export type InsertProductTagLink = typeof productTagLinks.$inferInsert;

/**
 * Order status history table (订单状态变更历史表)
 */
export const orderStatusHistory = mysqlTable("order_status_history", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  orderId: int("orderId").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  fromStatus: varchar("fromStatus", { length: 50 }), // 原状态
  toStatus: varchar("toStatus", { length: 50 }).notNull(), // 新状态
  notes: text("notes"), // 备注
  changedBy: int("changedBy").references(() => users.id), // 操作人
  changedAt: timestamp("changedAt").defaultNow().notNull(), // 变更时间
});

export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type InsertOrderStatusHistory = typeof orderStatusHistory.$inferInsert;


/**
 * Universal attributes table (通用属性表)
 * Supports Shopify-style attribute management across different modules
 */
export const attributes = mysqlTable("attributes", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  name: varchar("name", { length: 255 }).notNull(), // 属性值（如"麻布改绒布"）
  category: varchar("category", { length: 100 }).notNull(), // 根目录（如"产品管理"、"客户管理"）
  subcategory: varchar("subcategory", { length: 100 }), // 子目录（如"批次管理"）
  fieldName: varchar("fieldName", { length: 100 }).notNull(), // 字段名（如"变更说明"）
  displayOrder: int("displayOrder").default(0), // 显示顺序
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Attribute = typeof attributes.$inferSelect;
export type InsertAttribute = typeof attributes.$inferInsert;

/**
 * Company assignees table (客户负责人关联表)
 * Supports multiple assignees per company with one primary assignee
 */
export const companyAssignees = mysqlTable("company_assignees", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  companyId: int("companyId").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  userId: int("userId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  isPrimary: boolean("isPrimary").default(false).notNull(), // 是否为主要负责人
  assignedBy: int("assignedBy").references(() => users.id), // 分配人
  assignedAt: timestamp("assignedAt").defaultNow().notNull(), // 分配时间
}, (table) => ({
  // 确保每个公司-用户组合唯一
  uniqueAssignee: unique().on(table.companyId, table.userId),
  // 添加索引以提升查询性能
  companyIdIdx: index("company_assignees_company_id_idx").on(table.companyId),
  userIdIdx: index("company_assignees_user_id_idx").on(table.userId),
}));

export type CompanyAssignee = typeof companyAssignees.$inferSelect;
export type InsertCompanyAssignee = typeof companyAssignees.$inferInsert;

/**
 * Company attachment categories table (客户附件分类表)
 * Supports flexible attachment categorization per company
 */
export const companyAttachmentCategories = mysqlTable("company_attachment_categories", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  companyId: int("companyId").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 100 }).notNull(), // 分类名称（如"水洗标"、"布标"等）
  displayOrder: int("displayOrder").default(0).notNull(), // 显示顺序
  isDefault: boolean("isDefault").default(false).notNull(), // 是否为预设分类
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  companyIdIdx: index("attachment_categories_company_id_idx").on(table.companyId),
}));

export type CompanyAttachmentCategory = typeof companyAttachmentCategories.$inferSelect;
export type InsertCompanyAttachmentCategory = typeof companyAttachmentCategories.$inferInsert;

/**
 * Company attachments table (客户附件表)
 * Supports soft delete with backup mechanism
 */
export const companyAttachments = mysqlTable("company_attachments", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  companyId: int("companyId").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  categoryId: int("categoryId").references(() => companyAttachmentCategories.id, { onDelete: "set null" }),
  fileName: varchar("fileName", { length: 255 }).notNull(), // 文件名
  fileUrl: text("fileUrl").notNull(), // S3文件URL
  fileKey: text("fileKey").notNull(), // S3文件key
  fileSize: int("fileSize"), // 文件大小（字节）
  mimeType: varchar("mimeType", { length: 100 }), // 文件类型
  displayOrder: int("displayOrder").default(0).notNull(), // 显示顺序
  isDeleted: boolean("isDeleted").default(false).notNull(), // 软删除标记
  deletedBy: int("deletedBy").references(() => users.id), // 删除人
  deletedAt: timestamp("deletedAt"), // 删除时间
  uploadedBy: int("uploadedBy").references(() => users.id),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
}, (table) => ({
  companyIdIdx: index("attachments_company_id_idx").on(table.companyId),
  categoryIdIdx: index("attachments_category_id_idx").on(table.categoryId),
  isDeletedIdx: index("attachments_is_deleted_idx").on(table.isDeleted),
}));

export type CompanyAttachment = typeof companyAttachments.$inferSelect;
export type InsertCompanyAttachment = typeof companyAttachments.$inferInsert;

/**
 * System settings table (系统设置表)
 * Stores global configuration for the ERP system
 */
export const systemSettings = mysqlTable("system_settings", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  settingKey: varchar("settingKey", { length: 100 }).notNull(), // 设置键名
  settingValue: text("settingValue"), // 设置值（JSON字符串）
  description: text("description"), // 设置描述
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  uniqueCompanySetting: unique().on(table.erpCompanyId, table.settingKey),
}));

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;

/**
 * Product batches table (产品批次表)
 * Represents customized versions of products for specific customers
 */
export const productBatches = mysqlTable("product_batches", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  batchCode: varchar("batchCode", { length: 100 }).notNull().unique(), // 批次编号（如CV-1000-PC01）
  productId: int("productId").references(() => products.id, { onDelete: "cascade" }).notNull(), // 关联产品
  customerId: int("customerId").references(() => companies.id, { onDelete: "cascade" }).notNull(), // 关联客户
  supplierId: int("supplierId").references(() => suppliers.id), // 关联供应商
  
  // 定制要求
  customRequirements: text("customRequirements"), // 定制要求描述（包装、颜色、面料等）
  
  // 批次价格（可能与原产品不同）
  factoryPriceRmbExcludingTax: decimal("factoryPriceRmbExcludingTax", { precision: 10, scale: 2 }),
  factoryPriceRmbIncludingTax: decimal("factoryPriceRmbIncludingTax", { precision: 10, scale: 2 }),
  factoryPriceUsdFob: decimal("factoryPriceUsdFob", { precision: 10, scale: 2 }),
  myCostRmb: decimal("myCostRmb", { precision: 10, scale: 2 }),
  myCostUsd: decimal("myCostUsd", { precision: 10, scale: 2 }),
  fobFeeRmb: decimal("fobFeeRmb", { precision: 10, scale: 2 }),
  sellingPriceRmbIncludingTax: decimal("sellingPriceRmbIncludingTax", { precision: 10, scale: 2 }),
  fobSellingPrice: decimal("fobSellingPrice", { precision: 10, scale: 2 }), // 批次FOB售价
  
  // 生产状态
  productionStatus: mysqlEnum("productionStatus", ["pending", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
  
  // 其他信息
  notes: text("notes"),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  productIdIdx: index("batches_product_id_idx").on(table.productId),
  customerIdIdx: index("batches_customer_id_idx").on(table.customerId),
  supplierIdIdx: index("batches_supplier_id_idx").on(table.supplierId),
  productionStatusIdx: index("batches_production_status_idx").on(table.productionStatus),
}));

export type ProductBatch = typeof productBatches.$inferSelect;
export type InsertProductBatch = typeof productBatches.$inferInsert;

/**
 * Customer price history table (客户价格历史表)
 * Records the transaction prices for each customer-product combination
 */
export const customerPriceHistory = mysqlTable("customer_price_history", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  customerId: int("customerId").references(() => companies.id, { onDelete: "cascade" }).notNull(), // 客户ID
  productId: int("productId").references(() => products.id, { onDelete: "cascade" }).notNull(), // 产品ID
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(), // 成交单价
  currency: mysqlEnum("currency", ["USD", "RMB"]).default("USD").notNull(), // 货币类型
  orderId: int("orderId").references(() => orders.id, { onDelete: "set null" }), // 关联订单ID
  transactionDate: timestamp("transactionDate").defaultNow().notNull(), // 成交日期
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  customerProductIdx: index("customer_price_history_customer_product_idx").on(table.customerId, table.productId),
  transactionDateIdx: index("customer_price_history_transaction_date_idx").on(table.transactionDate),
}));

export type CustomerPriceHistory = typeof customerPriceHistory.$inferSelect;
export type InsertCustomerPriceHistory = typeof customerPriceHistory.$inferInsert;

/**
 * Quotations table (报价表)
 * Represents price quotations sent to customers before converting to orders
 */
export const quotations: any = mysqlTable("quotations", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  quotationNumber: varchar("quotationNumber", { length: 50 }).notNull().unique(), // 报价单号，格式：QUO-YYYYMMDD-XXX
  
  // 客户信息
  customerId: int("customerId").references(() => companies.id).notNull(),
  customerName: varchar("customerName", { length: 255 }).notNull(), // 客户名称（冗余字段）
  contactPerson: varchar("contactPerson", { length: 100 }),
  contactPhone: varchar("contactPhone", { length: 50 }),
  contactEmail: varchar("contactEmail", { length: 255 }),
  shippingAddress: text("shippingAddress"),
  
  // 报价模式
  quotationMode: mysqlEnum("quotationMode", ["fob_only", "batch_selection"]).default("batch_selection").notNull(),
  currency: varchar("currency", { length: 10 }).default("USD").notNull(),
  
  // 报价状态
  status: mysqlEnum("status", ["draft", "sent", "accepted", "rejected", "expired", "pending_approval", "approval_rejected"]).default("draft").notNull(),
  
  // 审批状态
  requiresApproval: boolean("requiresApproval").default(false).notNull(), // 是否需要审批
  approvalStatus: mysqlEnum("approvalStatus", ["pending", "approved", "rejected"]), // 审批状态
  
  // 金额信息
  totalAmount: decimal("totalAmount", { precision: 15, scale: 2 }).default("0.00").notNull(),
  
  // 有效期
  validUntil: timestamp("validUntil"),
  
  // 备注
  notes: text("notes"), // 内部备注
  customerNotes: text("customerNotes"), // 客户备注（显示在报价单上）
  
  // 版本控制
  version: int("version").default(1).notNull(),
  parentQuotationId: int("parentQuotationId").references((): any => quotations.id), // 父报价ID（用于版本追踪）
  
  // 转换关系
  convertedToOrderId: int("convertedToOrderId").references(() => orders.id),
  convertedAt: timestamp("convertedAt"),
  
  // 发送记录
  sentAt: timestamp("sentAt"),
  sentBy: int("sentBy").references(() => users.id),
  
  // 审计字段
  createdBy: int("createdBy").references(() => users.id).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"), // 软删除时间
}, (table) => ({
  customerIdx: index("quotations_customer_idx").on(table.customerId),
  statusIdx: index("quotations_status_idx").on(table.status),
  quotationNumberIdx: index("quotations_number_idx").on(table.quotationNumber),
  validUntilIdx: index("quotations_valid_until_idx").on(table.validUntil),
  createdAtIdx: index("quotations_created_at_idx").on(table.createdAt),
}));

export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = typeof quotations.$inferInsert;

/**
 * Quotation items table (报价产品明细表)
 */
export const quotationItems = mysqlTable("quotation_items", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  quotationId: int("quotationId").references(() => quotations.id, { onDelete: "cascade" }).notNull(),
  productId: int("productId").references(() => products.id).notNull(),
  productName: varchar("productName", { length: 255 }).notNull(), // 产品名称（冗余）
  productSku: varchar("productSku", { length: 100 }).notNull(), // 产品SKU（冗余）
  supplierSku: varchar("supplierSku", { length: 100 }), // 供应商SKU（从批次复制）
  customerSku: varchar("customerSku", { length: 100 }), // 客户SKU（从批次复制）
  
  // FOB模式字段
  fobQuantity: int("fobQuantity"),
  fobUnitPrice: decimal("fobUnitPrice", { precision: 15, scale: 2 }),
  fobSubtotal: decimal("fobSubtotal", { precision: 15, scale: 2 }),
  
  // 重量和CBM字段（从批次外箱信息复制）
  grossWeight: decimal("grossWeight", { precision: 10, scale: 6 }), // 毛重（kg）
  netWeight: decimal("netWeight", { precision: 10, scale: 6 }), // 净重（kg）
  cbm: decimal("cbm", { precision: 10, scale: 6 }), // 体积（m³）
  piecesPerBox: int("piecesPerBox").default(1), // 每箱件数（用于计算外箱数量）
  
  // 排序
  sortOrder: int("sortOrder").default(0).notNull(),
  
  // 审计字段
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  quotationIdx: index("quotation_items_quotation_idx").on(table.quotationId),
  productIdx: index("quotation_items_product_idx").on(table.productId),
}));

export type QuotationItem = typeof quotationItems.$inferSelect;
export type InsertQuotationItem = typeof quotationItems.$inferInsert;

/**
 * Quotation batches table (报价批次明细表)
 */
export const quotationBatches = mysqlTable("quotation_batches", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  quotationItemId: int("quotationItemId").references(() => quotationItems.id, { onDelete: "cascade" }).notNull(),
  variantId: int("variantId").references(() => productVariants.id),
  variantCode: varchar("variantCode", { length: 100 }), // 批次编号（冗余）
  variantName: varchar("variantName", { length: 255 }), // 批次名称（冗余）
  
  // 批次信息
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
  
  // 外箱重量和立方数字段（从批次引用）
  grossWeight: decimal("grossWeight", { precision: 10, scale: 3 }), // 毛重（千克）
  netWeight: decimal("netWeight", { precision: 10, scale: 3 }), // 净重（千克）
  cbm: decimal("cbm", { precision: 10, scale: 3 }), // 立方数（立方米）
  piecesPerBox: int("piecesPerBox").default(1), // 每箱件数（用于计算外箱数量）
  
  // 排序
  sortOrder: int("sortOrder").default(0).notNull(),
  
  // 审计字段
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  quotationItemIdx: index("quotation_batches_item_idx").on(table.quotationItemId),
  variantIdx: index("quotation_batches_variant_idx").on(table.variantId),
}));

export type QuotationBatch = typeof quotationBatches.$inferSelect;
export type InsertQuotationBatch = typeof quotationBatches.$inferInsert;

/**
 * Quotation version history table (报价版本历史表)
 */
export const quotationVersions = mysqlTable("quotation_versions", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  quotationId: int("quotationId").references(() => quotations.id, { onDelete: "cascade" }).notNull(),
  versionNumber: int("versionNumber").notNull(), // 版本号（从1开始）
  
  // 快照数据（JSON格式存储完整报价信息）
  snapshotData: json("snapshotData").notNull(), // 包含报价基本信息、产品明细、批次信息
  
  // 变更说明
  changeDescription: text("changeDescription"), // 本次修改的说明
  
  // 审计字段
  createdBy: int("createdBy").references(() => users.id).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  quotationIdx: index("quotation_versions_quotation_idx").on(table.quotationId),
  versionIdx: index("quotation_versions_version_idx").on(table.quotationId, table.versionNumber),
}));

export type QuotationVersion = typeof quotationVersions.$inferSelect;
export type InsertQuotationVersion = typeof quotationVersions.$inferInsert;

/**
 * Quotation approvals table (报价审批记录表)
 */
export const quotationApprovals = mysqlTable("quotation_approvals", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  quotationId: int("quotationId").references(() => quotations.id, { onDelete: "cascade" }).notNull(),
  
  // 审批信息
  approverId: int("approverId").references(() => users.id).notNull(), // 审批人
  approverName: varchar("approverName", { length: 100 }).notNull(), // 审批人姓名（冗余）
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  
  // 审批结果
  decision: mysqlEnum("decision", ["approved", "rejected"]), // 审批决定
  comments: text("comments"), // 审批意见
  decidedAt: timestamp("decidedAt"), // 审批时间
  
  // 审计字段
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  quotationIdx: index("quotation_approvals_quotation_idx").on(table.quotationId),
  approverIdx: index("quotation_approvals_approver_idx").on(table.approverId),
  statusIdx: index("quotation_approvals_status_idx").on(table.status),
}));

export type QuotationApproval = typeof quotationApprovals.$inferSelect;
export type InsertQuotationApproval = typeof quotationApprovals.$inferInsert;

/**
 * Quotation templates table (报价模板表)
 * Stores reusable quotation templates with common product combinations
 */
export const quotationTemplates = mysqlTable("quotation_templates", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  templateName: varchar("templateName", { length: 255 }).notNull(), // 模板名称
  description: text("description"), // 模板描述
  
  // 模板配置
  quotationMode: mysqlEnum("quotationMode", ["fob_only", "batch_selection"]).default("batch_selection").notNull(),
  currency: varchar("currency", { length: 10 }).default("USD").notNull(),
  
  // 产品信息（JSON存储）
  productsData: json("productsData").notNull(), // 存储产品列表和批次信息
  
  // 备注
  notes: text("notes"), // 默认备注
  customerNotes: text("customerNotes"), // 默认客户备注
  
  // 元数据
  createdBy: int("createdBy").references(() => users.id).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QuotationTemplate = typeof quotationTemplates.$inferSelect;
export type InsertQuotationTemplate = typeof quotationTemplates.$inferInsert;

/**
 * Material categories table (材料类别表)
 * 用于分类不同类型的材料（布料、脚、面板等）
 */
export const materialCategories = mysqlTable("material_categories", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  name: varchar("name", { length: 100 }).notNull(), // 类别名称（如：布料、脚、面板）
  code: varchar("code", { length: 50 }).notNull().unique(), // 类别代码（如：fabric、leg、panel）
  description: text("description"), // 描述
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaterialCategory = typeof materialCategories.$inferSelect;
export type InsertMaterialCategory = typeof materialCategories.$inferInsert;

/**
 * Material types table (材料类型表)
 * 用于管理材料类型（如：布料、木腿、扶手等）
 */
export const materialTypes = mysqlTable("material_types", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  name: varchar("name", { length: 50 }).notNull(), // 材料类型名称（例如：布料、木腿、扶手）
  icon: varchar("icon", { length: 10 }), // Emoji图标（例如：🧵、🪑、🛌️）
  sortOrder: int("sortOrder").default(0).notNull(), // 排序顺序
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"), // 软删除
});

export type MaterialType = typeof materialTypes.$inferSelect;
export type InsertMaterialType = typeof materialTypes.$inferInsert;

/**
 * Material suppliers table (材料供应商/工厂表)
 */
export const materialSuppliers = mysqlTable("material_suppliers", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  materialTypeId: int("materialTypeId").references(() => materialTypes.id), // 材料类型id（关联material_types表，保留用于向后兼容）
  materialTypeName: varchar("materialTypeName", { length: 100 }), // 材料类型名称（属性管理，优先使用）
  categoryId: int("categoryId").references(() => materialCategories.id), // 材料类别id（可选）
  name: varchar("name", { length: 255 }).notNull(), // 工厂名称
  code: varchar("code", { length: 100 }).notNull().unique(), // 工厂编号
  contactPerson: varchar("contactPerson", { length: 100 }), // 联系人
  contactPhone: varchar("contactPhone", { length: 50 }), // 联系电话
  contactEmail: varchar("contactEmail", { length: 255 }), // 联系邮箱
  address: text("address"), // 地址
  notes: text("notes"), // 备注
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  isLocked: boolean("isLocked").default(false).notNull(), // 是否锁定（系统默认材料不可删除）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaterialSupplier = typeof materialSuppliers.$inferSelect;
export type InsertMaterialSupplier = typeof materialSuppliers.$inferInsert;

/**
 * Material boards table (布板表)
 * 一个布板可以有多个颜色，但价格是统一的
 */
export const materialBoards = mysqlTable("material_boards", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  supplierId: int("supplierId").references(() => materialSuppliers.id, { onDelete: "cascade" }).notNull(),
  categoryId: int("categoryId").references(() => materialCategories.id), // 材料类别id（关联material_categories表，不混入产品类别）
  boardNumber: varchar("boardNumber", { length: 100 }).notNull(), // 布板编号（如：A87）
  boardName: varchar("boardName", { length: 255 }), // 布板名称
  materialType: varchar("materialType", { length: 100 }), // 材质类型（如：绒布、麻布、羊羔绒）
  pricePerMeter: decimal("pricePerMeter", { precision: 15, scale: 2 }).notNull(), // 价格（元/米）
  currency: varchar("currency", { length: 10 }).default("CNY").notNull(), // 货币单位
  minOrderQuantity: int("minOrderQuantity"), // 最小起订量（米）
  leadTime: int("leadTime"), // 交货周期（天）
  description: text("description"), // 描述
  notes: text("notes"), // 备注
  imageUrl: varchar("imageUrl", { length: 500 }), // 布板图片URL
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  isLocked: boolean("isLocked").default(false).notNull(), // 是否锁定（系统默认材料不可删除）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  supplierIdx: index("material_boards_supplier_idx").on(table.supplierId),
  boardNumberIdx: index("material_boards_number_idx").on(table.boardNumber),
  categoryIdx: index("material_boards_category_idx").on(table.categoryId), // 材料类别索引
}));

export type MaterialBoard = typeof materialBoards.$inferSelect;
export type InsertMaterialBoard = typeof materialBoards.$inferInsert;

/**
 * Material colors table (布料颜色表)
 * 每个颜色对应一个布板，可以上传照片
 */
export const materialColors = mysqlTable("material_colors", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  boardId: int("boardId").references(() => materialBoards.id, { onDelete: "cascade" }).notNull(),
  colorCode: varchar("colorCode", { length: 100 }).notNull(), // 颜色编号（如：08）
  colorName: varchar("colorName", { length: 255 }), // 颜色名称
  fullCode: varchar("fullCode", { length: 255 }), // 完整编号（如：dav-A87-08），自动生成
  hexColor: varchar("hexColor", { length: 7 }), // 十六进制颜色值（如：#FF5733）
  imageUrl: text("imageUrl"), // 布料照片URL
  thumbnailUrl: text("thumbnailUrl"), // 缩略图URL
  stockQuantity: int("stockQuantity"), // 库存数量（米）
  notes: text("notes"), // 备注
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  isLocked: boolean("isLocked").default(false).notNull(), // 是否锁定（系统默认材料不可删除）
  usageCount: int("usageCount").default(0).notNull(), // 引用次数（用于热度排序）
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  boardIdx: index("material_colors_board_idx").on(table.boardId),
  colorCodeIdx: index("material_colors_code_idx").on(table.colorCode),
}));

export type MaterialColor = typeof materialColors.$inferSelect;
export type InsertMaterialColor = typeof materialColors.$inferInsert;

/**
 * Variant materials table (批次-材料关联表)
 * 记录每个产品批次使用的材料
 */
export const variantMaterials = mysqlTable("variant_materials", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id), // 所属ERP公司（多租户）
  variantId: int("variantId").references(() => productVariants.id, { onDelete: "cascade" }).notNull(),
  materialColorId: int("materialColorId").references(() => materialColors.id).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(), // 材料显示顺序，数字越小优先级越高（用于订单显示前3个材料）
  materialType: varchar("materialType", { length: 50 }).default("fabric"), // 材料类型（旧字段，保留向后兼容）：fabric(布料), leg(木腿), armrest(扶手), filling(填充物)等
  materialTypeId: int("materialTypeId").references(() => materialTypes.id), // 材料类型外键（新字段）
  quantityUsed: decimal("quantityUsed", { precision: 15, scale: 2 }), // 使用数量（米）
  notes: text("notes"), // 备注
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  variantIdx: index("variant_materials_variant_idx").on(table.variantId),
  materialColorIdx: index("variant_materials_color_idx").on(table.materialColorId),
  materialTypeIdx: index("variant_materials_type_idx").on(table.materialTypeId), // 新增materialTypeId索引
  sortOrderIdx: index("variant_materials_sort_idx").on(table.variantId, table.sortOrder), // 优化排序查询
}));

export type VariantMaterial = typeof variantMaterials.$inferSelect;
export type InsertVariantMaterial = typeof variantMaterials.$inferInsert;

/**
 * Company letterhead table (公司文件抬头表)
 * 存储客户提供的具有法律效应的英文抬头信息，用于订单等正式文件
 */
export const companyLetterheads = mysqlTable("company_letterheads", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").references(() => companies.id, { onDelete: "cascade" }).notNull().unique(), // 一对一关系
  companyNameEn: varchar("companyNameEn", { length: 255 }), // 公司名称（英文）
  tradeAs: varchar("tradeAs", { length: 255 }), // Trade As / 商号
  contactPersonEn: varchar("contactPersonEn", { length: 100 }), // 联系人（英文）
  contactPhone: varchar("contactPhone", { length: 50 }), // 联系电话
  contactEmail: varchar("contactEmail", { length: 255 }), // 联系邮箱
  addressEn: text("addressEn"), // 地址（英文）
  cityEn: varchar("cityEn", { length: 100 }), // 城市（英文）
  stateEn: varchar("stateEn", { length: 100 }), // 州/省（英文）
  postalCode: varchar("postalCode", { length: 20 }), // 邮政编码
  countryEn: varchar("countryEn", { length: 100 }), // 国家（英文）
  notes: text("notes"), // 备注
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  companyIdx: index("company_letterheads_company_idx").on(table.companyId),
}));

export type CompanyLetterhead = typeof companyLetterheads.$inferSelect;
export type InsertCompanyLetterhead = typeof companyLetterheads.$inferInsert;

/**
 * Company settings table (公司信息设置表)
 * 存储每个ERP公司的基本信息、发票抬头、品牌信息等
 * 用于生成Invoice、报价单等业务文档
 */
export const companySettings = mysqlTable("company_settings", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").references(() => erpCompanies.id, { onDelete: "cascade" }).notNull().unique(), // 一对一关系
  
  // 基本信息
  companyName: varchar("companyName", { length: 255 }).notNull(),
  companyLogo: text("companyLogo"), // S3 URL
  contactPhone: varchar("contactPhone", { length: 50 }),
  contactEmail: varchar("contactEmail", { length: 255 }),
  companyAddress: text("companyAddress"),
  postalCode: varchar("postalCode", { length: 20 }),
  
  // 发票抬头信息
  invoiceCompanyName: varchar("invoiceCompanyName", { length: 255 }),
  taxNumber: varchar("taxNumber", { length: 100 }),
  
  // 品牌信息
  brandName: varchar("brandName", { length: 255 }),
  brandSlogan: varchar("brandSlogan", { length: 500 }),
  websiteUrl: varchar("websiteUrl", { length: 500 }),
  
  // 系统设置
  defaultCurrency: varchar("defaultCurrency", { length: 10 }).notNull().default("USD"),
  timezone: varchar("timezone", { length: 100 }).notNull().default("UTC"),
  language: varchar("language", { length: 10 }).notNull().default("zh-CN"),
  
  // 汇率设置
  exchangeRateUsdCny: decimal("exchangeRateUsdCny", { precision: 10, scale: 4 }).default("7.2000"), // USD/CNY 汇率
  exchangeRateEurCny: decimal("exchangeRateEurCny", { precision: 10, scale: 4 }), // EUR/CNY 汇率
  exchangeRateGbpCny: decimal("exchangeRateGbpCny", { precision: 10, scale: 4 }), // GBP/CNY 汇率
  
  // 利润率设置
  defaultProfitMarginLevel1: decimal("defaultProfitMarginLevel1", { precision: 5, scale: 2 }).default("30.00"), // FOB Level 1 默认利润率%
  defaultProfitMarginLevel2: decimal("defaultProfitMarginLevel2", { precision: 5, scale: 2 }).default("25.00"), // FOB Level 2 默认利润率%
  defaultProfitMarginLevel3: decimal("defaultProfitMarginLevel3", { precision: 5, scale: 2 }).default("20.00"), // FOB Level 3 默认利润率%
  defaultRmbProfitMargin: decimal("defaultRmbProfitMargin", { precision: 5, scale: 2 }).default("15.00"), // RMB 含税售价默认利润率%
  defaultTaxRate: decimal("defaultTaxRate", { precision: 5, scale: 2 }).default("13.00"), // 默认税率%
  
  // 邮件营销信息（用于邮件推广）
  marketingCompanyName: varchar("marketingCompanyName", { length: 255 }),
  marketingEmail: varchar("marketingEmail", { length: 255 }),
  marketingAddress: text("marketingAddress"),
  marketingPhone: varchar("marketingPhone", { length: 50 }),
  marketingWebsite: varchar("marketingWebsite", { length: 500 }),
  
  // 时间戳
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  erpCompanyIdx: index("company_settings_erp_company_idx").on(table.erpCompanyId),
}));

export type CompanySettings = typeof companySettings.$inferSelect;
export type InsertCompanySettings = typeof companySettings.$inferInsert;

/**
 * Company bank accounts table (公司银行账户表)
 * 支持每个公司添加多个银行账户，每个账户对应不同货币
 * 用于Invoice显示收款账户信息
 */
export const companyBankAccounts = mysqlTable("company_bank_accounts", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").references(() => erpCompanies.id, { onDelete: "cascade" }).notNull(),
  
  // 银行账户基本信息
  bankName: varchar("bankName", { length: 255 }).notNull(),
  accountName: varchar("accountName", { length: 255 }).notNull(),
  accountNumber: varchar("accountNumber", { length: 100 }).notNull(),
  
  // 货币类型（关键字段）
  currency: varchar("currency", { length: 10 }).notNull(), // USD, CNY, EUR, GBP, JPY等
  
  // 国际银行信息
  swiftCode: varchar("swiftCode", { length: 50 }),
  iban: varchar("iban", { length: 50 }),
  routingNumber: varchar("routingNumber", { length: 50 }),
  bankAddress: text("bankAddress"),
  
  // 账户设置
  isDefault: boolean("isDefault").notNull().default(false),
  sortOrder: int("sortOrder").notNull().default(0),
  
  // 时间戳
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  erpCompanyIdx: index("company_bank_accounts_erp_company_idx").on(table.erpCompanyId),
  currencyIdx: index("company_bank_accounts_currency_idx").on(table.currency),
  sortOrderIdx: index("company_bank_accounts_sort_idx").on(table.erpCompanyId, table.sortOrder),
}));

export type CompanyBankAccount = typeof companyBankAccounts.$inferSelect;
export type InsertCompanyBankAccount = typeof companyBankAccounts.$inferInsert;


/**
 * Package boxes table (批次外箱表)
 * 支持一个批次添加多个外箱，每个外箱有独立的长宽高和CBM计算
 * 用于精确计算物流成本和集装箱装载量
 */
export const packageBoxes = mysqlTable("package_boxes", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").references(() => erpCompanies.id, { onDelete: "cascade" }).notNull(),
  variantId: int("variantId").references(() => productVariants.id, { onDelete: "cascade" }).notNull(),
  
  // 外箱编号（自动生成：1, 2, 3...）
  boxNumber: int("boxNumber").notNull(),
  
  // 外箱尺寸（单位：cm）
  length: decimal("length", { precision: 10, scale: 2 }).notNull(),
  width: decimal("width", { precision: 10, scale: 2 }).notNull(),
  height: decimal("height", { precision: 10, scale: 2 }).notNull(),
  
  // CBM（立方米）= 长 × 宽 × 高 / 1,000,000
  cbm: decimal("cbm", { precision: 10, scale: 6 }).notNull(),
  
  // 重量（单位：kg）
  grossWeight: decimal("grossWeight", { precision: 10, scale: 2 }).default("0"), // 毛重
  netWeight: decimal("netWeight", { precision: 10, scale: 2 }).default("0"), // 净重
  
  // 包装方式
  packagingType: mysqlEnum("packagingType", ["single", "multiple", "bulk"]).default("single").notNull(), // 包装方式：单箱、多箱组合、一箱多件
  piecesPerBox: int("piecesPerBox").default(1).notNull(), // 每箱件数（仅Option 3使用）
  
  // 排序顺序
  sortOrder: int("sortOrder").notNull().default(0),
  
  // 时间戳
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  erpCompanyIdx: index("package_boxes_erp_company_idx").on(table.erpCompanyId),
  variantIdx: index("package_boxes_variant_idx").on(table.variantId),
  sortOrderIdx: index("package_boxes_sort_idx").on(table.variantId, table.sortOrder),
}));

export type PackageBox = typeof packageBoxes.$inferSelect;
export type InsertPackageBox = typeof packageBoxes.$inferInsert;


/**
 * SKU Rules table (SKU规则表)
 * 用于配置各种实体的编号生成规则（供应商、产品、批次、客户、订单、报关单）
 */
export const skuRules = mysqlTable("sku_rules", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").references(() => erpCompanies.id).notNull(), // 所属ERP公司（多租户）
  
  // 规则类型：supplier（供应商）、product（产品）、variant（批次）、customer（客户）、order（订单）、inspection（报关单）
  ruleType: varchar("ruleType", { length: 50 }).notNull(),
  
  // 前缀：固定的字母或文字前缀，例如 "CA"、"SUP"、"PRD"
  prefix: varchar("prefix", { length: 20 }).notNull().default(""),
  
  // 后缀位数：数字部分的位数，例如 3 表示 001、002、003
  suffixLength: int("suffixLength").notNull().default(4),
  
  // 当前计数器：用于生成下一个编号
  currentCounter: int("currentCounter").notNull().default(0),
  
  // 规则描述
  description: text("description"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  erpCompanyIdx: index("sku_rules_erp_company_idx").on(table.erpCompanyId),
  ruleTypeIdx: index("sku_rules_rule_type_idx").on(table.erpCompanyId, table.ruleType),
}));

export type SkuRule = typeof skuRules.$inferSelect;
export type InsertSkuRule = typeof skuRules.$inferInsert;


/**
 * Order Tracking table (订单跟进表)
 * 用于记录订单的物流和验货信息
 */
export const orderTracking = mysqlTable("order_tracking", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").references(() => erpCompanies.id).notNull(), // 所属ERP公司（多租户）
  orderId: int("orderId").references(() => orders.id, { onDelete: "cascade" }).notNull().unique(), // 订单ID（一对一关系）
  
  // 验货信息
  inspectionDate: timestamp("inspectionDate"), // 验货日期
  inspectionReportUrl: text("inspectionReportUrl"), // 验货报告文件URL
  inspectionReportFilename: varchar("inspectionReportFilename", { length: 255 }), // 验货报告文件名
  
  // 物流信息
  shippingPort: varchar("shippingPort", { length: 200 }), // 出货港口
  containerNumber: varchar("containerNumber", { length: 100 }), // 集装箱号码
  billOfLadingNumber: varchar("billOfLadingNumber", { length: 100 }), // 提单号码
  
  // 物流日期
  estimatedShippingDate: timestamp("estimatedShippingDate"), // 预计发货日期
  actualShippingDate: timestamp("actualShippingDate"), // 实际装柜日期/发货日期
  etd: timestamp("etd"), // Estimated Time of Departure
  eta: timestamp("eta"), // Estimated Time of Arrival
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  erpCompanyIdx: index("order_tracking_erp_company_idx").on(table.erpCompanyId),
  orderIdx: index("order_tracking_order_idx").on(table.orderId),
}));

export type OrderTracking = typeof orderTracking.$inferSelect;
export type InsertOrderTracking = typeof orderTracking.$inferInsert;


/**
 * Order Finance table (订单财务信息表)
 * 用于记录订单的付款信息
 */
export const orderFinance = mysqlTable("order_finance", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").references(() => erpCompanies.id).notNull(), // 所属ERP公司（多租户）
  orderId: int("orderId").references(() => orders.id, { onDelete: "cascade" }).notNull().unique(), // 订单ID（一对一关系）
  
  // 客户付款信息
  customerAdvancePaymentDate: timestamp("customerAdvancePaymentDate"), // 客户预付款日期
  customerAdvancePaymentAmount: decimal("customerAdvancePaymentAmount", { precision: 12, scale: 2 }), // 客户预付款金额
  customerFinalPaymentDate: timestamp("customerFinalPaymentDate"), // 客户尾款付款日期
  customerFinalPaymentAmount: decimal("customerFinalPaymentAmount", { precision: 12, scale: 2 }), // 客户尾款付款金额
  
  // 供应商付款信息
  supplierCurrency: mysqlEnum("supplierCurrency", ["USD", "RMB", "EUR", "GBP"]).default("RMB"), // 供应商付款币种（默认RMB）
  supplierAdvancePaymentDate: timestamp("supplierAdvancePaymentDate"), // 供应商预付款日期
  supplierAdvancePaymentAmount: decimal("supplierAdvancePaymentAmount", { precision: 12, scale: 2 }), // 供应商预付款金额
  supplierFinalPaymentDate: timestamp("supplierFinalPaymentDate"), // 供应商尾款日期
  supplierFinalPaymentAmount: decimal("supplierFinalPaymentAmount", { precision: 12, scale: 2 }), // 供应商尾款金额
  
  // 付款方式
  paymentMethod: mysqlEnum("paymentMethod", ["30TT_70TT", "LC_AT_SIGHT"]), // 30%TT, 70%TT 或 100% LC AT SIGHT
  documentsRequired: text("documentsRequired"), // 单据要求（用于Invoice导出）
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  erpCompanyIdx: index("order_finance_erp_company_idx").on(table.erpCompanyId),
  orderIdx: index("order_finance_order_idx").on(table.orderId),
}));

export type OrderFinance = typeof orderFinance.$inferSelect;
export type InsertOrderFinance = typeof orderFinance.$inferInsert;


/**
 * Inspection table (验货信息表)
 * 用于记录订单的验货信息
 */
export const inspections = mysqlTable("inspections", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").references(() => erpCompanies.id).notNull(), // 所属ERP公司（多租户）
  orderId: int("orderId").references(() => orders.id, { onDelete: "cascade" }).notNull().unique(), // 订单ID（一对一关系）
  
  // 验货方式（多选，存储为JSON数组）
  inspectionMethods: json("inspectionMethods").$type<string[]>(), // ["三方", "自己质检", "工厂质检"]
  
  // 验货日期
  inspectionDate: timestamp("inspectionDate"), // 验货日期
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  erpCompanyIdx: index("inspections_erp_company_idx").on(table.erpCompanyId),
  orderIdx: index("inspections_order_idx").on(table.orderId),
}));

export type Inspection = typeof inspections.$inferSelect;
export type InsertInspection = typeof inspections.$inferInsert;


/**
 * Inspection files table (验货报告文件表)
 * 支持多文件上传
 */
export const inspectionFiles = mysqlTable("inspection_files", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").references(() => erpCompanies.id).notNull(), // 所属ERP公司（多租户）
  inspectionId: int("inspectionId").references(() => inspections.id, { onDelete: "cascade" }).notNull(), // 验货ID
  
  // 文件信息
  fileName: varchar("fileName", { length: 255 }).notNull(), // 文件名
  fileUrl: text("fileUrl").notNull(), // S3文件URL
  fileKey: text("fileKey").notNull(), // S3文件key
  fileSize: int("fileSize"), // 文件大小（字节）
  mimeType: varchar("mimeType", { length: 100 }), // 文件类型
  
  // 排序顺序
  sortOrder: int("sortOrder").default(0).notNull(),
  
  uploadedBy: int("uploadedBy").references(() => users.id),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
}, (table) => ({
  erpCompanyIdx: index("inspection_files_erp_company_idx").on(table.erpCompanyId),
  inspectionIdx: index("inspection_files_inspection_idx").on(table.inspectionId),
}));

export type InspectionFile = typeof inspectionFiles.$inferSelect;
export type InsertInspectionFile = typeof inspectionFiles.$inferInsert;


/**
 * Email templates table (邮件模板表)
 * 保存历史生成的产品推广邮件
 */
export const emailTemplates = mysqlTable("email_templates", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").references(() => erpCompanies.id).notNull(), // 所属ERP公司（多租户）
  userId: int("userId").references(() => users.id).notNull(), // 创建用户
  
  templateName: varchar("templateName", { length: 200 }), // 模板名称（可选）
  
  // 选中的产品ID列表
  selectedProducts: json("selectedProducts").$type<number[]>().notNull(),
  
  // 显示字段配置
  displayConfig: json("displayConfig").$type<{
    showImage: boolean;
    showName: boolean;
    showSku: boolean;
    showPrice: boolean;
    priceTypes: ("fobLevel1" | "fobLevel2" | "fobLevel3")[];
    showMoq: boolean;
    showDescription: boolean;
    showSpecs: boolean;
  }>().notNull(),
  
  // 用户自定义内容描述
  customContent: text("customContent"),
  
  // 生成的HTML邮件
  generatedHtml: text("generatedHtml").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  erpCompanyIdx: index("email_templates_erp_company_idx").on(table.erpCompanyId),
  userIdx: index("email_templates_user_idx").on(table.userId),
  createdAtIdx: index("email_templates_created_at_idx").on(table.createdAt),
}));

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;


/**
 * Supplier bank accounts table (供应商银行账户表)
 * 支持每个供应商添加多个银行账户，每个账户对应不同货币
 * 用于工厂版Invoice显示供应商收款账户信息
 */
export const supplierBankAccounts = mysqlTable("supplier_bank_accounts", {
  id: int("id").autoincrement().primaryKey(),
  supplierId: int("supplierId").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
  erpCompanyId: int("erpCompanyId").references(() => erpCompanies.id, { onDelete: "cascade" }).notNull(),
  
  // 银行账户基本信息
  bankName: varchar("bankName", { length: 255 }).notNull(),
  accountName: varchar("accountName", { length: 255 }).notNull(),
  accountNumber: varchar("accountNumber", { length: 100 }).notNull(),
  
  // 货币类型（关键字段）
  currency: varchar("currency", { length: 10 }).notNull(), // USD, CNY, EUR, GBP, JPY等
  
  // 国际银行信息
  swiftCode: varchar("swiftCode", { length: 50 }),
  iban: varchar("iban", { length: 50 }),
  routingNumber: varchar("routingNumber", { length: 50 }),
  bankAddress: text("bankAddress"),
  
  // 账户设置
  isDefault: boolean("isDefault").notNull().default(false),
  sortOrder: int("sortOrder").notNull().default(0),
  
  // 时间戳
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  supplierIdx: index("supplier_bank_accounts_supplier_idx").on(table.supplierId),
  currencyIdx: index("supplier_bank_accounts_currency_idx").on(table.currency),
  sortOrderIdx: index("supplier_bank_accounts_sort_idx").on(table.supplierId, table.sortOrder),
}));

export type SupplierBankAccount = typeof supplierBankAccounts.$inferSelect;
export type InsertSupplierBankAccount = typeof supplierBankAccounts.$inferInsert;

/**
 * Invoice template configurations table (Invoice模板配置表)
 * 存储每个租户的Invoice字段显示配置（客户版、内部版、工厂版）
 */
export const invoiceTemplateConfigs = mysqlTable("invoice_template_configs", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").references(() => erpCompanies.id, { onDelete: "cascade" }).notNull(),
  
  // 模板类型：客户版、内部版、工厂版
  templateType: mysqlEnum("templateType", ["buyer", "internal", "factory"]).notNull(),
  
  // 字段配置（JSON格式）
  fieldConfig: json("fieldConfig").$type<{
    // 产品信息字段
    productFields: {
      showImage: boolean;
      showName: boolean;
      showSku: boolean;
      showCustomerSku: boolean;
      showDimensions: boolean;
      showDescription: boolean;
      showMaterial: boolean;
      showFabric: boolean;
      showColor: boolean;
      showPackaging: boolean;
      showPackageQty: boolean;
      showCbm: boolean;
      showGrossWeight: boolean;
      showNetWeight: boolean;
    };
    // 价格信息字段
    priceFields: {
      showUnitPrice: boolean;
      showQuantity: boolean;
      showSubtotal: boolean;
      showCostPrice: boolean; // 仅内部版
      showProfit: boolean; // 仅内部版
      showProfitMargin: boolean; // 仅内部版
    };
    // 公司信息字段
    companyFields: {
      showLogo: boolean;
      showNameCn: boolean;
      showNameEn: boolean;
      showAddress: boolean;
      showPhone: boolean;
      showEmail: boolean;
      showWebsite: boolean;
    };
    // 客户/供应商信息字段
    partnerFields: {
      showCompanyName: boolean;
      showAddress: boolean;
      showContactPerson: boolean;
      showPhone: boolean;
      showEmail: boolean;
    };
    // 交易条款字段
    termsFields: {
      showLoadingPort: boolean;
      showShipmentTime: boolean;
      showPartialShipment: boolean;
      showPaymentTerms: boolean;
      showQuantityTolerance: boolean;
      showPackingRequirements: boolean;
      showShippingMark: boolean;
      showInsurance: boolean;
      showDocumentsRequired: boolean;
      showUsdBankInfo: boolean;
      showRmbBankInfo: boolean;
      showModificationClause: boolean;
      showPaymentGuarantee: boolean;
      showTerminationClause: boolean;
      showForceMajeure: boolean;
      showArbitration: boolean;
      showSignature: boolean;
    };
  }>().notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  uniqueTemplate: unique().on(table.erpCompanyId, table.templateType),
  erpCompanyIdx: index("invoice_template_configs_erp_company_idx").on(table.erpCompanyId),
}));

export type InvoiceTemplateConfig = typeof invoiceTemplateConfigs.$inferSelect;
export type InsertInvoiceTemplateConfig = typeof invoiceTemplateConfigs.$inferInsert;

/**
 * Invoice terms templates table (Invoice条款模板表)
 * 存储17条交易条款的模板内容，支持变量替换
 */
export const invoiceTermsTemplates = mysqlTable("invoice_terms_templates", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").references(() => erpCompanies.id, { onDelete: "cascade" }).notNull(),
  
  // 条款编号（1-17）
  termNumber: int("termNumber").notNull(), // 1-17
  
  // 条款标题（中英文）
  titleCn: varchar("titleCn", { length: 200 }).notNull(),
  titleEn: varchar("titleEn", { length: 200 }).notNull(),
  
  // 条款内容（支持变量替换，例如 {{companyName}}, {{customerName}}）
  contentCn: text("contentCn"),
  contentEn: text("contentEn"),
  
  // 是否启用
  isEnabled: boolean("isEnabled").notNull().default(true),
  
  // 排序
  sortOrder: int("sortOrder").notNull().default(0),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  uniqueTerm: unique().on(table.erpCompanyId, table.termNumber),
  erpCompanyIdx: index("invoice_terms_templates_erp_company_idx").on(table.erpCompanyId),
  sortOrderIdx: index("invoice_terms_templates_sort_idx").on(table.erpCompanyId, table.sortOrder),
}));

export type InvoiceTermsTemplate = typeof invoiceTermsTemplates.$inferSelect;
export type InsertInvoiceTermsTemplate = typeof invoiceTermsTemplates.$inferInsert;

/**
 * In-App Notifications table - 站内通知（@提醒同事）
 */
export const inAppNotifications = mysqlTable("in_app_notifications", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").references(() => erpCompanies.id, { onDelete: "cascade" }).notNull(),
  // 接收通知的用户
  recipientId: int("recipientId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  // 发送通知的用户
  senderId: int("senderId").references(() => users.id).notNull(),
  senderName: varchar("senderName", { length: 200 }).notNull(),
  // 通知类型
  type: mysqlEnum("type", ["mention", "task", "system"]).notNull().default("mention"),
  // 通知内容
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  // 关联资源（可选）
  relatedType: varchar("relatedType", { length: 50 }), // "follow_up", "order", etc.
  relatedId: int("relatedId"), // 关联记录ID
  relatedCustomerId: int("relatedCustomerId"), // 关联客户ID（方便跳转）
  relatedCustomerName: varchar("relatedCustomerName", { length: 200 }), // 关联客户名称
  // 状态
  isRead: boolean("isRead").notNull().default(false),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  recipientIdx: index("in_app_notifications_recipient_idx").on(table.recipientId),
  erpCompanyIdx: index("in_app_notifications_erp_company_idx").on(table.erpCompanyId),
  isReadIdx: index("in_app_notifications_is_read_idx").on(table.recipientId, table.isRead),
}));
export type InAppNotification = typeof inAppNotifications.$inferSelect;
export type InsertInAppNotification = typeof inAppNotifications.$inferInsert;

/**
 * Apollo Candidates table - Apollo搜索结果暂存（待审核导入）
 * 用于暂存从Apollo API搜索到的潜在客户，审核后可一键导入到companies+contacts
 */
export const apolloCandidates = mysqlTable("apollo_candidates", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").references(() => erpCompanies.id, { onDelete: "cascade" }).notNull(),
  // 搜索来源场景
  searchScene: mysqlEnum("searchScene", ["buyer_search", "competitor_mining"]).notNull().default("buyer_search"),
  // Apollo原始数据
  apolloPersonId: varchar("apolloPersonId", { length: 100 }),
  apolloOrgId: varchar("apolloOrgId", { length: 100 }),
  // 人员信息
  firstName: varchar("firstName", { length: 100 }),
  lastName: varchar("lastName", { length: 100 }),
  fullName: varchar("fullName", { length: 200 }),
  jobTitle: varchar("jobTitle", { length: 200 }),
  email: varchar("email", { length: 320 }),
  linkedinUrl: varchar("linkedinUrl", { length: 500 }),
  phone: varchar("phone", { length: 50 }),
  enrichedAt: timestamp("enrichedAt"),
  // 公司信息
  companyName: varchar("companyName", { length: 300 }),
  companyDomain: varchar("companyDomain", { length: 200 }),
  companyLinkedinUrl: varchar("companyLinkedinUrl", { length: 500 }),
  industry: varchar("industry", { length: 200 }),
  country: varchar("country", { length: 100 }),
  city: varchar("city", { length: 100 }),
  employeeCount: int("employeeCount"),
  annualRevenue: varchar("annualRevenue", { length: 50 }),
  companyPhone: varchar("companyPhone", { length: 50 }),
  companyAddress: text("companyAddress"),
  companyDescription: text("companyDescription"),
  companyFoundedYear: int("companyFoundedYear"),
  companyLogoUrl: text("companyLogoUrl"),
  companyState: varchar("companyState", { length: 100 }),
  companyPostalCode: varchar("companyPostalCode", { length: 20 }),
  // AI生成的开发信
  aiOutreachEmail: text("aiOutreachEmail"),
  aiGeneratedAt: timestamp("aiGeneratedAt"),
  // 导入状态
  importStatus: mysqlEnum("importStatus", ["pending", "imported", "skipped", "duplicate"]).notNull().default("pending"),
  importedCompanyId: int("importedCompanyId"),
  importedContactId: int("importedContactId"),
  importedAt: timestamp("importedAt"),
  importedBy: int("importedBy").references(() => users.id),
  // 搜索批次
  searchBatchId: varchar("searchBatchId", { length: 100 }).notNull(),
  notes: text("notes"),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  apolloErpIdx: index("apollo_candidates_erp_idx").on(table.erpCompanyId),
  apolloStatusIdx: index("apollo_candidates_status_idx").on(table.importStatus),
  apolloBatchIdx: index("apollo_candidates_batch_idx").on(table.searchBatchId),
  apolloPersonIdx: index("apollo_candidates_person_idx").on(table.apolloPersonId),
}));
export type ApolloCandidate = typeof apolloCandidates.$inferSelect;
export type InsertApolloCandidate = typeof apolloCandidates.$inferInsert;


/**
 * Cost snapshots table - 成本快照记录（每次保存成本时自动创建快照）
 * 记录当时的所有成本字段和汇率，用于历史对比
 */
export const costSnapshots = mysqlTable("cost_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  erpCompanyId: int("erpCompanyId").notNull().references(() => erpCompanies.id),
  productId: int("productId").references(() => products.id, { onDelete: "cascade" }).notNull(),
  
  // 快照时的成本数据
  factoryPriceRmbExcludingTax: decimal("factoryPriceRmbExcludingTax", { precision: 10, scale: 2 }),
  factoryPriceRmbIncludingTax: decimal("factoryPriceRmbIncludingTax", { precision: 10, scale: 2 }),
  factoryPriceUsdFob: decimal("factoryPriceUsdFob", { precision: 10, scale: 2 }),
  myCostRmb: decimal("myCostRmb", { precision: 10, scale: 2 }),
  myCostUsd: decimal("myCostUsd", { precision: 10, scale: 2 }),
  fobFeeRmb: decimal("fobFeeRmb", { precision: 10, scale: 2 }),
  
  // 快照时的售价数据
  sellingPriceRmbIncludingTax: decimal("sellingPriceRmbIncludingTax", { precision: 10, scale: 2 }),
  fobLevel1: decimal("fobLevel1", { precision: 10, scale: 2 }),
  fobLevel2: decimal("fobLevel2", { precision: 10, scale: 2 }),
  fobLevel3: decimal("fobLevel3", { precision: 10, scale: 2 }),
  rmbTaxRate: decimal("rmbTaxRate", { precision: 5, scale: 2 }),
  
  // 快照时的汇率
  exchangeRate: decimal("exchangeRate", { precision: 10, scale: 4 }).notNull(), // 当时使用的USD/CNY汇率
  
  // 备注
  note: text("note"), // 操作备注
  
  // 操作人和时间
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  productIdx: index("cost_snapshots_product_idx").on(table.productId),
  erpCompanyIdx: index("cost_snapshots_erp_company_idx").on(table.erpCompanyId),
}));

export type CostSnapshot = typeof costSnapshots.$inferSelect;
export type InsertCostSnapshot = typeof costSnapshots.$inferInsert;
