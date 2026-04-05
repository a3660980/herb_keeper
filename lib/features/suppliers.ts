import { z } from "zod"

export const supplierFormSchema = z.object({
  name: z.string().trim().min(1, "請輸入供應商名稱"),
  phone: z.string().trim().max(50, "聯絡電話不可超過 50 字"),
  address: z.string().trim().max(500, "地址不可超過 500 字"),
  note: z.string().trim().max(500, "備註不可超過 500 字"),
})

export type SupplierPayload = z.output<typeof supplierFormSchema>

export type SupplierFormValues = {
  name: string
  phone: string
  address: string
  note: string
}

export type SupplierFormState = {
  message: string
  fieldErrors: Partial<Record<keyof SupplierFormValues, string>>
  values: SupplierFormValues
}

export type QuickCreateSupplierOption = {
  id: string
  name: string
  phone: string
  address: string
}

export type QuickCreateSupplierFormState = SupplierFormState & {
  createdSupplier: QuickCreateSupplierOption | null
}

export type SupplierRecord = {
  id: string
  name: string
  phone?: string | null
  address?: string | null
  note?: string | null
  created_at?: string
  updated_at?: string
}

export const emptySupplierFormValues: SupplierFormValues = {
  name: "",
  phone: "",
  address: "",
  note: "",
}

export function createSupplierFormState(
  values: Partial<SupplierFormValues> = {},
  message = ""
): SupplierFormState {
  return {
    message,
    fieldErrors: {},
    values: {
      ...emptySupplierFormValues,
      ...values,
    },
  }
}

export function createQuickSupplierFormState(
  values: Partial<SupplierFormValues> = {},
  message = "",
  createdSupplier: QuickCreateSupplierOption | null = null
): QuickCreateSupplierFormState {
  return {
    ...createSupplierFormState(values, message),
    createdSupplier,
  }
}

export function readSupplierFormValues(formData: FormData): SupplierFormValues {
  return {
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    address: String(formData.get("address") ?? ""),
    note: String(formData.get("note") ?? ""),
  }
}

export function getSupplierFieldErrors(error: z.ZodError<SupplierPayload>) {
  const fieldErrors = error.flatten().fieldErrors

  return {
    name: fieldErrors.name?.[0],
    phone: fieldErrors.phone?.[0],
    address: fieldErrors.address?.[0],
    note: fieldErrors.note?.[0],
  } satisfies Partial<Record<keyof SupplierFormValues, string>>
}

export function supplierRecordToFormValues(
  supplier: Pick<SupplierRecord, "name" | "phone" | "address" | "note">
): SupplierFormValues {
  return {
    name: supplier.name,
    phone: supplier.phone ?? "",
    address: supplier.address ?? "",
    note: supplier.note ?? "",
  }
}