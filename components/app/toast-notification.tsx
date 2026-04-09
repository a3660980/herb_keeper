"use client"

import { useEffect } from "react"
import { toast } from "sonner"

export function ToastNotification({
  flashError,
  flashSuccess,
}: {
  flashError?: string | null
  flashSuccess?: string | null
}) {
  useEffect(() => {
    if (flashSuccess) {
      const message = flashSuccess.includes("|")
        ? flashSuccess.slice(flashSuccess.indexOf("|") + 1)
        : flashSuccess
      toast.success(message)
      document.cookie = "flash_success=; path=/; max-age=0"
    }
  }, [flashSuccess])

  useEffect(() => {
    if (flashError) {
      const message = flashError.includes("|")
        ? flashError.slice(flashError.indexOf("|") + 1)
        : flashError
      toast.error(message)
      document.cookie = "flash_error=; path=/; max-age=0"
    }
  }, [flashError])

  return null
}
