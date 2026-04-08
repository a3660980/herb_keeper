"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  createCustomerFormState,
  createQuickCustomerFormState,
  emptyCustomerFormValues,
  getCustomerFieldErrors,
  customerFormSchema,
  readCustomerFormValues,
  type CustomerFormState,
  type QuickCreateCustomerFormState,
} from "@/lib/features/customers"
import {
  getUnexpectedServerActionErrorMessage,
  normalizeServerActionErrorMessage,
} from "@/lib/server-action-errors"
import { createClient } from "@/lib/supabase/server"
import { withQueryString } from "@/lib/url"

function getCustomerErrorMessage(error: { code?: string; message: string }, name: string) {
  if (error.code === "23503") {
    return "這位客戶已經被訂單或現場銷貨資料引用，無法刪除。"
  }

  if (error.code === "23514") {
    return `客戶「${name}」的欄位格式不符合資料表限制。`
  }

  return normalizeServerActionErrorMessage(error.message, "客戶資料寫入失敗，請稍後再試。")
}

function getUnexpectedErrorMessage(error: unknown) {
  return getUnexpectedServerActionErrorMessage(error)
}

export async function createCustomerAction(
  _previousState: CustomerFormState,
  formData: FormData
) {
  const values = readCustomerFormValues(formData)
  const parsed = customerFormSchema.safeParse(values)

  if (!parsed.success) {
    return {
      message: "請修正表單欄位後再送出。",
      fieldErrors: getCustomerFieldErrors(parsed.error),
      values,
    } satisfies CustomerFormState
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.from("customers").insert({
      name: parsed.data.name,
      phone: parsed.data.phone,
      address: parsed.data.address || null,
      type: parsed.data.type,
      discount_rate: parsed.data.discountRate,
    })

    if (error) {
      return {
        message: getCustomerErrorMessage(error, parsed.data.name),
        fieldErrors: {},
        values,
      } satisfies CustomerFormState
    }
  } catch (error) {
    return createCustomerFormState(values, getUnexpectedErrorMessage(error))
  }

  revalidatePath("/customers")
  redirect(
    withQueryString("/customers", {
      status: `已建立客戶：${parsed.data.name}`,
    })
  )
}

export async function createCustomerQuickAction(
  _previousState: QuickCreateCustomerFormState,
  formData: FormData
) {
  const values = readCustomerFormValues(formData)
  const parsed = customerFormSchema.safeParse(values)

  if (!parsed.success) {
    return {
      message: "請修正表單欄位後再送出。",
      fieldErrors: getCustomerFieldErrors(parsed.error),
      values,
      createdCustomer: null,
    } satisfies QuickCreateCustomerFormState
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("customers")
      .insert({
        name: parsed.data.name,
        phone: parsed.data.phone,
        address: parsed.data.address || null,
        type: parsed.data.type,
        discount_rate: parsed.data.discountRate,
      })
      .select("id, name, phone, discount_rate")
      .single()

    if (error) {
      return {
        message: getCustomerErrorMessage(error, parsed.data.name),
        fieldErrors: {},
        values,
        createdCustomer: null,
      } satisfies QuickCreateCustomerFormState
    }

    revalidatePath("/customers")
    revalidatePath("/orders/new")
    revalidatePath("/sales/new")

    return createQuickCustomerFormState(
      emptyCustomerFormValues,
      `已建立客戶：${parsed.data.name}`,
      {
        id: data.id,
        name: data.name,
        phone: data.phone,
        discountRate: Number(data.discount_rate ?? 1),
      }
    )
  } catch (error) {
    return createQuickCustomerFormState(
      values,
      getUnexpectedErrorMessage(error)
    )
  }
}

export async function updateCustomerAction(
  customerId: string,
  _previousState: CustomerFormState,
  formData: FormData
) {
  const values = readCustomerFormValues(formData)
  const parsed = customerFormSchema.safeParse(values)

  if (!parsed.success) {
    return {
      message: "請修正表單欄位後再送出。",
      fieldErrors: getCustomerFieldErrors(parsed.error),
      values,
    } satisfies CustomerFormState
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from("customers")
      .update({
        name: parsed.data.name,
        phone: parsed.data.phone,
        address: parsed.data.address || null,
        type: parsed.data.type,
        discount_rate: parsed.data.discountRate,
      })
      .eq("id", customerId)

    if (error) {
      return {
        message: getCustomerErrorMessage(error, parsed.data.name),
        fieldErrors: {},
        values,
      } satisfies CustomerFormState
    }
  } catch (error) {
    return createCustomerFormState(values, getUnexpectedErrorMessage(error))
  }

  revalidatePath("/customers")
  revalidatePath(`/customers/${customerId}/edit`)
  redirect(
    withQueryString("/customers", {
      status: `已更新客戶：${parsed.data.name}`,
    })
  )
}

export async function deleteCustomerAction(formData: FormData) {
  const customerId = String(formData.get("customerId") ?? "")
  const customerName = String(formData.get("customerName") ?? "這位客戶")

  if (!customerId) {
    redirect(
      withQueryString("/customers", {
        error: "缺少要刪除的客戶識別碼。",
      })
    )
  }

  let errorMessage = ""

  try {
    const supabase = await createClient()
    const { error } = await supabase.from("customers").delete().eq("id", customerId)

    if (error) {
      errorMessage = getCustomerErrorMessage(error, customerName)
    }
  } catch (error) {
    errorMessage = getUnexpectedErrorMessage(error)
  }

  if (errorMessage) {
    redirect(
      withQueryString("/customers", {
        error: errorMessage,
      })
    )
  }

  revalidatePath("/customers")
  redirect(
    withQueryString("/customers", {
      status: `已刪除客戶：${customerName}`,
    })
  )
}