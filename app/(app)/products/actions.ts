"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { setFlashError } from "@/lib/flash"

import {
  createProductFormState,
  getProductFieldErrors,
  getDeleteProductBlockedMessage,
  productFormSchema,
  readProductFormValues,
  type ProductFormState,
} from "@/lib/features/products"
import {
  createProductUnitFormState,
  emptyProductUnitFormValues,
  getProductUnitFieldErrors,
  productUnitFormSchema,
  readProductUnitFormValues,
  type ProductUnitFormState,
} from "@/lib/features/product-units"
import {
  getUnexpectedServerActionErrorMessage,
  normalizeServerActionErrorMessage,
} from "@/lib/server-action-errors"
import { createClient } from "@/lib/supabase/server"
import { withQueryString } from "@/lib/url"

function getProductErrorMessage(error: { code?: string; message: string }, name: string) {
  if (error.code === "23505") {
    return `藥材「${name}」已存在，請改用其他名稱。`
  }

  return normalizeServerActionErrorMessage(error.message, "藥材資料寫入失敗，請稍後再試。")
}

function getDeleteProductErrorMessage(error: { code?: string; message: string }, name: string) {
  if (error.code === "23503") {
    return `藥材「${name}」已有進貨、減損或交易履歷，為了保留歷史資料，不能直接刪除。`
  }

  return normalizeServerActionErrorMessage(
    error.message,
    `刪除藥材「${name}」失敗，請稍後再試。`
  )
}

function getUnexpectedErrorMessage(error: unknown) {
  return getUnexpectedServerActionErrorMessage(error)
}

function getProductUnitErrorMessage(error: { code?: string; message: string }, name: string) {
  if (error.code === "23505") {
    return `單位「${name}」已存在。`
  }

  return normalizeServerActionErrorMessage(error.message, "新增單位失敗，請稍後再試。")
}

export async function createProductAction(
  _previousState: ProductFormState,
  formData: FormData
) {
  const values = readProductFormValues(formData)
  const parsed = productFormSchema.safeParse(values)

  if (!parsed.success) {
    return {
      message: "請修正表單欄位後再送出。",
      fieldErrors: getProductFieldErrors(parsed.error),
      values,
    } satisfies ProductFormState
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.from("products").insert({
      name: parsed.data.name,
      base_price: parsed.data.basePrice,
      low_stock_threshold: parsed.data.lowStockThreshold,
      unit: parsed.data.unit,
    })

    if (error) {
      return {
        message: getProductErrorMessage(error, parsed.data.name),
        fieldErrors: {},
        values,
      } satisfies ProductFormState
    }
  } catch (error) {
    return createProductFormState(values, getUnexpectedErrorMessage(error))
  }

  revalidatePath("/products")
  redirect(
    withQueryString("/products", {
      statusMessage: `已建立藥材：${parsed.data.name}`,
    })
  )
}

export async function updateProductAction(
  productId: string,
  _previousState: ProductFormState,
  formData: FormData
) {
  const values = readProductFormValues(formData)
  const parsed = productFormSchema.safeParse(values)

  if (!parsed.success) {
    return {
      message: "請修正表單欄位後再送出。",
      fieldErrors: getProductFieldErrors(parsed.error),
      values,
    } satisfies ProductFormState
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from("products")
      .update({
        name: parsed.data.name,
        base_price: parsed.data.basePrice,
        low_stock_threshold: parsed.data.lowStockThreshold,
        unit: parsed.data.unit,
      })
      .eq("id", productId)

    if (error) {
      return {
        message: getProductErrorMessage(error, parsed.data.name),
        fieldErrors: {},
        values,
      } satisfies ProductFormState
    }
  } catch (error) {
    return createProductFormState(values, getUnexpectedErrorMessage(error))
  }

  revalidatePath("/products")
  revalidatePath(`/products/${productId}`)
  revalidatePath(`/products/${productId}/edit`)
  redirect(
    withQueryString("/products", {
      statusMessage: `已更新藥材：${parsed.data.name}`,
    })
  )
}

export async function createProductUnitAction(
  _previousState: ProductUnitFormState,
  formData: FormData
) {
  const values = readProductUnitFormValues(formData)
  const parsed = productUnitFormSchema.safeParse(values)

  if (!parsed.success) {
    return {
      message: "請修正單位欄位後再送出。",
      fieldErrors: getProductUnitFieldErrors(parsed.error),
      values,
      createdUnit: null,
    } satisfies ProductUnitFormState
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("product_units")
      .insert({
        name: parsed.data.name,
      })
      .select("id, name")
      .single()

    if (error) {
      return createProductUnitFormState(
        values,
        getProductUnitErrorMessage(error, parsed.data.name)
      )
    }

    revalidatePath("/products")
    revalidatePath("/products/new")

    return createProductUnitFormState(
      emptyProductUnitFormValues,
      `已新增單位：${parsed.data.name}`,
      {
        id: data.id,
        name: data.name,
      }
    )
  } catch (error) {
    return createProductUnitFormState(values, getUnexpectedErrorMessage(error))
  }
}

export async function deleteProductAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "")
  const productName = String(formData.get("productName") ?? "這筆藥材")

  if (!productId) {
    await setFlashError("缺少要刪除的藥材識別碼。")
    redirect("/products")
  }

  let errorMessage = ""

  try {
    const supabase = await createClient()
    const { data: inventorySnapshot, error: inventoryError } = await supabase
      .from("current_inventory_view")
      .select("product_name, unit, cached_stock_quantity, ledger_stock_quantity")
      .eq("product_id", productId)
      .maybeSingle()

    if (inventoryError) {
      errorMessage = inventoryError.message
    } else if (
      inventorySnapshot &&
      (Number(inventorySnapshot.cached_stock_quantity ?? 0) !== 0 ||
        Number(inventorySnapshot.ledger_stock_quantity ?? 0) !== 0)
    ) {
      errorMessage = getDeleteProductBlockedMessage({
        name: String(inventorySnapshot.product_name ?? productName),
        unit: String(inventorySnapshot.unit ?? ""),
        cachedStockQuantity: inventorySnapshot.cached_stock_quantity,
        ledgerStockQuantity: inventorySnapshot.ledger_stock_quantity,
      })
    } else {
      const { error } = await supabase.from("products").delete().eq("id", productId)

      if (error) {
        errorMessage = getDeleteProductErrorMessage(error, productName)
      }
    }
  } catch (error) {
    errorMessage = getUnexpectedErrorMessage(error)
  }

  if (errorMessage) {
    await setFlashError(errorMessage)
    redirect("/products")
  }

  revalidatePath("/products")
  redirect(
    withQueryString("/products", {
      statusMessage: `已刪除藥材：${productName}`,
    })
  )
}