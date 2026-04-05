"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  createInventoryDisposalFormState,
  getInventoryDisposalFieldErrors,
  inventoryDisposalFormSchema,
  localDateTimeToIsoString,
  readInventoryDisposalFormSubmission,
  type InventoryDisposalFormState,
} from "@/lib/features/inventory-disposals"
import { createClient } from "@/lib/supabase/server"
import { withQueryString } from "@/lib/url"

function getUnexpectedErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "發生未預期錯誤，請稍後再試。"
}

function getInventoryDisposalActionErrorMessage(error: { code?: string; message: string }) {
  if (error.code === "PGRST202") {
    return "Inventory disposal workflow 的資料庫函式尚未部署，請先套用最新 migration。"
  }

  if (error.message.includes("Authentication required")) {
    return "登入已失效，請重新登入後再試。"
  }

  if (error.message.includes("Insufficient privileges")) {
    return "目前帳號沒有登錄庫存減損的權限。"
  }

  if (error.message.includes("Product") && error.message.includes("not found")) {
    return "選取的藥材不存在，請重新整理後再試。"
  }

  if (error.message.includes("Adjustment reason is required")) {
    return "請選擇減損原因。"
  }

  if (error.message.includes("Adjustment quantity must be greater than 0")) {
    return "減損數量必須大於 0。"
  }

  if (error.message.includes("Insufficient stock for inventory adjustment")) {
    return "減損數量不可超過目前帳面庫存。"
  }

  return error.message || "新增庫存減損失敗，請稍後再試。"
}

export async function createInventoryDisposalAction(
  _previousState: InventoryDisposalFormState,
  formData: FormData
) {
  const submission = readInventoryDisposalFormSubmission(formData)
  const values = submission.values
  const parsed = inventoryDisposalFormSchema.safeParse(values)

  if (!parsed.success) {
    return {
      message: "請修正減損欄位後再送出。",
      fieldErrors: getInventoryDisposalFieldErrors(parsed.error),
      values,
    } satisfies InventoryDisposalFormState
  }

  const occurredAtIso = localDateTimeToIsoString(
    parsed.data.occurredAt,
    submission.timezoneOffsetMinutes
  )

  if (!occurredAtIso) {
    return {
      message: "請修正減損欄位後再送出。",
      fieldErrors: {
        occurredAt: "減損時間格式不正確",
      },
      values,
    } satisfies InventoryDisposalFormState
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.rpc("create_inventory_adjustment_record", {
      p_product_id: parsed.data.productId,
      p_quantity: parsed.data.quantity,
      p_reason: parsed.data.reason,
      p_occurred_at: occurredAtIso,
      p_note: parsed.data.note || null,
    })

    if (error) {
      return createInventoryDisposalFormState(
        values,
        getInventoryDisposalActionErrorMessage(error)
      )
    }
  } catch (error) {
    return createInventoryDisposalFormState(values, getUnexpectedErrorMessage(error))
  }

  revalidatePath("/dashboard")
  revalidatePath("/inventory")
  revalidatePath("/inventory/disposals")
  revalidatePath("/products")
  revalidatePath(`/products/${parsed.data.productId}`)

  redirect(
    withQueryString("/inventory/disposals", {
      productId: parsed.data.productId,
      status: "已登錄庫存減損，庫存與減損歷史已同步更新。",
    })
  )
}