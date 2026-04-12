import { describe, expect, it } from "vitest"

import {
  getDateRangeEndBefore,
  getDateRangeStartAt,
  getSingleSearchParam,
  hasInvalidDateRange,
  readDateParam,
  toDateInputValue,
  withQueryString,
} from "@/lib/url"

describe("lib/url", () => {
  it("returns a single search param from a string array", () => {
    expect(getSingleSearchParam(["first", "second"])).toBe("first")
    expect(getSingleSearchParam("only")).toBe("only")
    expect(getSingleSearchParam(undefined)).toBeUndefined()
  })

  it("builds query strings and skips undefined params", () => {
    expect(
      withQueryString("/reports", {
        q: "黃耆 3g",
        type: "direct_sale",
        empty: undefined,
      })
    ).toBe("/reports?q=%E9%BB%83%E8%80%86+3g&type=direct_sale")
  })

  it("returns the original path when no params are present", () => {
    expect(withQueryString("/orders", { status: undefined })).toBe("/orders")
  })

  it("validates date params and date range boundaries", () => {
    expect(readDateParam("2026-04-12")).toBe("2026-04-12")
    expect(readDateParam("2026-02-30")).toBe("")
    expect(readDateParam("04/12/2026")).toBe("")
    expect(hasInvalidDateRange("2026-04-12", "2026-04-11")).toBe(true)
    expect(hasInvalidDateRange("2026-04-11", "2026-04-12")).toBe(false)
    expect(getDateRangeStartAt("2026-04-12")).toBe("2026-04-12T00:00:00+08:00")
    expect(getDateRangeEndBefore("2026-04-12")).toBe("2026-04-13T00:00:00+08:00")
  })

  it("converts timestamps to Taiwan date input values", () => {
    expect(toDateInputValue("2026-04-11T16:10:00.000Z")).toBe("2026-04-12")
    expect(toDateInputValue("invalid")).toBe("")
  })
})