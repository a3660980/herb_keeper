import { z } from "zod"

export const customerTypeOptions = ["general", "vip", "wholesale"] as const

const discountRateField = z
  .string()
  .trim()
  .min(1, "請輸入折扣倍率")
  .refine((value) => Number.isFinite(Number(value)), "折扣倍率必須是數字")
  .transform((value) => Number(value))
  .refine((value) => value > 0, "折扣倍率必須大於 0")
  .refine((value) => value <= 1, "折扣倍率不可大於 1")

export const customerFormSchema = z.object({
  name: z.string().trim().min(1, "請輸入客戶名稱"),
  phone: z.string().trim().min(1, "請輸入聯絡電話"),
  type: z.enum(customerTypeOptions),
  discountRate: discountRateField,
})

export type CustomerPayload = z.output<typeof customerFormSchema>
export type CustomerType = (typeof customerTypeOptions)[number]

export type CustomerFormValues = {
  name: string
  phone: string
  type: CustomerType
  discountRate: string
}

export type CustomerFormState = {
  message: string
  fieldErrors: Partial<Record<keyof CustomerFormValues, string>>
  values: CustomerFormValues
}

export type CustomerRecord = {
  id: string
  name: string
  phone: string
  type: CustomerType
  discount_rate: number | string
  created_at?: string
  updated_at?: string
}

export const emptyCustomerFormValues: CustomerFormValues = {
  name: "",
  phone: "",
  type: "general",
  discountRate: "1",
}

export function createCustomerFormState(
  values: Partial<CustomerFormValues> = {},
  message = ""
): CustomerFormState {
  return {
    message,
    fieldErrors: {},
    values: {
      ...emptyCustomerFormValues,
      ...values,
    },
  }
}

export function readCustomerFormValues(formData: FormData): CustomerFormValues {
  const typeValue = String(formData.get("type") ?? "general")

  return {
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    type: customerTypeOptions.includes(typeValue as CustomerType)
      ? (typeValue as CustomerType)
      : "general",
    discountRate: String(formData.get("discountRate") ?? ""),
  }
}

export function getCustomerFieldErrors(error: z.ZodError<CustomerPayload>) {
  const fieldErrors = error.flatten().fieldErrors

  return {
    name: fieldErrors.name?.[0],
    phone: fieldErrors.phone?.[0],
    type: fieldErrors.type?.[0],
    discountRate: fieldErrors.discountRate?.[0],
  } satisfies Partial<Record<keyof CustomerFormValues, string>>
}

export function customerRecordToFormValues(
  customer: Pick<CustomerRecord, "name" | "phone" | "type" | "discount_rate">
): CustomerFormValues {
  return {
    name: customer.name,
    phone: customer.phone,
    type: customer.type,
    discountRate: String(customer.discount_rate ?? "1"),
  }
}