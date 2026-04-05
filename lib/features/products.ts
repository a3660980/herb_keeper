import { z } from "zod"

import { formatQuantity } from "@/lib/format"

const productPriceField = z
  .string()
  .trim()
  .min(1, "請輸入基準售價")
  .refine((value) => Number.isFinite(Number(value)), "基準售價必須是數字")
  .transform((value) => Number(value))
  .refine((value) => value >= 0, "基準售價不可小於 0")

const productThresholdField = z
  .string()
  .trim()
  .min(1, "請輸入低庫存門檻")
  .refine((value) => Number.isFinite(Number(value)), "低庫存門檻必須是數字")
  .transform((value) => Number(value))
  .refine((value) => value >= 0, "低庫存門檻不可小於 0")

export const productFormSchema = z.object({
  name: z.string().trim().min(1, "請輸入藥材名稱"),
  basePrice: productPriceField,
  lowStockThreshold: productThresholdField,
  unit: z.string().trim().min(1, "請選擇單位"),
})

export type ProductPayload = z.output<typeof productFormSchema>

export type ProductFormValues = {
  name: string
  basePrice: string
  lowStockThreshold: string
  unit: string
}

export type ProductUnitRecord = {
  id: string
  name: string
}

export type ProductFormState = {
  message: string
  fieldErrors: Partial<Record<keyof ProductFormValues, string>>
  values: ProductFormValues
}

export type ProductListItem = {
  product_id: string
  product_name: string
  unit: string
  base_price: number | string
  avg_unit_cost: number | string
  low_stock_threshold: number | string
  cached_stock_quantity: number | string
  ledger_stock_quantity: number | string
  is_low_stock: boolean
  updated_at: string
}

export type ProductRecord = {
  id: string
  name: string
  base_price: number | string
  low_stock_threshold: number | string
  unit: string
}

export const emptyProductFormValues: ProductFormValues = {
  name: "",
  basePrice: "",
  lowStockThreshold: "0",
  unit: "",
}

export function createProductFormState(
  values: Partial<ProductFormValues> = {},
  message = ""
): ProductFormState {
  return {
    message,
    fieldErrors: {},
    values: {
      ...emptyProductFormValues,
      ...values,
    },
  }
}

export function readProductFormValues(formData: FormData): ProductFormValues {
  return {
    name: String(formData.get("name") ?? ""),
    basePrice: String(formData.get("basePrice") ?? ""),
    lowStockThreshold: String(formData.get("lowStockThreshold") ?? ""),
    unit: String(formData.get("unit") ?? "").trim(),
  }
}

export function getProductFieldErrors(error: z.ZodError<ProductPayload>) {
  const fieldErrors = error.flatten().fieldErrors

  return {
    name: fieldErrors.name?.[0],
    basePrice: fieldErrors.basePrice?.[0],
    lowStockThreshold: fieldErrors.lowStockThreshold?.[0],
    unit: fieldErrors.unit?.[0],
  } satisfies Partial<Record<keyof ProductFormValues, string>>
}

export function productRecordToFormValues(
  product: Pick<ProductRecord, "name" | "base_price" | "low_stock_threshold" | "unit">
): ProductFormValues {
  return {
    name: product.name,
    basePrice: String(product.base_price ?? ""),
    lowStockThreshold: String(product.low_stock_threshold ?? "0"),
    unit: String(product.unit ?? "").trim(),
  }
}

function toNumberValue(value: number | string | null | undefined) {
  return Number(value ?? 0)
}

export function getDeleteProductBlockedMessage(params: {
  name: string
  unit: string
  cachedStockQuantity: number | string | null | undefined
  ledgerStockQuantity: number | string | null | undefined
}) {
  const cachedStockQuantity = toNumberValue(params.cachedStockQuantity)
  const ledgerStockQuantity = toNumberValue(params.ledgerStockQuantity)
  const unit = params.unit.trim() || "單位"

  if (cachedStockQuantity !== 0 || ledgerStockQuantity !== 0) {
    if (cachedStockQuantity !== ledgerStockQuantity) {
      return `藥材「${params.name}」目前還不能刪除，因為庫存尚未歸零且有帳存差異（系統庫存 ${formatQuantity(cachedStockQuantity)} ${unit}、帳面庫存 ${formatQuantity(ledgerStockQuantity)} ${unit}）。請先把庫存處理到 0。`
    }

    return `藥材「${params.name}」目前還有 ${formatQuantity(ledgerStockQuantity)} ${unit} 庫存，請先出清、做減損或調整為 0 後再刪除。`
  }

  return `藥材「${params.name}」已有進貨、減損或交易履歷，為了保留歷史資料，不能直接刪除。`
}