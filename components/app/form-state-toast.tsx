"use client"

import { useEffect } from "react"
import { toast } from "sonner"

type FormStateToastProps = {
  message?: string | null
  tone?: "error" | "success" | "info"
  trigger?: unknown
}

export function FormStateToast({
  message,
  tone = "error",
  trigger,
}: FormStateToastProps) {
  useEffect(() => {
    if (!message) {
      return
    }

    if (tone === "success") {
      toast.success(message)
      return
    }

    if (tone === "info") {
      toast(message)
      return
    }

    toast.error(message)
  }, [message, tone, trigger])

  return null
}