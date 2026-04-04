import { z } from "zod"

import {
  getCurrentDateTimeLocalValue,
  localDateTimeToIsoString,
  type TradeCustomerOption,
  type TradeProductOption,
} from "@/lib/features/trades"
import { formatQuantity } from "@/lib/format"

export { getCurrentDateTimeLocalValue, localDateTimeToIsoString }

export const orderStatusOptions = ["pending", "partial", "completed", "canceled"] as const

export type OrderStatus = (typeof orderStatusOptions)[number]

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending: "待出貨",
  partial: "部分出貨",
  completed: "已完成",
  canceled: "已撤銷",
}

export type OrderLineFormValues = {
  id: string
  productId: string
  orderedQuantity: string
  finalUnitPrice: string
}

export type OrderFormValues = {
  customerId: string
  orderDate: string
  note: string
  items: OrderLineFormValues[]
}

export type OrderFormState = {
  message: string
  fieldErrors: Partial<Record<"customerId" | "orderDate" | "note" | "items", string>>
  itemErrors: Record<string, Partial<Record<"productId" | "orderedQuantity" | "finalUnitPrice", string>>>
  values: OrderFormValues
}

export type ShipmentLineFormValues = {
  orderItemId: string
  productId: string
  productName: string
  remainingQuantity: string
  availableStock: string
  unit: string
  shippedQuantity: string
}

export type ShipmentFormValues = {
  shipmentDate: string
  note: string
  items: ShipmentLineFormValues[]
}

export type ShipmentFormState = {
  message: string
  fieldErrors: Partial<Record<"shipmentDate" | "note" | "items", string>>
  itemErrors: Record<string, Partial<Record<"shippedQuantity", string>>>
  values: ShipmentFormValues
}

export type OrderCustomerOption = TradeCustomerOption

export type OrderProductOption = TradeProductOption

export type EditableOrderRecord = {
  customerId: string
  orderDate: string
  note: string | null
}

export type EditableOrderItemRecord = {
  id: string
  productId: string
  orderedQuantity: number | string
  finalUnitPrice: number | string
}

export type OrderDetailItem = {
  orderItemId: string
  productId: string
  productName: string
  unit: string
  orderedQuantity: number
  shippedQuantity: number
  remainingQuantity: number
  finalUnitPrice: number
  availableStock: number
}

export type OrderRpcItem = {
  product_id: string
  ordered_quantity: number
  final_unit_price: number
}

export type ShipmentRpcItem = {
  order_item_id: string
  shipped_quantity: number
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

function toNumericInputValue(value: number | string | null | undefined) {
  if (typeof value === "number" || typeof value === "string") {
    return String(value)
  }

  return ""
}

function toStringNumber(value: unknown, fallback = "0") {
  return typeof value === "string" && value.trim() ? value : fallback
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

const nonNegativeQuantityField = z
  .string()
  .trim()
  .min(1, "請輸入數量")
  .refine((value) => Number.isFinite(Number(value)), "數量必須是數字")
  .transform((value) => Number(value))
  .refine((value) => value >= 0, "數量不可小於 0")

const currencyField = z
  .string()
  .trim()
  .min(1, "請輸入單價")
  .refine((value) => Number.isFinite(Number(value)), "單價必須是數字")
  .transform((value) => Number(value))
  .refine((value) => value >= 0, "單價不可小於 0")

const orderLineSchema = z.object({
  id: z.string().min(1),
  productId: z.string().uuid("請選擇藥材"),
  orderedQuantity: quantityField,
  finalUnitPrice: currencyField,
})

export const orderFormSchema = z
  .object({
    customerId: z.string().uuid("請選擇客戶"),
    orderDate: z
      .string()
      .trim()
      .min(1, "請選擇下單時間")
      .refine(isValidLocalDateTime, "下單時間格式不正確"),
    note: z.string().trim().max(500, "備註不可超過 500 字"),
    items: z.array(orderLineSchema).min(1, "至少加入一筆藥材明細"),
  })
  .superRefine((values, context) => {
    const seenProductIds = new Set<string>()

    values.items.forEach((item) => {
      if (seenProductIds.has(item.productId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "同一張訂單不可重複加入同一藥材。",
          path: ["items"],
        })
      }

      seenProductIds.add(item.productId)
    })
  })

const shipmentLineSchema = z.object({
  orderItemId: z.string().uuid("無效的訂單明細"),
  productId: z.string(),
  productName: z.string(),
  remainingQuantity: z.string(),
  availableStock: z.string(),
  unit: z.string(),
  shippedQuantity: nonNegativeQuantityField,
})

export const shipmentFormSchema = z
  .object({
    shipmentDate: z
      .string()
      .trim()
      .min(1, "請選擇出貨時間")
      .refine(isValidLocalDateTime, "出貨時間格式不正確"),
    note: z.string().trim().max(500, "備註不可超過 500 字"),
    items: z.array(shipmentLineSchema).min(1, "沒有可出貨的訂單明細。"),
  })
  .superRefine((values, context) => {
    if (!values.items.some((item) => item.shippedQuantity > 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "至少輸入一筆本次出貨數量。",
        path: ["items"],
      })
    }

    values.items.forEach((item, index) => {
      const remainingQuantity = Number(item.remainingQuantity || 0)
      const availableStock = Number(item.availableStock || 0)

      if (item.shippedQuantity > remainingQuantity) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `本次出貨量不可超過待出貨 ${formatQuantity(remainingQuantity)}。`,
          path: ["items", index, "shippedQuantity"],
        })
        return
      }

      if (item.shippedQuantity > availableStock) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `本次出貨量不可超過目前庫存 ${formatQuantity(availableStock)}。`,
          path: ["items", index, "shippedQuantity"],
        })
      }
    })
  })

