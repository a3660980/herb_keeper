import { describe, expect, it } from "vitest"

import {
  createOrderFormState,
  createShipmentFormState,
  getOrderFieldErrors,
  getShipmentFieldErrors,
  localDateTimeToIsoString,
  orderStatusLabels,
  orderStatusOptions,
  orderRecordToFormValues,
  orderFormSchema,
  orderPayloadToRpcItems,
  readOrderFormSubmission,
  readShipmentFormSubmission,
  shipmentFormSchema,
  shipmentPayloadToRpcItems,
} from "@/lib/features/orders"

const customerId = "11111111-1111-1111-1111-111111111111"
const productId = "22222222-2222-2222-2222-222222222222"
const orderItemId = "33333333-3333-3333-3333-333333333333"

describe("lib/features/orders", () => {
  it("includes the canceled order status label", () => {
    expect(orderStatusOptions).toContain("canceled")
    expect(orderStatusLabels.canceled).toBe("已撤銷")
  })

  it("converts a local datetime and timezone offset into ISO", () => {
    expect(localDateTimeToIsoString("2026-04-04T06:36", -480)).toBe(
      "2026-04-03T22:36:00.000Z"
    )
    expect(localDateTimeToIsoString("invalid", -480)).toBeNull()
  })

  it("creates an order form state with default date and one line", () => {
    const state = createOrderFormState()

    expect(state.values.orderDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(state.values.items).toHaveLength(1)
  })

  it("parses an order submission payload and timezone offset", () => {
    const formData = new FormData()
    formData.set(
      "payload",
      JSON.stringify({
        customerId,
        orderDate: "2026-04-04T06:36",
        note: "急單",
        items: [
          {
            id: "line-1",
            productId,
            orderedQuantity: "2",
            finalUnitPrice: "52",
          },
        ],
      })
    )
    formData.set("timezoneOffsetMinutes", "-480")

    expect(readOrderFormSubmission(formData)).toEqual({
      values: {
        customerId,
        orderDate: "2026-04-04T06:36",
        note: "急單",
        items: [
          {
            id: "line-1",
            productId,
            orderedQuantity: "2",
            finalUnitPrice: "52",
          },
        ],
      },
      timezoneOffsetMinutes: -480,
    })
  })

  it("falls back to a safe default order payload when the submission is malformed", () => {
    const formData = new FormData()
    formData.set("payload", "{bad json")

    const submission = readOrderFormSubmission(formData)

    expect(submission.timezoneOffsetMinutes).toBe(0)
    expect(submission.values.customerId).toBe("")
    expect(submission.values.items).toHaveLength(1)
  })

  it("maps order field and line errors", () => {
    const values = {
      customerId: "not-a-uuid",
      orderDate: "bad-date",
      note: "",
      items: [
        {
          id: "line-1",
          productId: "bad-product-id",
          orderedQuantity: "",
          finalUnitPrice: "-1",
        },
      ],
    }
    const result = orderFormSchema.safeParse(values)

    expect(result.success).toBe(false)

    if (result.success) {
      throw new Error("Expected order schema validation to fail")
    }

    const { fieldErrors, itemErrors } = getOrderFieldErrors(result.error, values)

    expect(fieldErrors.customerId).toBe("請選擇客戶")
    expect(fieldErrors.orderDate).toBe("下單時間格式不正確")
    expect(itemErrors["line-1"]).toEqual({
      productId: "請選擇藥材",
      orderedQuantity: "請輸入數量",
      finalUnitPrice: "單價不可小於 0",
    })
  })

  it("prefers the required order date error when the datetime is blank", () => {
    const values = {
      customerId,
      orderDate: "",
      note: "",
      items: [
        {
          id: "line-1",
          productId,
          orderedQuantity: "1",
          finalUnitPrice: "52",
        },
      ],
    }
    const result = orderFormSchema.safeParse(values)

    expect(result.success).toBe(false)

    if (result.success) {
      throw new Error("Expected blank order date validation to fail")
    }

    const { fieldErrors } = getOrderFieldErrors(result.error, values)

    expect(fieldErrors.orderDate).toBe("請選擇下單時間")
  })

  it("maps order payloads to RPC items", () => {
    expect(
      orderPayloadToRpcItems({
        customerId,
        orderDate: "2026-04-04T06:36",
        note: "",
        items: [
          {
            id: "line-1",
            productId,
            orderedQuantity: 2,
            finalUnitPrice: 52,
          },
        ],
      })
    ).toEqual([
      {
        product_id: productId,
        ordered_quantity: 2,
        final_unit_price: 52,
      },
    ])
  })

  it("builds editable order form values from an existing order", () => {
    const values = orderRecordToFormValues(
      {
        customerId,
        orderDate: "2026-04-04T06:36:00.000Z",
        note: "保留原訂單內容",
      },
      [
        {
          id: orderItemId,
          productId,
          orderedQuantity: 2.5,
          finalUnitPrice: 52,
        },
      ]
    )

    expect(values.customerId).toBe(customerId)
    expect(values.note).toBe("保留原訂單內容")
    expect(values.orderDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(values.items).toEqual([
      {
        id: orderItemId,
        productId,
        orderedQuantity: "2.5",
        finalUnitPrice: "52",
      },
    ])
  })

  it("rejects duplicate products in one order", () => {
    const values = {
      customerId,
      orderDate: "2026-04-04T06:36",
      note: "",
      items: [
        {
          id: "line-1",
          productId,
          orderedQuantity: "1",
          finalUnitPrice: "52",
        },
        {
          id: "line-2",
          productId,
          orderedQuantity: "2",
          finalUnitPrice: "52",
        },
      ],
    }
    const result = orderFormSchema.safeParse(values)

    expect(result.success).toBe(false)

    if (result.success) {
      throw new Error("Expected duplicate order product validation to fail")
    }

    const { fieldErrors } = getOrderFieldErrors(result.error, values)

    expect(fieldErrors.items).toBe("同一張訂單不可重複加入同一藥材。")
  })

  it("creates a shipment form state with default date", () => {
    const state = createShipmentFormState({
      items: [
        {
          orderItemId,
          productId,
          productName: "黃耆",
          remainingQuantity: "2",
          availableStock: "100",
          unit: "g",
          shippedQuantity: "0",
        },
      ],
    })

    expect(state.values.shipmentDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(state.values.items).toHaveLength(1)
  })

  it("parses a shipment submission payload and timezone offset", () => {
    const formData = new FormData()
    formData.set(
      "payload",
      JSON.stringify({
        shipmentDate: "2026-04-04T06:36",
        note: "先出一半",
        items: [
          {
            orderItemId,
            productId,
            productName: "黃耆",
            remainingQuantity: "2",
            availableStock: "100",
            unit: "g",
            shippedQuantity: "1",
          },
        ],
      })
    )
    formData.set("timezoneOffsetMinutes", "-480")

    expect(readShipmentFormSubmission(formData)).toEqual({
      values: {
        shipmentDate: "2026-04-04T06:36",
        note: "先出一半",
        items: [
          {
            orderItemId,
            productId,
            productName: "黃耆",
            remainingQuantity: "2",
            availableStock: "100",
            unit: "g",
            shippedQuantity: "1",
          },
        ],
      },
      timezoneOffsetMinutes: -480,
    })
  })

  it("maps shipment field and line errors", () => {
    const values = {
      shipmentDate: "bad-date",
      note: "",
      items: [
        {
          orderItemId,
          productId,
          productName: "黃耆",
          remainingQuantity: "2",
          availableStock: "100",
          unit: "g",
          shippedQuantity: "",
        },
      ],
    }
    const result = shipmentFormSchema.safeParse(values)

    expect(result.success).toBe(false)

    if (result.success) {
      throw new Error("Expected shipment schema validation to fail")
    }

    const { fieldErrors, itemErrors } = getShipmentFieldErrors(result.error, values)

    expect(fieldErrors.shipmentDate).toBe("出貨時間格式不正確")
    expect(itemErrors[orderItemId]).toEqual({
      shippedQuantity: "請輸入數量",
    })
  })

  it("prefers the required shipment date error when the datetime is blank", () => {
    const values = {
      shipmentDate: "",
      note: "",
      items: [
        {
          orderItemId,
          productId,
          productName: "黃耆",
          remainingQuantity: "2",
          availableStock: "100",
          unit: "g",
          shippedQuantity: "1",
        },
      ],
    }
    const result = shipmentFormSchema.safeParse(values)

    expect(result.success).toBe(false)

    if (result.success) {
      throw new Error("Expected blank shipment date validation to fail")
    }

    const { fieldErrors } = getShipmentFieldErrors(result.error, values)

    expect(fieldErrors.shipmentDate).toBe("請選擇出貨時間")
  })

  it("requires at least one positive shipment quantity", () => {
    const values = {
      shipmentDate: "2026-04-04T06:36",
      note: "",
      items: [
        {
          orderItemId,
          productId,
          productName: "黃耆",
          remainingQuantity: "2",
          availableStock: "100",
          unit: "g",
          shippedQuantity: "0",
        },
      ],
    }
    const result = shipmentFormSchema.safeParse(values)

    expect(result.success).toBe(false)

    if (result.success) {
      throw new Error("Expected zero-quantity shipment validation to fail")
    }

    const { fieldErrors } = getShipmentFieldErrors(result.error, values)

    expect(fieldErrors.items).toBe("至少輸入一筆本次出貨數量。")
  })

  it("falls back to a safe default shipment payload when the submission is malformed", () => {
    const formData = new FormData()
    formData.set("payload", "{bad json")

    const submission = readShipmentFormSubmission(formData)

    expect(submission.timezoneOffsetMinutes).toBe(0)
    expect(submission.values.shipmentDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(submission.values.items).toEqual([])
  })

  it("filters zero-quantity shipment lines before RPC submission", () => {
    expect(
      shipmentPayloadToRpcItems({
        shipmentDate: "2026-04-04T06:36",
        note: "",
        items: [
          {
            orderItemId,
            productId,
            productName: "黃耆",
            remainingQuantity: "2",
            availableStock: "100",
            unit: "g",
            shippedQuantity: 0,
          },
          {
            orderItemId: "44444444-4444-4444-4444-444444444444",
            productId,
            productName: "黃耆",
            remainingQuantity: "1",
            availableStock: "100",
            unit: "g",
            shippedQuantity: 1,
          },
        ],
      })
    ).toEqual([
      {
        order_item_id: "44444444-4444-4444-4444-444444444444",
        shipped_quantity: 1,
      },
    ])
  })
})