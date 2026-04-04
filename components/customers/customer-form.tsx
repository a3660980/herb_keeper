"use client"

import { useActionState } from "react"

import { FormMessage } from "@/components/app/form-message"
import { SubmitButton } from "@/components/app/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  customerTypeOptions,
  type CustomerFormState,
} from "@/lib/features/customers"

type CustomerFormProps = {
  action: (
    state: CustomerFormState,
    formData: FormData
  ) => Promise<CustomerFormState>
  initialState: CustomerFormState
  submitLabel: string
  pendingLabel: string
}

const selectClassName =
  "flex h-11 w-full rounded-[1.15rem] border border-border/70 bg-background/78 px-4 py-2 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] outline-none transition-[color,box-shadow,background-color,border-color] focus-visible:border-primary/30 focus-visible:ring-4 focus-visible:ring-ring/15 sm:text-sm"

const customerTypeLabels: Record<(typeof customerTypeOptions)[number], string> = {
  general: "一般客",
  vip: "VIP",
  wholesale: "批發",
}

export function CustomerForm({
  action,
  initialState,
  submitLabel,
  pendingLabel,
}: CustomerFormProps) {
  const [state, formAction] = useActionState(action, initialState)

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? <FormMessage message={state.message} tone="error" /> : null}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">客戶名稱</Label>
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
          <Label htmlFor="type">客戶類型</Label>
          <select
            id="type"
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

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="discountRate">折扣倍率</Label>
          <Input
            id="discountRate"
            name="discountRate"
            type="number"
            step="0.0001"
            min="0.0001"
            max="1"
            defaultValue={state.values.discountRate}
          />
          {state.fieldErrors.discountRate ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.discountRate}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            1 代表原價，0.9 代表九折，0.85 代表八五折。
          </p>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <SubmitButton pendingLabel={pendingLabel}>{submitLabel}</SubmitButton>
      </div>
    </form>
  )
}