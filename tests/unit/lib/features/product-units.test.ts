import { describe, expect, it } from "vitest"

import {
  createProductUnitFormState,
  getProductUnitFieldErrors,
  productUnitFormSchema,
  readProductUnitFormValues,
} from "@/lib/features/product-units"

describe("lib/features/product-units", () => {
  it("creates a product unit form state with merged values", () => {
    const state = createProductUnitFormState({ name: "台斤" })

    expect(state.values.name).toBe("台斤")
    expect(state.createdUnit).toBeNull()
  })

  it("reads product unit form values from form data", () => {
    const formData = new FormData()
    formData.set("name", "公斤")

    expect(readProductUnitFormValues(formData)).toEqual({
      name: "公斤",
    })
  })

  it("maps product unit zod errors to field errors", () => {
    const result = productUnitFormSchema.safeParse({
      name: "",
    })

    expect(result.success).toBe(false)

    if (result.success) {
      throw new Error("Expected product unit schema validation to fail")
    }

    expect(getProductUnitFieldErrors(result.error)).toEqual({
      name: "請輸入單位名稱",
    })
  })
})