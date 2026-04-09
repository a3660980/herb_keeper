"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { setFlashError, setFlashSuccess } from "@/lib/flash"

import { formatQuantity, toNumberValue } from "@/lib/format"
import {
  createOrderFormState,
  createShipmentFormState,
  getOrderFieldErrors,
  getShipmentFieldErrors,
  localDateTimeToIsoString,
  orderFormSchema,
  orderPayloadToRpcItems,
  readOrderFormSubmission,
  readShipmentFormSubmission,
  shipmentFormSchema,
  shipmentPayloadToRpcItems,
  type OrderFormState,
  type ShipmentFormState,
} from "@/lib/features/orders"
import {
  getUnexpectedServerActionErrorMessage,
  normalizeServerActionErrorMessage,
} from "@/lib/server-action-errors"
import { createClient } from "@/lib/supabase/server"

function getUnexpectedErrorMessage(error: unknown) {
  return getUnexpectedServerActionErrorMessage(error)
}

function getOrderActionErrorMessage(error: { code?: string; message: string }) {
  if (error.code === "PGRST202") {
    return "Orders workflow 的資料庫函式尚未部署，請先套用最新 migration。"
  }

  if (error.message.includes("At least one order item is required")) {
    return "至少加入一筆藥材明細。"
  }

  if (error.message.includes("Duplicate products are not allowed")) {
    return "同一張訂單不可重複加入同一藥材。"
  }

  if (error.message.includes("Customer") && error.message.includes("not found")) {
    return "選取的客戶不存在，請重新整理後再試。"
  }

  if (error.message.includes("Product") && error.message.includes("not found")) {
    return "部分藥材不存在，請重新整理後再試。"
  }

  return normalizeServerActionErrorMessage(error.message, "建立訂單失敗，請稍後再試。")
}

function getUpdateOrderActionErrorMessage(error: { code?: string; message: string }) {
  if (error.code === "PGRST202") {
    return "Orders update workflow 的資料庫函式尚未部署，請先套用最新 migration。"
  }

  if (error.message.includes("Canceled orders cannot be updated")) {
    return "已撤銷的訂單不可修改。"
  }

  if (error.message.includes("Only orders without shipment history can be updated")) {
    return "已有出貨紀錄的訂單不可修改，避免影響履歷與庫存。"
  }

  if (error.message.includes("Order") && error.message.includes("not found")) {
    return "這張訂單已不存在，請返回列表後重新操作。"
  }

  if (error.message.includes("At least one order item is required")) {
    return "至少加入一筆藥材明細。"
  }

  if (error.message.includes("Duplicate products are not allowed")) {
    return "同一張訂單不可重複加入同一藥材。"
  }

  if (error.message.includes("Customer") && error.message.includes("not found")) {
    return "選取的客戶不存在，請重新整理後再試。"
  }

  if (error.message.includes("Product") && error.message.includes("not found")) {
    return "部分藥材不存在，請重新整理後再試。"
  }

  return normalizeServerActionErrorMessage(error.message, "修改訂單失敗，請稍後再試。")
}

function getCancelOrderActionErrorMessage(error: { code?: string; message: string }) {
  if (error.code === "PGRST202") {
    return "Orders cancel workflow 的資料庫函式尚未部署，請先套用最新 migration。"
  }

  if (error.message.includes("Only orders without shipment history can be canceled")) {
    return "已有出貨紀錄的訂單不可撤銷，避免影響履歷與庫存。"
  }

  if (error.message.includes("Order already canceled")) {
    return "這張訂單已經撤銷。"
  }

  if (error.message.includes("Order") && error.message.includes("not found")) {
    return "這張訂單已不存在，請返回列表後重新操作。"
  }

  return normalizeServerActionErrorMessage(error.message, "撤銷訂單失敗，請稍後再試。")
}

function getShipmentActionErrorMessage(error: { code?: string; message: string }) {
  if (error.code === "PGRST202") {
    return "Shipment workflow 的資料庫函式尚未部署，請先套用最新 migration。"
  }

  if (error.message.includes("Canceled orders cannot create shipments")) {
    return "已撤銷的訂單不可再建立出貨。"
  }

  if (
    error.message.includes("At least one shipment item quantity must be greater than 0")
  ) {
    return "至少輸入一筆本次出貨數量。"
  }

  if (error.message.includes("Insufficient stock")) {
    return "庫存不足，請重新整理頁面後再確認出貨數量。"
  }

  if (error.message.includes("exceeds remaining quantity")) {
    return "本次出貨量不可超過剩餘待出貨數量。"
  }

  if (error.message.includes("does not belong to order")) {
    return "部分出貨明細與訂單不一致，請重新整理頁面。"
  }

  if (error.message.includes("Order item") && error.message.includes("not found")) {
    return "部分訂單明細已不存在，請重新整理頁面。"
  }

  return normalizeServerActionErrorMessage(error.message, "建立出貨失敗，請稍後再試。")
}

