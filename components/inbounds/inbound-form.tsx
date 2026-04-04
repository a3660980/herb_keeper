"use client"

import { useActionState, useEffect, useEffectEvent, useRef, useState } from "react"

import { FormMessage } from "@/components/app/form-message"
import { SubmitButton } from "@/components/app/submit-button"
import { QuickCreateSupplierSheet } from "@/components/suppliers/quick-create-supplier-sheet"
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency, formatQuantity } from "@/lib/format"
import type {
  InboundFormState,
  InboundProductOption,
  InboundSupplierOption,
} from "@/lib/features/inbounds"
import {
  calculateInboundTotalCost,
  calculateInboundUnitCost,
  formatInboundCurrencyInput,
} from "@/lib/features/inbounds"

type InboundFormProps = {
  action: (
    state: InboundFormState,
    formData: FormData
  ) => Promise<InboundFormState>
  initialState: InboundFormState
  products: InboundProductOption[]
  suppliers: InboundSupplierOption[]
  submitLabel: string
  pendingLabel: string
}

export function InboundForm({
  action,
  initialState,
  products,
  suppliers,
  submitLabel,
  pendingLabel,
}: InboundFormProps) {
  const [state, formAction] = useActionState(action, initialState)
  const [values, setValues] = useState(state.values)
  const [supplierOptions, setSupplierOptions] = useState(suppliers)
  const [costBasis, setCostBasis] = useState<"unitCost" | "totalCost">("unitCost")
  const timezoneOffsetRef = useRef<HTMLInputElement>(null)
  const syncValuesFromAction = useEffectEvent((nextValues: typeof state.values) => {
    setValues(nextValues)
  })
  const syncSupplierOptions = useEffectEvent((nextSuppliers: InboundSupplierOption[]) => {
    setSupplierOptions(nextSuppliers)
  })

  useEffect(() => {
    syncValuesFromAction(state.values)
  }, [state.values])

  useEffect(() => {
    syncSupplierOptions(suppliers)
  }, [suppliers])

  function findProduct(productId: string) {
    return products.find((product) => product.id === productId)
  }

  function syncTotalCost(quantity: string, unitCost: string) {
    const nextTotalCost = calculateInboundTotalCost(quantity, unitCost)

    setValues((current) => ({
      ...current,
      totalCost: formatInboundCurrencyInput(nextTotalCost),
    }))
  }

  function syncUnitCost(quantity: string, totalCost: string) {
    const nextUnitCost = calculateInboundUnitCost(quantity, totalCost)

    setValues((current) => ({
      ...current,
      unitCost: formatInboundCurrencyInput(nextUnitCost),
    }))
  }

  const payload = JSON.stringify(values)
  const selectedProduct = findProduct(values.productId)
  const enteredTotalCost =
    values.totalCost.trim().length > 0 && Number.isFinite(Number(values.totalCost))
      ? Number(values.totalCost)
      : null
  const inboundTotal = enteredTotalCost ?? calculateInboundTotalCost(values.quantity, values.unitCost) ?? 0
  const quantityValue = Number(values.quantity)
  const totalCostValue = Number(values.totalCost)
  const hasRoundedDerivedUnitCost =
    costBasis === "totalCost" &&
    Number.isFinite(quantityValue) &&
    quantityValue > 0 &&
    Number.isFinite(totalCostValue) &&
    Math.abs(totalCostValue / quantityValue - Number((totalCostValue / quantityValue).toFixed(2))) >
      0.000001
  const productSelectOptions: SearchableSelectOption[] = products.map((product) => ({
    value: product.id,
    label: product.name,
    searchText: product.name,
    secondaryText: `庫存 ${formatQuantity(product.availableStock)} ${product.unit} / 平均成本 ${formatCurrency(product.avgUnitCost)}`,
  }))
  const supplierSelectOptions: SearchableSelectOption[] = supplierOptions.map((supplier) => ({
    value: supplier.id,
    label: supplier.name,
    searchText: `${supplier.name} ${supplier.phone} ${supplier.address}`,
    secondaryText: supplier.phone || supplier.address || "未填聯絡資訊",
  }))

  function handleSupplierCreated(supplier: InboundSupplierOption) {
    setSupplierOptions((current) => {
      const nextSuppliers = [...current.filter((item) => item.id !== supplier.id), supplier]

      nextSuppliers.sort((left, right) => left.name.localeCompare(right.name, "zh-Hant"))

      return nextSuppliers
    })
    setValues((current) => ({
      ...current,
      supplierId: supplier.id,
    }))
  }

  return (
    <form
      action={formAction}
      className="space-y-6"
      onSubmit={() => {
        if (timezoneOffsetRef.current) {
          timezoneOffsetRef.current.value = String(new Date().getTimezoneOffset())
        }
      }}
    >
      {state.message ? <FormMessage message={state.message} tone="error" /> : null}

      <input type="hidden" name="payload" value={payload} />
      <input ref={timezoneOffsetRef} type="hidden" name="timezoneOffsetMinutes" defaultValue="0" />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[1.15rem] border border-border/70 bg-background/72 px-4 py-3 shadow-sm">
          <div className="text-xs font-medium tracking-[0.08em] text-muted-foreground">
            目前帳面庫存
          </div>
          <div className="mt-2 flex items-end gap-2">
            <div className="text-[1.75rem] leading-none font-semibold text-foreground">
              {selectedProduct ? formatQuantity(selectedProduct.availableStock) : "-"}
            </div>
            <div className="pb-0.5 text-sm text-muted-foreground">
              {selectedProduct ? selectedProduct.unit : "請先選藥材"}
            </div>
          </div>
        </div>

        <div className="rounded-[1.15rem] border border-border/70 bg-background/72 px-4 py-3 shadow-sm">
          <div className="text-xs font-medium tracking-[0.08em] text-muted-foreground">
            目前平均成本
          </div>
          <div className="mt-2 text-[1.75rem] leading-none font-semibold text-foreground">
            {selectedProduct ? formatCurrency(selectedProduct.avgUnitCost) : "-"}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">進貨後會依新成本自動重算</p>
        </div>

        <div className="rounded-[1.15rem] border border-primary/18 bg-primary/8 px-4 py-3 shadow-sm">
          <div className="text-xs font-medium tracking-[0.08em] text-muted-foreground">
            本次進貨總額
          </div>
          <div className="mt-2 text-[1.75rem] leading-none font-semibold text-foreground">
            {formatCurrency(inboundTotal)}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">可填總價或單價，另一欄會自動換算</p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="productId">藥材</Label>
          <SearchableSelect
            id="productId"
            value={values.productId}
            options={productSelectOptions}
            placeholder="請選擇藥材"
            searchPlaceholder="搜尋藥材名稱"
            emptyMessage="找不到符合的藥材"
            clearLabel="清除藥材"
            ariaLabel="藥材"
            invalid={Boolean(state.fieldErrors.productId)}
            onValueChange={(nextProductId) => {
              setValues((current) => ({
                ...current,
                productId: nextProductId,
              }))
            }}
          />
          {state.fieldErrors.productId ? (
            <p className="text-sm text-destructive">{state.fieldErrors.productId}</p>
          ) : null}
        </div>

        <div className="space-y-2 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Label htmlFor="supplierId">供應商</Label>
            <QuickCreateSupplierSheet onCreated={handleSupplierCreated} />
          </div>
          <SearchableSelect
            id="supplierId"
            value={values.supplierId}
            options={supplierSelectOptions}
            placeholder="請選擇供應商"
            searchPlaceholder="搜尋供應商名稱、電話或地址"
            emptyMessage="找不到符合的供應商"
            clearLabel="清除供應商"
            ariaLabel="供應商"
            invalid={Boolean(state.fieldErrors.supplierId)}
            onValueChange={(nextSupplierId) => {
              setValues((current) => ({
                ...current,
                supplierId: nextSupplierId,
              }))
            }}
          />
          {state.fieldErrors.supplierId ? (
            <p className="text-sm text-destructive">{state.fieldErrors.supplierId}</p>
          ) : null}
          {supplierOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              目前還沒有供應商，先用右上角抽屜快速建立第一筆。
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">進貨數量</Label>
          <Input
            id="quantity"
            type="number"
            step="0.001"
            min="0.001"
            value={values.quantity}
            onChange={(event) => {
              const nextQuantity = event.target.value

              setValues((current) => ({
                ...current,
                quantity: nextQuantity,
              }))

              if (costBasis === "totalCost") {
                syncUnitCost(nextQuantity, values.totalCost)
                return
              }

              syncTotalCost(nextQuantity, values.unitCost)
            }}
          />
          <p className="min-h-6 text-sm text-muted-foreground">
            {selectedProduct ? `單位：${selectedProduct.unit}` : "請先選擇藥材以確認單位"}
          </p>
          {state.fieldErrors.quantity ? (
            <p className="text-sm text-destructive">{state.fieldErrors.quantity}</p>
          ) : null}
        </div>

        <div className="grid content-start gap-2">
          <Label htmlFor="inboundDate">進貨時間</Label>
          <Input
            id="inboundDate"
            type="datetime-local"
            value={values.inboundDate}
            onChange={(event) => {
              setValues((current) => ({
                ...current,
                inboundDate: event.target.value,
              }))
            }}
          />
          <p className="min-h-6 text-sm text-muted-foreground">建議保留實際到貨時間，方便後續查單與比對採購紀錄。</p>
          {state.fieldErrors.inboundDate ? (
            <p className="text-sm text-destructive">{state.fieldErrors.inboundDate}</p>
          ) : null}
        </div>

        <div className="grid content-start gap-2">
          <Label htmlFor="unitCost">進貨單價</Label>
          <Input
            id="unitCost"
            type="number"
            step="0.01"
            min="0"
            value={values.unitCost}
            onChange={(event) => {
              const nextUnitCost = event.target.value

              setCostBasis("unitCost")
              setValues((current) => ({
                ...current,
                unitCost: nextUnitCost,
              }))

              syncTotalCost(values.quantity, nextUnitCost)
            }}
          />
          <div className="min-h-6 flex items-center">
            <Badge variant={costBasis === "unitCost" ? "secondary" : "outline"}>
              {costBasis === "unitCost" ? "目前以單價為主" : "由總價自動回算"}
            </Badge>
          </div>
          <p className="min-h-6 text-sm text-muted-foreground">
            建議填每 {selectedProduct?.unit ?? "單位"} 的實際進貨成本。
          </p>
          {state.fieldErrors.unitCost ? (
            <p className="text-sm text-destructive">{state.fieldErrors.unitCost}</p>
          ) : null}
        </div>

        <div className="grid content-start gap-2">
          <Label htmlFor="totalCost">進貨總價</Label>
          <Input
            id="totalCost"
            type="number"
            step="0.01"
            min="0"
            value={values.totalCost}
            onChange={(event) => {
              const nextTotalCost = event.target.value

              setCostBasis("totalCost")
              setValues((current) => ({
                ...current,
                totalCost: nextTotalCost,
              }))

              syncUnitCost(values.quantity, nextTotalCost)
            }}
          />
          <div className="min-h-6 flex items-center">
            <Badge variant={costBasis === "totalCost" ? "secondary" : "outline"}>
              {costBasis === "totalCost" ? "目前以總價為主" : "由單價自動回算"}
            </Badge>
          </div>
          <p className="min-h-6 text-sm text-muted-foreground">
            若手邊只有整筆採購金額，可直接填總價，由系統回算單價。
          </p>
          {state.fieldErrors.totalCost ? (
            <p className="text-sm text-destructive">{state.fieldErrors.totalCost}</p>
          ) : null}
        </div>

        {hasRoundedDerivedUnitCost ? (
          <div className="rounded-[1.15rem] border border-border/70 bg-background/72 px-4 py-3 text-sm text-muted-foreground md:col-span-2">
            因進貨總價除以數量後無法整除，系統顯示的回算單價已四捨五入到小數第 2 位；實際送出仍以你輸入的總價為主。
          </div>
        ) : null}

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="note">備註</Label>
          <Textarea
            id="note"
            value={values.note}
            placeholder="例如：補常備藥、臨時急件、成本波動備註。"
            onChange={(event) => {
              setValues((current) => ({
                ...current,
                note: event.target.value,
              }))
            }}
          />
          <p className="text-sm text-muted-foreground">
            備註可記錄單據號碼、批號或成本波動原因，方便後續追查採購來源。
          </p>
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