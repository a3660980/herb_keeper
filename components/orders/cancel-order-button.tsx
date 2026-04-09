"use client"

import { useState } from "react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { Button } from "@/components/ui/button"
import { SubmitButton } from "@/components/app/submit-button"

type CancelOrderButtonProps = {
  action: () => Promise<void>
  size?: "sm" | "default"
  label?: string
  dialogTitle?: string
  dialogDescription?: string
}

export function CancelOrderButton({
  action,
  size = "default",
  label = "撤銷訂單",
  dialogTitle = "確認撤銷訂單",
  dialogDescription = "撤銷後訂單將無法再修改或出貨，確定要撤銷嗎？",
}: CancelOrderButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button type="button" size={size} variant="destructive">
          {label}
        </Button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border/60 bg-card p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <DialogPrimitive.Title className="text-lg font-semibold text-foreground">
            {dialogTitle}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
            {dialogDescription}
          </DialogPrimitive.Description>

          <div className="mt-6 flex justify-end gap-3">
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="outline">
                取消
              </Button>
            </DialogPrimitive.Close>
            <form
              action={async () => {
                await action()
                setOpen(false)
              }}
            >
              <SubmitButton variant="destructive" pendingLabel="撤銷中…">
                確認撤銷
              </SubmitButton>
            </form>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
