import { describe, expect, it } from "vitest"

import {
  createSaleFormState,
  getSaleFieldErrors,
  localDateTimeToIsoString,
  readSaleFormSubmission,
  saleFormSchema,
  salePayloadToRpcItems,
} from "@/lib/features/sales"

const customerId = "55555555-5555-5555-5555-555555555555"
const productId = "66666666-6666-6666-6666-666666666666"

describe("lib/features/sales", () => {
  it("converts a local sale datetime and timezone offset into ISO", () => {
    expect(localDateTimeToIsoString("2026-04-04T06:37", -480)).toBe(
      "2026-04-03T22:37:00.000Z"
    )
    expect(localDateTimeToIsoString("bad", -480)).toBeNull()
  })

  it("creates a sale form state with default values", () => {
    const state = createSaleFormState()

    expect(state.values.saleDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(state.values.items).toHaveLength(1)
  })

  it("parses a sale submission payload and timezone offset", () => {
    const formData = new FormData()
    formData.set(
      "payload",
      JSON.stringify({
        customerId,
        saleDate: "2026-04-04T06:37",
        note: "店內零售",
        items: [
          {
            id: "line-1",
            productId,
            quantity: "3",
            finalUnitPrice: "52",
          },
        ],
      })
    )
    formData.set("timezoneOffsetMinutes", "-480")

    expect(readSaleFormSubmission(formData)).toEqual({
      values: {
        customerId,
        saleDate: "2026-04-04T06:37",
        note: "店內零售",
        items: [
          {
            id: "line-1",
            productId,
            quantity: "3",
            finalUnitPrice: "52",
          },
        ],
      },
      timezoneOffsetMinutes: -480,
    })
  })

  it("falls back to a safe default sale payload when the submission is malformed", () => {
    const formData = new FormData()
    formData.set("payload", "{bad json")

    const submission = readSaleFormSubmission(formData)

    expect(submission.timezoneOffsetMinutes).toBe(0)
    expect(submission.values.customerId).toBe("")
    expect(submission.values.items).toHaveLength(1)
  })

  it("maps sale field and line errors", () => {
    const values = {
      customerId: "bad-customer-id",
      saleDate: "bad-date",
      note: "",
      items: [
        {
          id: "line-1",
          productId: "bad-product-id",
          quantity: "",
          finalUnitPrice: "-1",
        },
      ],
    }
    const result = saleFormSchema.safeParse(values)

    expect(result.success).toBe(false)

    if (result.success) {
      throw new Error("Expected sale schema validation to fail")
    }

    const { fieldErrors, itemErrors } = getSaleFieldErrors(result.error, values)

    expect(fieldErrors.customerId).toBe("請選擇客戶")
    expect(fieldErrors.saleDate).toBe("銷貨時間格式不正確")
    expect(itemErrors["line-1"]).toEqual({
      productId: "請選擇藥材",
      quantity: "請輸入數量",
      finalUnitPrice: "單價不可小於 0",
    })
  })

  it("maps sale payloads to RPC items", () => {
    expect(
      salePayloadToRpcItems({
        customerId,
        saleDate: "2026-04-04T06:37",
        note: "",
        items: [
          {
            id: "line-1",
            productId,
            quantity: 3,
            finalUnitPrice: 52,
          },
        ],
      })
    ).toEqual([
      {
        product_id: productId,
        quantity: 3,
        final_unit_price: 52,
      },
    ])
  })

  it("rejects duplicate products in one direct sale", () => {
    const values = {
      customerId,
      saleDate: "2026-04-04T06:37",
      note: "",
      items: [
        {
          id: "line-1",
          productId,
          quantity: "1",
          finalUnitPrice: "52",
        },
        {
          id: "line-2",
          productId,
          quantity: "2",
          finalUnitPrice: "52",
        },
      ],
    }
    const result = saleFormSchema.safeParse(values)

    expect(result.success).toBe(false)

    if (result.success) {
      throw new Error("Expected duplicate sale product validation to fail")
    }

    const { fieldErrors } = getSaleFieldErrors(result.error, values)

    expect(fieldErrors.items).toBe("同一筆現場銷貨不可重複加入同一藥材。")
  })
})