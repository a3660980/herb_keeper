import { describe, expect, it } from "vitest"

import {
  createQuickSupplierFormState,
  createSupplierFormState,
  getSupplierFieldErrors,
  readSupplierFormValues,
  supplierFormSchema,
  supplierRecordToFormValues,
} from "@/lib/features/suppliers"

describe("lib/features/suppliers", () => {
  it("creates a supplier form state with merged values", () => {
    const state = createSupplierFormState({ name: "廣源藥材行", phone: "02-2555-1001" })

    expect(state.values.name).toBe("廣源藥材行")
    expect(state.values.phone).toBe("02-2555-1001")
    expect(state.values.address).toBe("")
  })

  it("creates a quick supplier form state with created supplier payload", () => {
    const state = createQuickSupplierFormState(
      { name: "順安藥業" },
      "已建立供應商：順安藥業",
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "順安藥業",
        phone: "04-2311-2002",
        address: "台中市西區示範街 88 號",
      }
    )

    expect(state.message).toBe("已建立供應商：順安藥業")
    expect(state.createdSupplier).toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      name: "順安藥業",
      phone: "04-2311-2002",
      address: "台中市西區示範街 88 號",
    })
  })

  it("reads supplier form values from form data", () => {
    const formData = new FormData()
    formData.set("name", "順安藥業")
    formData.set("phone", "04-2311-2002")
    formData.set("address", "台中市西區示範街 88 號")
    formData.set("note", "補貨與急件供應")

    expect(readSupplierFormValues(formData)).toEqual({
      name: "順安藥業",
      phone: "04-2311-2002",
      address: "台中市西區示範街 88 號",
      note: "補貨與急件供應",
    })
  })

  it("maps supplier zod errors to field errors", () => {
    const result = supplierFormSchema.safeParse({
      name: "",
      phone: "",
      address: "x".repeat(501),
      note: "x".repeat(501),
    })

    expect(result.success).toBe(false)

    if (result.success) {
      throw new Error("Expected supplier schema validation to fail")
    }

    expect(getSupplierFieldErrors(result.error)).toEqual({
      name: "請輸入供應商名稱",
      phone: undefined,
      address: "地址不可超過 500 字",
      note: "備註不可超過 500 字",
    })
  })

  it("converts supplier records into editable form values", () => {
    expect(
      supplierRecordToFormValues({
        name: "廣源藥材行",
        phone: "02-2555-1001",
        address: "台北市大同區示範路 12 號",
        note: "常備藥材供應",
      })
    ).toEqual({
      name: "廣源藥材行",
      phone: "02-2555-1001",
      address: "台北市大同區示範路 12 號",
      note: "常備藥材供應",
    })
  })
})