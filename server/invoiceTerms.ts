import { eq, and, asc } from "drizzle-orm";
import { getDb } from "./db";
import {
  invoiceTermsTemplates,
  type InsertInvoiceTermsTemplate,
} from "../drizzle/schema";

/**
 * Get all invoice terms templates for a company
 */
export async function getInvoiceTermsTemplates(erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(invoiceTermsTemplates)
    .where(eq(invoiceTermsTemplates.erpCompanyId, erpCompanyId))
    .orderBy(asc(invoiceTermsTemplates.sortOrder), asc(invoiceTermsTemplates.termNumber));
}

/**
 * Get a specific invoice terms template by ID
 */
export async function getInvoiceTermsTemplateById(id: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [template] = await db
    .select()
    .from(invoiceTermsTemplates)
    .where(
      and(
        eq(invoiceTermsTemplates.id, id),
        eq(invoiceTermsTemplates.erpCompanyId, erpCompanyId)
      )
    );
  return template;
}

/**
 * Create a new invoice terms template
 */
export async function createInvoiceTermsTemplate(data: InsertInvoiceTermsTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(invoiceTermsTemplates).values(data);
  return result.insertId;
}

/**
 * Update an invoice terms template
 */
export async function updateInvoiceTermsTemplate(
  id: number,
  erpCompanyId: number,
  data: Partial<InsertInvoiceTermsTemplate>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(invoiceTermsTemplates)
    .set(data)
    .where(
      and(
        eq(invoiceTermsTemplates.id, id),
        eq(invoiceTermsTemplates.erpCompanyId, erpCompanyId)
      )
    );
}

/**
 * Delete an invoice terms template
 */
export async function deleteInvoiceTermsTemplate(id: number, erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(invoiceTermsTemplates)
    .where(
      and(
        eq(invoiceTermsTemplates.id, id),
        eq(invoiceTermsTemplates.erpCompanyId, erpCompanyId)
      )
    );
}

/**
 * Initialize default invoice terms templates for a company
 */
