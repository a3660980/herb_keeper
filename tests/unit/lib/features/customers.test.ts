import { describe, expect, it } from "vitest"

import {
  createCustomerFormState,
  customerFormSchema,
  customerRecordToFormValues,
  getCustomerFieldErrors,
  readCustomerFormValues,
} from "@/lib/features/customers"

describe("lib/features/customers", () => {
  it("creates a form state with merged values", () => {
    const state = createCustomerFormState({ name: "和生藥局", discountRate: "0.92" })

    expect(state.values.name).toBe("和生藥局")
    expect(state.values.type).toBe("general")
    expect(state.values.discountRate).toBe("0.92")
  })

  it("reads form data and falls back to general type when invalid", () => {
    const formData = new FormData()
    formData.set("name", "永順批發")
    formData.set("phone", "0900-000-123")
    formData.set("type", "invalid")
    formData.set("discountRate", "0.85")

    expect(readCustomerFormValues(formData)).toEqual({
      name: "永順批發",
      phone: "0900-000-123",
      type: "general",
      discountRate: "0.85",
    })
  })

  it("maps zod errors back to customer fields", () => {
    const result = customerFormSchema.safeParse({
      name: "",
      phone: "",
      type: "vip",
      discountRate: "1.2",
    })

    expect(result.success).toBe(false)

    if (result.success) {
      throw new Error("Expected customer schema validation to fail")
    }

    expect(getCustomerFieldErrors(result.error)).toEqual({
      name: "請輸入客戶名稱",
      phone: "請輸入聯絡電話",
      type: undefined,
      discountRate: "折扣倍率不可大於 1",
    })
  })

  it("converts customer records into editable form values", () => {
    expect(
      customerRecordToFormValues({
        name: "示範一般客戶",
        phone: "0900-000-001",
        type: "general",
        discount_rate: 1,
      })
    ).toEqual({
      name: "示範一般客戶",
      phone: "0900-000-001",
      type: "general",
      discountRate: "1",
    })
  })
})