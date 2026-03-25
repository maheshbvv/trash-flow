import { z } from 'zod'

export const emailSchema = z.object({
  sender: z.string().email().optional(),
  before: z.string().datetime().optional(),
  after: z.string().datetime().optional(),
})

export const scheduleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  sender: z.string().email().optional(),
  before: z.string().datetime().optional(),
  after: z.string().datetime().optional(),
  marketingOnly: z.boolean().optional(),
  cronExpression: z.string().min(9).max(100),
  enabled: z.boolean().optional(),
})

export function validateEmail(input: unknown) {
  const result = emailSchema.safeParse(input)
  if (!result.success) {
    return { valid: false, errors: result.error.errors }
  }
  return { valid: true, data: result.data }
}

export function validateSchedule(input: unknown) {
  const result = scheduleSchema.safeParse(input)
  if (!result.success) {
    return { valid: false, errors: result.error.errors }
  }
  return { valid: true, data: result.data }
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim().slice(0, 254)
}

export function validateDateRange(before?: string, after?: string): boolean {
  if (before && after) {
    const beforeDate = new Date(before)
    const afterDate = new Date(after)
    return beforeDate > afterDate
  }
  return true
}
