import { describe, expect, it } from "vitest"

import {
  createProductFormState,
  getDeleteProductBlockedMessage,
  getProductFieldErrors,
  productFormSchema,
  productRecordToFormValues,
  readProductFormValues,
} from "@/lib/features/products"

describe("lib/features/products", () => {
  it("creates a form state with merged values", () => {
    const state = createProductFormState({ name: "黃耆", unit: "台斤" })

    expect(state.values.unit).toBe("台斤")
    expect(state.values.name).toBe("黃耆")
  })

  it("reads product form values from form data", () => {
    const formData = new FormData()
    formData.set("name", "當歸")
    formData.set("basePrice", "85")
    formData.set("lowStockThreshold", "300")
    formData.set("unit", "公斤")

    expect(readProductFormValues(formData)).toEqual({
      name: "當歸",
      basePrice: "85",
      lowStockThreshold: "300",
      unit: "公斤",
    })
  })

  it("maps zod errors back to product fields", () => {
    const result = productFormSchema.safeParse({
      name: "",
      basePrice: "-1",
      lowStockThreshold: "-2",
      unit: "",
    })

    expect(result.success).toBe(false)

    if (result.success) {
      throw new Error("Expected product schema validation to fail")
    }

    expect(getProductFieldErrors(result.error)).toEqual({
      name: "請輸入藥材名稱",
      basePrice: "基準售價不可小於 0",
      lowStockThreshold: "低庫存門檻不可小於 0",
      unit: "請選擇單位",
    })
  })

  it("converts product records into editable form values", () => {
    expect(
      productRecordToFormValues({
        name: "枸杞",
        base_price: 46,
        low_stock_threshold: 350,
        unit: "公斤",
      })
    ).toEqual({
      name: "枸杞",
      basePrice: "46",
      lowStockThreshold: "350",
      unit: "公斤",
    })
  })

  it("explains clearly when a product still has stock and cannot be deleted", () => {
    expect(
      getDeleteProductBlockedMessage({
        name: "黃耆",
        unit: "公斤",
        cachedStockQuantity: 12,
        ledgerStockQuantity: 12,
      })
    ).toBe(
      "藥材「黃耆」目前還有 12 公斤 庫存，請先出清、做減損或調整為 0 後再刪除。"
    )
  })

  it("explains clearly when a product has stock mismatch and cannot be deleted", () => {
    expect(
      getDeleteProductBlockedMessage({
        name: "當歸",
        unit: "g",
        cachedStockQuantity: 8,
        ledgerStockQuantity: 10,
      })
    ).toBe(
      "藥材「當歸」目前還不能刪除，因為庫存尚未歸零且有帳存差異（系統庫存 8 g、帳面庫存 10 g）。請先把庫存處理到 0。"
    )
  })

  it("explains clearly when a product has history even though stock is zero", () => {
    expect(
      getDeleteProductBlockedMessage({
        name: "枸杞",
        unit: "公斤",
        cachedStockQuantity: 0,
        ledgerStockQuantity: 0,
      })
    ).toBe(
      "藥材「枸杞」已有進貨、減損或交易履歷，為了保留歷史資料，不能直接刪除。"
    )
  })
})