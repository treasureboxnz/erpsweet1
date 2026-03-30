import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getCompanyBankAccounts,
  getCompanyBankAccountById,
  createCompanyBankAccount,
  updateCompanyBankAccount,
  deleteCompanyBankAccount,
  getSupplierBankAccounts,
  getSupplierBankAccountById,
  createSupplierBankAccount,
  updateSupplierBankAccount,
  deleteSupplierBankAccount,
} from "../bankAccounts";

const bankAccountSchema = z.object({
  bankName: z.string().min(1),
  accountName: z.string().min(1),
  accountNumber: z.string().min(1),
  currency: z.string().min(1),
  swiftCode: z.string().optional(),
  iban: z.string().optional(),
  routingNumber: z.string().optional(),
  bankAddress: z.string().optional(),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().default(0),
});

export const bankAccountsRouter = router({
  // Company Bank Accounts
  getCompanyBankAccounts: protectedProcedure.query(async ({ ctx }) => {
    return await getCompanyBankAccounts(ctx.user.erpCompanyId);
  }),

  getCompanyBankAccountById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return await getCompanyBankAccountById(input.id, ctx.user.erpCompanyId);
    }),

  createCompanyBankAccount: protectedProcedure
    .input(bankAccountSchema)
    .mutation(async ({ ctx, input }) => {
      const id = await createCompanyBankAccount({
        ...input,
        erpCompanyId: ctx.user.erpCompanyId,
      });
      return { id };
    }),

  updateCompanyBankAccount: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: bankAccountSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateCompanyBankAccount(input.id, ctx.user.erpCompanyId, input.data);
      return { success: true };
    }),

  deleteCompanyBankAccount: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteCompanyBankAccount(input.id, ctx.user.erpCompanyId);
      return { success: true };
    }),

  // Supplier Bank Accounts
  getSupplierBankAccounts: protectedProcedure
    .input(z.object({ supplierId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await getSupplierBankAccounts(input.supplierId, ctx.user.erpCompanyId);
    }),

  getSupplierBankAccountById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return await getSupplierBankAccountById(input.id, ctx.user.erpCompanyId);
    }),

  createSupplierBankAccount: protectedProcedure
    .input(
      bankAccountSchema.extend({
        supplierId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = await createSupplierBankAccount({
        ...input,
        erpCompanyId: ctx.user.erpCompanyId,
      });
      return { id };
    }),

  updateSupplierBankAccount: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: bankAccountSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateSupplierBankAccount(input.id, ctx.user.erpCompanyId, input.data);
      return { success: true };
    }),

  deleteSupplierBankAccount: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteSupplierBankAccount(input.id, ctx.user.erpCompanyId);
      return { success: true };
    }),
});
