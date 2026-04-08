"use client"

import { useActionState, useEffect, useState } from "react"

import { createCustomerQuickAction } from "@/app/(app)/customers/actions"
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
  createQuickCustomerFormState,
  customerTypeOptions,
  emptyCustomerFormValues,
} from "@/lib/features/customers"
import type { TradeCustomerOption } from "@/lib/features/trades"

type QuickCreateCustomerSheetProps = {
  onCreated: (customer: TradeCustomerOption) => void
  triggerClassName?: string
}

const selectClassName =
  "flex h-11 w-full rounded-[1.15rem] border border-border/70 bg-background/78 px-4 py-2 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] outline-none transition-[color,box-shadow,background-color,border-color] focus-visible:border-primary/30 focus-visible:ring-4 focus-visible:ring-ring/15 sm:text-sm"

const customerTypeLabels: Record<(typeof customerTypeOptions)[number], string> = {
  general: "一般客",
  vip: "VIP",
  wholesale: "批發",
}

type QuickCreateCustomerSheetFormProps = {
  onCreated: (customer: TradeCustomerOption) => void
  onCompleted: () => void
}

function QuickCreateCustomerSheetForm({
  onCreated,
  onCompleted,
}: QuickCreateCustomerSheetFormProps) {
  const [state, formAction] = useActionState(
    createCustomerQuickAction,
    createQuickCustomerFormState(emptyCustomerFormValues)
  )

  useEffect(() => {
    if (!state.createdCustomer) {
      return
    }

    onCreated(state.createdCustomer)
    onCompleted()
  }, [state.createdCustomer, onCompleted, onCreated])

  return (
    <form action={formAction} className="flex h-full flex-col gap-6">
      {state.message ? <FormMessage message={state.message} tone="error" /> : null}

      <div className="grid gap-5">
        <div className="space-y-2">
          <Label htmlFor="quickCustomerName">客戶名稱</Label>
          <Input id="quickCustomerName" name="name" defaultValue={state.values.name} />
          {state.fieldErrors.name ? (
            <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="quickCustomerPhone">聯絡電話</Label>
          <Input id="quickCustomerPhone" name="phone" defaultValue={state.values.phone} />
          {state.fieldErrors.phone ? (
            <p className="text-sm text-destructive">{state.fieldErrors.phone}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="quickCustomerAddress">地址</Label>
          <Textarea
            id="quickCustomerAddress"
            name="address"
            defaultValue={state.values.address}
            placeholder="例如：台北市大同區示範路 12 號"
          />
          {state.fieldErrors.address ? (
            <p className="text-sm text-destructive">{state.fieldErrors.address}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="quickCustomerType">客戶類型</Label>
          <select
            id="quickCustomerType"
            name="type"
            defaultValue={state.values.type}
            className={selectClassName}
          >
            {customerTypeOptions.map((type) => (
              <option key={type} value={type}>
                {customerTypeLabels[type]}
              </option>
            ))}
          </select>
          {state.fieldErrors.type ? (
            <p className="text-sm text-destructive">{state.fieldErrors.type}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="quickCustomerDiscountRate">折扣倍率</Label>
          <Input
            id="quickCustomerDiscountRate"
            name="discountRate"
            type="number"
            step="0.0001"
            min="0.0001"
            max="1"
            defaultValue={state.values.discountRate}
          />
          {state.fieldErrors.discountRate ? (
            <p className="text-sm text-destructive">{state.fieldErrors.discountRate}</p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            建立後會直接帶回目前這筆交易並自動選取這位客戶。
          </p>
        </div>
      </div>

      <div className="mt-auto flex justify-end gap-3 border-t border-border/60 pt-4">
        <SubmitButton pendingLabel="建立中...">建立客戶</SubmitButton>
      </div>
    </form>
  )
}

export function QuickCreateCustomerSheet({
  onCreated,
  triggerClassName,
}: QuickCreateCustomerSheetProps) {
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
          快速新增客戶
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full border-l border-border/70 sm:max-w-lg">
        <SheetHeader className="border-b border-border/70 px-6 py-5">
          <SheetTitle>快速新增客戶</SheetTitle>
          <SheetDescription>
            不離開交易表單，直接補上新客戶並帶回當前流程。
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <QuickCreateCustomerSheetForm
            key={formKey}
            onCreated={onCreated}
            onCompleted={handleCompleted}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}