export async function createOrderAction(
  _previousState: OrderFormState,
  formData: FormData
) {
  const submission = readOrderFormSubmission(formData)
  const values = submission.values
  const parsed = orderFormSchema.safeParse(values)

  if (!parsed.success) {
    const { fieldErrors, itemErrors } = getOrderFieldErrors(parsed.error, values)

    return {
      message: "請修正訂單欄位後再送出。",
      fieldErrors,
      itemErrors,
      values,
    } satisfies OrderFormState
  }

  const orderDateIso = localDateTimeToIsoString(
    parsed.data.orderDate,
    submission.timezoneOffsetMinutes
  )

  if (!orderDateIso) {
    return {
      message: "請修正訂單欄位後再送出。",
      fieldErrors: {
        orderDate: "下單時間格式不正確",
      },
      itemErrors: {},
      values,
    } satisfies OrderFormState
  }

  let orderId: string | null = null

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("create_order_with_items", {
      p_customer_id: parsed.data.customerId,
      p_order_date: orderDateIso,
      p_note: parsed.data.note || null,
      p_items: orderPayloadToRpcItems(parsed.data),
    })

    if (error) {
      return createOrderFormState(values, getOrderActionErrorMessage(error))
    }

    if (!data) {
      return createOrderFormState(values, "建立訂單失敗，系統未回傳訂單編號。")
    }

    orderId = data
  } catch (error) {
    return createOrderFormState(values, getUnexpectedErrorMessage(error))
  }

  revalidatePath("/orders")
  await setFlashSuccess("已建立訂單，可直接安排出貨。")
  redirect(`/orders/${orderId}`)
}

export async function updateOrderAction(
  orderId: string,
  _previousState: OrderFormState,
  formData: FormData
) {
  const submission = readOrderFormSubmission(formData)
  const values = submission.values
  const parsed = orderFormSchema.safeParse(values)

  if (!parsed.success) {
    const { fieldErrors, itemErrors } = getOrderFieldErrors(parsed.error, values)

    return {
      message: "請修正訂單欄位後再送出。",
      fieldErrors,
      itemErrors,
      values,
    } satisfies OrderFormState
  }

  const orderDateIso = localDateTimeToIsoString(
    parsed.data.orderDate,
    submission.timezoneOffsetMinutes
  )

  if (!orderDateIso) {
    return {
      message: "請修正訂單欄位後再送出。",
      fieldErrors: {
        orderDate: "下單時間格式不正確",
      },
      itemErrors: {},
      values,
    } satisfies OrderFormState
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("update_order_with_items", {
      p_order_id: orderId,
      p_customer_id: parsed.data.customerId,
      p_order_date: orderDateIso,
      p_note: parsed.data.note || null,
      p_items: orderPayloadToRpcItems(parsed.data),
    })

    if (error) {
      return createOrderFormState(values, getUpdateOrderActionErrorMessage(error))
    }

    if (!data) {
      return createOrderFormState(values, "修改訂單失敗，系統未回傳訂單編號。")
    }
  } catch (error) {
    return createOrderFormState(values, getUnexpectedErrorMessage(error))
  }

  revalidatePath("/orders")
  revalidatePath(`/orders/${orderId}`)
  revalidatePath(`/orders/${orderId}/edit`)
  await setFlashSuccess("已更新訂單內容。")
  redirect(`/orders/${orderId}`)
}

export async function cancelOrderAction(orderId: string, redirectToList = false) {
  let errorMessage = ""

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("cancel_order", {
      p_order_id: orderId,
    })

    if (error) {
      errorMessage = getCancelOrderActionErrorMessage(error)
    } else if (!data) {
      errorMessage = "撤銷訂單失敗，系統未回傳訂單編號。"
    }
  } catch (error) {
    errorMessage = getUnexpectedErrorMessage(error)
  }

  if (errorMessage) {
    await setFlashError(errorMessage)
    redirect(redirectToList ? "/orders" : `/orders/${orderId}`)
  }

  revalidatePath("/orders")
  revalidatePath(`/orders/${orderId}`)
  revalidatePath(`/orders/${orderId}/edit`)
  revalidatePath("/dashboard")

  await setFlashSuccess(
    redirectToList ? "已撤銷訂單。" : "已撤銷訂單，不能再修改或出貨。"
  )
  redirect(redirectToList ? "/orders" : `/orders/${orderId}`)
}

