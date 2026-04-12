"use client"

import {
  useActionState,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react"

import { ConfirmActionButton } from "@/components/app/confirm-action-button"
import { FormMessage } from "@/components/app/form-message"
import { SubmitButton } from "@/components/app/submit-button"
import { QuickCreateSupplierSheet } from "@/components/suppliers/quick-create-supplier-sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency, formatQuantity } from "@/lib/format"
import type {
  InboundBatchFormState,
  InboundProductOption,
  InboundSupplierOption,
} from "@/lib/features/inbounds"
import {
  calculateInboundTotalCost,
  calculateInboundUnitCost,
  createInboundBatchLineFormValue,
  formatInboundCurrencyInput,
} from "@/lib/features/inbounds"
import { cn } from "@/lib/utils"

type BatchInboundFormProps = {
  action: (
    state: InboundBatchFormState,
    formData: FormData
  ) => Promise<InboundBatchFormState>
  initialState: InboundBatchFormState
  products: InboundProductOption[]
  suppliers: InboundSupplierOption[]
  submitLabel: string
  pendingLabel: string
}

type CostBasis = "unitCost" | "totalCost"

export function BatchInboundForm({
  action,
  initialState,
  products,
  suppliers,
  submitLabel,
  pendingLabel,
}: BatchInboundFormProps) {
  const [state, formAction] = useActionState(action, initialState)
  const [values, setValues] = useState(state.values)
  const [supplierOptions, setSupplierOptions] = useState(suppliers)
  const [costBasisByLine, setCostBasisByLine] = useState<
    Record<string, CostBasis>
  >(() =>
    Object.fromEntries(
      state.values.items.map((item) => [
        item.id,
        item.totalCost.trim() && !item.unitCost.trim()
          ? "totalCost"
          : "unitCost",
      ])
    )
  )
  const timezoneOffsetRef = useRef<HTMLInputElement>(null)
  const itemsScrollAreaRef = useRef<HTMLDivElement>(null)
  const previousItemCountRef = useRef(state.values.items.length)
  const syncValuesFromAction = useEffectEvent(
    (nextValues: typeof state.values) => {
      setValues(nextValues)
    }
  )
  const syncSupplierOptions = useEffectEvent(
    (nextSuppliers: InboundSupplierOption[]) => {
      setSupplierOptions(nextSuppliers)
    }
  )

  useEffect(() => {
    syncValuesFromAction(state.values)
  }, [state.values])

  useEffect(() => {
    syncSupplierOptions(suppliers)
  }, [suppliers])

  useEffect(() => {
    const previousItemCount = previousItemCountRef.current
    previousItemCountRef.current = values.items.length

    if (values.items.length <= previousItemCount) {
      return
    }

    const scrollArea = itemsScrollAreaRef.current

    if (!scrollArea) {
      return
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    const animationFrameId = window.requestAnimationFrame(() => {
      scrollArea.scrollTo({
        top: scrollArea.scrollHeight,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      })
    })

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [values.items.length])

  function findProduct(productId: string) {
    return products.find((product) => product.id === productId)
  }

  function updateLine(
    lineId: string,
    updater: (
      line: (typeof values.items)[number]
    ) => (typeof values.items)[number]
  ) {
    setValues((current) => ({
      ...current,
      items: current.items.map((line) =>
        line.id === lineId ? updater(line) : line
      ),
    }))
  }

  function syncLineTotalCost(
    lineId: string,
    quantity: string,
    unitCost: string
  ) {
    const nextTotalCost = calculateInboundTotalCost(quantity, unitCost)

    updateLine(lineId, (line) => ({
      ...line,
      totalCost: formatInboundCurrencyInput(nextTotalCost),
    }))
  }

  function syncLineUnitCost(
    lineId: string,
    quantity: string,
    totalCost: string
  ) {
    const nextUnitCost = calculateInboundUnitCost(quantity, totalCost)

    updateLine(lineId, (line) => ({
      ...line,
      unitCost: formatInboundCurrencyInput(nextUnitCost),
    }))
  }

  function handleSupplierCreated(supplier: InboundSupplierOption) {
    setSupplierOptions((current) => {
      const nextSuppliers = [
        ...current.filter((item) => item.id !== supplier.id),
        supplier,
      ]

      nextSuppliers.sort((left, right) =>
        left.name.localeCompare(right.name, "zh-Hant")
      )

      return nextSuppliers
    })
    setValues((current) => ({
      ...current,
      supplierId: supplier.id,
    }))
  }

  const payload = JSON.stringify(values)
  const supplierSelectOptions: SearchableSelectOption[] = supplierOptions.map(
    (supplier) => ({
      value: supplier.id,
      label: supplier.name,
      searchText: `${supplier.name} ${supplier.phone} ${supplier.address}`,
      secondaryText: supplier.phone || supplier.address || "未填聯絡資訊",
    })
  )
  const selectedSupplier = supplierOptions.find(
    (supplier) => supplier.id === values.supplierId
  )
  const totalAmount = values.items.reduce((sum, item) => {
    const enteredTotalCost =
      item.totalCost.trim().length > 0 &&
      Number.isFinite(Number(item.totalCost))
        ? Number(item.totalCost)
        : null

    return (
      sum +
      (enteredTotalCost ??
        calculateInboundTotalCost(item.quantity, item.unitCost) ??
        0)
    )
  }, 0)
  const canRemoveItems = values.items.length > 1

  return (
    <form
      action={formAction}
      className="space-y-6"
      onSubmit={() => {
        if (timezoneOffsetRef.current) {
          timezoneOffsetRef.current.value = String(
            new Date().getTimezoneOffset()
          )
        }
      }}
    >
      {state.message ? (
        <FormMessage message={state.message} tone="error" />
      ) : null}

      <input type="hidden" name="payload" value={payload} />
      <input
        ref={timezoneOffsetRef}
        type="hidden"
        name="timezoneOffsetMinutes"
        defaultValue="0"
      />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[1.15rem] border border-border/70 bg-background/72 px-4 py-3 shadow-sm">
          <div className="text-xs font-medium tracking-[0.08em] text-muted-foreground">
            本次供應商
          </div>
          <div className="mt-2 text-[1.4rem] leading-none font-semibold text-foreground">
            {selectedSupplier?.name ?? "尚未選擇"}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            同一批次會共用供應商與到貨時間
          </p>
        </div>

        <div className="rounded-[1.15rem] border border-border/70 bg-background/72 px-4 py-3 shadow-sm">
          <div className="text-xs font-medium tracking-[0.08em] text-muted-foreground">
            進貨明細數
          </div>
          <div className="mt-2 text-[1.75rem] leading-none font-semibold text-foreground">
            {values.items.length}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            每列對應一種藥材，避免重複品項
          </p>
        </div>

        <div className="rounded-[1.15rem] border border-primary/18 bg-primary/8 px-4 py-3 shadow-sm">
          <div className="text-xs font-medium tracking-[0.08em] text-muted-foreground">
            批次採購總額
          </div>
          <div className="mt-2 text-[1.75rem] leading-none font-semibold text-foreground">
            {formatCurrency(totalAmount)}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            每列可填單價或總價，系統會自動換算
          </p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
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
            <p className="text-sm text-destructive">
              {state.fieldErrors.supplierId}
            </p>
          ) : null}
          {supplierOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              目前還沒有供應商，先用右上角抽屜快速建立第一筆。
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="inboundDate">到貨時間</Label>
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
          <p className="min-h-6 text-sm text-muted-foreground">
            同批次所有藥材會套用相同到貨時間。
          </p>
          {state.fieldErrors.inboundDate ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.inboundDate}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="note">批次備註</Label>
          <Textarea
            id="note"
            value={values.note}
            placeholder="例如：同一張採購單、同批到貨、含運費已折入單價。"
            onChange={(event) => {
              setValues((current) => ({
                ...current,
                note: event.target.value,
              }))
            }}
          />
          {state.fieldErrors.note ? (
            <p className="text-sm text-destructive">{state.fieldErrors.note}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-foreground">進貨明細</div>
            <p className="text-sm text-muted-foreground">
              一家供應商可一次建立多個藥材品項，送出時會以同一批次寫入。
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setValues((current) => ({
                ...current,
                items: [...current.items, createInboundBatchLineFormValue()],
              }))
            }}
          >
            新增一列
          </Button>
        </div>

        {state.fieldErrors.items ? (
          <FormMessage message={state.fieldErrors.items} tone="error" />
        ) : null}

        <div className="overflow-hidden rounded-[1.35rem] border border-border/70 bg-card/55">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-background/72 px-4 py-3">
            <div className="text-xs font-medium tracking-[0.08em] text-muted-foreground">
              共 {values.items.length} 筆明細
            </div>
            <div className="text-xs text-muted-foreground">
              新增列後只會在這個區塊內捲動
            </div>
          </div>

          <div
            ref={itemsScrollAreaRef}
            data-testid="batch-inbound-lines-scroll-area"
            className="content-scrollbar max-h-[34rem] overflow-y-auto"
          >
            {values.items.map((line, index) => {
              const product = findProduct(line.productId)
              const lineErrors = state.itemErrors[line.id] ?? {}
              const lineNumber = index + 1
              const costBasis = costBasisByLine[line.id] ?? "unitCost"
              const selectedProductIds = new Set(
                values.items
                  .filter((item) => item.id !== line.id && item.productId)
                  .map((item) => item.productId)
              )
              const availableProductOptions: SearchableSelectOption[] = products
                .filter(
                  (productOption) => !selectedProductIds.has(productOption.id)
                )
                .map((productOption) => ({
                  value: productOption.id,
                  label: productOption.name,
                  searchText: productOption.name,
                  secondaryText: `庫存 ${formatQuantity(productOption.availableStock)} ${productOption.unit} / 平均成本 ${formatCurrency(productOption.avgUnitCost)}`,
                }))
              const enteredTotalCost =
                line.totalCost.trim().length > 0 &&
                Number.isFinite(Number(line.totalCost))
                  ? Number(line.totalCost)
                  : null
              const lineTotal =
                enteredTotalCost ??
                calculateInboundTotalCost(line.quantity, line.unitCost) ??
                0
              const quantityValue = Number(line.quantity)
              const totalCostValue = Number(line.totalCost)
              const hasRoundedDerivedUnitCost =
                costBasis === "totalCost" &&
                Number.isFinite(quantityValue) &&
                quantityValue > 0 &&
                Number.isFinite(totalCostValue) &&
                Math.abs(
                  totalCostValue / quantityValue -
                    Number((totalCostValue / quantityValue).toFixed(2))
                ) > 0.000001

              return (
                <div
                  key={line.id}
                  data-testid="batch-inbound-line"
                  className={cn(
                    "px-4 py-4 sm:px-5",
                    index > 0 && "border-t border-border/60"
                  )}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-full border border-border/70 bg-background text-xs font-semibold text-foreground">
                        {lineNumber}
                      </span>
                      <div className="text-sm font-medium text-foreground">
                        進貨明細
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        小計 {formatCurrency(lineTotal)}
                      </Badge>
                      {canRemoveItems ? (
                        <ConfirmActionButton
                          size="xs"
                          variant="ghost"
                          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:border-destructive/30 focus-visible:ring-destructive/15"
                          dialogTitle={`確認移除第 ${lineNumber} 筆進貨明細`}
                          dialogDescription="這筆尚未送出的進貨明細會從表單中移除，確定要繼續嗎？"
                          confirmLabel="確認移除"
                          onConfirm={() => {
                            setValues((current) => ({
                              ...current,
                              items: current.items.filter(
                                (item) => item.id !== line.id
                              ),
                            }))
                          }}
                        >
                          移除
                        </ConfirmActionButton>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_10rem_10rem_10rem] lg:items-start">
                    <div className="space-y-2">
                      <Label>藥材</Label>
                      <SearchableSelect
                        ariaLabel={`批次進貨明細 ${lineNumber} 藥材`}
                        value={line.productId}
                        options={availableProductOptions}
                        placeholder="請選擇藥材"
                        searchPlaceholder="搜尋藥材名稱"
                        emptyMessage="找不到符合的藥材"
                        clearLabel="清除藥材"
                        invalid={Boolean(lineErrors.productId)}
                        onValueChange={(nextProductId) => {
                          updateLine(line.id, (currentLine) => ({
                            ...currentLine,
                            productId: nextProductId,
                          }))
                        }}
                      />
                      {lineErrors.productId ? (
                        <p className="text-sm text-destructive">
                          {lineErrors.productId}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <Label>進貨數量</Label>
                      <Input
                        aria-label={`批次進貨明細 ${lineNumber} 進貨數量`}
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={line.quantity}
                        onChange={(event) => {
                          const nextQuantity = event.target.value

                          updateLine(line.id, (currentLine) => ({
                            ...currentLine,
                            quantity: nextQuantity,
                          }))

                          if (costBasis === "totalCost") {
                            syncLineUnitCost(
                              line.id,
                              nextQuantity,
                              line.totalCost
                            )
                            return
                          }

                          syncLineTotalCost(
                            line.id,
                            nextQuantity,
                            line.unitCost
                          )
                        }}
                      />
                      {lineErrors.quantity ? (
                        <p className="text-sm text-destructive">
                          {lineErrors.quantity}
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        {product ? `單位 ${product.unit}` : "請先選擇藥材"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>進貨單價</Label>
                      <Input
                        aria-label={`批次進貨明細 ${lineNumber} 進貨單價`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitCost}
                        onChange={(event) => {
                          const nextUnitCost = event.target.value

                          setCostBasisByLine((current) => ({
                            ...current,
                            [line.id]: "unitCost",
                          }))
                          updateLine(line.id, (currentLine) => ({
                            ...currentLine,
                            unitCost: nextUnitCost,
                          }))
                          syncLineTotalCost(
                            line.id,
                            line.quantity,
                            nextUnitCost
                          )
                        }}
                      />
                      {lineErrors.unitCost ? (
                        <p className="text-sm text-destructive">
                          {lineErrors.unitCost}
                        </p>
                      ) : null}
                      <div className="flex min-h-6 items-center">
                        <Badge
                          variant={
                            costBasis === "unitCost" ? "secondary" : "outline"
                          }
                        >
                          {costBasis === "unitCost"
                            ? "目前以單價為主"
                            : "由總價自動回算"}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>進貨總價</Label>
                      <Input
                        aria-label={`批次進貨明細 ${lineNumber} 進貨總價`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.totalCost}
                        onChange={(event) => {
                          const nextTotalCost = event.target.value

                          setCostBasisByLine((current) => ({
                            ...current,
                            [line.id]: "totalCost",
                          }))
                          updateLine(line.id, (currentLine) => ({
                            ...currentLine,
                            totalCost: nextTotalCost,
                          }))
                          syncLineUnitCost(
                            line.id,
                            line.quantity,
                            nextTotalCost
                          )
                        }}
                      />
                      {lineErrors.totalCost ? (
                        <p className="text-sm text-destructive">
                          {lineErrors.totalCost}
                        </p>
                      ) : null}
                      <div className="flex min-h-6 items-center">
                        <Badge
                          variant={
                            costBasis === "totalCost" ? "secondary" : "outline"
                          }
                        >
                          {costBasis === "totalCost"
                            ? "目前以總價為主"
                            : "由單價自動回算"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {product ? (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">
                        目前庫存 {formatQuantity(product.availableStock)}{" "}
                        {product.unit}
                      </Badge>
                      <Badge variant="outline">
                        平均成本 {formatCurrency(product.avgUnitCost)}
                      </Badge>
                      <Badge variant="secondary">
                        建議售價 {formatCurrency(product.basePrice)}
                      </Badge>
                    </div>
                  ) : null}

                  {hasRoundedDerivedUnitCost ? (
                    <div className="mt-3 rounded-[1rem] border border-border/70 bg-background/72 px-3.5 py-2 text-xs leading-5 text-muted-foreground">
                      這列以總價回算單價時會四捨五入到小數第 2
                      位；實際送出仍以你輸入的總價為主。
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <SubmitButton pendingLabel={pendingLabel}>{submitLabel}</SubmitButton>
      </div>
    </form>
  )
}
