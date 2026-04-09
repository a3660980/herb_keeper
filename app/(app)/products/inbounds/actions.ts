"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { setFlashSuccess } from "@/lib/flash"
import {
  calculateInboundUnitCost,
  createInboundFormState,
  formatInboundCurrencyInput,
  getInboundFieldErrors,
  inboundFormSchema,
  localDateTimeToIsoString,
  readInboundFormSubmission,
  type InboundFormState,
} from "@/lib/features/inbounds"
import {
  getUnexpectedServerActionErrorMessage,
  normalizeServerActionErrorMessage,
} from "@/lib/server-action-errors"
import { createClient } from "@/lib/supabase/server"

function getUnexpectedErrorMessage(error: unknown) {
  return getUnexpectedServerActionErrorMessage(error)
}

function getInboundActionErrorMessage(error: { code?: string; message: string }) {
  if (error.code === "PGRST202") {
    return "Inbound workflow 的資料庫函式尚未部署，請先套用最新 migration。"
  }

  if (error.message.includes("Product") && error.message.includes("not found")) {
    return "選取的藥材不存在，請重新整理後再試。"
  }

  if (error.message.includes("Supplier is required")) {
    return "請選擇供應商。"
  }

  if (error.message.includes("Supplier") && error.message.includes("not found")) {
    return "選取的供應商不存在，請重新整理後再試。"
  }

  if (error.message.includes("Inbound quantity must be greater than 0")) {
    return "進貨數量必須大於 0。"
  }

  if (error.message.includes("Inbound unit cost must be 0 or greater")) {
    return "進貨單價不可小於 0。"
  }

  return normalizeServerActionErrorMessage(error.message, "新增進貨失敗，請稍後再試。")
}

export async function createInboundAction(
  _previousState: InboundFormState,
  formData: FormData
) {
  const submission = readInboundFormSubmission(formData)
  const values = submission.values
  const parsed = inboundFormSchema.safeParse(values)

  if (!parsed.success) {
    return {
      message: "請修正進貨欄位後再送出。",
      fieldErrors: getInboundFieldErrors(parsed.error),
      values,
    } satisfies InboundFormState
  }

  const resolvedUnitCost =
    parsed.data.unitCost ?? calculateInboundUnitCost(parsed.data.quantity, parsed.data.totalCost)

  if (resolvedUnitCost === null) {
    return {
      message: "請修正進貨欄位後再送出。",
      fieldErrors: {
        unitCost: "請輸入進貨單價或進貨總價",
        totalCost: "請輸入進貨單價或進貨總價",
      },
      values: {
        ...values,
        unitCost: formatInboundCurrencyInput(resolvedUnitCost),
      },
    } satisfies InboundFormState
  }

  const inboundDateIso = localDateTimeToIsoString(
    parsed.data.inboundDate,
    submission.timezoneOffsetMinutes
  )

  if (!inboundDateIso) {
    return {
      message: "請修正進貨欄位後再送出。",
      fieldErrors: {
        inboundDate: "進貨時間格式不正確",
      },
      values,
    } satisfies InboundFormState
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.rpc("create_inbound_record", {
      p_product_id: parsed.data.productId,
      p_supplier_id: parsed.data.supplierId,
      p_quantity: parsed.data.quantity,
      p_unit_cost: resolvedUnitCost,
      p_inbound_date: inboundDateIso,
      p_note: parsed.data.note || null,
    })

    if (error) {
      return createInboundFormState(values, getInboundActionErrorMessage(error))
    }
  } catch (error) {
    return createInboundFormState(values, getUnexpectedErrorMessage(error))
  }

  revalidatePath("/dashboard")
  revalidatePath("/products")
  revalidatePath(`/products/${parsed.data.productId}`)
  revalidatePath("/products/inbounds")
  revalidatePath("/products/disposals")
  await setFlashSuccess("已登錄進貨，庫存、平均成本與進貨歷史已同步更新。")
  redirect("/products/inbounds")
}