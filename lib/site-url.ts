const LOCAL_FALLBACK_URL = "http://localhost:3000"

function normalizeSiteUrl(value: string | undefined) {
  const trimmed = value?.trim()

  if (!trimmed) {
    return undefined
  }

  const withProtocol = /^https?:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  return withProtocol.replace(/\/+$/, "")
}

export function getSiteUrl() {
  return (
    normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalizeSiteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizeSiteUrl(process.env.VERCEL_BRANCH_URL) ??
    normalizeSiteUrl(process.env.VERCEL_URL) ??
    LOCAL_FALLBACK_URL
  )
}

export function getAbsoluteUrl(path = "/") {
  return new URL(path, `${getSiteUrl()}/`).toString()
}