export type OrderPayload = z.output<typeof orderFormSchema>
export type ShipmentPayload = z.output<typeof shipmentFormSchema>

export function createOrderLineFormValue(
  values: Partial<OrderLineFormValues> = {}
): OrderLineFormValues {
  return {
    id: toStringValue(values.id, crypto.randomUUID()),
    productId: toStringValue(values.productId),
    orderedQuantity: toStringValue(values.orderedQuantity),
    finalUnitPrice: toStringValue(values.finalUnitPrice),
  }
}

export function createEmptyOrderFormValues(): OrderFormValues {
  return {
    customerId: "",
    orderDate: getCurrentDateTimeLocalValue(),
    note: "",
    items: [createOrderLineFormValue()],
  }
}

function toLocalDateTimeInputValue(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return getCurrentDateTimeLocalValue()
  }

  return getCurrentDateTimeLocalValue(date)
}

export function orderRecordToFormValues(
  order: EditableOrderRecord,
  items: EditableOrderItemRecord[]
): OrderFormValues {
  return normalizeOrderFormValues({
    customerId: order.customerId,
    orderDate: toLocalDateTimeInputValue(order.orderDate),
    note: order.note ?? "",
    items: items.map((item) =>
      createOrderLineFormValue({
        id: item.id,
        productId: item.productId,
        orderedQuantity: toNumericInputValue(item.orderedQuantity),
        finalUnitPrice: toNumericInputValue(item.finalUnitPrice),
      })
    ),
  })
}

export function normalizeOrderFormValues(input: unknown): OrderFormValues {
  const fallback = createEmptyOrderFormValues()

  if (!isRecord(input)) {
    return fallback
  }

  const items = Array.isArray(input.items)
    ? input.items.map((item) =>
        createOrderLineFormValue(isRecord(item) ? item : undefined)
      )
    : fallback.items

  return {
    customerId: toStringValue(input.customerId),
    orderDate: toStringValue(input.orderDate),
    note: toStringValue(input.note),
    items: items.length > 0 ? items : fallback.items,
  }
}

