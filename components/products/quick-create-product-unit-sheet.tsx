"use client"

import { useActionState, useEffect, useState } from "react"

import { createProductUnitAction } from "@/app/(app)/products/actions"
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
import {
  createProductUnitFormState,
  emptyProductUnitFormValues,
} from "@/lib/features/product-units"
import type { ProductUnitRecord } from "@/lib/features/products"

type QuickCreateProductUnitSheetProps = {
  onCreated: (unit: ProductUnitRecord) => void
  triggerClassName?: string
}

type QuickCreateProductUnitSheetFormProps = {
  onCreated: (unit: ProductUnitRecord) => void
  onCompleted: () => void
}

function QuickCreateProductUnitSheetForm({
  onCreated,
  onCompleted,
}: QuickCreateProductUnitSheetFormProps) {
  const [state, formAction] = useActionState(
    createProductUnitAction,
    createProductUnitFormState(emptyProductUnitFormValues)
  )

  useEffect(() => {
    if (!state.createdUnit) {
      return
    }

    onCreated(state.createdUnit)
    onCompleted()
  }, [state.createdUnit, onCompleted, onCreated])

  return (
    <form action={formAction} className="flex h-full flex-col gap-6">
      {state.message ? <FormMessage message={state.message} tone="error" /> : null}

      <div className="grid gap-5">
        <div className="space-y-2">
          <Label htmlFor="quickProductUnitName">單位名稱</Label>
          <Input
            id="quickProductUnitName"
            name="name"
            defaultValue={state.values.name}
            placeholder="例如：台斤、公斤、包"
          />
          {state.fieldErrors.name ? (
            <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-auto flex justify-end gap-3 border-t border-border/60 pt-4">
        <SubmitButton pendingLabel="建立中...">新增單位</SubmitButton>
      </div>
    </form>
  )
}

export function QuickCreateProductUnitSheet({
  onCreated,
  triggerClassName,
}: QuickCreateProductUnitSheetProps) {
  const [open, setOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)

  function handleCompleted() {
    setOpen(false)
    setFormKey((current) => current + 1)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="lg" className={triggerClassName}>
          新增單位
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full border-l border-border/70 sm:max-w-md">
        <SheetHeader className="border-b border-border/70 px-6 py-5">
          <SheetTitle>新增單位</SheetTitle>
          <SheetDescription>建立後會直接帶回目前這筆藥材資料。</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <QuickCreateProductUnitSheetForm
            key={formKey}
            onCreated={onCreated}
            onCompleted={handleCompleted}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}