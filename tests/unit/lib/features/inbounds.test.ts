import { describe, expect, it } from "vitest"

import {
  calculateInboundTotalCost,
  calculateInboundUnitCost,
  createInboundFormState,
  formatInboundCurrencyInput,
  getInboundFieldErrors,
  inboundFormSchema,
  localDateTimeToIsoString,
  readInboundFormSubmission,
} from "@/lib/features/inbounds"

const productId = "22222222-2222-4222-8222-222222222222"
const supplierId = "33333333-3333-4333-8333-333333333333"

describe("lib/features/inbounds", () => {
  it("creates an inbound form state with a default datetime", () => {
    const state = createInboundFormState({ productId })

    expect(state.values.productId).toBe(productId)
    expect(state.values.supplierId).toBe("")
    expect(state.values.totalCost).toBe("")
    expect(state.values.inboundDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })

  it("parses an inbound submission payload and timezone offset", () => {
    const formData = new FormData()
    formData.set(
      "payload",
      JSON.stringify({
        productId,
        supplierId,
        quantity: "1200",
        unitCost: "26.5",
        totalCost: "31800",
        inboundDate: "2026-04-04T08:15",
        note: "常備補貨",
      })
    )
    formData.set("timezoneOffsetMinutes", "-480")

    expect(readInboundFormSubmission(formData)).toEqual({
      values: {
        productId,
        supplierId,
        quantity: "1200",
        unitCost: "26.5",
        totalCost: "31800",
        inboundDate: "2026-04-04T08:15",
        note: "常備補貨",
      },
      timezoneOffsetMinutes: -480,
    })
  })

  it("falls back to a safe default inbound payload when the submission is malformed", () => {
    const formData = new FormData()
    formData.set("payload", "{bad json")

    const submission = readInboundFormSubmission(formData)

    expect(submission.values.productId).toBe("")
    expect(submission.values.supplierId).toBe("")
    expect(submission.values.quantity).toBe("")
    expect(submission.values.unitCost).toBe("")
    expect(submission.values.totalCost).toBe("")
    expect(submission.values.inboundDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(submission.timezoneOffsetMinutes).toBe(0)
  })

  it("maps zod errors back to inbound fields", () => {
    const result = inboundFormSchema.safeParse({
      productId: "not-a-uuid",
      supplierId: "not-a-uuid",
      quantity: "0",
      unitCost: "-1",
      totalCost: "",
      inboundDate: "bad-date",
      note: "",
    })

    expect(result.success).toBe(false)

    if (result.success) {
      throw new Error("Expected inbound schema validation to fail")
    }

    expect(getInboundFieldErrors(result.error)).toEqual({
      productId: "請選擇藥材",
      supplierId: "請選擇供應商",
      quantity: "進貨數量必須大於 0",
      unitCost: "進貨單價不可小於 0",
      totalCost: undefined,
      inboundDate: "進貨時間格式不正確",
      note: undefined,
    })
  })

  it("accepts a total cost without a unit cost and can derive unit cost", () => {
    const result = inboundFormSchema.safeParse({
      productId,
      supplierId,
      quantity: "3",
      unitCost: "",
      totalCost: "100",
      inboundDate: "2026-04-04T08:15",
      note: "常備補貨",
    })

    expect(result.success).toBe(true)

    if (!result.success) {
      throw new Error("Expected inbound schema validation to succeed")
    }

    expect(calculateInboundUnitCost(result.data.quantity, result.data.totalCost)).toBe(33.33)
    expect(formatInboundCurrencyInput(calculateInboundUnitCost(result.data.quantity, result.data.totalCost))).toBe("33.33")
  })

  it("calculates total cost from quantity and unit cost with currency rounding", () => {
    expect(calculateInboundTotalCost("3.5", "26.4")).toBe(92.4)
    expect(formatInboundCurrencyInput(calculateInboundTotalCost("3.5", "26.4"))).toBe("92.4")
  })

  it("converts local datetime to ISO with timezone offset", () => {
    expect(localDateTimeToIsoString("2026-04-04T08:15", -480)).toBe(
      "2026-04-04T00:15:00.000Z"
    )
  })
})