export function createOrderFormState(
  values: Partial<OrderFormValues> = {},
  message = ""
): OrderFormState {
  const normalized = normalizeOrderFormValues({
    ...createEmptyOrderFormValues(),
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

export function readOrderFormSubmission(formData: FormData) {
  const payload = parseJsonPayload(formData.get("payload"))
  const values = normalizeOrderFormValues(payload)
  const timezoneOffsetValue = formData.get("timezoneOffsetMinutes")
  const timezoneOffsetMinutes =
    typeof timezoneOffsetValue === "string" && timezoneOffsetValue.trim()
      ? Number(timezoneOffsetValue)
      : 0

  return { values, timezoneOffsetMinutes }
}

export function getOrderFieldErrors(
  error: z.ZodError<OrderPayload>,
  values: OrderFormValues
) {
  const fieldErrors: OrderFormState["fieldErrors"] = {}
  const itemErrors: OrderFormState["itemErrors"] = {}

  error.issues.forEach((issue) => {
    const [first, second, third] = issue.path

    if (first === "items" && typeof second === "number" && typeof third === "string") {
      const lineId = values.items[second]?.id ?? String(second)
      const currentItemErrors = itemErrors[lineId] ?? {}

      if (
        third === "productId" ||
        third === "orderedQuantity" ||
        third === "finalUnitPrice"
      ) {
        currentItemErrors[third] = issue.message
      }

      itemErrors[lineId] = currentItemErrors
      return
    }

    if (first === "customerId" || first === "orderDate" || first === "note" || first === "items") {
      fieldErrors[first] = issue.message
    }
  })

  return { fieldErrors, itemErrors }
}

export function orderPayloadToRpcItems(payload: OrderPayload): OrderRpcItem[] {
  return payload.items.map((item) => ({
    product_id: item.productId,
    ordered_quantity: item.orderedQuantity,
    final_unit_price: item.finalUnitPrice,
  }))
}

export function createShipmentLineFormValue(
  values: Partial<ShipmentLineFormValues>
): ShipmentLineFormValues {
  return {
    orderItemId: toStringValue(values.orderItemId),
    productId: toStringValue(values.productId),
    productName: toStringValue(values.productName),
    remainingQuantity: toStringNumber(values.remainingQuantity),
    availableStock: toStringNumber(values.availableStock),
    unit: toStringValue(values.unit, "g"),
    shippedQuantity: toStringNumber(values.shippedQuantity),
  }
}

export function createEmptyShipmentFormValues(
  items: ShipmentLineFormValues[] = []
): ShipmentFormValues {
  return {
    shipmentDate: getCurrentDateTimeLocalValue(),
    note: "",
    items,
  }
}

export function normalizeShipmentFormValues(input: unknown): ShipmentFormValues {
  const fallback = createEmptyShipmentFormValues()

  if (!isRecord(input)) {
    return fallback
  }

  const items = Array.isArray(input.items)
    ? input.items.map((item) =>
        createShipmentLineFormValue(isRecord(item) ? item : {})
      )
    : fallback.items

  return {
    shipmentDate: toStringValue(input.shipmentDate),
    note: toStringValue(input.note),
    items,
  }
}

export function createShipmentFormState(
  values: Partial<ShipmentFormValues> = {},
  message = ""
): ShipmentFormState {
  const normalized = normalizeShipmentFormValues({
    ...createEmptyShipmentFormValues(values.items ?? []),
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

export function readShipmentFormSubmission(formData: FormData) {
  const payload = parseJsonPayload(formData.get("payload"))
  const values = normalizeShipmentFormValues(payload)
  const timezoneOffsetValue = formData.get("timezoneOffsetMinutes")
  const timezoneOffsetMinutes =
    typeof timezoneOffsetValue === "string" && timezoneOffsetValue.trim()
      ? Number(timezoneOffsetValue)
      : 0

  return { values, timezoneOffsetMinutes }
}

export function getShipmentFieldErrors(
  error: z.ZodError<ShipmentPayload>,
  values: ShipmentFormValues
) {
  const fieldErrors: ShipmentFormState["fieldErrors"] = {}
  const itemErrors: ShipmentFormState["itemErrors"] = {}

  error.issues.forEach((issue) => {
    const [first, second, third] = issue.path

    if (first === "items" && typeof second === "number" && typeof third === "string") {
      const orderItemId = values.items[second]?.orderItemId ?? String(second)
      const currentItemErrors = itemErrors[orderItemId] ?? {}

      if (third === "shippedQuantity") {
        currentItemErrors.shippedQuantity = issue.message
      }

      itemErrors[orderItemId] = currentItemErrors
      return
    }

    if (first === "shipmentDate" || first === "note" || first === "items") {
      fieldErrors[first] = issue.message
    }
  })

  return { fieldErrors, itemErrors }
}

export function shipmentPayloadToRpcItems(
  payload: ShipmentPayload
): ShipmentRpcItem[] {
  return payload.items
    .filter((item) => item.shippedQuantity > 0)
    .map((item) => ({
      order_item_id: item.orderItemId,
      shipped_quantity: item.shippedQuantity,
    }))
}