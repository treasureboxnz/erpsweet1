import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createOperationLog } from "../db";
import * as customerMgmt from "../customerManagement";

// Admin or assigned user can access
const canAccessCompany = async (ctx: any, companyId: number) => {
  if (ctx.user.role === "super_admin" || ctx.user.role === "admin") {
    return true;
  }
  const company = await customerMgmt.getCompanyById(companyId, ctx.user.erpCompanyId);
  return company?.assignedTo === ctx.user.id;
};

export const customerManagementRouter = router({
  // Company-Contact linking
  companyContacts: router({
    link: protectedProcedure
      .input(z.object({ companyId: z.number(), contactId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!(await canAccessCompany(ctx, input.companyId))) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const result = await customerMgmt.linkContactToCompany(input.companyId, input.contactId);
        await createOperationLog({
          erpCompanyId: ctx.user.erpCompanyId,
          userId: ctx.user.id,
          userName: ctx.user.name || "Unknown",
          module: "customer",
          operationType: "create",
          targetId: input.companyId,
          details: `Linked contact ${input.contactId} to company ${input.companyId}`,
          ipAddress: ctx.req.ip || "unknown",
        });
        return result;
      }),
  }),
  // Company operations
  companies: router({
    list: protectedProcedure
      .input(
        z
          .object({
            cooperationStatus: z.string().optional(),
            country: z.string().optional(),
            assignedTo: z.number().optional(),
            search: z.string().optional(),
            customerNature: z.string().optional(),
            customerCategory: z.array(z.string()).optional(),
            cooperationLevel: z.string().optional(),
            createdBy: z.number().optional(),
            overdueFollowUp: z.boolean().optional(),
            overdueDays: z.number().optional(),
            page: z.number().optional(),
            pageSize: z.number().optional(),
            sortBy: z.string().optional(),
            sortOrder: z.enum(['asc', 'desc']).optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        // Non-admin users can only see their assigned companies
        const filters = input || {};
        if (ctx.user.role === "operator") {
          filters.assignedTo = ctx.user.id;
        }
        return customerMgmt.getAllCompanies(ctx.user.erpCompanyId, filters);
      }),

    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
      const company = await customerMgmt.getCompanyById(input.id, ctx.user.erpCompanyId);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }
      if (!(await canAccessCompany(ctx, input.id))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return company;
    }),

    getOrderStats: protectedProcedure.input(z.object({ companyId: z.number() })).query(async ({ input, ctx }) => {
      if (!(await canAccessCompany(ctx, input.companyId))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // TODO: Implement order stats calculation from orders table
      // For now, return mock data
      return {
        totalOrders: 0,
        totalAmountUSD: 0,
        averageOrderAmount: 0,
      };
    }),

    create: protectedProcedure
      .input(
        z.object({
          companyName: z.string().min(1),
          customerCode: z.string().optional(),
          customerNature: z.string().optional(),
          customerCategory: z.array(z.string()).optional(),
          industryType: z.string().optional(),
          country: z.string().optional(),
          state: z.string().optional(),
          city: z.string().optional(),
          address: z.string().optional(),
          postalCode: z.string().optional(),
          businessLicense: z.string().optional(),
          taxNumber: z.string().optional(),
          website: z.string().optional(),
          companyScale: z.enum(["small", "medium", "large", "enterprise"]).optional(),
          mainProducts: z.string().optional(),
          annualPurchaseVolume: z.string().optional(),
          cooperationStatus: z.enum(["developing", "cooperating", "stopped"]).optional(),
          cooperationLevel: z.string().optional(),
          source: z.string().optional(),
          assignedTo: z.number().optional(),
          importance: z.enum(["low", "medium", "high", "vip"]).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Generate customer code if not provided
        let customerCode = input.customerCode;
        if (!customerCode) {
          const { generateSkuCode } = await import("../skuRulesHelper");
          customerCode = await generateSkuCode("customer", ctx.user.erpCompanyId);
        }
        
        // Check if customer code already exists
        const existingCustomer = await customerMgmt.getCompanyByCode(customerCode, ctx.user.erpCompanyId);
        if (existingCustomer) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `客户编号 "${customerCode}" 已存在，请使用其他编号`,
          });
        }
        
        const id = await customerMgmt.createCompany({
          ...input,
          customerCode,
          createdBy: ctx.user.id,
        }, ctx.user.erpCompanyId);

        await createOperationLog({
          erpCompanyId: ctx.user.erpCompanyId,
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email || "Unknown",
          operationType: "create",
          module: "customer",
          targetId: id,
          targetName: input.companyName,
          details: `Created company: ${input.companyName}`,
          ipAddress: (ctx.req.ip || (Array.isArray(ctx.req.headers["x-forwarded-for"]) ? ctx.req.headers["x-forwarded-for"][0] : ctx.req.headers["x-forwarded-for"]) || "unknown") as string,
        });

        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          companyName: z.string().min(1).optional(),
          customerCode: z.string().optional(),
          customerNature: z.string().optional(),
          customerCategory: z.array(z.string()).optional(),
          industryType: z.string().optional(),
          country: z.string().optional(),
          state: z.string().optional(),
          city: z.string().optional(),
          address: z.string().optional(),
          postalCode: z.string().optional(),
          businessLicense: z.string().optional(),
          taxNumber: z.string().optional(),
          website: z.string().optional(),
          companyScale: z.enum(["small", "medium", "large", "enterprise"]).optional(),
          mainProducts: z.string().optional(),
          annualPurchaseVolume: z.string().optional(),
          cooperationStatus: z.enum(["developing", "cooperating", "stopped"]).optional(),
          cooperationLevel: z.string().optional(),
          source: z.string().optional(),
          assignedTo: z.number().optional(),
          importance: z.enum(["low", "medium", "high", "vip"]).optional(),
          notes: z.string().optional(),
          defaultFobLevel: z.enum(["level1", "level2", "level3"]).optional(),
          linkedinUrl: z.string().optional(),
          phone: z.string().optional(),
          description: z.string().optional(),
          foundedYear: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!(await canAccessCompany(ctx, input.id))) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const { id, ...data } = input;
        await customerMgmt.updateCompany(id, data, ctx.user.erpCompanyId);

        await createOperationLog({
          erpCompanyId: ctx.user.erpCompanyId,
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email || "Unknown",
          operationType: "update",
          module: "customer",
          targetId: id,
          details: `Updated company ID: ${id}`,
          ipAddress: (ctx.req.ip || (Array.isArray(ctx.req.headers["x-forwarded-for"]) ? ctx.req.headers["x-forwarded-for"][0] : ctx.req.headers["x-forwarded-for"]) || "unknown") as string,
        });

        return { success: true };
      }),

    delete: protectedProcedure.input(z.number()).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await customerMgmt.deleteCompany(input, ctx.user.erpCompanyId);

      await createOperationLog({
        erpCompanyId: ctx.user.erpCompanyId,
        userId: ctx.user.id,
        userName: ctx.user.name || ctx.user.email || "Unknown",
        operationType: "delete",
        module: "customer",
        targetId: input,
        details: `Deleted company ID: ${input}`,
        ipAddress: (ctx.req.ip || (Array.isArray(ctx.req.headers["x-forwarded-for"]) ? ctx.req.headers["x-forwarded-for"][0] : ctx.req.headers["x-forwarded-for"]) || "unknown") as string,
      });

      return { success: true };
    }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      return customerMgmt.getCompanyStats(ctx.user.erpCompanyId);
    }),

    batchDelete: protectedProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        let deletedCount = 0;
        for (const id of input.ids) {
          try {
            await customerMgmt.deleteCompany(id, ctx.user.erpCompanyId);
            deletedCount++;
          } catch (error) {
            console.error(`Failed to delete company ${id}:`, error);
          }
        }

        await createOperationLog({
          erpCompanyId: ctx.user.erpCompanyId,
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email || "Unknown",
          operationType: "delete",
          module: "customer",
          targetId: input.ids[0] || 0,
          details: `Batch deleted ${deletedCount} companies (IDs: ${input.ids.join(", ")})`,
          ipAddress: (ctx.req.ip || (Array.isArray(ctx.req.headers["x-forwarded-for"]) ? ctx.req.headers["x-forwarded-for"][0] : ctx.req.headers["x-forwarded-for"]) || "unknown") as string,
        });

        return { deletedCount };
      }),

    batchUpdateCooperationStatus: protectedProcedure
      .input(z.object({ ids: z.array(z.number()), cooperationStatus: z.enum(["developing", "cooperating", "stopped"]) }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        let updatedCount = 0;
        for (const id of input.ids) {
          try {
            await customerMgmt.updateCompany(id, { cooperationStatus: input.cooperationStatus }, ctx.user.erpCompanyId);
            updatedCount++;
          } catch (error) {
            console.error(`Failed to update company ${id}:`, error);
          }
        }

        await createOperationLog({
          erpCompanyId: ctx.user.erpCompanyId,
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email || "Unknown",
          operationType: "update",
          module: "customer",
          targetId: input.ids[0] || 0,
          details: `Batch updated cooperation status to ${input.cooperationStatus} for ${updatedCount} companies (IDs: ${input.ids.join(", ")})`,
          ipAddress: (ctx.req.ip || (Array.isArray(ctx.req.headers["x-forwarded-for"]) ? ctx.req.headers["x-forwarded-for"][0] : ctx.req.headers["x-forwarded-for"]) || "unknown") as string,
        });

        return { updatedCount };
      }),

    uploadLogo: protectedProcedure
      .input(
        z.object({
          companyId: z.number(),
          imageData: z.string(), // base64 encoded image
          mimeType: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!(await canAccessCompany(ctx, input.companyId))) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        // Import storage function
        const { storagePut } = await import("../storage");

        // Convert base64 to buffer
        const base64Data = input.imageData.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        // Generate unique file name
        const timestamp = Date.now();
        const ext = input.mimeType.split("/")[1] || "png";
        const fileName = `company-logos/${input.companyId}-${timestamp}.${ext}`;

        // Upload to S3
        const { url } = await storagePut(fileName, buffer, input.mimeType);

        // Update company logoUrl
        await customerMgmt.updateCompany(input.companyId, { logoUrl: url }, ctx.user.erpCompanyId);

        await createOperationLog({
          erpCompanyId: ctx.user.erpCompanyId,
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email || "Unknown",
          operationType: "update",
          module: "customer",
          targetId: input.companyId,
          details: `Uploaded logo for company ID: ${input.companyId}`,
          ipAddress: (ctx.req.ip || (Array.isArray(ctx.req.headers["x-forwarded-for"]) ? ctx.req.headers["x-forwarded-for"][0] : ctx.req.headers["x-forwarded-for"]) || "unknown") as string,
        });

        return { logoUrl: url };
      }),
  }),

  // Contact operations
  contacts: router({
    list: protectedProcedure
      .input(
        z
          .object({
            cooperationStatus: z.string().optional(),
            search: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return customerMgmt.getAllContacts(input || {});
      }),

    getById: protectedProcedure.input(z.number()).query(async ({ input }) => {
      const contact = await customerMgmt.getContactById(input);
      if (!contact) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found" });
      }
      return contact;
    }),

    getByCompany: protectedProcedure.input(z.number()).query(async ({ input, ctx }) => {
      if (!(await canAccessCompany(ctx, input))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return customerMgmt.getContactsByCompany(input);
    }),

    create: protectedProcedure
      .input(
        z.object({
          fullName: z.string().min(1),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          jobTitle: z.string().optional(),
          department: z.string().optional(),
          role: z
            .enum(["decision_maker", "purchaser", "finance", "technical", "sales", "other"])
            .optional(),
          mobile: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().email().optional().or(z.literal("")),
          wechat: z.string().optional(),
          skype: z.string().optional(),
          linkedin: z.string().optional(),
          whatsapp: z.string().optional(),
          importance: z.enum(["key", "normal", "secondary"]).optional(),
          preferredLanguage: z.string().optional(),
          bestContactTime: z.string().optional(),
          timezone: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await customerMgmt.createContact({
          ...input,
          erpCompanyId: ctx.user.erpCompanyId,
          createdBy: ctx.user.id,
        });

        await createOperationLog({
          erpCompanyId: ctx.user.erpCompanyId,
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email || "Unknown",
          operationType: "create",
          module: "customer",
          targetId: id,
          targetName: input.fullName,
          details: `Created contact: ${input.fullName}`,
          ipAddress: (ctx.req.ip || (Array.isArray(ctx.req.headers["x-forwarded-for"]) ? ctx.req.headers["x-forwarded-for"][0] : ctx.req.headers["x-forwarded-for"]) || "unknown") as string,
        });

        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          fullName: z.string().min(1).optional(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          jobTitle: z.string().optional(),
          department: z.string().optional(),
          role: z
            .enum(["decision_maker", "purchaser", "finance", "technical", "sales", "other"])
            .optional(),
          mobile: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().email().optional().or(z.literal("")),
          wechat: z.string().optional(),
          skype: z.string().optional(),
          linkedin: z.string().optional(),
          whatsapp: z.string().optional(),
          importance: z.enum(["key", "normal", "secondary"]).optional(),
          preferredLanguage: z.string().optional(),
          bestContactTime: z.string().optional(),
          timezone: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await customerMgmt.updateContact(id, data);

        await createOperationLog({
          erpCompanyId: ctx.user.erpCompanyId,
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email || "Unknown",
          operationType: "update",
          module: "customer",
          targetId: id,
          details: `Updated contact ID: ${id}`,
          ipAddress: (ctx.req.ip || (Array.isArray(ctx.req.headers["x-forwarded-for"]) ? ctx.req.headers["x-forwarded-for"][0] : ctx.req.headers["x-forwarded-for"]) || "unknown") as string,
        });

        return { success: true };
      }),

    delete: protectedProcedure.input(z.number()).mutation(async ({ input, ctx }) => {
      await customerMgmt.deleteContact(input);

      await createOperationLog({
        erpCompanyId: ctx.user.erpCompanyId,
        userId: ctx.user.id,
        userName: ctx.user.name || ctx.user.email || "Unknown",
        operationType: "delete",
        module: "customer",
        targetId: input,
        details: `Deleted contact ID: ${input}`,
        ipAddress: (ctx.req.ip || (Array.isArray(ctx.req.headers["x-forwarded-for"]) ? ctx.req.headers["x-forwarded-for"][0] : ctx.req.headers["x-forwarded-for"]) || "unknown") as string,
      });

      return { success: true };
    }),

    linkToCompany: protectedProcedure
      .input(
        z.object({
          companyId: z.number(),
          contactId: z.number(),
          isPrimary: z.boolean().optional(),
          relationshipType: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!(await canAccessCompany(ctx, input.companyId))) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await customerMgmt.linkContactToCompany(
          input.companyId,
          input.contactId,
          input.isPrimary,
          input.relationshipType
        );

        return { success: true };
      }),

    unlinkFromCompany: protectedProcedure
      .input(
        z.object({
          companyId: z.number(),
          contactId: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!(await canAccessCompany(ctx, input.companyId))) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await customerMgmt.unlinkContactFromCompany(input.companyId, input.contactId);

        return { success: true };
      }),
  }),

  // Follow-up records
  followUps: router({
    getByCompany: protectedProcedure.input(z.number()).query(async ({ input, ctx }) => {
      if (!(await canAccessCompany(ctx, input))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return customerMgmt.getFollowUpsByCompany(input);
    }),

    create: protectedProcedure
      .input(
        z.object({
          companyId: z.number(),
          contactId: z.number().optional(),
          type: z.enum(["call", "email", "meeting", "visit", "quote", "sample", "other"]),
          subject: z.string().optional(),
          content: z.string().min(1),
          result: z.enum(["positive", "neutral", "negative", "pending"]).optional(),
          nextFollowUpDate: z.date().optional(),
          attachments: z.string().optional(),
          relatedOrderId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!(await canAccessCompany(ctx, input.companyId))) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const id = await customerMgmt.createFollowUpRecord({
          ...input,
          erpCompanyId: ctx.user.erpCompanyId,
          followUpBy: ctx.user.id,
        });

        await createOperationLog({
          erpCompanyId: ctx.user.erpCompanyId,
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email || "Unknown",
          operationType: "create",
          module: "customer",
          targetId: id,
          details: `Created follow-up record for company ID: ${input.companyId}`,
          ipAddress: (ctx.req.ip || (Array.isArray(ctx.req.headers["x-forwarded-for"]) ? ctx.req.headers["x-forwarded-for"][0] : ctx.req.headers["x-forwarded-for"]) || "unknown") as string,
        });

        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          type: z.enum(["call", "email", "meeting", "visit", "quote", "sample", "other"]).optional(),
          subject: z.string().optional(),
          content: z.string().min(1).optional(),
          result: z.enum(["positive", "neutral", "negative", "pending"]).optional(),
          nextFollowUpDate: z.date().optional(),
          attachments: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await customerMgmt.updateFollowUpRecord(id, data);

        await createOperationLog({
          erpCompanyId: ctx.user.erpCompanyId,
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email || "Unknown",
          operationType: "update",
          module: "customer",
          targetId: id,
          details: `Updated follow-up record ID: ${id}`,
          ipAddress: (ctx.req.ip || (Array.isArray(ctx.req.headers["x-forwarded-for"]) ? ctx.req.headers["x-forwarded-for"][0] : ctx.req.headers["x-forwarded-for"]) || "unknown") as string,
        });

        return { success: true };
      }),

    delete: protectedProcedure.input(z.number()).mutation(async ({ input, ctx }) => {
      await customerMgmt.deleteFollowUpRecord(input);

      await createOperationLog({
        erpCompanyId: ctx.user.erpCompanyId,
        userId: ctx.user.id,
        userName: ctx.user.name || ctx.user.email || "Unknown",
        operationType: "delete",
        module: "customer",
        targetId: input,
        details: `Deleted follow-up record ID: ${input}`,
        ipAddress: (ctx.req.ip || (Array.isArray(ctx.req.headers["x-forwarded-for"]) ? ctx.req.headers["x-forwarded-for"][0] : ctx.req.headers["x-forwarded-for"]) || "unknown") as string,
      });

      return { success: true };
    }),
  }),

  // Company Assignees operations
  assignees: router({
    // Get all assignees for a company
    list: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (!(await canAccessCompany(ctx, input.companyId))) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await customerMgmt.getCompanyAssignees(input.companyId);
      }),

    // Add an assignee to a company
    add: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        userId: z.number(),
        isPrimary: z.boolean().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can assign users" });
        }
        
        const result = await customerMgmt.addCompanyAssignee({
          companyId: input.companyId,
          userId: input.userId,
          isPrimary: input.isPrimary,
          assignedBy: ctx.user.id,
        });

        await createOperationLog({
          erpCompanyId: ctx.user.erpCompanyId,
          userId: ctx.user.id,
          userName: ctx.user.name || "Unknown",
          module: "customer",
          operationType: "update",
          targetId: input.companyId,
          details: `Added assignee ${input.userId} to company ${input.companyId}${input.isPrimary ? " (primary)" : ""}`,
          ipAddress: ctx.req.ip || "unknown",
        });

        return result;
      }),

    // Remove an assignee from a company
    remove: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        userId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can remove assignees" });
        }

        await customerMgmt.removeCompanyAssignee(input.companyId, input.userId);

        await createOperationLog({
          erpCompanyId: ctx.user.erpCompanyId,
          userId: ctx.user.id,
          userName: ctx.user.name || "Unknown",
          module: "customer",
          operationType: "update",
          targetId: input.companyId,
          details: `Removed assignee ${input.userId} from company ${input.companyId}`,
          ipAddress: ctx.req.ip || "unknown",
        });

        return { success: true };
      }),

    // Set primary assignee
    setPrimary: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        userId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can set primary assignee" });
        }

        await customerMgmt.setPrimaryAssignee(input.companyId, input.userId);

        await createOperationLog({
          erpCompanyId: ctx.user.erpCompanyId,
          userId: ctx.user.id,
          userName: ctx.user.name || "Unknown",
          module: "customer",
          operationType: "update",
          targetId: input.companyId,
          details: `Set user ${input.userId} as primary assignee for company ${input.companyId}`,
          ipAddress: ctx.req.ip || "unknown",
        });

        return { success: true };
      }),
  }),

  // Attachments management
  attachments: router({
    // Get attachment categories for a company
    categories: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (!(await canAccessCompany(ctx, input.companyId))) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await customerMgmt.getAttachmentCategories(input.companyId);
      }),

    // Create attachment category
    createCategory: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        name: z.string(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!(await canAccessCompany(ctx, input.companyId))) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await customerMgmt.createAttachmentCategory({
          companyId: input.companyId,
          name: input.name,
          isDefault: input.isDefault || false,
          createdBy: ctx.user.id,
        });
      }),

    // Rename attachment category
    renameCategory: protectedProcedure
      .input(z.object({
        categoryId: z.number(),
        name: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await customerMgmt.renameAttachmentCategory(input.categoryId, input.name);
      }),

    // Delete attachment category
    deleteCategory: protectedProcedure
      .input(z.object({ categoryId: z.number() }))
      .mutation(async ({ input }) => {
        return await customerMgmt.deleteAttachmentCategory(input.categoryId);
      }),

    // Get attachments (normal or deleted)
    list: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        includeDeleted: z.boolean().optional(),
      }))
      .query(async ({ input, ctx }) => {
        if (!(await canAccessCompany(ctx, input.companyId))) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await customerMgmt.getAttachments(input.companyId, input.includeDeleted || false);
      }),

    // Upload attachment
    upload: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        categoryId: z.number().optional(),
        fileName: z.string(),
        fileUrl: z.string(),
        fileKey: z.string(),
        fileSize: z.number().optional(),
        mimeType: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!(await canAccessCompany(ctx, input.companyId))) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await customerMgmt.uploadAttachment({
          ...input,
          uploadedBy: ctx.user.id,
        });
      }),

    // Soft delete attachment
    delete: protectedProcedure
      .input(z.object({ attachmentId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return await customerMgmt.softDeleteAttachment(input.attachmentId, ctx.user.id);
      }),

    // Restore attachment (admin only)
    restore: protectedProcedure
      .input(z.object({ attachmentId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can restore attachments" });
        }
        return await customerMgmt.restoreAttachment(input.attachmentId);
      }),
  }),

  // Price history
  priceHistory: router({
    // Get customer's price history for all products
    list: protectedProcedure
      .input(z.object({ customerId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (!(await canAccessCompany(ctx, input.customerId))) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await customerMgmt.getCustomerPriceHistory(input.customerId);
      }),
  }),

  // Company letterheads
  companyLetterheads: router({
    getByCompanyId: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (!(await canAccessCompany(ctx, input.companyId))) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await customerMgmt.getCompanyLetterhead(input.companyId);
      }),

    upsert: protectedProcedure
      .input(
        z.object({
          companyId: z.number(),
          companyNameEn: z.string().optional(),
          tradeAs: z.string().optional(),
          contactPersonEn: z.string().optional(),
          contactPhone: z.string().optional(),
          contactEmail: z.string().optional(),
          addressEn: z.string().optional(),
          cityEn: z.string().optional(),
          stateEn: z.string().optional(),
          postalCode: z.string().optional(),
          countryEn: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!(await canAccessCompany(ctx, input.companyId))) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { companyId, ...data } = input;
        const result = await customerMgmt.upsertCompanyLetterhead(companyId, data);
        await createOperationLog({
          erpCompanyId: ctx.user.erpCompanyId,
          userId: ctx.user.id,
          userName: ctx.user.name || "Unknown",
          module: "customer",
          operationType: "update",
          targetId: companyId,
          details: `Updated company letterhead for company ${companyId}`,
          ipAddress: ctx.req.ip || "unknown",
        });
        return result;
      }),
  }),

  // Follow-up Progress (跟进进度) - New enhanced follow-up with stage tracking
  followUpProgress: router({
    getByCustomer: protectedProcedure
      .input(z.number())
      .query(async ({ input, ctx }) => {
        if (!(await canAccessCompany(ctx, input))) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return customerMgmt.getCustomerFollowUpProgress(input);
      }),

    getLatestTime: protectedProcedure
      .input(z.number())
      .query(async ({ input, ctx }) => {
        if (!(await canAccessCompany(ctx, input))) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return { lastFollowUpAt: await customerMgmt.getLatestFollowUpTime(input) };
      }),

    getOverdue: protectedProcedure
      .input(z.object({ days: z.number().default(30) }))
      .query(async ({ input, ctx }) => {
        if (!ctx.user.erpCompanyId) throw new TRPCError({ code: "FORBIDDEN" });
        return customerMgmt.getOverdueFollowUpCustomers(ctx.user.erpCompanyId, input.days);
      }),

    create: protectedProcedure
      .input(
        z.object({
          customerId: z.number(),
          content: z.string().min(1),
          followUpType: z.enum(["call", "email", "meeting", "visit", "other"]),
          currentStageId: z.number().optional(),
          nextPlanStageId: z.number().optional(),
          nextPlanDate: z.date().optional(),
          quotationFiles: z.string().optional(), // JSON string
          quotationDate: z.date().optional(),
          images: z.string().optional(), // JSON string of image URLs
          mentionedUserIds: z.array(z.number()).optional(), // @提醒的用户ID列表
          customerName: z.string().optional(), // 客户名称（用于通知内容）
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!(await canAccessCompany(ctx, input.customerId))) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { mentionedUserIds, customerName, ...progressData } = input;
        const id = await customerMgmt.createCustomerFollowUpProgress({
          ...progressData,
          erpCompanyId: ctx.user.erpCompanyId || undefined,
          followUpBy: ctx.user.id,
        });
        // 发送@提醒通知
        if (mentionedUserIds && mentionedUserIds.length > 0 && ctx.user.erpCompanyId) {
          const { getDb } = await import("../db");
          const { inAppNotifications } = await import("../../drizzle/schema");
          const db = await getDb();
          if (db) {
            const senderName = ctx.user.name || ctx.user.email || "同事";
            const custName = customerName || `客户ID:${input.customerId}`;
            const preview = input.content.length > 50 ? input.content.slice(0, 50) + "..." : input.content;
            await Promise.all(mentionedUserIds.map(recipientId =>
              db.insert(inAppNotifications).values({
                erpCompanyId: ctx.user.erpCompanyId!,
                recipientId,
                senderId: ctx.user.id,
                senderName,
                type: "mention",
                title: `${senderName} 在跟进记录中@了你`,
                content: `客户：${custName}\n内容：${preview}`,
                relatedType: "follow_up",
                relatedId: id,
                relatedCustomerId: input.customerId,
                relatedCustomerName: custName,
              })
            ));
          }
        }
        await createOperationLog({
          erpCompanyId: ctx.user.erpCompanyId,
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email || "Unknown",
          operationType: "create",
          module: "customer",
          targetId: id,
          details: `Created follow-up progress for customer ID: ${input.customerId}`,
          ipAddress: (ctx.req.ip || "unknown") as string,
        });
        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          content: z.string().min(1).optional(),
          followUpType: z.enum(["call", "email", "meeting", "visit", "other"]).optional(),
          currentStageId: z.number().nullable().optional(),
          nextPlanStageId: z.number().nullable().optional(),
          nextPlanDate: z.date().nullable().optional(),
          quotationFiles: z.string().optional(),
          quotationDate: z.date().nullable().optional(),
          images: z.string().optional(), // JSON string of image URLs
          mentionedUserIds: z.array(z.number()).optional(), // 新增@提醒的用户ID列表
          customerName: z.string().optional(), // 客户名称（用于通知内容）
          customerId: z.number().optional(), // 关联客户ID（用于通知跳转）
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, mentionedUserIds, customerName, customerId, ...data } = input;
        await customerMgmt.updateCustomerFollowUpProgress(id, data);
        // 编辑时补发@提醒通知
        if (mentionedUserIds && mentionedUserIds.length > 0 && ctx.user.erpCompanyId) {
          const { getDb } = await import("../db");
          const { inAppNotifications } = await import("../../drizzle/schema");
          const db = await getDb();
          if (db) {
            const senderName = ctx.user.name || ctx.user.email || "同事";
            const custName = customerName || (customerId ? `客户ID:${customerId}` : "未知客户");
            const preview = (input.content || "").length > 50 ? (input.content || "").slice(0, 50) + "..." : (input.content || "");
            await Promise.all(mentionedUserIds.map(recipientId =>
              db.insert(inAppNotifications).values({
                erpCompanyId: ctx.user.erpCompanyId!,
                recipientId,
                senderId: ctx.user.id,
                senderName,
                type: "mention",
                title: `${senderName} 在跟进记录中@了你（编辑）`,
                content: `客户：${custName}\n内容：${preview}`,
                relatedType: "follow_up",
                relatedId: id,
                relatedCustomerId: customerId,
                relatedCustomerName: custName,
              })
            ));
          }
        }
        await createOperationLog({
          erpCompanyId: ctx.user.erpCompanyId,
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email || "Unknown",
          operationType: "update",
          module: "customer",
          targetId: id,
          details: `Updated follow-up progress ID: ${id}`,
          ipAddress: (ctx.req.ip || "unknown") as string,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input, ctx }) => {
        await customerMgmt.deleteCustomerFollowUpProgress(input);
        await createOperationLog({
          erpCompanyId: ctx.user.erpCompanyId,
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email || "Unknown",
          operationType: "delete",
          module: "customer",
          targetId: input,
          details: `Deleted follow-up progress ID: ${input}`,
          ipAddress: (ctx.req.ip || "unknown") as string,
        });
        return { success: true };
      }),

    uploadQuotationFile: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileBase64: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { storagePut } = await import("../storage");
        const buffer = Buffer.from(input.fileBase64, "base64");
        const suffix = input.fileName.split(".").pop() || "file";
        const key = `follow-up-quotations/${ctx.user.id}-${Date.now()}.${suffix}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { url, key, name: input.fileName, type: input.mimeType };
      }),

    uploadImage: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileBase64: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { storagePut } = await import("../storage");
        const buffer = Buffer.from(input.fileBase64, "base64");
        const suffix = input.fileName.split(".").pop() || "png";
        const key = `follow-up-images/${ctx.user.id}-${Date.now()}.${suffix}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { url, key, name: input.fileName, type: input.mimeType };
      }),
  }),
});