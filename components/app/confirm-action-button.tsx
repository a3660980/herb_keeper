"use client"

import * as React from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

type ConfirmActionButtonProps = React.ComponentProps<typeof Button> & {
  dialogTitle: string
  dialogDescription: string
  confirmLabel?: string
  cancelLabel?: string
  pendingConfirmLabel?: string
  confirmVariant?: React.ComponentProps<typeof Button>["variant"]
  onConfirm?: () => void | Promise<void>
}

export function ConfirmActionButton({
  children,
  dialogTitle,
  dialogDescription,
  confirmLabel = "確認",
  cancelLabel = "取消",
  pendingConfirmLabel,
  confirmVariant = "destructive",
  onConfirm,
  type = "button",
  disabled,
  ...props
}: ConfirmActionButtonProps) {
  const [open, setOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)

    if (!nextOpen) {
      setIsSubmitting(false)
    }
  }

  async function handleConfirm() {
    if (disabled || isSubmitting) {
      return
    }

    setIsSubmitting(true)

    try {
      if (onConfirm) {
        await onConfirm()
        setOpen(false)
        return
      }

      const form = triggerRef.current?.closest("form")

      if (!form) {
        setOpen(false)
        return
      }

      form.requestSubmit()
      return
    } finally {
      if (onConfirm) {
        setIsSubmitting(false)
      }
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button ref={triggerRef} type={type} disabled={disabled} {...props}>
          {children}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
          <AlertDialogDescription>{dialogDescription}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button type="button" variant="outline" disabled={isSubmitting}>
              {cancelLabel}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              type="button"
              variant={confirmVariant}
              aria-busy={isSubmitting}
              disabled={disabled || isSubmitting}
              onClick={(event) => {
                event.preventDefault()
                void handleConfirm()
              }}
            >
              {isSubmitting ? pendingConfirmLabel ?? confirmLabel : confirmLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}