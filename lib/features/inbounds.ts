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
  .refine(
    (value) => value.length === 0 || Number.isFinite(Number(value)),
    "進貨單價必須是數字"
  )
  .transform((value) => (value.length > 0 ? Number(value) : null))
  .refine((value) => value === null || value >= 0, "進貨單價不可小於 0")

const inboundTotalCostField = z
  .string()
  .trim()
  .refine(
    (value) => value.length === 0 || Number.isFinite(Number(value)),
    "進貨總價必須是數字"
  )
  .transform((value) => (value.length > 0 ? Number(value) : null))
  .refine((value) => value === null || value >= 0, "進貨總價不可小於 0")

export const inboundFormSchema = z
  .object({
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
  })
  .superRefine((value, context) => {
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

export type InboundBatchLineFormValues = {
  id: string
  productId: string
  quantity: string
  unitCost: string
  totalCost: string
}

export type InboundBatchFormValues = {
  supplierId: string
  inboundDate: string
  note: string
  items: InboundBatchLineFormValues[]
}

export type InboundBatchFormState = {
  message: string
  fieldErrors: Partial<
    Record<"supplierId" | "inboundDate" | "note" | "items", string>
  >
  itemErrors: Record<
    string,
    Partial<Record<"productId" | "quantity" | "unitCost" | "totalCost", string>>
  >
  values: InboundBatchFormValues
}

export type InboundBatchRpcItem = {
  product_id: string
  quantity: number
  unit_cost: number
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

const inboundBatchLineSchema = z
  .object({
    id: z.string().min(1),
    productId: z.string().uuid("請選擇藥材"),
    quantity: inboundQuantityField,
    unitCost: inboundUnitCostField,
    totalCost: inboundTotalCostField,
  })
  .superRefine((value, context) => {
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

export const inboundBatchFormSchema = z
  .object({
    supplierId: z.string().uuid("請選擇供應商"),
    inboundDate: z
      .string()
      .trim()
      .min(1, "請選擇進貨時間")
      .refine(isValidLocalDateTime, "進貨時間格式不正確"),
    note: z.string().trim().max(500, "備註不可超過 500 字"),
    items: z.array(inboundBatchLineSchema).min(1, "至少加入一筆進貨明細"),
  })
  .superRefine((values, context) => {
    const seenProductIds = new Set<string>()

    values.items.forEach((item) => {
      if (seenProductIds.has(item.productId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items"],
          message: "同一批進貨不可重複加入同一藥材。",
        })
      }

      seenProductIds.add(item.productId)
    })
  })

export type InboundBatchPayload = z.output<typeof inboundBatchFormSchema>

export function createInboundBatchLineFormValue(
  values: Partial<InboundBatchLineFormValues> = {}
): InboundBatchLineFormValues {
  return {
    id: toStringValue(values.id, crypto.randomUUID()),
    productId: toStringValue(values.productId),
    quantity: toStringValue(values.quantity),
    unitCost: toStringValue(values.unitCost),
    totalCost: toStringValue(values.totalCost),
  }
}

export function createEmptyInboundBatchFormValues(): InboundBatchFormValues {
  return {
    supplierId: "",
    inboundDate: getCurrentDateTimeLocalValue(),
    note: "",
    items: [createInboundBatchLineFormValue()],
  }
}

export function normalizeInboundBatchFormValues(
  input: unknown
): InboundBatchFormValues {
  const fallback = createEmptyInboundBatchFormValues()

  if (!isRecord(input)) {
    return fallback
  }

  const items = Array.isArray(input.items)
    ? input.items.map((item) =>
        createInboundBatchLineFormValue(isRecord(item) ? item : undefined)
      )
    : fallback.items

  return {
    supplierId: toStringValue(input.supplierId),
    inboundDate: toStringValue(input.inboundDate, fallback.inboundDate),
    note: toStringValue(input.note),
    items: items.length > 0 ? items : fallback.items,
  }
}

export function createInboundBatchFormState(
  values: Partial<InboundBatchFormValues> = {},
  message = ""
): InboundBatchFormState {
  const normalized = normalizeInboundBatchFormValues({
    ...createEmptyInboundBatchFormValues(),
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

export function readInboundBatchFormSubmission(formData: FormData) {
  const payload = parseJsonPayload(formData.get("payload"))
  const values = normalizeInboundBatchFormValues(payload)
  const timezoneOffsetValue = formData.get("timezoneOffsetMinutes")
  const timezoneOffsetMinutes =
    typeof timezoneOffsetValue === "string" && timezoneOffsetValue.trim()
      ? Number(timezoneOffsetValue)
      : 0

  return { values, timezoneOffsetMinutes }
}

export function getInboundBatchFieldErrors(
  error: z.ZodError<InboundBatchPayload>,
  values: InboundBatchFormValues
) {
  const fieldErrors: InboundBatchFormState["fieldErrors"] = {}
  const itemErrors: InboundBatchFormState["itemErrors"] = {}

  error.issues.forEach((issue) => {
    const [first, second, third] = issue.path

    if (
      first === "items" &&
      typeof second === "number" &&
      typeof third === "string"
    ) {
      const lineId = values.items[second]?.id ?? String(second)
      const currentItemErrors = itemErrors[lineId] ?? {}

      if (
        third === "productId" ||
        third === "quantity" ||
        third === "unitCost" ||
        third === "totalCost"
      ) {
        currentItemErrors[third] ??= issue.message
      }

      itemErrors[lineId] = currentItemErrors
      return
    }

    if (
      first === "supplierId" ||
      first === "inboundDate" ||
      first === "note" ||
      first === "items"
    ) {
      fieldErrors[first] ??= issue.message
    }
  })

  return { fieldErrors, itemErrors }
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
  const payload = parseJsonPayload(formData.get("payload"))
  const timezoneOffsetMinutes = Number(
    formData.get("timezoneOffsetMinutes") ?? 0
  )

  if (!isRecord(payload)) {
    return {
      values: {
        ...emptyInboundFormValues,
        inboundDate: getCurrentDateTimeLocalValue(),
      },
      timezoneOffsetMinutes: 0,
    }
  }

  return {
    values: {
      productId: toStringValue(payload.productId),
      supplierId: toStringValue(payload.supplierId),
      quantity: toStringValue(payload.quantity),
      unitCost: toStringValue(payload.unitCost),
      totalCost: toStringValue(payload.totalCost),
      inboundDate: toStringValue(
        payload.inboundDate,
        getCurrentDateTimeLocalValue()
      ),
      note: toStringValue(payload.note),
    } satisfies InboundFormValues,
    timezoneOffsetMinutes: Number.isFinite(timezoneOffsetMinutes)
      ? timezoneOffsetMinutes
      : 0,
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

  if (
    parsedQuantity === null ||
    parsedTotalCost === null ||
    parsedQuantity <= 0
  ) {
    return null
  }

  return roundCurrency(parsedTotalCost / parsedQuantity)
}

export function formatInboundCurrencyInput(value: number | null) {
  return value === null ? "" : formatDecimalInput(value)
}

export function resolveInboundUnitCost(
  quantity: number,
  unitCost: number | null,
  totalCost: number | null
) {
  return unitCost ?? calculateInboundUnitCost(quantity, totalCost)
}

export function inboundBatchPayloadToRpcItems(
  payload: InboundBatchPayload
): InboundBatchRpcItem[] {
  return payload.items.map((item) => {
    const resolvedUnitCost = resolveInboundUnitCost(
      item.quantity,
      item.unitCost,
      item.totalCost
    )

    if (resolvedUnitCost === null) {
      throw new Error(`Missing unit cost for inbound batch item ${item.id}`)
    }

    return {
      product_id: item.productId,
      quantity: item.quantity,
      unit_cost: resolvedUnitCost,
    }
  })
}
