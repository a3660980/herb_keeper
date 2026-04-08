"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { formatQuantity, toNumberValue } from "@/lib/format"
import {
  createSaleFormState,
  getSaleFieldErrors,
  localDateTimeToIsoString,
  readSaleFormSubmission,
  saleFormSchema,
  salePayloadToRpcItems,
  type SaleFormState,
} from "@/lib/features/sales"
import {
  getUnexpectedServerActionErrorMessage,
  normalizeServerActionErrorMessage,
} from "@/lib/server-action-errors"
import { createClient } from "@/lib/supabase/server"
import { withQueryString } from "@/lib/url"

function getUnexpectedErrorMessage(error: unknown) {
  return getUnexpectedServerActionErrorMessage(error)
}

function getDirectSaleErrorMessage(error: { code?: string; message: string }) {
  if (error.code === "PGRST202") {
    return "Direct Sales workflow 的資料庫函式尚未部署，請先套用最新 migration。"
  }

  if (error.message.includes("At least one direct sale item is required")) {
    return "至少加入一筆銷貨明細。"
  }

  if (error.message.includes("Duplicate products are not allowed")) {
    return "同一筆現場銷貨不可重複加入同一藥材。"
  }

  if (error.message.includes("Customer") && error.message.includes("not found")) {
    return "選取的客戶不存在，請重新整理後再試。"
  }

  if (error.message.includes("Product") && error.message.includes("not found")) {
    return "部分藥材不存在，請重新整理後再試。"
  }

  if (error.message.includes("Insufficient stock")) {
    return "庫存不足，請重新整理頁面後再確認銷貨數量。"
  }

  return normalizeServerActionErrorMessage(error.message, "建立現場銷貨失敗，請稍後再試。")
}

export async function createDirectSaleAction(
  _previousState: SaleFormState,
  formData: FormData
) {
  const submission = readSaleFormSubmission(formData)
  const values = submission.values
  const parsed = saleFormSchema.safeParse(values)
  let productIds: string[] = []

  if (!parsed.success) {
    const { fieldErrors, itemErrors } = getSaleFieldErrors(parsed.error, values)

    return {
      message: "請修正銷貨欄位後再送出。",
      fieldErrors,
      itemErrors,
      values,
    } satisfies SaleFormState
  }

  const saleDateIso = localDateTimeToIsoString(
    parsed.data.saleDate,
    submission.timezoneOffsetMinutes
  )

  if (!saleDateIso) {
    return {
      message: "請修正銷貨欄位後再送出。",
      fieldErrors: {
        saleDate: "銷貨時間格式不正確",
      },
      itemErrors: {},
      values,
    } satisfies SaleFormState
  }

  let directSaleId: string | null = null

  try {
    const supabase = await createClient()
    productIds = Array.from(new Set(parsed.data.items.map((item) => item.productId)))
    const { data: stockRows, error: stockError } = await supabase
      .from("current_inventory_view")
      .select("product_id, ledger_stock_quantity")
      .in("product_id", productIds)

    if (stockError) {
      return createSaleFormState(values, "無法驗證目前庫存，請稍後再試。")
    }

    const stockMap = new Map(
      (stockRows ?? []).map((item) => [
        String(item.product_id),
        toNumberValue(item.ledger_stock_quantity),
      ])
    )

    const itemErrors: SaleFormState["itemErrors"] = {}

    parsed.data.items.forEach((item, index) => {
      const lineId = values.items[index]?.id ?? String(index)
      const availableStock = stockMap.get(item.productId)

      if (availableStock == null) {
        itemErrors[lineId] = {
          productId: "這筆藥材已不存在，請重新整理頁面。",
        }
        return
      }

      if (item.quantity > availableStock) {
        itemErrors[lineId] = {
          quantity: `目前庫存不足，現有 ${formatQuantity(availableStock)}。`,
        }
      }
    })

    if (Object.keys(itemErrors).length > 0) {
      return {
        message: "請修正銷貨數量後再送出。",
        fieldErrors: {},
        itemErrors,
        values,
      } satisfies SaleFormState
    }

    const { data, error } = await supabase.rpc("create_direct_sale_with_items", {
      p_customer_id: parsed.data.customerId,
      p_sale_date: saleDateIso,
      p_note: parsed.data.note || null,
      p_items: salePayloadToRpcItems(parsed.data),
    })

    if (error) {
      return createSaleFormState(values, getDirectSaleErrorMessage(error))
    }

    if (!data) {
      return createSaleFormState(values, "建立現場銷貨失敗，系統未回傳銷貨單號。")
    }

    directSaleId = data
  } catch (error) {
    return createSaleFormState(values, getUnexpectedErrorMessage(error))
  }

  revalidatePath("/dashboard")
  revalidatePath("/products")
  revalidatePath("/sales")
  revalidatePath("/inventory")
  revalidatePath("/reports")
  productIds.forEach((productId) => {
    revalidatePath(`/products/${productId}`)
  })
  redirect(
    withQueryString(`/sales/${directSaleId}`, {
      status: "已建立現場銷貨，庫存與報表資料已同步更新。",
    })
  )
}