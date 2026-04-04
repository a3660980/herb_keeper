import { describe, expect, it } from "vitest"

import {
  createProductFormState,
  getProductFieldErrors,
  productFormSchema,
  productRecordToFormValues,
  readProductFormValues,
} from "@/lib/features/products"

describe("lib/features/products", () => {
  it("creates a form state and always forces the unit to g", () => {
    const state = createProductFormState({ name: "黃耆", unit: "g" })

    expect(state.values.unit).toBe("g")
    expect(state.values.name).toBe("黃耆")
  })

  it("reads product form values from form data", () => {
    const formData = new FormData()
    formData.set("name", "當歸")
    formData.set("basePrice", "85")
    formData.set("lowStockThreshold", "300")

    expect(readProductFormValues(formData)).toEqual({
      name: "當歸",
      basePrice: "85",
      lowStockThreshold: "300",
      unit: "g",
    })
  })

  it("maps zod errors back to product fields", () => {
    const result = productFormSchema.safeParse({
      name: "",
      basePrice: "-1",
      lowStockThreshold: "-2",
      unit: "g",
    })

    expect(result.success).toBe(false)

    if (result.success) {
      throw new Error("Expected product schema validation to fail")
    }

    expect(getProductFieldErrors(result.error)).toEqual({
      name: "請輸入藥材名稱",
      basePrice: "基準售價不可小於 0",
      lowStockThreshold: "低庫存門檻不可小於 0",
      unit: undefined,
    })
  })

  it("converts product records into editable form values", () => {
    expect(
      productRecordToFormValues({
        name: "枸杞",
        base_price: 46,
        low_stock_threshold: 350,
        unit: "g",
      })
    ).toEqual({
      name: "枸杞",
      basePrice: "46",
      lowStockThreshold: "350",
      unit: "g",
    })
  })
})