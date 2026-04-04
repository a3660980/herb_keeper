import { afterEach, describe, expect, it } from "vitest"

import {
  getSupabasePublicEnv,
  getSupabaseServiceRoleKey,
  hasSupabaseEnv,
} from "@/lib/supabase/env"

const envKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const

function resetEnv() {
  for (const key of envKeys) {
    delete process.env[key]
  }
}

afterEach(() => {
  resetEnv()
})

describe("lib/supabase/env", () => {
  it("detects when required public env vars are present", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = "public-key"

    expect(hasSupabaseEnv()).toBe(true)
    expect(getSupabasePublicEnv()).toEqual({
      url: "https://example.supabase.co",
      publicKey: "public-key",
    })
  })

  it("supports the legacy anon key fallback", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"

    expect(getSupabasePublicEnv()).toEqual({
      url: "https://example.supabase.co",
      publicKey: "anon-key",
    })
  })

  it("trims whitespace from Supabase env vars", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "  https://example.supabase.co  \n"
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = "  public-key  "
    process.env.SUPABASE_SERVICE_ROLE_KEY = "  service-role  \n"

    expect(hasSupabaseEnv()).toBe(true)
    expect(getSupabasePublicEnv()).toEqual({
      url: "https://example.supabase.co",
      publicKey: "public-key",
    })
    expect(getSupabaseServiceRoleKey()).toBe("service-role")
  })

  it("treats an invalid Supabase URL as unavailable and throws a clear error", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "sb_publishable_not_a_url"
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = "public-key"

    expect(hasSupabaseEnv()).toBe(false)
    expect(() => getSupabasePublicEnv()).toThrow(
      "Invalid NEXT_PUBLIC_SUPABASE_URL. Must be a valid HTTP or HTTPS URL."
    )
  })

  it("throws when public env vars are incomplete", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"

    expect(() => getSupabasePublicEnv()).toThrow(
      "Missing Supabase public environment variables"
    )
  })

  it("returns the service role key when configured", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role"

    expect(getSupabaseServiceRoleKey()).toBe("service-role")
  })

  it("throws when the service role key is missing", () => {
    expect(() => getSupabaseServiceRoleKey()).toThrow(
      "Missing SUPABASE_SERVICE_ROLE_KEY"
    )
  })
})