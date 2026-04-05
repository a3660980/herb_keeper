"use client"

import { useActionState, useEffect, useState } from "react"

import { createSupplierQuickAction } from "@/app/(app)/suppliers/actions"
import { FormMessage } from "@/components/app/form-message"
import { SubmitButton } from "@/components/app/submit-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  createQuickSupplierFormState,
  emptySupplierFormValues,
  type QuickCreateSupplierOption,
} from "@/lib/features/suppliers"

type QuickCreateSupplierSheetProps = {
  onCreated: (supplier: QuickCreateSupplierOption) => void
  triggerClassName?: string
}

type QuickCreateSupplierSheetFormProps = {
  onCreated: (supplier: QuickCreateSupplierOption) => void
  onCompleted: () => void
}

function QuickCreateSupplierSheetForm({
  onCreated,
  onCompleted,
}: QuickCreateSupplierSheetFormProps) {
  const [state, formAction] = useActionState(
    createSupplierQuickAction,
    createQuickSupplierFormState(emptySupplierFormValues)
  )

  useEffect(() => {
    if (!state.createdSupplier) {
      return
    }

    onCreated(state.createdSupplier)
    onCompleted()
  }, [state.createdSupplier, onCompleted, onCreated])

  return (
    <form action={formAction} className="flex h-full flex-col gap-6">
      {state.message ? <FormMessage message={state.message} tone="error" /> : null}

      <div className="grid gap-5">
        <div className="space-y-2">
          <Label htmlFor="quickSupplierName">供應商名稱</Label>
          <Input id="quickSupplierName" name="name" defaultValue={state.values.name} />
          {state.fieldErrors.name ? (
            <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="quickSupplierPhone">聯絡電話</Label>
          <Input id="quickSupplierPhone" name="phone" defaultValue={state.values.phone} />
          {state.fieldErrors.phone ? (
            <p className="text-sm text-destructive">{state.fieldErrors.phone}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="quickSupplierAddress">地址</Label>
          <Textarea
            id="quickSupplierAddress"
            name="address"
            defaultValue={state.values.address}
            placeholder="例如：台北市大同區示範路 12 號"
          />
          {state.fieldErrors.address ? (
            <p className="text-sm text-destructive">{state.fieldErrors.address}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="quickSupplierNote">備註</Label>
          <Textarea
            id="quickSupplierNote"
            name="note"
            defaultValue={state.values.note}
            placeholder="例如：主要供貨項目、急件窗口或結帳條件。"
          />
          {state.fieldErrors.note ? (
            <p className="text-sm text-destructive">{state.fieldErrors.note}</p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            建立後會直接帶回目前這張進貨單並自動選取這位供應商。
          </p>
        </div>
      </div>

      <div className="mt-auto flex justify-end gap-3 border-t border-border/60 pt-4">
        <SubmitButton pendingLabel="建立中...">建立供應商</SubmitButton>
      </div>
    </form>
  )
}

export function QuickCreateSupplierSheet({
  onCreated,
  triggerClassName,
}: QuickCreateSupplierSheetProps) {
  const [open, setOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)

  function handleCompleted() {
    setOpen(false)
    setFormKey((current) => current + 1)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm" className={triggerClassName}>
          快速新增供應商
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full border-l border-border/70 sm:max-w-lg">
        <SheetHeader className="border-b border-border/70 px-6 py-5">
          <SheetTitle>快速新增供應商</SheetTitle>
          <SheetDescription>
            不離開進貨單，直接補上新供應商並帶回當前表單。
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <QuickCreateSupplierSheetForm
            key={formKey}
            onCreated={onCreated}
            onCompleted={handleCompleted}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}