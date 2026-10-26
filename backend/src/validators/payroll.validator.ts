import { z } from 'zod';

export const generatePayrollSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
});

export const updatePayrollItemSchema = z.object({
  bonusAmount: z.coerce.number().min(0).optional(),
  penaltyAmount: z.coerce.number().min(0).optional(),
  advanceAmount: z.coerce.number().min(0).optional(),
  kpiBonus: z.coerce.number().min(0).optional(),
  allowanceAmount: z.coerce.number().min(0).optional(),
  note: z.string().trim().max(500).optional(),
});

export const payrollQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
});

export type GeneratePayrollInput = z.infer<typeof generatePayrollSchema>;
export type UpdatePayrollItemInput = z.infer<typeof updatePayrollItemSchema>;
export type PayrollQuery = z.infer<typeof payrollQuerySchema>;
