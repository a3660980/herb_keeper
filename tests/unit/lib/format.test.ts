import { describe, expect, it } from "vitest"

import {
  formatCurrency,
  formatDecimalInput,
  formatQuantity,
  toNumberValue,
} from "@/lib/format"

describe("lib/format", () => {
  it("formats currency in TWD", () => {
    expect(formatCurrency(156)).toBe("$156")
  })

  it("formats quantity with up to three decimal places", () => {
    expect(formatQuantity(3168)).toBe("3,168")
    expect(formatQuantity(3.1684)).toBe("3.168")
  })

  it("normalizes decimal inputs for form defaults", () => {
    expect(formatDecimalInput(52)).toBe("52")
    expect(formatDecimalInput(52.126)).toBe("52.13")
  })

  it("converts nullable values to numbers", () => {
    expect(toNumberValue("3.25")).toBe(3.25)
    expect(toNumberValue(null)).toBe(0)
    expect(toNumberValue(undefined)).toBe(0)
  })
})