"use client"

import { useActionState } from "react"

import { FormMessage } from "@/components/app/form-message"
import { SubmitButton } from "@/components/app/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ProductFormState } from "@/lib/features/products"

type ProductFormProps = {
  action: (
    state: ProductFormState,
    formData: FormData
  ) => Promise<ProductFormState>
  initialState: ProductFormState
  submitLabel: string
  pendingLabel: string
}

export function ProductForm({
  action,
  initialState,
  submitLabel,
  pendingLabel,
}: ProductFormProps) {
  const [state, formAction] = useActionState(action, initialState)

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? <FormMessage message={state.message} tone="error" /> : null}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">藥材名稱</Label>
          <Input id="name" name="name" defaultValue={state.values.name} />
          {state.fieldErrors.name ? (
            <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="basePrice">基準售價</Label>
          <Input
            id="basePrice"
            name="basePrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue={state.values.basePrice}
          />
          {state.fieldErrors.basePrice ? (
            <p className="text-sm text-destructive">{state.fieldErrors.basePrice}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lowStockThreshold">低庫存門檻</Label>
          <Input
            id="lowStockThreshold"
            name="lowStockThreshold"
            type="number"
            step="0.001"
            min="0"
            defaultValue={state.values.lowStockThreshold}
          />
          {state.fieldErrors.lowStockThreshold ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.lowStockThreshold}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit">單位</Label>
          <Input id="unit" name="unit" value="g" readOnly />
          <p className="text-sm text-muted-foreground">
            目前系統固定以公克為單位，後續若有多單位需求再擴充。
          </p>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>平均成本</Label>
          <div className="rounded-[1.5rem] border border-border/70 bg-card/72 px-4 py-3.5 text-sm leading-6 text-muted-foreground shadow-sm">
            平均成本會依進貨紀錄自動更新，建立藥材時不需要手動輸入。
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <SubmitButton pendingLabel={pendingLabel}>{submitLabel}</SubmitButton>
      </div>
    </form>
  )
}