import { z } from "zod"

import { formatDecimalInput } from "@/lib/format"
import {
  getCurrentDateTimeLocalValue,
  localDateTimeToIsoString,
} from "@/lib/features/trades"

export { getCurrentDateTimeLocalValue, localDateTimeToIsoString }

const inboundQuantityField = z
  .string()
  .trim()
  .min(1, "請輸入進貨數量")
  .refine((value) => Number.isFinite(Number(value)), "進貨數量必須是數字")
  .transform((value) => Number(value))
  .refine((value) => value > 0, "進貨數量必須大於 0")

const inboundUnitCostField = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || Number.isFinite(Number(value)), "進貨單價必須是數字")
  .transform((value) => (value.length > 0 ? Number(value) : null))
  .refine((value) => value === null || value >= 0, "進貨單價不可小於 0")

const inboundTotalCostField = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || Number.isFinite(Number(value)), "進貨總價必須是數字")
  .transform((value) => (value.length > 0 ? Number(value) : null))
  .refine((value) => value === null || value >= 0, "進貨總價不可小於 0")

export const inboundFormSchema = z.object({
  productId: z.string().uuid("請選擇藥材"),
  supplierId: z.string().uuid("請選擇供應商"),
  quantity: inboundQuantityField,
  unitCost: inboundUnitCostField,
  totalCost: inboundTotalCostField,
  inboundDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "進貨時間格式不正確"),
  note: z.string().trim().max(500, "備註不可超過 500 字"),
}).superRefine((value, context) => {
  if (value.unitCost === null && value.totalCost === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["unitCost"],
      message: "請輸入進貨單價或進貨總價",
    })
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["totalCost"],
      message: "請輸入進貨單價或進貨總價",
    })
  }
})

export type InboundPayload = z.output<typeof inboundFormSchema>

export type InboundFormValues = {
  productId: string
  supplierId: string
  quantity: string
  unitCost: string
  totalCost: string
  inboundDate: string
  note: string
}

export type InboundFormState = {
  message: string
  fieldErrors: Partial<Record<keyof InboundFormValues, string>>
  values: InboundFormValues
}

export type InboundProductOption = {
  id: string
  name: string
  unit: string
  availableStock: number
  avgUnitCost: number
  basePrice: number
}

export type InboundSupplierOption = {
  id: string
  name: string
  phone: string
  address: string
}

export const emptyInboundFormValues: InboundFormValues = {
  productId: "",
  supplierId: "",
  quantity: "",
  unitCost: "",
  totalCost: "",
  inboundDate: getCurrentDateTimeLocalValue(),
  note: "",
}

export function createInboundFormState(
  values: Partial<InboundFormValues> = {},
  message = ""
): InboundFormState {
  return {
    message,
    fieldErrors: {},
    values: {
      ...emptyInboundFormValues,
      ...values,
      inboundDate: values.inboundDate ?? getCurrentDateTimeLocalValue(),
    },
  }
}

export function readInboundFormSubmission(formData: FormData) {
  const rawPayload = String(formData.get("payload") ?? "")
  const timezoneOffsetMinutes = Number(formData.get("timezoneOffsetMinutes") ?? 0)

  try {
    const parsed = JSON.parse(rawPayload) as Partial<InboundFormValues>

    return {
      values: {
        productId: String(parsed.productId ?? ""),
        supplierId: String(parsed.supplierId ?? ""),
        quantity: String(parsed.quantity ?? ""),
        unitCost: String(parsed.unitCost ?? ""),
        totalCost: String(parsed.totalCost ?? ""),
        inboundDate: String(parsed.inboundDate ?? getCurrentDateTimeLocalValue()),
        note: String(parsed.note ?? ""),
      } satisfies InboundFormValues,
      timezoneOffsetMinutes: Number.isFinite(timezoneOffsetMinutes)
        ? timezoneOffsetMinutes
        : 0,
    }
  } catch {
    return {
      values: {
        ...emptyInboundFormValues,
        inboundDate: getCurrentDateTimeLocalValue(),
      },
      timezoneOffsetMinutes: 0,
    }
  }
}

export function getInboundFieldErrors(error: z.ZodError<InboundPayload>) {
  const fieldErrors = error.flatten().fieldErrors

  return {
    productId: fieldErrors.productId?.[0],
    supplierId: fieldErrors.supplierId?.[0],
    quantity: fieldErrors.quantity?.[0],
    unitCost: fieldErrors.unitCost?.[0],
    totalCost: fieldErrors.totalCost?.[0],
    inboundDate: fieldErrors.inboundDate?.[0],
    note: fieldErrors.note?.[0],
  } satisfies Partial<Record<keyof InboundFormValues, string>>
}

function parseOptionalNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2))
}

export function calculateInboundTotalCost(
  quantity: number | string | null | undefined,
  unitCost: number | string | null | undefined
) {
  const parsedQuantity = parseOptionalNumber(quantity)
  const parsedUnitCost = parseOptionalNumber(unitCost)

  if (parsedQuantity === null || parsedUnitCost === null) {
    return null
  }

  return roundCurrency(parsedQuantity * parsedUnitCost)
}

export function calculateInboundUnitCost(
  quantity: number | string | null | undefined,
  totalCost: number | string | null | undefined
) {
  const parsedQuantity = parseOptionalNumber(quantity)
  const parsedTotalCost = parseOptionalNumber(totalCost)

  if (parsedQuantity === null || parsedTotalCost === null || parsedQuantity <= 0) {
    return null
  }

  return roundCurrency(parsedTotalCost / parsedQuantity)
}

export function formatInboundCurrencyInput(value: number | null) {
  return value === null ? "" : formatDecimalInput(value)
}