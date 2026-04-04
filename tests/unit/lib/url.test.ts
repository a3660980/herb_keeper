import { describe, expect, it } from "vitest"

import { getSingleSearchParam, withQueryString } from "@/lib/url"

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
})