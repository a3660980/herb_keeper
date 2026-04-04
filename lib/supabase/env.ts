type SupabasePublicEnv = {
  url: string
  publicKey: string
}

function readEnv(name: string) {
  const value = process.env[name]?.trim()

  return value ? value : undefined
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value)

    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function getSupabasePublicKey() {
  return (
    readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY") ??
    readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ??
    readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  )
}

export function hasSupabaseEnv() {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL")

  return Boolean(url && getSupabasePublicKey() && isValidHttpUrl(url))
}

export function getSupabasePublicEnv(): SupabasePublicEnv {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL")
  const publicKey = getSupabasePublicKey()

  if (!url || !publicKey) {
    throw new Error(
      "Missing Supabase public environment variables. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY for compatibility."
    )
  }

  if (!isValidHttpUrl(url)) {
    throw new Error("Invalid NEXT_PUBLIC_SUPABASE_URL. Must be a valid HTTP or HTTPS URL.")
  }

  return { url, publicKey }
}

export function getSupabaseServiceRoleKey() {
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY")

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Server actions that require elevated privileges should only run after it is configured."
    )
  }

  return serviceRoleKey
}
