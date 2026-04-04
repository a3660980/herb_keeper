import { z } from "zod"

import {
  getCurrentDateTimeLocalValue,
  localDateTimeToIsoString,
  type TradeCustomerOption,
  type TradeProductOption,
} from "@/lib/features/trades"

export { getCurrentDateTimeLocalValue, localDateTimeToIsoString }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseJsonPayload(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null
  }

  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

function toStringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback
}

function isValidLocalDateTime(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
}

const quantityField = z
  .string()
  .trim()
  .min(1, "請輸入數量")
  .refine((value) => Number.isFinite(Number(value)), "數量必須是數字")
  .transform((value) => Number(value))
  .refine((value) => value > 0, "數量必須大於 0")

const currencyField = z
  .string()
  .trim()
  .min(1, "請輸入單價")
  .refine((value) => Number.isFinite(Number(value)), "單價必須是數字")
  .transform((value) => Number(value))
  .refine((value) => value >= 0, "單價不可小於 0")

const saleLineSchema = z.object({
  id: z.string().min(1),
  productId: z.string().uuid("請選擇藥材"),
  quantity: quantityField,
  finalUnitPrice: currencyField,
})

export const saleFormSchema = z
  .object({
    customerId: z.string().uuid("請選擇客戶"),
    saleDate: z
      .string()
      .trim()
      .min(1, "請選擇銷貨時間")
      .refine(isValidLocalDateTime, "銷貨時間格式不正確"),
    note: z.string().trim().max(500, "備註不可超過 500 字"),
    items: z.array(saleLineSchema).min(1, "至少加入一筆銷貨明細"),
  })
  .superRefine((values, context) => {
    const seenProductIds = new Set<string>()

    values.items.forEach((item) => {
      if (seenProductIds.has(item.productId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "同一筆現場銷貨不可重複加入同一藥材。",
          path: ["items"],
        })
      }

      seenProductIds.add(item.productId)
    })
  })

export type SalePayload = z.output<typeof saleFormSchema>

export type SaleLineFormValues = {
  id: string
  productId: string
  quantity: string
  finalUnitPrice: string
}

export type SaleFormValues = {
  customerId: string
  saleDate: string
  note: string
  items: SaleLineFormValues[]
}

export type SaleFormState = {
  message: string
  fieldErrors: Partial<Record<"customerId" | "saleDate" | "note" | "items", string>>
  itemErrors: Record<string, Partial<Record<"productId" | "quantity" | "finalUnitPrice", string>>>
  values: SaleFormValues
}

export type SaleCustomerOption = TradeCustomerOption

export type SaleProductOption = TradeProductOption

export type DirectSaleRpcItem = {
  product_id: string
  quantity: number
  final_unit_price: number
}

export function createSaleLineFormValue(
  values: Partial<SaleLineFormValues> = {}
): SaleLineFormValues {
  return {
    id: toStringValue(values.id, crypto.randomUUID()),
    productId: toStringValue(values.productId),
    quantity: toStringValue(values.quantity),
    finalUnitPrice: toStringValue(values.finalUnitPrice),
  }
}

export function createEmptySaleFormValues(): SaleFormValues {
  return {
    customerId: "",
    saleDate: getCurrentDateTimeLocalValue(),
    note: "",
    items: [createSaleLineFormValue()],
  }
}

export function normalizeSaleFormValues(input: unknown): SaleFormValues {
  const fallback = createEmptySaleFormValues()

  if (!isRecord(input)) {
    return fallback
  }

  const items = Array.isArray(input.items)
    ? input.items.map((item) =>
        createSaleLineFormValue(isRecord(item) ? item : undefined)
      )
    : fallback.items

  return {
    customerId: toStringValue(input.customerId),
    saleDate: toStringValue(input.saleDate),
    note: toStringValue(input.note),
    items: items.length > 0 ? items : fallback.items,
  }
}

export function createSaleFormState(
  values: Partial<SaleFormValues> = {},
  message = ""
): SaleFormState {
  const normalized = normalizeSaleFormValues({
    ...createEmptySaleFormValues(),
    ...values,
    items: values.items,
  })

  return {
    message,
    fieldErrors: {},
    itemErrors: {},
    values: normalized,
  }
}

export function readSaleFormSubmission(formData: FormData) {
  const payload = parseJsonPayload(formData.get("payload"))
  const values = normalizeSaleFormValues(payload)
  const timezoneOffsetValue = formData.get("timezoneOffsetMinutes")
  const timezoneOffsetMinutes =
    typeof timezoneOffsetValue === "string" && timezoneOffsetValue.trim()
      ? Number(timezoneOffsetValue)
      : 0

  return { values, timezoneOffsetMinutes }
}

export function getSaleFieldErrors(
  error: z.ZodError<SalePayload>,
  values: SaleFormValues
) {
  const fieldErrors: SaleFormState["fieldErrors"] = {}
  const itemErrors: SaleFormState["itemErrors"] = {}

  error.issues.forEach((issue) => {
    const [first, second, third] = issue.path

    if (first === "items" && typeof second === "number" && typeof third === "string") {
      const lineId = values.items[second]?.id ?? String(second)
      const currentItemErrors = itemErrors[lineId] ?? {}

      if (third === "productId" || third === "quantity" || third === "finalUnitPrice") {
        currentItemErrors[third] = issue.message
      }

      itemErrors[lineId] = currentItemErrors
      return
    }

    if (first === "customerId" || first === "saleDate" || first === "note" || first === "items") {
      fieldErrors[first] = issue.message
    }
  })

  return { fieldErrors, itemErrors }
}

export function salePayloadToRpcItems(payload: SalePayload): DirectSaleRpcItem[] {
  return payload.items.map((item) => ({
    product_id: item.productId,
    quantity: item.quantity,
    final_unit_price: item.finalUnitPrice,
  }))
}