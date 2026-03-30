import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { quotations, quotationItems, quotationBatches, orders, companies, products, productVariants, users, systemSettings, packageBoxes, variantPricing } from "../../drizzle/schema";
import { eq, and, desc, sql, gte, lte, like, or, isNull } from "drizzle-orm";

/**
 * Generate quotation number using SKU rules
 */
async function generateQuotationNumber(erpCompanyId: number): Promise<string> {
  const { generateSkuCode } = await import("../skuRulesHelper");
  return await generateSkuCode("quotation", erpCompanyId);
}
/**
 * Quotations router
 */
export const quotationsRouter = router({
  /**
   * Create a new quotation
   */
  create: protectedProcedure
    .input(z.object({
      customerId: z.number(),
      quotationMode: z.enum(["fob_only", "batch_selection"]),
      currency: z.string().default("USD"),
      contactPerson: z.string().optional(),
      contactPhone: z.string().optional(),
      contactEmail: z.string().optional(),
      shippingAddress: z.string().optional(),
      validUntil: z.string().optional(), // ISO date string
      notes: z.string().optional(),
      customerNotes: z.string().optional(),
      items: z.array(z.object({
        productId: z.number(),
        fobQuantity: z.number().optional(),
        fobUnitPrice: z.number().optional(),
        batches: z.array(z.object({
          variantId: z.number().nullable(),
          quantity: z.number(),
          unitPrice: z.number(),
          notes: z.string().optional(),
        })).optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Get customer info
      const customer = await db.select().from(companies).where(eq(companies.id, input.customerId)).limit(1);
      if (!customer.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
      }

      // Generate quotation number
      const quotationNumber = await generateQuotationNumber(ctx.user.erpCompanyId);
      
      // Check if quotation number already exists
      const existingQuotation = await db
        .select()
        .from(quotations)
        .where(and(eq(quotations.quotationNumber, quotationNumber), eq(quotations.erpCompanyId, ctx.user.erpCompanyId)))
        .limit(1);
      if (existingQuotation.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `报价单编号 "${quotationNumber}" 已存在，请使用其他编号`,
        });
      }

      // Calculate total amount
      let totalAmount = 0;
      for (const item of input.items) {
        if (input.quotationMode === "fob_only" && item.fobQuantity && item.fobUnitPrice) {
          totalAmount += item.fobQuantity * item.fobUnitPrice;
        } else if (input.quotationMode === "batch_selection" && item.batches) {
          for (const batch of item.batches) {
            totalAmount += batch.quantity * batch.unitPrice;
          }
        }
      }

      // Check if approval is required based on threshold
      const [approvalThreshold] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.settingKey, "quotation_approval_threshold"))
        .limit(1);
      
      const threshold = approvalThreshold && approvalThreshold.settingValue ? parseFloat(approvalThreshold.settingValue) : 10000;
      const requiresApproval = totalAmount >= threshold;

      // Create quotation
      const [quotation] = await db.insert(quotations).values({
        quotationNumber,
        customerId: input.customerId,
        customerName: customer[0].companyName,
        contactPerson: input.contactPerson,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        shippingAddress: input.shippingAddress,
        quotationMode: input.quotationMode,
        currency: input.currency,
        totalAmount: totalAmount.toFixed(2),
        requiresApproval: requiresApproval,
        approvalStatus: requiresApproval ? "pending" : null,
        status: requiresApproval ? "pending_approval" : "draft",
        validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
        notes: input.notes,
        customerNotes: input.customerNotes,
        version: 1,
        createdBy: ctx.user.id,
        erpCompanyId: ctx.user.erpCompanyId,
      });

      // Create quotation items
      for (let i = 0; i < input.items.length; i++) {
        const item = input.items[i];
        
        // Get product info
        const product = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
        if (!product.length) continue;

        let fobSubtotal = 0;
        if (item.fobQuantity && item.fobUnitPrice) {
          fobSubtotal = item.fobQuantity * item.fobUnitPrice;
        }

        // Get weight, CBM, and SKU from package_boxes and product_variants if in batch mode
        let grossWeight = null;
        let netWeight = null;
        let cbm = null;
        let piecesPerBox = 1;
        let supplierSku = null;
        let customerSku = null;
        
        if (input.quotationMode === "batch_selection" && item.batches && item.batches.length > 0) {
          // Use the first batch's variant to get weight, CBM, and SKU
          const firstBatch = item.batches[0];
          if (firstBatch.variantId) {
            // Fetch SKU from product_variants
            const [variant] = await db
              .select()
              .from(productVariants)
              .where(eq(productVariants.id, firstBatch.variantId))
              .limit(1);
            
            if (variant) {
              supplierSku = variant.supplierSku;
              customerSku = variant.customerSku;
            }
            
            // Fetch weight and CBM from package_boxes
            const [packageBox] = await db
              .select()
              .from(packageBoxes)
              .where(eq(packageBoxes.variantId, firstBatch.variantId))
              .limit(1);
            
            if (packageBox) {
              grossWeight = packageBox.grossWeight;
              netWeight = packageBox.netWeight;
              cbm = packageBox.cbm;
            }
          }
        }

        const [quotationItem] = await db.insert(quotationItems).values({
          erpCompanyId: ctx.user.erpCompanyId,
          quotationId: quotation.insertId,
          productId: item.productId,
          productName: product[0].name || product[0].sku,
          productSku: product[0].sku,
          supplierSku,
          customerSku,
          fobQuantity: item.fobQuantity,
          fobUnitPrice: item.fobUnitPrice ? item.fobUnitPrice.toFixed(2) : undefined,
          fobSubtotal: fobSubtotal > 0 ? fobSubtotal.toFixed(2) : undefined,
          grossWeight,
          netWeight,
          cbm,
          piecesPerBox,
          sortOrder: i,
        });

        // Create quotation batches if in batch mode
        if (input.quotationMode === "batch_selection" && item.batches) {
          for (let j = 0; j < item.batches.length; j++) {
            const batch = item.batches[j];
            
            let variantCode = "";
            let variantName = "";
            let batchGrossWeight = null;
            let batchNetWeight = null;
            let batchCbm = null;
            let batchPiecesPerBox = 1;
            
            if (batch.variantId) {
              // Get variant info
              const variant = await db.select().from(productVariants).where(eq(productVariants.id, batch.variantId)).limit(1);
              if (variant.length) {
                variantCode = variant[0].variantCode;
                variantName = variant[0].variantName || "";
              }
              
              // Get package box info for weight and CBM
              const [packageBox] = await db
                .select()
                .from(packageBoxes)
                .where(eq(packageBoxes.variantId, batch.variantId))
                .limit(1);
              
              if (packageBox) {
                batchGrossWeight = packageBox.grossWeight;
                batchNetWeight = packageBox.netWeight;
                batchCbm = packageBox.cbm;
                batchPiecesPerBox = packageBox.piecesPerBox || 1;
              }
            }

            const subtotal = batch.quantity * batch.unitPrice;

            await db.insert(quotationBatches).values({
              erpCompanyId: ctx.user.erpCompanyId,
              quotationItemId: quotationItem.insertId,
              variantId: batch.variantId,
              variantCode: variantCode || undefined,
              variantName: variantName || undefined,
              quantity: batch.quantity,
              unitPrice: batch.unitPrice.toFixed(2),
              subtotal: subtotal.toFixed(2),
              grossWeight: batchGrossWeight,
              netWeight: batchNetWeight,
              cbm: batchCbm,
              piecesPerBox: batchPiecesPerBox,
              sortOrder: j,
            });
          }
        }
      }

      return {
        id: quotation.insertId,
        quotationNumber,
        status: "draft",
        totalAmount,
      };
    }),

  /**
   * Get quotation list with filters
   */
  list: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      pageSize: z.number().default(20),
      status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).optional(),
      customerId: z.number().optional(),
      search: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const { page, pageSize, status, customerId, search, startDate, endDate } = input;
      const offset = (page - 1) * pageSize;

      // Build where conditions
      const conditions = [
        eq(quotations.erpCompanyId, ctx.user.erpCompanyId),
        isNull(quotations.deletedAt)
      ];
      
      if (status) {
        conditions.push(eq(quotations.status, status));
      }
      
      if (customerId) {
        conditions.push(eq(quotations.customerId, customerId));
      }
      
      if (search) {
        conditions.push(
          or(
            like(quotations.quotationNumber, `%${search}%`),
            like(quotations.customerName, `%${search}%`)
          )!
        );
      }
      
      if (startDate) {
        conditions.push(gte(quotations.createdAt, new Date(startDate)));
      }
      
      if (endDate) {
        conditions.push(lte(quotations.createdAt, new Date(endDate)));
      }

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(quotations)
        .where(and(...conditions));

      // Get quotations
      const quotationsList = await db
        .select({
          id: quotations.id,
          quotationNumber: quotations.quotationNumber,
          customerName: quotations.customerName,
          quotationMode: quotations.quotationMode,
          totalAmount: quotations.totalAmount,
          currency: quotations.currency,
          status: quotations.status,
          validUntil: quotations.validUntil,
          createdAt: quotations.createdAt,
          convertedToOrderId: quotations.convertedToOrderId,
        })
        .from(quotations)
        .where(and(...conditions))
        .orderBy(desc(quotations.createdAt))
        .limit(pageSize)
        .offset(offset);

      // Calculate totalGrossWeight, totalNetWeight, totalCBM, avgFobPrice for each quotation
      const items = await Promise.all(quotationsList.map(async (quotation) => {
        // Get quotation items
        const itemsData = await db
          .select({
            itemId: quotationItems.id,
            fobQuantity: quotationItems.fobQuantity,
            fobUnitPrice: quotationItems.fobUnitPrice,
          })
          .from(quotationItems)
          .where(eq(quotationItems.quotationId, quotation.id));
        
        // Calculate total weight, CBM, and average FOB price
        let totalGrossWeight = 0;
        let totalNetWeight = 0;
        let totalCBM = 0;
        let totalFobAmount = 0;
        let totalFobQuantity = 0;
        
        for (const item of itemsData) {
          // Query quotation_batches table to get weight and CBM data
          const batches = await db
            .select({
              quantity: quotationBatches.quantity,
              unitPrice: quotationBatches.unitPrice,
              grossWeight: quotationBatches.grossWeight,
              netWeight: quotationBatches.netWeight,
              cbm: quotationBatches.cbm,
            })
            .from(quotationBatches)
            .where(eq(quotationBatches.quotationItemId, item.itemId));
          
          // Calculate weight and CBM from batches (batch weight/CBM × quantity)
          for (const batch of batches) {
            const batchQuantity = Number(batch.quantity) || 0;
            totalGrossWeight += (Number(batch.grossWeight) || 0) * batchQuantity;
            totalNetWeight += (Number(batch.netWeight) || 0) * batchQuantity;
            totalCBM += (Number(batch.cbm) || 0) * batchQuantity;
            
            // Calculate FOB price for batch mode
            const batchUnitPrice = Number(batch.unitPrice) || 0;
            if (batchUnitPrice > 0 && batchQuantity > 0) {
              totalFobAmount += batchUnitPrice * batchQuantity;
              totalFobQuantity += batchQuantity;
            }
          }
          
          // Calculate FOB price for FOB mode
          if (quotation.quotationMode === 'fob_only') {
            const fobQuantity = Number(item.fobQuantity) || 0;
            const unitPrice = Number(item.fobUnitPrice) || 0;
            if (unitPrice > 0 && fobQuantity > 0) {
              totalFobAmount += unitPrice * fobQuantity;
              totalFobQuantity += fobQuantity;
            }
          }
        }
        
        // Calculate average FOB unit price
        const avgFobPrice = totalFobQuantity > 0 ? totalFobAmount / totalFobQuantity : null;
        
        return {
          ...quotation,
          totalGrossWeight,
          totalNetWeight,
          totalCBM,
          avgFobPrice,
        };
      }));

      return {
        items,
        total: count,
        page,
        pageSize,
      };
    }),

  /**
   * Get quotation by ID
   */
  getById: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input, ctx }): Promise<any> => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Get quotation
      const [quotation] = await db
        .select()
        .from(quotations)
        .where(and(
          eq(quotations.id, input.id),
          eq(quotations.erpCompanyId, ctx.user.erpCompanyId),
          isNull(quotations.deletedAt)
        ))
        .limit(1);

      if (!quotation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quotation not found" });
      }

      // Get quotation items with batches
      const items = await db
        .select()
        .from(quotationItems)
        .where(eq(quotationItems.quotationId, input.id))
        .orderBy(quotationItems.sortOrder);

      const itemsWithBatches = await Promise.all(
        items.map(async (item) => {
          const batches = await db
            .select()
            .from(quotationBatches)
            .where(eq(quotationBatches.quotationItemId, item.id))
            .orderBy(quotationBatches.sortOrder);

          // For each batch, get FOB reference price from variant_pricing
          const batchesWithFobPrice = await Promise.all(
            batches.map(async (batch) => {
              if (!batch.variantId) {
                return { ...batch, fobReferencePrice: null };
              }

              const [pricing] = await db
                .select({
                  sellingPriceFobL1: variantPricing.sellingPriceFobL1,
                })
                .from(variantPricing)
                .where(and(
                  eq(variantPricing.variantId, batch.variantId),
                  eq(variantPricing.isCurrent, true)
                ))
                .limit(1);

              return {
                ...batch,
                fobReferencePrice: pricing?.sellingPriceFobL1 || null,
              };
            })
          );

          // Calculate total weight and CBM for this item (batch weight/CBM × quantity)
          let totalGrossWeight = 0;
          let totalNetWeight = 0;
          let totalCBM = 0;
          if (batchesWithFobPrice.length > 0) {
            for (const batch of batchesWithFobPrice) {
              const quantity = batch.quantity || 0;
              totalGrossWeight += (Number(batch.grossWeight) || 0) * quantity;
              totalNetWeight += (Number(batch.netWeight) || 0) * quantity;
              totalCBM += (Number(batch.cbm) || 0) * quantity;
            }
          } else {
            // Fallback: use quotation_items level grossWeight/netWeight/cbm × fobQuantity
            const qty = item.fobQuantity || 0;
            totalGrossWeight = (Number(item.grossWeight) || 0) * qty;
            totalNetWeight = (Number(item.netWeight) || 0) * qty;
            totalCBM = (Number(item.cbm) || 0) * qty;
          }
          return {
            ...item,
            batches: batchesWithFobPrice,
            totalGrossWeight,
            totalNetWeight,
            totalCBM,
          };
        })
      );

      // Get customer info
      const [customer] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, quotation.customerId))
        .limit(1);

      // Get creator info
      const [creator] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, quotation.createdBy))
        .limit(1);

      return {
        ...quotation,
        items: itemsWithBatches,
        customer,
        createdByUser: creator,
      };
    }),

  /**
   * Update quotation
   */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      customerId: z.number().optional(),
      quotationMode: z.enum(["fob_only", "batch_selection"]).optional(),
      currency: z.string().optional(),
      contactPerson: z.string().optional(),
      contactPhone: z.string().optional(),
      contactEmail: z.string().optional(),
      shippingAddress: z.string().optional(),
      validUntil: z.string().optional(),
      notes: z.string().optional(),
      customerNotes: z.string().optional(),
      items: z.array(z.object({
        productId: z.number(),
        fobQuantity: z.number().optional(),
        fobUnitPrice: z.number().optional(),
        batches: z.array(z.object({
          variantId: z.number().nullable(),
          quantity: z.number(),
          unitPrice: z.number(),
          notes: z.string().optional(),
        })).optional(),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Check if quotation exists
      const [existing] = await db
        .select()
        .from(quotations)
        .where(and(
          eq(quotations.id, input.id),
          eq(quotations.erpCompanyId, ctx.user.erpCompanyId),
          isNull(quotations.deletedAt)
        ))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quotation not found" });
      }

      // Allow editing at any status (removed status restriction)

      // Update quotation basic info
      const updateData: any = {};
      
      if (input.customerId) {
        const [customer] = await db.select().from(companies).where(eq(companies.id, input.customerId)).limit(1);
        if (customer) {
          updateData.customerId = input.customerId;
          updateData.customerName = customer.companyName;
        }
      }
      
      if (input.quotationMode) updateData.quotationMode = input.quotationMode;
      if (input.currency) updateData.currency = input.currency;
      if (input.contactPerson !== undefined) updateData.contactPerson = input.contactPerson;
      if (input.contactPhone !== undefined) updateData.contactPhone = input.contactPhone;
      if (input.contactEmail !== undefined) updateData.contactEmail = input.contactEmail;
      if (input.shippingAddress !== undefined) updateData.shippingAddress = input.shippingAddress;
      if (input.validUntil !== undefined) updateData.validUntil = input.validUntil ? new Date(input.validUntil) : null;
      if (input.notes !== undefined) updateData.notes = input.notes;
      if (input.customerNotes !== undefined) updateData.customerNotes = input.customerNotes;

      // Update items if provided
      if (input.items) {
        // Calculate new total amount
        let totalAmount = 0;
        const mode = input.quotationMode || existing.quotationMode;
        
        for (const item of input.items) {
          if (mode === "fob_only" && item.fobQuantity && item.fobUnitPrice) {
            totalAmount += item.fobQuantity * item.fobUnitPrice;
          } else if (mode === "batch_selection" && item.batches) {
            for (const batch of item.batches) {
              totalAmount += batch.quantity * batch.unitPrice;
            }
          }
        }
        
        updateData.totalAmount = totalAmount.toFixed(2);

        // Delete existing items and batches
        await db.delete(quotationItems).where(eq(quotationItems.quotationId, input.id));

        // Create new items
        for (let i = 0; i < input.items.length; i++) {
          const item = input.items[i];
          
          const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
          if (!product) continue;

          let fobSubtotal = 0;
          if (item.fobQuantity && item.fobUnitPrice) {
            fobSubtotal = item.fobQuantity * item.fobUnitPrice;
          }

          // Get weight, CBM, and SKU from package_boxes and product_variants if in batch mode
          let itemGrossWeight = null;
          let itemNetWeight = null;
          let itemCbm = null;
          let itemPiecesPerBox = 1;
          let itemSupplierSku = null;
          let itemCustomerSku = null;
          
          if (mode === "batch_selection" && item.batches && item.batches.length > 0) {
            const firstBatch = item.batches[0];
            if (firstBatch.variantId) {
              const [variant] = await db.select().from(productVariants).where(eq(productVariants.id, firstBatch.variantId)).limit(1);
              if (variant) {
                itemSupplierSku = variant.supplierSku;
                itemCustomerSku = variant.customerSku;
              }
              const [packageBox] = await db.select().from(packageBoxes).where(eq(packageBoxes.variantId, firstBatch.variantId)).limit(1);
              if (packageBox) {
                itemGrossWeight = packageBox.grossWeight;
                itemNetWeight = packageBox.netWeight;
                itemCbm = packageBox.cbm;
                itemPiecesPerBox = packageBox.piecesPerBox || 1;
              }
            }
          }

          const [quotationItem] = await db.insert(quotationItems).values({
            erpCompanyId: ctx.user.erpCompanyId,
            quotationId: input.id,
            productId: item.productId,
            productName: product.name || product.sku,
            productSku: product.sku,
            supplierSku: itemSupplierSku,
            customerSku: itemCustomerSku,
            grossWeight: itemGrossWeight,
            netWeight: itemNetWeight,
            cbm: itemCbm,
            piecesPerBox: itemPiecesPerBox,
            fobQuantity: item.fobQuantity,
            fobUnitPrice: item.fobUnitPrice ? item.fobUnitPrice.toFixed(2) : undefined,
            fobSubtotal: fobSubtotal > 0 ? fobSubtotal.toFixed(2) : undefined,
            sortOrder: i,
          });

          if (mode === "batch_selection" && item.batches) {
            for (let j = 0; j < item.batches.length; j++) {
              const batch = item.batches[j];
              
              let variantCode = "";
              let variantName = "";
              let batchGrossWeight = null;
              let batchNetWeight = null;
              let batchCbm = null;
              let batchPiecesPerBox = 1;
              
              if (batch.variantId) {
                const [variant] = await db.select().from(productVariants).where(eq(productVariants.id, batch.variantId)).limit(1);
                if (variant) {
                  variantCode = variant.variantCode;
                  variantName = variant.variantName || "";
                }
                
                // Get package box info for weight and CBM
                const [packageBox] = await db
                  .select()
                  .from(packageBoxes)
                  .where(eq(packageBoxes.variantId, batch.variantId))
                  .limit(1);
                
                if (packageBox) {
                  batchGrossWeight = packageBox.grossWeight;
                  batchNetWeight = packageBox.netWeight;
                  batchCbm = packageBox.cbm;
                  batchPiecesPerBox = packageBox.piecesPerBox || 1;
                }
              }

              const subtotal = batch.quantity * batch.unitPrice;

              await db.insert(quotationBatches).values({
                quotationItemId: quotationItem.insertId,
                variantId: batch.variantId,
                variantCode: variantCode || undefined,
                variantName: variantName || undefined,
                quantity: batch.quantity,
                unitPrice: batch.unitPrice.toFixed(2),
                subtotal: subtotal.toFixed(2),
                grossWeight: batchGrossWeight,
                netWeight: batchNetWeight,
                cbm: batchCbm,
                piecesPerBox: batchPiecesPerBox,
                sortOrder: j,
                erpCompanyId: ctx.user.erpCompanyId,
              });
            }
          }
        }
      }

      // Update quotation
      if (Object.keys(updateData).length > 0) {
        await db.update(quotations).set(updateData).where(eq(quotations.id, input.id));
      }

      return { success: true };
    }),

  /**
   * Delete quotation (soft delete)
   */
  delete: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Check if quotation exists and is in draft status
      const [existing] = await db
        .select()
        .from(quotations)
        .where(and(
          eq(quotations.id, input.id),
          eq(quotations.erpCompanyId, ctx.user.erpCompanyId),
          isNull(quotations.deletedAt)
        ))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quotation not found" });
      }

      if (existing.status !== "draft") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only draft quotations can be deleted" });
      }

      // Soft delete
      await db.update(quotations).set({
        deletedAt: new Date(),
      }).where(eq(quotations.id, input.id));

      return { success: true };
    }),

  /**
   * Batch delete quotations (soft delete)
   */
  batchDelete: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      if (input.ids.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No quotations selected" });
      }

      // Check all quotations exist and are in draft status
      const existing = await db
        .select()
        .from(quotations)
        .where(and(
          sql`${quotations.id} IN (${sql.join(input.ids.map(id => sql`${id}`), sql`, `)})`,
          eq(quotations.erpCompanyId, ctx.user.erpCompanyId),
          isNull(quotations.deletedAt)
        ));

      if (existing.length !== input.ids.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Some quotations not found" });
      }

      const nonDraftQuotations = existing.filter(q => q.status !== "draft");
      if (nonDraftQuotations.length > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only draft quotations can be deleted" });
      }

      // Batch soft delete
      await db.update(quotations).set({
        deletedAt: new Date(),
      }).where(sql`${quotations.id} IN (${sql.join(input.ids.map(id => sql`${id}`), sql`, `)})`);

      return { success: true, count: input.ids.length };
    }),

  /**
   * Send quotation to customer
   */
  send: protectedProcedure
    .input(z.object({
      id: z.number(),
      email: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Check if quotation exists
      const [quotation] = await db
        .select()
        .from(quotations)
        .where(and(
          eq(quotations.id, input.id),
          eq(quotations.erpCompanyId, ctx.user.erpCompanyId),
          isNull(quotations.deletedAt)
        ))
        .limit(1);

      if (!quotation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quotation not found" });
      }

      if (quotation.status !== "draft") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only draft quotations can be sent" });
      }

      // Update quotation status
      const sentAt = new Date();
      await db.update(quotations).set({
        status: "sent",
        sentAt,
        sentBy: ctx.user.id,
      }).where(eq(quotations.id, input.id));

      // TODO: Send email to customer with quotation PDF

      return {
        success: true,
        sentAt: sentAt.toISOString(),
      };
    }),

  /**
   * Mark quotation as accepted
   */
  markAsAccepted: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Check if quotation exists
      const [quotation] = await db
        .select()
        .from(quotations)
        .where(and(
          eq(quotations.id, input.id),
          eq(quotations.erpCompanyId, ctx.user.erpCompanyId),
          isNull(quotations.deletedAt)
        ))
        .limit(1);

      if (!quotation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quotation not found" });
      }

      if (quotation.status === "accepted") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Quotation is already accepted" });
      }

      // Update quotation status
      await db.update(quotations).set({
        status: "accepted",
      }).where(eq(quotations.id, input.id));

      return { success: true };
    }),

  /**
   * Mark quotation as rejected
   */
  markAsRejected: protectedProcedure
    .input(z.object({
      id: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Check if quotation exists
      const [quotation] = await db
        .select()
        .from(quotations)
        .where(and(
          eq(quotations.id, input.id),
          eq(quotations.erpCompanyId, ctx.user.erpCompanyId),
          isNull(quotations.deletedAt)
        ))
        .limit(1);

      if (!quotation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quotation not found" });
      }

      // Update quotation status
      await db.update(quotations).set({
        status: "rejected",
        notes: input.reason ? `${quotation.notes || ''}\n\n拒绝原因: ${input.reason}` : quotation.notes,
      }).where(eq(quotations.id, input.id));

      return { success: true };
    }),

  /**
   * Duplicate quotation (create new version or independent copy)
   */
  duplicate: protectedProcedure
    .input(z.object({
      quotationId: z.number(),
      createNewVersion: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Get original quotation with items
      const [original] = await db
        .select()
        .from(quotations)
        .where(and(eq(quotations.id, input.quotationId), isNull(quotations.deletedAt)))
        .limit(1);

      if (!original) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quotation not found" });
      }

      // Get original items
      const originalItems = await db
        .select()
        .from(quotationItems)
        .where(eq(quotationItems.quotationId, input.quotationId));

      // Generate new quotation number
      const quotationNumber = await generateQuotationNumber(ctx.user.erpCompanyId);

      // Create new quotation
      const [newQuotation] = await db.insert(quotations).values({
        quotationNumber,
        customerId: original.customerId,
        customerName: original.customerName,
        contactPerson: original.contactPerson,
        contactPhone: original.contactPhone,
        contactEmail: original.contactEmail,
        shippingAddress: original.shippingAddress,
        quotationMode: original.quotationMode,
        currency: original.currency,
        totalAmount: original.totalAmount,
        validUntil: original.validUntil,
        notes: original.notes,
        customerNotes: original.customerNotes,
        status: "draft",
        version: input.createNewVersion ? original.version + 1 : 1,
        parentQuotationId: input.createNewVersion ? input.quotationId : undefined,
        createdBy: ctx.user.id,
        erpCompanyId: ctx.user.erpCompanyId,
      });

      // Copy items
      for (const item of originalItems) {
        const [newItem] = await db.insert(quotationItems).values({
          erpCompanyId: ctx.user.erpCompanyId,
          quotationId: newQuotation.insertId,
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          fobQuantity: item.fobQuantity,
          fobUnitPrice: item.fobUnitPrice,
          fobSubtotal: item.fobSubtotal,
          sortOrder: item.sortOrder,
        });

        // Copy batches
        const originalBatches = await db
          .select()
          .from(quotationBatches)
          .where(eq(quotationBatches.quotationItemId, item.id));

        for (const batch of originalBatches) {
          await db.insert(quotationBatches).values({
            erpCompanyId: ctx.user.erpCompanyId,
            quotationItemId: newItem.insertId,
            variantId: batch.variantId,
            variantName: batch.variantName,
            quantity: batch.quantity,
            unitPrice: batch.unitPrice,
            subtotal: batch.subtotal,
            sortOrder: batch.sortOrder,
          });
        }
      }

      return {
        success: true,
        newQuotationId: newQuotation.insertId,
        quotationNumber,
      };
    }),

  /**
   * Convert quotation to order
   */
  convertToOrder: protectedProcedure
    .input(z.object({
      quotationId: z.number(),
      contactPhone: z.string().optional(),
      contactEmail: z.string().optional(),
      shippingAddress: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Check if quotation exists and is accepted
      const [quotation] = await db
        .select()
        .from(quotations)
        .where(and(eq(quotations.id, input.quotationId), isNull(quotations.deletedAt)))
        .limit(1);

      if (!quotation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quotation not found" });
      }

      if (quotation.status !== "accepted") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only accepted quotations can be converted to orders" });
      }

      if (quotation.convertedToOrderId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Quotation has already been converted to an order" });
      }

      // Get quotation items
      const items = await db
        .select()
        .from(quotationItems)
        .where(eq(quotationItems.quotationId, input.quotationId));

      if (items.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Quotation has no items" });
      }

      // Generate order number
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateStr = `${year}${month}${day}`;
      const prefix = `ORD-${dateStr}`;
      
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(like(orders.orderNumber, `${prefix}%`));
      
      const count = result[0]?.count || 0;
      const sequence = String(count + 1).padStart(3, '0');
      const orderNumber = `${prefix}-${sequence}`;

      // Create order
      const [order] = await db.insert(orders).values({
        orderNumber,
        customerId: quotation.customerId,
        customerName: quotation.customerName,
        contactPerson: quotation.contactPerson,
        contactPhone: input.contactPhone || quotation.contactPhone,
        contactEmail: input.contactEmail || quotation.contactEmail,
        shippingAddress: input.shippingAddress || quotation.shippingAddress,
        currency: quotation.currency,
        totalAmount: quotation.totalAmount,
        status: "pending",
        paymentStatus: "unpaid",
        notes: input.notes,
        createdBy: ctx.user.id,
      });

      // Update quotation with converted order ID
      await db.update(quotations).set({
        convertedToOrderId: order.insertId,
      }).where(eq(quotations.id, input.quotationId));

      return {
        success: true,
        orderId: order.insertId,
        orderNumber,
      };
    }),

  /**
   * Generate PDF for quotation
   */
  downloadPDF: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Get quotation with items
      const [quotation] = await db
        .select()
        .from(quotations)
        .where(and(
          eq(quotations.id, input.id),
          eq(quotations.erpCompanyId, ctx.user.erpCompanyId),
          isNull(quotations.deletedAt)
        ))
        .limit(1);

      if (!quotation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quotation not found" });
      }

      // Get customer info
      const [customer] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, quotation.customerId))
        .limit(1);

      // Get items
      const items = await db
        .select()
        .from(quotationItems)
        .where(eq(quotationItems.quotationId, input.id));

      // Get batches for each item
      const itemsWithBatches = await Promise.all(
        items.map(async (item) => {
          const batches = await db
            .select()
            .from(quotationBatches)
            .where(eq(quotationBatches.quotationItemId, item.id));
          return { ...item, batches };
        })
      );

      // Return quotation data for PDF generation
      return {
        quotation,
        customer,
        items: itemsWithBatches,
      };
    }),

  /**
   * Get quotation statistics
   */
  stats: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const conditions = [
        eq(quotations.erpCompanyId, ctx.user.erpCompanyId),
        isNull(quotations.deletedAt)
      ];
      
      if (input.startDate) {
        conditions.push(gte(quotations.createdAt, new Date(input.startDate)));
      }
      
      if (input.endDate) {
        conditions.push(lte(quotations.createdAt, new Date(input.endDate)));
      }

      // Get total quotations
      const [{ totalQuotations }] = await db
        .select({ totalQuotations: sql<number>`count(*)` })
        .from(quotations)
        .where(and(...conditions));

      // Get quotations by status
      const statusCounts = await db
        .select({
          status: quotations.status,
          count: sql<number>`count(*)`,
        })
        .from(quotations)
        .where(and(...conditions))
        .groupBy(quotations.status);

      const byStatus = {
        draft: 0,
        sent: 0,
        accepted: 0,
        rejected: 0,
        expired: 0,
      };

      for (const row of statusCounts) {
        byStatus[row.status as keyof typeof byStatus] = row.count;
      }

      // Calculate conversion rate
      const conversionRate = byStatus.sent > 0 ? (byStatus.accepted / byStatus.sent) * 100 : 0;

      // Get total value
      const [{ totalValue }] = await db
        .select({ totalValue: sql<number>`COALESCE(SUM(totalAmount), 0)` })
        .from(quotations)
        .where(and(...conditions));

      // Get accepted value
      const [{ acceptedValue }] = await db
        .select({ acceptedValue: sql<number>`COALESCE(SUM(totalAmount), 0)` })
        .from(quotations)
        .where(and(...conditions, eq(quotations.status, "accepted")));

      return {
        totalQuotations,
        byStatus,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        totalValue: parseFloat(Number(totalValue).toFixed(2)),
        acceptedValue: parseFloat(Number(acceptedValue).toFixed(2)),
      };
    }),
});
