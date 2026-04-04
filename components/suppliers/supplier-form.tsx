"use client"

import { useActionState } from "react"

import { FormMessage } from "@/components/app/form-message"
import { SubmitButton } from "@/components/app/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { SupplierFormState } from "@/lib/features/suppliers"

type SupplierFormProps = {
  action: (
    state: SupplierFormState,
    formData: FormData
  ) => Promise<SupplierFormState>
  initialState: SupplierFormState
  submitLabel: string
  pendingLabel: string
}

export function SupplierForm({
  action,
  initialState,
  submitLabel,
  pendingLabel,
}: SupplierFormProps) {
  const [state, formAction] = useActionState(action, initialState)

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? <FormMessage message={state.message} tone="error" /> : null}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">供應商名稱</Label>
          <Input id="name" name="name" defaultValue={state.values.name} />
          {state.fieldErrors.name ? (
            <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">聯絡電話</Label>
          <Input id="phone" name="phone" defaultValue={state.values.phone} />
          {state.fieldErrors.phone ? (
            <p className="text-sm text-destructive">{state.fieldErrors.phone}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">地址</Label>
          <Input id="address" name="address" defaultValue={state.values.address} />
          {state.fieldErrors.address ? (
            <p className="text-sm text-destructive">{state.fieldErrors.address}</p>
          ) : null}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="note">備註</Label>
          <Textarea
            id="note"
            name="note"
            defaultValue={state.values.note}
            placeholder="例如：主要供貨項目、結帳條件或聯絡窗口。"
          />
          {state.fieldErrors.note ? (
            <p className="text-sm text-destructive">{state.fieldErrors.note}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <SubmitButton pendingLabel={pendingLabel}>{submitLabel}</SubmitButton>
      </div>
    </form>
  )
}