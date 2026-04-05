import { describe, expect, it } from "vitest"

import {
  calculateInventoryDisposalAmount,
  calculateInventoryRemainingStock,
  createInventoryDisposalFormState,
  getInventoryDisposalFieldErrors,
  inventoryDisposalFormSchema,
  inventoryDisposalReasonLabels,
  localDateTimeToIsoString,
  readInventoryDisposalFormSubmission,
} from "@/lib/features/inventory-disposals"

const productId = "22222222-2222-4222-8222-222222222222"

describe("lib/features/inventory-disposals", () => {
  it("creates a disposal form state with a default datetime", () => {
    const state = createInventoryDisposalFormState({ productId })

    expect(state.values.productId).toBe(productId)
    expect(state.values.quantity).toBe("")
    expect(state.values.reason).toBe("")
    expect(state.values.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })

  it("parses a disposal submission payload and timezone offset", () => {
    const formData = new FormData()
    formData.set(
      "payload",
      JSON.stringify({
        productId,
        quantity: "2.5",
        reason: "disaster",
        occurredAt: "2026-04-05T08:15",
        note: "倉儲受潮",
      })
    )
    formData.set("timezoneOffsetMinutes", "-480")

    expect(readInventoryDisposalFormSubmission(formData)).toEqual({
      values: {
        productId,
        quantity: "2.5",
        reason: "disaster",
        occurredAt: "2026-04-05T08:15",
        note: "倉儲受潮",
      },
      timezoneOffsetMinutes: -480,
    })
  })

  it("falls back to a safe default disposal payload when the submission is malformed", () => {
    const formData = new FormData()
    formData.set("payload", "{bad json")

    const submission = readInventoryDisposalFormSubmission(formData)

    expect(submission.values.productId).toBe("")
    expect(submission.values.quantity).toBe("")
    expect(submission.values.reason).toBe("")
    expect(submission.values.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(submission.timezoneOffsetMinutes).toBe(0)
  })

  it("maps zod errors back to disposal fields", () => {
    const result = inventoryDisposalFormSchema.safeParse({
      productId: "not-a-uuid",
      quantity: "0",
      reason: "",
      occurredAt: "bad-date",
      note: "",
    })

    expect(result.success).toBe(false)

    if (result.success) {
      throw new Error("Expected disposal schema validation to fail")
    }

    expect(getInventoryDisposalFieldErrors(result.error)).toEqual({
      productId: "請選擇藥材",
      quantity: "減損數量必須大於 0",
      reason: "請選擇減損原因",
      occurredAt: "減損時間格式不正確",
      note: undefined,
    })
  })

  it("exposes the expected user-facing reason labels", () => {
    expect(inventoryDisposalReasonLabels.damage).toBe("品質毀損")
    expect(inventoryDisposalReasonLabels.quality_return).toBe("品質退回")
    expect(inventoryDisposalReasonLabels.disaster).toBe("天災損失")
    expect(inventoryDisposalReasonLabels.other).toBe("其他減損")
  })

  it("calculates projected loss and remaining stock", () => {
    expect(calculateInventoryDisposalAmount("2.5", "26.4")).toBe(66)
    expect(calculateInventoryRemainingStock("10", "2.5")).toBe(7.5)
  })

  it("converts local datetime to ISO with timezone offset", () => {
    expect(localDateTimeToIsoString("2026-04-05T08:15", -480)).toBe(
      "2026-04-05T00:15:00.000Z"
    )
  })
})