export async function createShipmentAction(
  orderId: string,
  _previousState: ShipmentFormState,
  formData: FormData
) {
  const submission = readShipmentFormSubmission(formData)
  const values = submission.values
  const parsed = shipmentFormSchema.safeParse(values)
  let productIds: string[] = []

  if (!parsed.success) {
    const { fieldErrors, itemErrors } = getShipmentFieldErrors(parsed.error, values)

    return {
      message: "請修正出貨欄位後再送出。",
      fieldErrors,
      itemErrors,
      values,
    } satisfies ShipmentFormState
  }

  const shipmentDateIso = localDateTimeToIsoString(
    parsed.data.shipmentDate,
    submission.timezoneOffsetMinutes
  )

  if (!shipmentDateIso) {
    return {
      message: "請修正出貨欄位後再送出。",
      fieldErrors: {
        shipmentDate: "出貨時間格式不正確",
      },
      itemErrors: {},
      values,
    } satisfies ShipmentFormState
  }

  try {
    const supabase = await createClient()
    const itemsToShip = parsed.data.items.filter((item) => item.shippedQuantity > 0)
    const orderItemIds = itemsToShip.map((item) => item.orderItemId)

    const { data: currentItems, error: itemsError } = await supabase
      .from("order_fulfillment_view")
      .select("order_item_id, product_id, remaining_quantity")
      .eq("order_id", orderId)
      .in("order_item_id", orderItemIds)

    if (itemsError) {
      return createShipmentFormState(
        values,
        "無法驗證目前訂單明細，請稍後再試。"
      )
    }

    productIds = Array.from(
      new Set((currentItems ?? []).map((item) => String(item.product_id)))
    )

    const stockResponse = productIds.length
      ? await supabase
          .from("current_inventory_view")
          .select("product_id, ledger_stock_quantity")
          .in("product_id", productIds)
      : { data: [], error: null }

    if (stockResponse.error) {
      return createShipmentFormState(
        values,
        "無法驗證目前庫存，請稍後再試。"
      )
    }

    const currentItemMap = new Map(
      (currentItems ?? []).map((item) => [
        String(item.order_item_id),
        {
          productId: String(item.product_id),
          remainingQuantity: toNumberValue(item.remaining_quantity),
        },
      ])
    )

    const stockMap = new Map(
      (stockResponse.data ?? []).map((item) => [
        String(item.product_id),
        toNumberValue(item.ledger_stock_quantity),
      ])
    )

    const itemErrors: ShipmentFormState["itemErrors"] = {}

    itemsToShip.forEach((item) => {
      const currentItem = currentItemMap.get(item.orderItemId)

      if (!currentItem) {
        itemErrors[item.orderItemId] = {
          shippedQuantity: "這筆訂單明細已不存在，請重新整理頁面。",
        }
        return
      }

      if (item.shippedQuantity > currentItem.remainingQuantity) {
        itemErrors[item.orderItemId] = {
          shippedQuantity: `本次出貨量不可超過剩餘 ${formatQuantity(currentItem.remainingQuantity)}。`,
        }
        return
      }

      const availableStock = stockMap.get(currentItem.productId) ?? 0

      if (item.shippedQuantity > availableStock) {
        itemErrors[item.orderItemId] = {
          shippedQuantity: `目前庫存不足，現有 ${formatQuantity(availableStock)}。`,
        }
      }
    })

    if (Object.keys(itemErrors).length > 0) {
      return {
        message: "請修正出貨數量後再送出。",
        fieldErrors: {},
        itemErrors,
        values,
      } satisfies ShipmentFormState
    }

    const { data, error } = await supabase.rpc("create_shipment_with_items", {
      p_order_id: orderId,
      p_shipment_date: shipmentDateIso,
      p_note: parsed.data.note || null,
      p_items: shipmentPayloadToRpcItems(parsed.data),
    })

    if (error) {
      return createShipmentFormState(values, getShipmentActionErrorMessage(error))
    }

    if (!data) {
      return createShipmentFormState(values, "建立出貨失敗，系統未回傳出貨批次編號。")
    }
  } catch (error) {
    return createShipmentFormState(values, getUnexpectedErrorMessage(error))
  }

  revalidatePath("/orders")
  revalidatePath(`/orders/${orderId}`)
  revalidatePath("/products")
  productIds.forEach((productId) => {
    revalidatePath(`/products/${productId}`)
  })
  await setFlashSuccess("出貨完成，庫存與訂單狀態已同步更新。")
  redirect(`/orders/${orderId}#shipment-form`)
}