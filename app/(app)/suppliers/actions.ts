"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { setFlashError } from "@/lib/flash"

import {
  createSupplierFormState,
  createQuickSupplierFormState,
  emptySupplierFormValues,
  getSupplierFieldErrors,
  readSupplierFormValues,
  supplierFormSchema,
  type SupplierFormState,
  type QuickCreateSupplierFormState,
} from "@/lib/features/suppliers"
import {
  getUnexpectedServerActionErrorMessage,
  normalizeServerActionErrorMessage,
} from "@/lib/server-action-errors"
import { createClient } from "@/lib/supabase/server"
import { withQueryString } from "@/lib/url"

function getSupplierErrorMessage(error: { code?: string; message: string }, name: string) {
  if (error.code === "23505") {
    return `供應商「${name}」已存在。`
  }

  if (error.code === "23503") {
    return "這個供應商已經被進貨資料引用，無法刪除。"
  }

  return normalizeServerActionErrorMessage(error.message, "供應商資料寫入失敗，請稍後再試。")
}

function getUnexpectedErrorMessage(error: unknown) {
  return getUnexpectedServerActionErrorMessage(error)
}

export async function createSupplierAction(
  _previousState: SupplierFormState,
  formData: FormData
) {
  const values = readSupplierFormValues(formData)
  const parsed = supplierFormSchema.safeParse(values)

  if (!parsed.success) {
    return {
      message: "請修正表單欄位後再送出。",
      fieldErrors: getSupplierFieldErrors(parsed.error),
      values,
    } satisfies SupplierFormState
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.from("suppliers").insert({
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      note: parsed.data.note || null,
    })

    if (error) {
      return createSupplierFormState(
        values,
        getSupplierErrorMessage(error, parsed.data.name)
      )
    }
  } catch (error) {
    return createSupplierFormState(values, getUnexpectedErrorMessage(error))
  }

  revalidatePath("/suppliers")
  revalidatePath("/products/inbounds/new")
  redirect(
    withQueryString("/suppliers", {
      statusMessage: `已建立供應商：${parsed.data.name}`,
    })
  )
}

export async function createSupplierQuickAction(
  _previousState: QuickCreateSupplierFormState,
  formData: FormData
) {
  const values = readSupplierFormValues(formData)
  const parsed = supplierFormSchema.safeParse(values)

  if (!parsed.success) {
    return {
      message: "請修正表單欄位後再送出。",
      fieldErrors: getSupplierFieldErrors(parsed.error),
      values,
      createdSupplier: null,
    } satisfies QuickCreateSupplierFormState
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        note: parsed.data.note || null,
      })
      .select("id, name, phone, address")
      .single()

    if (error) {
      return createQuickSupplierFormState(
        values,
        getSupplierErrorMessage(error, parsed.data.name)
      )
    }

    revalidatePath("/suppliers")
    revalidatePath("/products/inbounds")
    revalidatePath("/products/inbounds/new")

    return createQuickSupplierFormState(
      emptySupplierFormValues,
      `已建立供應商：${parsed.data.name}`,
      {
        id: data.id,
        name: data.name,
        phone: data.phone ?? "",
        address: data.address ?? "",
      }
    )
  } catch (error) {
    return createQuickSupplierFormState(values, getUnexpectedErrorMessage(error))
  }
}

export async function updateSupplierAction(
  supplierId: string,
  _previousState: SupplierFormState,
  formData: FormData
) {
  const values = readSupplierFormValues(formData)
  const parsed = supplierFormSchema.safeParse(values)

  if (!parsed.success) {
    return {
      message: "請修正表單欄位後再送出。",
      fieldErrors: getSupplierFieldErrors(parsed.error),
      values,
    } satisfies SupplierFormState
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from("suppliers")
      .update({
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        note: parsed.data.note || null,
      })
      .eq("id", supplierId)

    if (error) {
      return createSupplierFormState(
        values,
        getSupplierErrorMessage(error, parsed.data.name)
      )
    }
  } catch (error) {
    return createSupplierFormState(values, getUnexpectedErrorMessage(error))
  }

  revalidatePath("/suppliers")
  revalidatePath(`/suppliers/${supplierId}/edit`)
  revalidatePath("/products/inbounds/new")
  redirect(
    withQueryString("/suppliers", {
      statusMessage: `已更新供應商：${parsed.data.name}`,
    })
  )
}

export async function deleteSupplierAction(formData: FormData) {
  const supplierId = String(formData.get("supplierId") ?? "")
  const supplierName = String(formData.get("supplierName") ?? "這個供應商")

  if (!supplierId) {
    await setFlashError("缺少要刪除的供應商識別碼。")
    redirect("/suppliers")
  }

  let errorMessage = ""

  try {
    const supabase = await createClient()
    const { error } = await supabase.from("suppliers").delete().eq("id", supplierId)

    if (error) {
      errorMessage = getSupplierErrorMessage(error, supplierName)
    }
  } catch (error) {
    errorMessage = getUnexpectedErrorMessage(error)
  }

  if (errorMessage) {
    await setFlashError(errorMessage)
    redirect("/suppliers")
  }

  revalidatePath("/suppliers")
  revalidatePath("/products/inbounds/new")
  redirect(
    withQueryString("/suppliers", {
      statusMessage: `已刪除供應商：${supplierName}`,
    })
  )
}