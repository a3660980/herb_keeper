"use client"

import { useEffect, useEffectEvent, useState } from "react"
import { FullscreenIcon, MinimizeScreenIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type FullscreenToggleProps = {
  className?: string
  labelClassName?: string
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
}

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void>
  webkitCancelFullScreen?: () => void
}

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>
  webkitRequestFullScreen?: () => void
}

function isFullscreenSupported(doc: FullscreenDocument) {
  const element = doc.documentElement as FullscreenElement

  return Boolean(
    element.requestFullscreen ||
      element.webkitRequestFullscreen ||
      element.webkitRequestFullScreen
  )
}

function isFullscreenActive(doc: FullscreenDocument) {
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement)
}

async function enterFullscreen(doc: FullscreenDocument) {
  const element = doc.documentElement as FullscreenElement

  if (element.requestFullscreen) {
    await element.requestFullscreen()
    return
  }

  if (element.webkitRequestFullscreen) {
    await element.webkitRequestFullscreen()
    return
  }

  element.webkitRequestFullScreen?.()
}

async function exitFullscreen(doc: FullscreenDocument) {
  if (doc.exitFullscreen) {
    await doc.exitFullscreen()
    return
  }

  if (doc.webkitExitFullscreen) {
    await doc.webkitExitFullscreen()
    return
  }

  doc.webkitCancelFullScreen?.()
}

export function FullscreenToggle({
  className,
  labelClassName,
  variant = "outline",
  size = "sm",
}: FullscreenToggleProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const syncState = useEffectEvent(() => {
    const doc = document as FullscreenDocument

    setIsSupported(isFullscreenSupported(doc))
    setIsFullscreen(isFullscreenActive(doc))
  })

  useEffect(() => {
    syncState()

    const handleChange = () => {
      syncState()
    }

    document.addEventListener("fullscreenchange", handleChange)
    document.addEventListener("webkitfullscreenchange", handleChange)

    return () => {
      document.removeEventListener("fullscreenchange", handleChange)
      document.removeEventListener("webkitfullscreenchange", handleChange)
    }
  }, [syncState])

  const buttonLabel = isFullscreen ? "離開全螢幕" : "進入全螢幕"

  async function handleToggle() {
    if (!isSupported || isPending) {
      return
    }

    const doc = document as FullscreenDocument

    setIsPending(true)

    try {
      if (isFullscreenActive(doc)) {
        await exitFullscreen(doc)
      } else {
        await enterFullscreen(doc)
      }
    } catch {
      syncState()
    } finally {
      setIsPending(false)
    }
  }

  if (!isSupported) {
    return null
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      aria-label={buttonLabel}
      aria-pressed={isFullscreen}
      title={buttonLabel}
      disabled={isPending}
      onClick={handleToggle}
    >
      <HugeiconsIcon
        icon={isFullscreen ? MinimizeScreenIcon : FullscreenIcon}
        strokeWidth={2}
        data-icon="inline-start"
      />
      <span className={cn(labelClassName)}>{buttonLabel}</span>
    </Button>
  )
}