import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import {
  invoiceTemplateConfigs,
  type InsertInvoiceTemplateConfig,
} from "../drizzle/schema";

type TemplateType = "buyer" | "internal" | "factory";

/**
 * Get invoice template config by type
 */
export async function getInvoiceTemplateConfig(erpCompanyId: number, templateType: TemplateType) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [config] = await db
    .select()
    .from(invoiceTemplateConfigs)
    .where(
      and(
        eq(invoiceTemplateConfigs.erpCompanyId, erpCompanyId),
        eq(invoiceTemplateConfigs.templateType, templateType)
      )
    );
  return config;
}

/**
 * Get all invoice template configs for a company
 */
export async function getAllInvoiceTemplateConfigs(erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(invoiceTemplateConfigs)
    .where(eq(invoiceTemplateConfigs.erpCompanyId, erpCompanyId));
}

/**
 * Create or update invoice template config
 */
export async function upsertInvoiceTemplateConfig(data: InsertInvoiceTemplateConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if config exists
  const existing = await getInvoiceTemplateConfig(data.erpCompanyId, data.templateType);

  if (existing) {
    // Update existing config
    await db
      .update(invoiceTemplateConfigs)
      .set({ fieldConfig: data.fieldConfig })
      .where(
        and(
          eq(invoiceTemplateConfigs.erpCompanyId, data.erpCompanyId),
          eq(invoiceTemplateConfigs.templateType, data.templateType)
        )
      );
    return existing.id;
  } else {
    // Create new config
    const [result] = await db.insert(invoiceTemplateConfigs).values(data);
    return result.insertId;
  }
}

/**
 * Initialize default invoice template configs for a company
 */
export async function initializeDefaultInvoiceTemplateConfigs(erpCompanyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if configs already exist
  const existing = await getAllInvoiceTemplateConfigs(erpCompanyId);
  if (existing.length > 0) {
    return; // Already initialized
  }

  // Default config for buyer (customer) invoice
  const buyerConfig: InsertInvoiceTemplateConfig = {
    erpCompanyId,
    templateType: "buyer",
    fieldConfig: {
      productFields: {
        showImage: true,
        showName: true,
        showSku: false,
        showCustomerSku: true,
        showDimensions: true,
        showDescription: true,
        showMaterial: true,
        showFabric: true,
        showColor: true,
        showPackaging: true,
        showPackageQty: true,
        showCbm: true,
        showGrossWeight: true,
        showNetWeight: true,
      },
      priceFields: {
        showUnitPrice: true,
        showQuantity: true,
        showSubtotal: true,
        showCostPrice: false,
        showProfit: false,
        showProfitMargin: false,
      },
      companyFields: {
        showLogo: true,
        showNameCn: true,
        showNameEn: true,
        showAddress: true,
        showPhone: true,
        showEmail: true,
        showWebsite: true,
      },
      partnerFields: {
        showCompanyName: true,
        showAddress: true,
        showContactPerson: true,
        showPhone: true,
        showEmail: true,
      },
      termsFields: {
        showLoadingPort: true,
        showShipmentTime: true,
        showPartialShipment: true,
        showPaymentTerms: true,
        showQuantityTolerance: true,
        showPackingRequirements: true,
        showShippingMark: true,
        showInsurance: true,
        showDocumentsRequired: true,
        showUsdBankInfo: true,
        showRmbBankInfo: true,
        showModificationClause: true,
        showPaymentGuarantee: true,
        showTerminationClause: true,
        showForceMajeure: true,
        showArbitration: true,
        showSignature: true,
      },
    },
  };

  // Default config for internal invoice
  const internalConfig: InsertInvoiceTemplateConfig = {
    erpCompanyId,
    templateType: "internal",
    fieldConfig: {
      productFields: {
        showImage: true,
        showName: true,
        showSku: true,
        showCustomerSku: true,
        showDimensions: true,
        showDescription: true,
        showMaterial: true,
        showFabric: true,
        showColor: true,
        showPackaging: true,
        showPackageQty: true,
        showCbm: true,
        showGrossWeight: true,
        showNetWeight: true,
      },
      priceFields: {
        showUnitPrice: true,
        showQuantity: true,
        showSubtotal: true,
        showCostPrice: true, // Show cost for internal
        showProfit: true, // Show profit for internal
        showProfitMargin: true, // Show profit margin for internal
      },
      companyFields: {
        showLogo: true,
        showNameCn: true,
        showNameEn: true,
        showAddress: true,
        showPhone: true,
        showEmail: true,
        showWebsite: true,
      },
      partnerFields: {
        showCompanyName: true,
        showAddress: true,
        showContactPerson: true,
        showPhone: true,
        showEmail: true,
      },
      termsFields: {
        showLoadingPort: true,
        showShipmentTime: true,
        showPartialShipment: true,
        showPaymentTerms: true,
        showQuantityTolerance: true,
        showPackingRequirements: true,
        showShippingMark: true,
        showInsurance: true,
        showDocumentsRequired: true,
        showUsdBankInfo: true,
        showRmbBankInfo: true,
        showModificationClause: true,
        showPaymentGuarantee: true,
        showTerminationClause: true,
        showForceMajeure: true,
        showArbitration: true,
        showSignature: true,
      },
    },
  };

  // Default config for factory invoice
  const factoryConfig: InsertInvoiceTemplateConfig = {
    erpCompanyId,
    templateType: "factory",
    fieldConfig: {
      productFields: {
        showImage: true,
        showName: true,
        showSku: true,
        showCustomerSku: false,
        showDimensions: true,
        showDescription: true,
        showMaterial: true,
        showFabric: true,
        showColor: true,
        showPackaging: true,
        showPackageQty: true,
        showCbm: true,
        showGrossWeight: true,
        showNetWeight: true,
      },
      priceFields: {
        showUnitPrice: true,
        showQuantity: true,
        showSubtotal: true,
        showCostPrice: false,
        showProfit: false,
        showProfitMargin: false,
      },
      companyFields: {
        showLogo: true,
        showNameCn: true,
        showNameEn: true,
        showAddress: true,
        showPhone: true,
        showEmail: true,
        showWebsite: true,
      },
      partnerFields: {
        showCompanyName: true,
        showAddress: true,
        showContactPerson: true,
        showPhone: true,
        showEmail: true,
      },
      termsFields: {
        showLoadingPort: true,
        showShipmentTime: true,
        showPartialShipment: true,
        showPaymentTerms: true,
        showQuantityTolerance: true,
        showPackingRequirements: true,
        showShippingMark: true,
        showInsurance: false,
        showDocumentsRequired: false,
        showUsdBankInfo: false,
        showRmbBankInfo: true, // Factory usually uses RMB
        showModificationClause: false,
        showPaymentGuarantee: false,
        showTerminationClause: false,
        showForceMajeure: false,
        showArbitration: false,
        showSignature: true,
      },
    },
  };

  // Insert all default configs
  await db.insert(invoiceTemplateConfigs).values([buyerConfig, internalConfig, factoryConfig]);
}
