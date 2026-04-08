/**
 * Next.js 的 redirect() 透過 throw Error("NEXT_REDIRECT") 運作，
 * 如果 redirect() 被放在 try/catch 裡面會被誤攔。
 *
 * 正確做法是所有 redirect() 都寫在 try/catch 外面（本 repo 已全面修正）。
 * 此 helper 僅作為最後防線：萬一有漏網之魚，用 fallback 取代原始技術字串。
 */
export function normalizeServerActionErrorMessage(
  message: string | null | undefined,
  fallback: string
) {
  if (!message || message.includes("NEXT_REDIRECT") || message.includes("NEXT_NOT_FOUND")) {
    return fallback
  }

  return message
}

export function getUnexpectedServerActionErrorMessage(
  error: unknown,
  fallback = "發生未預期錯誤，請稍後再試。"
) {
  if (error instanceof Error) {
    return normalizeServerActionErrorMessage(error.message, fallback)
  }

  return fallback
}