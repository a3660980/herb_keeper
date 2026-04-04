"use client"

import { useActionState, useEffect, useEffectEvent, useState } from "react"

import { FormMessage } from "@/components/app/form-message"
import { SubmitButton } from "@/components/app/submit-button"
import { QuickCreateProductUnitSheet } from "@/components/products/quick-create-product-unit-sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ProductFormState, ProductUnitRecord } from "@/lib/features/products"

type ProductFormProps = {
  action: (
    state: ProductFormState,
    formData: FormData
  ) => Promise<ProductFormState>
  initialState: ProductFormState
  units: ProductUnitRecord[]
  submitLabel: string
  pendingLabel: string
}

const selectClassName =
  "flex h-11 w-full rounded-[1.15rem] border border-border/70 bg-background/78 px-4 py-2 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] outline-none transition-[color,box-shadow,background-color,border-color] focus-visible:border-primary/30 focus-visible:ring-4 focus-visible:ring-ring/15 sm:text-sm"

export function ProductForm({
  action,
  initialState,
  units,
  submitLabel,
  pendingLabel,
}: ProductFormProps) {
  const [state, formAction] = useActionState(action, initialState)
  const [unitOptions, setUnitOptions] = useState(units)
  const [selectedUnit, setSelectedUnit] = useState(state.values.unit)
  const syncSelectedUnit = useEffectEvent((nextUnit: string) => {
    setSelectedUnit(nextUnit)
  })

  useEffect(() => {
    setUnitOptions(units)
  }, [units])

  useEffect(() => {
    syncSelectedUnit(state.values.unit)
  }, [state.values.unit])

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
          <div className="flex flex-col gap-2 md:flex-row">
            <select
              id="unit"
              name="unit"
              value={selectedUnit}
              className={selectClassName}
              onChange={(event) => {
                setSelectedUnit(event.target.value)
              }}
            >
              <option value="">請選擇單位</option>
              {unitOptions.map((unit) => (
                <option key={unit.id} value={unit.name}>
                  {unit.name}
                </option>
              ))}
            </select>
            <QuickCreateProductUnitSheet
              onCreated={(unit) => {
                setUnitOptions((current) => {
                  const nextUnits = [...current.filter((item) => item.id !== unit.id), unit]

                  nextUnits.sort((left, right) =>
                    left.name.localeCompare(right.name, "zh-Hant")
                  )

                  return nextUnits
                })
                setSelectedUnit(unit.name)
              }}
              triggerClassName="self-start md:shrink-0"
            />
          </div>
          {state.fieldErrors.unit ? (
            <p className="text-sm text-destructive">{state.fieldErrors.unit}</p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            常用單位可直接選擇，若現場需要新的單位，也可以在這裡即時新增。
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