"use client"

import { useActionState, useEffect, useEffectEvent, useRef, useState } from "react"

import { FormMessage } from "@/components/app/form-message"
import { SubmitButton } from "@/components/app/submit-button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency, formatQuantity } from "@/lib/format"
import {
  calculateInventoryDisposalAmount,
  calculateInventoryRemainingStock,
  inventoryDisposalReasonLabels,
  inventoryDisposalReasonOptions,
  type InventoryDisposalFormState,
  type InventoryDisposalProductOption,
  type InventoryDisposalReason,
} from "@/lib/features/inventory-disposals"
import { cn } from "@/lib/utils"

type InventoryDisposalFormProps = {
  action: (
    state: InventoryDisposalFormState,
    formData: FormData
  ) => Promise<InventoryDisposalFormState>
  initialState: InventoryDisposalFormState
  products: InventoryDisposalProductOption[]
  submitLabel: string
  pendingLabel: string
}

const selectClassName =
  "flex h-11 w-full rounded-[1.15rem] border border-border/70 bg-background/78 px-4 py-2 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] outline-none transition-[color,box-shadow,background-color,border-color] focus-visible:border-primary/30 focus-visible:ring-4 focus-visible:ring-ring/15 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/15 sm:text-sm"

export function InventoryDisposalForm({
  action,
  initialState,
  products,
  submitLabel,
  pendingLabel,
}: InventoryDisposalFormProps) {
  const [state, formAction] = useActionState(action, initialState)
  const [values, setValues] = useState(state.values)
  const timezoneOffsetRef = useRef<HTMLInputElement>(null)
  const syncValuesFromAction = useEffectEvent((nextValues: typeof state.values) => {
    setValues(nextValues)
  })

  useEffect(() => {
    syncValuesFromAction(state.values)
  }, [state.values])

  function findProduct(productId: string) {
    return products.find((product) => product.id === productId)
  }

  const payload = JSON.stringify(values)
  const selectedProduct = findProduct(values.productId)
  const projectedLoss =
    calculateInventoryDisposalAmount(values.quantity, selectedProduct?.avgUnitCost ?? null) ?? 0
  const remainingStock = selectedProduct
    ? calculateInventoryRemainingStock(selectedProduct.availableStock, values.quantity)
    : null
  const exceedsStock = remainingStock !== null && remainingStock < 0
  const productSelectOptions: SearchableSelectOption[] = products.map((product) => ({
    value: product.id,
    label: product.name,
    searchText: product.name,
    secondaryText: `帳面庫存 ${formatQuantity(product.availableStock)} ${product.unit} / 平均成本 ${formatCurrency(product.avgUnitCost)}`,
  }))

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

      <div className="grid gap-3 md:grid-cols-4">
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
          <p className="mt-1.5 text-xs text-muted-foreground">減損會沿用當下平均成本做成本快照。</p>
        </div>

        <div className="rounded-[1.15rem] border border-amber-300/60 bg-amber-50/80 px-4 py-3 shadow-sm">
          <div className="text-xs font-medium tracking-[0.08em] text-muted-foreground">
            預估損失成本
          </div>
          <div className="mt-2 text-[1.75rem] leading-none font-semibold text-foreground">
            {formatCurrency(projectedLoss)}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">以目前平均成本乘上減損數量估算。</p>
        </div>

        <div
          className={cn(
            "rounded-[1.15rem] border px-4 py-3 shadow-sm",
            exceedsStock
              ? "border-destructive/30 bg-destructive/8"
              : "border-emerald-300/60 bg-emerald-50/75"
          )}
        >
          <div className="text-xs font-medium tracking-[0.08em] text-muted-foreground">
            減損後帳面庫存
          </div>
          <div className="mt-2 flex items-end gap-2">
            <div className="text-[1.75rem] leading-none font-semibold text-foreground">
              {remainingStock === null ? "-" : formatQuantity(remainingStock)}
            </div>
            <div className="pb-0.5 text-sm text-muted-foreground">
              {selectedProduct ? selectedProduct.unit : "請先選藥材"}
            </div>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {exceedsStock ? "減損數量超過目前庫存，送出前請先修正。" : "送出後會同步扣減帳面庫存。"}
          </p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="productId">藥材</Label>
            {selectedProduct?.isLowStock ? <Badge variant="destructive">低庫存</Badge> : null}
          </div>
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

        <div className="space-y-2">
          <Label htmlFor="quantity">減損數量</Label>
          <Input
            id="quantity"
            type="number"
            step="0.001"
            min="0.001"
            value={values.quantity}
            onChange={(event) => {
              setValues((current) => ({
                ...current,
                quantity: event.target.value,
              }))
            }}
          />
          <p className="min-h-6 text-sm text-muted-foreground">
            {selectedProduct ? `單位：${selectedProduct.unit}` : "請先選擇藥材以確認單位"}
          </p>
          {state.fieldErrors.quantity ? (
            <p className="text-sm text-destructive">{state.fieldErrors.quantity}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">減損原因</Label>
          <select
            id="reason"
            value={values.reason}
            aria-invalid={Boolean(state.fieldErrors.reason) || undefined}
            className={selectClassName}
            onChange={(event) => {
              const nextReason = event.target.value
              const resolvedReason = inventoryDisposalReasonOptions.includes(
                nextReason as InventoryDisposalReason
              )
                ? (nextReason as InventoryDisposalReason)
                : ""

              setValues((current) => ({
                ...current,
                reason: resolvedReason,
              }))
            }}
          >
            <option value="">請選擇減損原因</option>
            {inventoryDisposalReasonOptions.map((reason) => (
              <option key={reason} value={reason}>
                {inventoryDisposalReasonLabels[reason]}
              </option>
            ))}
          </select>
          <p className="min-h-6 text-sm text-muted-foreground">用來區分天災、品質毀損或退回等非銷售性減量。</p>
          {state.fieldErrors.reason ? (
            <p className="text-sm text-destructive">{state.fieldErrors.reason}</p>
          ) : null}
        </div>

        <div className="grid content-start gap-2 md:col-span-2">
          <Label htmlFor="occurredAt">減損時間</Label>
          <Input
            id="occurredAt"
            type="datetime-local"
            value={values.occurredAt}
            onChange={(event) => {
              setValues((current) => ({
                ...current,
                occurredAt: event.target.value,
              }))
            }}
          />
          <p className="min-h-6 text-sm text-muted-foreground">建議保留實際發生時間，方便回查庫存異常與損耗原因。</p>
          {state.fieldErrors.occurredAt ? (
            <p className="text-sm text-destructive">{state.fieldErrors.occurredAt}</p>
          ) : null}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="note">備註</Label>
          <Textarea
            id="note"
            value={values.note}
            onChange={(event) => {
              setValues((current) => ({
                ...current,
                note: event.target.value,
              }))
            }}
            placeholder="例如：受潮退回、倉庫漏水、蟲蛀報廢..."
          />
          <p className="min-h-6 text-sm text-muted-foreground">可補充批次、事故背景或退貨來源，方便後續稽核。</p>
          {state.fieldErrors.note ? (
            <p className="text-sm text-destructive">{state.fieldErrors.note}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
        <p className="text-sm text-muted-foreground">減損建立後會保留歷史紀錄，並立即反映在藥材庫存管理模組與藥材詳情。</p>
        <SubmitButton pendingLabel={pendingLabel}>{submitLabel}</SubmitButton>
      </div>
    </form>
  )
}