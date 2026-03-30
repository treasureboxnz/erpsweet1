import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getInvoiceTemplateConfig,
  getAllInvoiceTemplateConfigs,
  upsertInvoiceTemplateConfig,
  initializeDefaultInvoiceTemplateConfigs,
} from "../invoiceTemplateConfig";

const templateTypeSchema = z.enum(["buyer", "internal", "factory"]);

const fieldConfigSchema = z.object({
  productFields: z.object({
    showImage: z.boolean(),
    showName: z.boolean(),
    showSku: z.boolean(),
    showCustomerSku: z.boolean(),
    showDimensions: z.boolean(),
    showDescription: z.boolean(),
    showMaterial: z.boolean(),
    showFabric: z.boolean(),
    showColor: z.boolean(),
    showPackaging: z.boolean(),
    showPackageQty: z.boolean(),
    showCbm: z.boolean(),
    showGrossWeight: z.boolean(),
    showNetWeight: z.boolean(),
  }),
  priceFields: z.object({
    showUnitPrice: z.boolean(),
    showQuantity: z.boolean(),
    showSubtotal: z.boolean(),
    showCostPrice: z.boolean(),
    showProfit: z.boolean(),
    showProfitMargin: z.boolean(),
  }),
  companyFields: z.object({
    showLogo: z.boolean(),
    showNameCn: z.boolean(),
    showNameEn: z.boolean(),
    showAddress: z.boolean(),
    showPhone: z.boolean(),
    showEmail: z.boolean(),
    showWebsite: z.boolean(),
  }),
  partnerFields: z.object({
    showCompanyName: z.boolean(),
    showAddress: z.boolean(),
    showContactPerson: z.boolean(),
    showPhone: z.boolean(),
    showEmail: z.boolean(),
  }),
  termsFields: z.object({
    showLoadingPort: z.boolean(),
    showShipmentTime: z.boolean(),
    showPartialShipment: z.boolean(),
    showPaymentTerms: z.boolean(),
    showQuantityTolerance: z.boolean(),
    showPackingRequirements: z.boolean(),
    showShippingMark: z.boolean(),
    showInsurance: z.boolean(),
    showDocumentsRequired: z.boolean(),
    showUsdBankInfo: z.boolean(),
    showRmbBankInfo: z.boolean(),
    showModificationClause: z.boolean(),
    showPaymentGuarantee: z.boolean(),
    showTerminationClause: z.boolean(),
    showForceMajeure: z.boolean(),
    showArbitration: z.boolean(),
    showSignature: z.boolean(),
  }),
});

export const invoiceTemplateConfigRouter = router({
  // Get config by template type
  getByType: protectedProcedure
    .input(z.object({ templateType: templateTypeSchema }))
    .query(async ({ ctx, input }) => {
      return await getInvoiceTemplateConfig(ctx.user.erpCompanyId, input.templateType);
    }),

  // Get all configs
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return await getAllInvoiceTemplateConfigs(ctx.user.erpCompanyId);
  }),

  // Upsert config
  upsert: protectedProcedure
    .input(
      z.object({
        templateType: templateTypeSchema,
        fieldConfig: fieldConfigSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = await upsertInvoiceTemplateConfig({
        erpCompanyId: ctx.user.erpCompanyId,
        templateType: input.templateType,
        fieldConfig: input.fieldConfig,
      });
      return { id };
    }),

  // Initialize default configs
  initializeDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    await initializeDefaultInvoiceTemplateConfigs(ctx.user.erpCompanyId);
    return { success: true };
  }),
});
