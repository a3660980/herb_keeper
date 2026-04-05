import { z } from "zod"

import { formatDecimalInput } from "@/lib/format"
import {
  getCurrentDateTimeLocalValue,
  localDateTimeToIsoString,
} from "@/lib/features/trades"

export { getCurrentDateTimeLocalValue, localDateTimeToIsoString }

export const inventoryDisposalReasonOptions = [
  "damage",
  "quality_return",
  "disaster",
  "other",
] as const

export type InventoryDisposalReason =
  (typeof inventoryDisposalReasonOptions)[number]

export const inventoryDisposalReasonLabels: Record<InventoryDisposalReason, string> = {
  damage: "品質毀損",
  quality_return: "品質退回",
  disaster: "天災損失",
  other: "其他減損",
}

const inventoryDisposalQuantityField = z
  .string()
  .trim()
  .min(1, "請輸入減損數量")
  .refine((value) => Number.isFinite(Number(value)), "減損數量必須是數字")
  .transform((value) => Number(value))
  .refine((value) => value > 0, "減損數量必須大於 0")

export const inventoryDisposalFormSchema = z.object({
  productId: z.string().uuid("請選擇藥材"),
  quantity: inventoryDisposalQuantityField,
  reason: z.enum(inventoryDisposalReasonOptions, {
    error: "請選擇減損原因",
  }),
  occurredAt: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "減損時間格式不正確"),
  note: z.string().trim().max(500, "備註不可超過 500 字"),
})

export type InventoryDisposalPayload = z.output<typeof inventoryDisposalFormSchema>

export type InventoryDisposalFormValues = {
  productId: string
  quantity: string
  reason: InventoryDisposalReason | ""
  occurredAt: string
  note: string
}

export type InventoryDisposalFormState = {
  message: string
  fieldErrors: Partial<Record<keyof InventoryDisposalFormValues, string>>
  values: InventoryDisposalFormValues
}

export type InventoryDisposalProductOption = {
  id: string
  name: string
  unit: string
  basePrice: number
  avgUnitCost: number
  availableStock: number
  isLowStock: boolean
}

export const emptyInventoryDisposalFormValues: InventoryDisposalFormValues = {
  productId: "",
  quantity: "",
  reason: "",
  occurredAt: getCurrentDateTimeLocalValue(),
  note: "",
}

export function createInventoryDisposalFormState(
  values: Partial<InventoryDisposalFormValues> = {},
  message = ""
): InventoryDisposalFormState {
  return {
    message,
    fieldErrors: {},
    values: {
      ...emptyInventoryDisposalFormValues,
      ...values,
      occurredAt: values.occurredAt ?? getCurrentDateTimeLocalValue(),
    },
  }
}

export function readInventoryDisposalFormSubmission(formData: FormData) {
  const rawPayload = String(formData.get("payload") ?? "")
  const timezoneOffsetMinutes = Number(formData.get("timezoneOffsetMinutes") ?? 0)

  try {
    const parsed = JSON.parse(rawPayload) as Partial<InventoryDisposalFormValues>

    return {
      values: {
        productId: String(parsed.productId ?? ""),
        quantity: String(parsed.quantity ?? ""),
        reason: inventoryDisposalReasonOptions.includes(
          parsed.reason as InventoryDisposalReason
        )
          ? (parsed.reason as InventoryDisposalReason)
          : "",
        occurredAt: String(parsed.occurredAt ?? getCurrentDateTimeLocalValue()),
        note: String(parsed.note ?? ""),
      } satisfies InventoryDisposalFormValues,
      timezoneOffsetMinutes: Number.isFinite(timezoneOffsetMinutes)
        ? timezoneOffsetMinutes
        : 0,
    }
  } catch {
    return {
      values: {
        ...emptyInventoryDisposalFormValues,
        occurredAt: getCurrentDateTimeLocalValue(),
      },
      timezoneOffsetMinutes: 0,
    }
  }
}

export function getInventoryDisposalFieldErrors(
  error: z.ZodError<InventoryDisposalPayload>
) {
  const fieldErrors = error.flatten().fieldErrors

  return {
    productId: fieldErrors.productId?.[0],
    quantity: fieldErrors.quantity?.[0],
    reason: fieldErrors.reason?.[0],
    occurredAt: fieldErrors.occurredAt?.[0],
    note: fieldErrors.note?.[0],
  } satisfies Partial<Record<keyof InventoryDisposalFormValues, string>>
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

export function calculateInventoryDisposalAmount(
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

export function calculateInventoryRemainingStock(
  availableStock: number | string | null | undefined,
  quantity: number | string | null | undefined
) {
  const parsedAvailableStock = parseOptionalNumber(availableStock)
  const parsedQuantity = parseOptionalNumber(quantity)

  if (parsedAvailableStock === null || parsedQuantity === null) {
    return null
  }

  return Number((parsedAvailableStock - parsedQuantity).toFixed(3))
}

export function formatInventoryDisposalCurrencyInput(value: number | null) {
  return value === null ? "" : formatDecimalInput(value)
}