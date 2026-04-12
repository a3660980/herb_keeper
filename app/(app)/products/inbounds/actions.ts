"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { setFlashSuccess } from "@/lib/flash"
import {
  createInboundBatchFormState,
  calculateInboundUnitCost,
  createInboundFormState,
  formatInboundCurrencyInput,
  getInboundBatchFieldErrors,
  getInboundFieldErrors,
  inboundBatchFormSchema,
  inboundBatchPayloadToRpcItems,
  inboundFormSchema,
  localDateTimeToIsoString,
  readInboundBatchFormSubmission,
  readInboundFormSubmission,
  type InboundBatchFormState,
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

function getInboundActionErrorMessage(error: {
  code?: string
  message: string
}) {
  if (error.code === "PGRST202") {
    return "Inbound workflow 的資料庫函式尚未部署，請先套用最新 migration。"
  }

  if (error.message.includes("At least one inbound item is required")) {
    return "至少加入一筆進貨明細。"
  }

  if (
    error.message.includes(
      "Duplicate products are not allowed in one inbound batch"
    )
  ) {
    return "同一批進貨不可重複加入同一藥材。"
  }

  if (
    error.message.includes("Product") &&
    error.message.includes("not found")
  ) {
    return "選取的藥材不存在，請重新整理後再試。"
  }

  if (error.message.includes("Supplier is required")) {
    return "請選擇供應商。"
  }

  if (
    error.message.includes("Supplier") &&
    error.message.includes("not found")
  ) {
    return "選取的供應商不存在，請重新整理後再試。"
  }

  if (error.message.includes("Inbound quantity must be greater than 0")) {
    return "進貨數量必須大於 0。"
  }

  if (error.message.includes("Inbound unit cost must be 0 or greater")) {
    return "進貨單價不可小於 0。"
  }

  return normalizeServerActionErrorMessage(
    error.message,
    "新增進貨失敗，請稍後再試。"
  )
}

function getBatchUnexpectedErrorMessage(error: unknown) {
  return getUnexpectedServerActionErrorMessage(error)
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
    parsed.data.unitCost ??
    calculateInboundUnitCost(parsed.data.quantity, parsed.data.totalCost)

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

export async function createInboundBatchAction(
  _previousState: InboundBatchFormState,
  formData: FormData
) {
  const submission = readInboundBatchFormSubmission(formData)
  const values = submission.values
  const parsed = inboundBatchFormSchema.safeParse(values)

  if (!parsed.success) {
    return {
      message: "請修正批次進貨欄位後再送出。",
      ...getInboundBatchFieldErrors(parsed.error, values),
      values,
    } satisfies InboundBatchFormState
  }

  const inboundDateIso = localDateTimeToIsoString(
    parsed.data.inboundDate,
    submission.timezoneOffsetMinutes
  )

  if (!inboundDateIso) {
    return {
      message: "請修正批次進貨欄位後再送出。",
      fieldErrors: {
        inboundDate: "進貨時間格式不正確",
      },
      itemErrors: {},
      values,
    } satisfies InboundBatchFormState
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.rpc("create_inbound_batch_records", {
      p_supplier_id: parsed.data.supplierId,
      p_inbound_date: inboundDateIso,
      p_note: parsed.data.note || null,
      p_items: inboundBatchPayloadToRpcItems(parsed.data),
    })

    if (error) {
      return createInboundBatchFormState(
        values,
        getInboundActionErrorMessage(error)
      )
    }
  } catch (error) {
    return createInboundBatchFormState(
      values,
      getBatchUnexpectedErrorMessage(error)
    )
  }

  const uniqueProductIds = [
    ...new Set(parsed.data.items.map((item) => item.productId)),
  ]

  revalidatePath("/dashboard")
  revalidatePath("/products")
  revalidatePath("/products/inbounds")
  revalidatePath("/products/disposals")
  uniqueProductIds.forEach((productId) => {
    revalidatePath(`/products/${productId}`)
  })

  await setFlashSuccess(
    `已建立 ${parsed.data.items.length} 筆批次進貨，庫存、平均成本與進貨歷史已同步更新。`
  )
  redirect("/products/inbounds")
}
