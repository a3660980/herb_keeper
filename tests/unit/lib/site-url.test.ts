import { afterEach, describe, expect, it } from "vitest"

import { getAbsoluteUrl, getSiteUrl } from "@/lib/site-url"

const envKeys = [
  "NEXT_PUBLIC_SITE_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_BRANCH_URL",
  "VERCEL_URL",
] as const

function resetEnv() {
  for (const key of envKeys) {
    delete process.env[key]
  }
}

afterEach(() => {
  resetEnv()
})

describe("lib/site-url", () => {
  it("prefers the explicit public site url and trims trailing slashes", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://herbkeeper.example.com/"

    expect(getSiteUrl()).toBe("https://herbkeeper.example.com")
    expect(getAbsoluteUrl("/auth/login")).toBe(
      "https://herbkeeper.example.com/auth/login"
    )
  })

  it("falls back to Vercel production env vars and adds https", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "herbkeeper.vercel.app"

    expect(getSiteUrl()).toBe("https://herbkeeper.vercel.app")
  })

  it("falls back to localhost when no deployment env var is available", () => {
    expect(getSiteUrl()).toBe("http://localhost:3000")
    expect(getAbsoluteUrl("/dashboard")).toBe("http://localhost:3000/dashboard")
  })
})