export async function initializeDefaultInvoiceTerms(erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if templates already exist
  const existing = await getInvoiceTermsTemplates(erpCompanyId);
  if (existing.length > 0) {
    return; // Already initialized
  }

  // Default 17 invoice terms - 完全按照用户模板内容
  const defaultTerms: InsertInvoiceTermsTemplate[] = [
    {
      erpCompanyId,
      termNumber: 1,
      titleCn: "产品描述/规格/重量/单价",
      titleEn: "Commodity/Specification/Weight/Unit Price",
      contentCn: "如订单中所列明",
      contentEn: "As listed in the order",
      isEnabled: true,
      sortOrder: 1,
    },
    {
      erpCompanyId,
      termNumber: 2,
      titleCn: "装运口岸和目的港",
      titleEn: "Loading Port & Destination",
      contentCn: "从 {{shipmentPort}} 港 到 按买方要求",
      contentEn: "From {{shipmentPort}} port To As buyer requirement",
      isEnabled: true,
      sortOrder: 2,
    },
    {
      erpCompanyId,
      termNumber: 3,
      titleCn: "装运期限",
      titleEn: "Time of Shipment",
      contentCn: "收到预付款后45天内发货",
      contentEn: "45 DAYS After the deposit received",
      isEnabled: true,
      sortOrder: 3,
    },
    {
      erpCompanyId,
      termNumber: 4,
      titleCn: "分批装运",
      titleEn: "Partial Shipment",
      contentCn: "不允许",
      contentEn: "NOT Allowed",
      isEnabled: true,
      sortOrder: 4,
    },
    {
      erpCompanyId,
      termNumber: 5,
      titleCn: "付款条件",
      titleEn: "Terms of Payment",
      contentCn: "30% T/T 作为预付款，余款对提提单副本支付，10天内结清",
      contentEn: "30% T/T as deposit, balance against the BL copy within 10days",
      isEnabled: true,
      sortOrder: 5,
    },
    {
      erpCompanyId,
      termNumber: 6,
      titleCn: "溢短装条款",
      titleEn: "More or less on quantity & value",
      contentCn: "数量和金额允许溢短+/-5%",
      contentEn: "+/-5% on quantity & value",
      isEnabled: true,
      sortOrder: 6,
    },
    {
      erpCompanyId,
      termNumber: 7,
      titleCn: "包装",
      titleEn: "Packing",
      contentCn: "如注明",
      contentEn: "as noted",
      isEnabled: true,
      sortOrder: 7,
    },
    {
      erpCompanyId,
      termNumber: 8,
      titleCn: "唐头",
      titleEn: "Shipping Mark",
      contentCn: "由买方提供或卖方设计，按照买方要求",
      contentEn: "Provided by the buyer or designed by the seller, according to the buyer's requirement",
      isEnabled: true,
      sortOrder: 8,
    },
    {
      erpCompanyId,
      termNumber: 9,
      titleCn: "保险",
      titleEn: "Insurance",
      contentCn: "无",
      contentEn: "NO",
      isEnabled: true,
      sortOrder: 9,
    },
    {
      erpCompanyId,
      termNumber: 10,
      titleCn: "单据要求",
      titleEn: "Documents Required",
      contentCn: "CI, PL, BL ... 按要求",
      contentEn: "CI, PL, BL ... As request",
      isEnabled: true,
      sortOrder: 10,
    },
    {
      erpCompanyId,
      termNumber: 11,
      titleCn: "美金银行信息",
      titleEn: "USD Bank information",
      contentCn: "Beneficiary Name: {{accountName}}\nBank: {{bankName}}\nA/C NO: {{accountNumber}}\nSWIFT CODE: {{swiftCode}}\nBeneficiary Bank Address: {{bankAddress}}",
      contentEn: "Beneficiary Name: {{accountName}}\nBank: {{bankName}}\nA/C NO: {{accountNumber}}\nSWIFT CODE: {{swiftCode}}\nBeneficiary Bank Address: {{bankAddress}}",
      isEnabled: true,
      sortOrder: 11,
    },
    {
      erpCompanyId,
      termNumber: 12,
      titleCn: "人民币银行信息",
      titleEn: "RMB Bank information",
      contentCn: "收款公司: {{companyName}}\n银行: {{cnyBankName}}\n银行账号: {{cnyAccountNumber}}",
      contentEn: "收款公司: {{companyName}}\n银行: {{cnyBankName}}\n银行账号: {{cnyAccountNumber}}",
      isEnabled: true,
      sortOrder: 12,
    },
    {
      erpCompanyId,
      termNumber: 13,
      titleCn: "以上卖方银行信息如需更改，双方必须签订书面的合同变更协议并经双方签署（盖章）后生效",
      titleEn: "Bank information change notice",
      contentCn: "以上卖方银行信息如需更改，双方必须签订书面的合同变更协议并经双方签署（盖章）后生效；任何快递、邮件、电话等方式的变更，双方均不应予以认可。",
      contentEn: "In case the above seller's bank information needs to be changed, both parties must sign a written contract amendment agreement which shall take effect after being signed (stamped) by both parties; any changes via courier, email, telephone, etc. shall not be recognized by either party.",
      isEnabled: true,
      sortOrder: 13,
    },
    {
      erpCompanyId,
      termNumber: 14,
      titleCn: "一旦预见买方付款延期",
      titleEn: "Payment delay notice",
      contentCn: "一旦预见买方付款延期，卖方可要求其他付款方式来保证其收款；卖方也可书面通知买方停止生产、终止发运；在卖方提出要求期间，如果买方无法或拒绝接受其他付款方式，卖方有权就已制造、修改或订购的货物向其他买家出售。",
      contentEn: "Once the buyer's payment delay is anticipated, the seller may require other payment methods to ensure collection; the seller may also notify the buyer in writing to stop production and terminate shipment; during the period when the seller makes the request, if the buyer cannot or refuses to accept other payment methods, the seller has the right to sell the manufactured, modified or ordered goods to other buyers.",
      isEnabled: true,
      sortOrder: 14,
    },
    {
      erpCompanyId,
      termNumber: 15,
      titleCn: "未经卖方书面同意，买方不得终止本合同及订单",
      titleEn: "Contract termination",
      contentCn: "未经卖方书面同意，买方不得终止本合同及订单；若卖方同意终止，买方应向卖方支付在终止之前所有卖方已经制造、修改或订购并且符合合同规定的货物在本合同项下约定的全部货款。",
      contentEn: "Without the written consent of the seller, the buyer shall not terminate this contract and order; if the seller agrees to terminate, the buyer shall pay the seller all the amounts agreed under this contract for all goods that the seller has manufactured, modified or ordered and that meet the contract requirements before the termination.",
      isEnabled: true,
      sortOrder: 15,
    },
    {
      erpCompanyId,
      termNumber: 16,
      titleCn: "不可抗力条款",
      titleEn: "Force majeure clause",
      contentCn: "不可抗力指任何超出双方控制范围且不可预见的事件，包括但不限于战争、天灾、政府行为、全国性罢工、洪水、地震、火灾、风暴或其他自然灾害。不可抗力事件发生后，受影响方应尽快通知对方并提供相关证明文件。如不可抗力事件持续超过60天，双方可协商终止合同。",
      contentEn: "Force majeure refers to any event beyond the control of both parties and unforeseeable, including but not limited to war, natural disasters, government actions, nationwide strikes, floods, earthquakes, fires, storms or other natural disasters. After the occurrence of a force majeure event, the affected party shall notify the other party as soon as possible and provide relevant certification documents. If the force majeure event continues for more than 60 days, both parties may negotiate to terminate the contract.",
      isEnabled: true,
      sortOrder: 16,
    },
    {
      erpCompanyId,
      termNumber: 17,
      titleCn: "仲裁",
      titleEn: "Arbitration",
      contentCn: "凡因执行本合同或与本合同有关事项所发生的一切争执，应由双方通过友好协商的方式解决。协商不成的，交由中国国际经济贸易仲裁委员会仲裁。",
      contentEn: "All disputes arising from the execution of this contract or related to this contract shall be settled by both parties through friendly negotiation. If no settlement can be reached, it shall be submitted to the China International Economic and Trade Arbitration Commission for arbitration.",
      isEnabled: true,
      sortOrder: 17,
    },
  ];

  // Insert all default terms
  await db.insert(invoiceTermsTemplates).values(defaultTerms);
}
