"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

export function ToastNotification({
  flashError,
}: {
  flashError?: string | null
}) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const statusMessage = searchParams.get("statusMessage")

    if (statusMessage) {
      toast.success(statusMessage)
      const params = new URLSearchParams(searchParams.toString())
      params.delete("statusMessage")
      const remaining = params.toString()
      router.replace(remaining ? `${pathname}?${remaining}` : pathname, {
        scroll: false,
      })
    }
  }, [searchParams, pathname, router])

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
