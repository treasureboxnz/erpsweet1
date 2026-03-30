import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";
import { users } from "./schema";

/**
 * Companies table - 客户公司主体信息
 * 大部分字段非必填，支持灵活配置
 */
export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  
  // 基本信息
  companyName: varchar("companyName", { length: 200 }).notNull(), // *必填
  customerCode: varchar("customerCode", { length: 50 }).unique(), // 客户编号
  customerType: mysqlEnum("customerType", ["direct", "distributor", "agent", "retailer", "other"]), // 客户类型
  industryType: varchar("industryType", { length: 100 }), // 行业类型
  
  // 地址信息
  country: varchar("country", { length: 100 }), // 国家/地区
  state: varchar("state", { length: 100 }), // 省/州
  city: varchar("city", { length: 100 }), // 城市
  address: text("address"), // 详细地址
  postalCode: varchar("postalCode", { length: 20 }), // 邮政编码
  
  // 注册信息
  businessLicense: varchar("businessLicense", { length: 100 }), // 营业执照号
  taxNumber: varchar("taxNumber", { length: 100 }), // 税号
  website: varchar("website", { length: 200 }), // 公司网站
  
  // 业务信息
  companyScale: mysqlEnum("companyScale", ["small", "medium", "large", "enterprise"]), // 企业规模
  mainProducts: text("mainProducts"), // 主营产品
  annualPurchaseVolume: decimal("annualPurchaseVolume", { precision: 15, scale: 2 }), // 年采购量
  
  // 状态和管理
  status: mysqlEnum("status", ["active", "inactive", "potential", "suspended"]).default("potential").notNull(),
  assignedTo: int("assignedTo").references(() => users.id), // 负责销售员
  importance: mysqlEnum("importance", ["low", "medium", "high", "vip"]).default("medium"), // 重要性
  
  // 备注
  notes: text("notes"), // 备注信息
  
  // 审计字段
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

/**
 * Contacts table - 联系人信息
 * 支持多层级、多角色的联系人管理
 */
export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  
  // 基本信息
  fullName: varchar("fullName", { length: 100 }).notNull(), // *必填
  firstName: varchar("firstName", { length: 50 }),
  lastName: varchar("lastName", { length: 50 }),
  
  // 职位信息
  jobTitle: varchar("jobTitle", { length: 100 }), // 职位
  department: varchar("department", { length: 100 }), // 部门
  role: mysqlEnum("role", ["decision_maker", "purchaser", "finance", "technical", "sales", "other"]), // 角色标签
  
  // 联系方式
  mobile: varchar("mobile", { length: 50 }),
  phone: varchar("phone", { length: 50 }), // 座机
  email: varchar("email", { length: 320 }),
  wechat: varchar("wechat", { length: 100 }),
  skype: varchar("skype", { length: 100 }),
  linkedin: varchar("linkedin", { length: 200 }),
  whatsapp: varchar("whatsapp", { length: 50 }),
  
  // 重要性和偏好
  importance: mysqlEnum("importance", ["key", "normal", "secondary"]).default("normal"), // 重要性等级
  preferredLanguage: varchar("preferredLanguage", { length: 50 }), // 语言偏好
  bestContactTime: varchar("bestContactTime", { length: 100 }), // 最佳联系时间
  timezone: varchar("timezone", { length: 50 }), // 时区
  
  // 备注
  notes: text("notes"),
  
  // 状态
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  
  // 审计字段
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

/**
 * Company-Contact relationship table - 公司与联系人的多对多关系
 * 一个联系人可以属于多个公司，一个公司可以有多个联系人
 */
export const companyContacts = mysqlTable("company_contacts", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").references(() => companies.id).notNull(),
  contactId: int("contactId").references(() => contacts.id).notNull(),
  
  // 关系属性
  isPrimary: boolean("isPrimary").default(false), // 是否为主要联系人
  relationshipType: varchar("relationshipType", { length: 50 }), // 关系类型（如：直接联系人、转介绍等）
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CompanyContact = typeof companyContacts.$inferSelect;
export type InsertCompanyContact = typeof companyContacts.$inferInsert;

/**
 * Follow-up records table - 跟进记录
 * 记录与客户的所有沟通历史
 */
export const followUpRecords = mysqlTable("follow_up_records", {
  id: int("id").autoincrement().primaryKey(),
  
  // 关联信息
  companyId: int("companyId").references(() => companies.id).notNull(),
  contactId: int("contactId").references(() => contacts.id), // 可选，具体联系人
  
  // 跟进内容
  type: mysqlEnum("type", ["call", "email", "meeting", "visit", "quote", "sample", "other"]).notNull(),
  subject: varchar("subject", { length: 200 }), // 主题
  content: text("content").notNull(), // 内容
  
  // 跟进结果
  result: mysqlEnum("result", ["positive", "neutral", "negative", "pending"]),
  nextFollowUpDate: timestamp("nextFollowUpDate"), // 下次跟进日期
  
  // 附件和关联
  attachments: text("attachments"), // JSON array of file URLs
  relatedOrderId: int("relatedOrderId"), // 关联订单
  
  // 审计字段
  followUpBy: int("followUpBy").references(() => users.id).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FollowUpRecord = typeof followUpRecords.$inferSelect;
export type InsertFollowUpRecord = typeof followUpRecords.$inferInsert;
