"use client"

import { useActionState, useEffect, useEffectEvent, useRef, useState } from "react"

import { FormMessage } from "@/components/app/form-message"
import { FormStateToast } from "@/components/app/form-state-toast"
import { SubmitButton } from "@/components/app/submit-button"
import { QuickCreateCustomerSheet } from "@/components/customers/quick-create-customer-sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency, formatDecimalInput, formatQuantity } from "@/lib/format"
import {
  createOrderLineFormValue,
  type OrderCustomerOption,
  type OrderFormState,
  type OrderProductOption,
} from "@/lib/features/orders"
import { cn } from "@/lib/utils"

type OrderFormProps = {
  action: (
    state: OrderFormState,
    formData: FormData
  ) => Promise<OrderFormState>
  initialState: OrderFormState
  customers: OrderCustomerOption[]
  products: OrderProductOption[]
  submitLabel: string
  pendingLabel: string
}

export function OrderForm({
  action,
  initialState,
  customers,
  products,
  submitLabel,
  pendingLabel,
}: OrderFormProps) {
  const [state, formAction] = useActionState(action, initialState)
  const [customerOptions, setCustomerOptions] = useState(customers)
  const [values, setValues] = useState(state.values)
  const timezoneOffsetRef = useRef<HTMLInputElement>(null)
  const itemsScrollAreaRef = useRef<HTMLDivElement>(null)
  const previousItemCountRef = useRef(state.values.items.length)
  const syncValuesFromAction = useEffectEvent((nextValues: typeof state.values) => {
    setValues(nextValues)
  })

  useEffect(() => {
    setCustomerOptions(customers)
  }, [customers])

  useEffect(() => {
    syncValuesFromAction(state.values)
  }, [state.values])

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

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
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

  function findCustomer(customerId: string) {
    return customerOptions.find((customer) => customer.id === customerId)
  }

  function findProduct(productId: string) {
    return products.find((product) => product.id === productId)
  }

  function getSuggestedUnitPrice(productId: string, customerId: string) {
    const product = findProduct(productId)

    if (!product) {
      return ""
    }

    const discountRate = findCustomer(customerId)?.discountRate ?? 1

    return formatDecimalInput(product.basePrice * discountRate)
  }

  function updateLine(
    lineId: string,
    updater: (line: (typeof values.items)[number]) => (typeof values.items)[number]
  ) {
    setValues((current) => ({
      ...current,
      items: current.items.map((line) =>
        line.id === lineId ? updater(line) : line
      ),
    }))
  }

  const payload = JSON.stringify({
    ...values,
  })
  const customerSelectOptions: SearchableSelectOption[] = customerOptions.map((customer) => ({
    value: customer.id,
    label: `${customer.name} (${customer.phone})`,
    searchText: `${customer.name} ${customer.phone}`,
    secondaryText: `折扣倍率 ${customer.discountRate}`,
  }))
  const productSelectOptions: SearchableSelectOption[] = products.map((product) => ({
    value: product.id,
    label: product.name,
    searchText: product.name,
    secondaryText: `庫存 ${formatQuantity(product.availableStock)} ${product.unit}`,
  }))
  const canRemoveItems = values.items.length > 1

  function handleCustomerCreated(customer: OrderCustomerOption) {
    setCustomerOptions((current) => {
      const nextCustomers = [...current.filter((item) => item.id !== customer.id), customer]

      nextCustomers.sort((left, right) => left.name.localeCompare(right.name, "zh-Hant"))

      return nextCustomers
    })
    setValues((current) => ({
      ...current,
      customerId: customer.id,
      items: current.items.map((item) => {
        if (!item.productId) {
          return item
        }

        const product = findProduct(item.productId)
        const previousSuggested = getSuggestedUnitPrice(item.productId, current.customerId)
        const nextSuggested = product
          ? formatDecimalInput(product.basePrice * customer.discountRate)
          : ""

        if (
          item.finalUnitPrice === "" ||
          item.finalUnitPrice === previousSuggested
        ) {
          return {
            ...item,
            finalUnitPrice: nextSuggested,
          }
        }

        return item
      }),
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
      <FormStateToast message={state.message} trigger={state} />

      <input type="hidden" name="payload" value={payload} />
      <input ref={timezoneOffsetRef} type="hidden" name="timezoneOffsetMinutes" defaultValue="0" />

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Label htmlFor="customerId">客戶</Label>
            <QuickCreateCustomerSheet onCreated={handleCustomerCreated} />
          </div>
          <SearchableSelect
            id="customerId"
            value={values.customerId}
            options={customerSelectOptions}
            placeholder="請選擇客戶"
            searchPlaceholder="搜尋客戶名稱或電話"
            emptyMessage="找不到符合的客戶"
            clearLabel="清除客戶"
            ariaLabel="客戶"
            invalid={Boolean(state.fieldErrors.customerId)}
            onValueChange={(nextCustomerId) => {
              setValues((current) => ({
                ...current,
                customerId: nextCustomerId,
                items: current.items.map((item) => {
                  if (!item.productId) {
                    return item
                  }

                  const previousSuggested = getSuggestedUnitPrice(
                    item.productId,
                    current.customerId
                  )
                  const nextSuggested = getSuggestedUnitPrice(
                    item.productId,
                    nextCustomerId
                  )

                  if (
                    item.finalUnitPrice === "" ||
                    item.finalUnitPrice === previousSuggested
                  ) {
                    return {
                      ...item,
                      finalUnitPrice: nextSuggested,
                    }
                  }

                  return item
                }),
              }))
            }}
          />
          {state.fieldErrors.customerId ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.customerId}
            </p>
          ) : null}
          {customerOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              目前還沒有客戶，先用右上角抽屜快速建立第一筆。
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="orderDate">下單時間</Label>
          <Input
            id="orderDate"
            type="datetime-local"
            value={values.orderDate}
            onChange={(event) => {
              setValues((current) => ({
                ...current,
                orderDate: event.target.value,
              }))
            }}
          />
          {state.fieldErrors.orderDate ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.orderDate}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="note">備註</Label>
          <Textarea
            id="note"
            value={values.note}
            placeholder="例如：急單、代客留貨、需分兩次出貨。"
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
            <div className="text-sm font-medium text-foreground">訂單明細</div>
            <p className="text-sm text-muted-foreground">
              選擇藥材後會帶入客戶折扣建議價，仍可手動調整成交單價。
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setValues((current) => ({
                ...current,
                items: [...current.items, createOrderLineFormValue()],
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
            <div className="text-xs text-muted-foreground">新增列後只會在這個區塊內捲動</div>
          </div>

          <div
            ref={itemsScrollAreaRef}
            data-testid="order-lines-scroll-area"
            className="content-scrollbar max-h-[30rem] overflow-y-auto"
          >
          {values.items.map((line, index) => {
            const product = findProduct(line.productId)
            const customer = findCustomer(values.customerId)
            const suggestedUnitPrice = line.productId
              ? getSuggestedUnitPrice(line.productId, values.customerId)
              : ""
            const lineErrors = state.itemErrors[line.id] ?? {}
            const lineNumber = index + 1

            return (
              <div
                key={line.id}
                data-testid="order-line"
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
                    <div className="text-sm font-medium text-foreground">訂單明細</div>
                  </div>
                  {canRemoveItems ? (
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:border-destructive/30 focus-visible:ring-destructive/15"
                      onClick={() => {
                        setValues((current) => ({
                          ...current,
                          items: current.items.filter((item) => item.id !== line.id),
                        }))
                      }}
                    >
                      移除
                    </Button>
                  ) : null}
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.65fr)_10rem_10rem] lg:items-start">
                  <div className="space-y-2">
                    <Label>藥材</Label>
                    <SearchableSelect
                      ariaLabel={`訂單明細 ${lineNumber} 藥材`}
                      value={line.productId}
                      options={productSelectOptions}
                      placeholder="請選擇藥材"
                      searchPlaceholder="搜尋藥材名稱"
                      emptyMessage="找不到符合的藥材"
                      clearLabel="清除藥材"
                      invalid={Boolean(lineErrors.productId)}
                      onValueChange={(nextProductId) => {

                        updateLine(line.id, (currentLine) => ({
                          ...currentLine,
                          productId: nextProductId,
                          finalUnitPrice: getSuggestedUnitPrice(
                            nextProductId,
                            values.customerId
                          ),
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
                    <Label>訂購數量</Label>
                    <Input
                      aria-label={`訂單明細 ${lineNumber} 訂購數量`}
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={line.orderedQuantity}
                      onChange={(event) => {
                        updateLine(line.id, (currentLine) => ({
                          ...currentLine,
                          orderedQuantity: event.target.value,
                        }))
                      }}
                    />
                    {lineErrors.orderedQuantity ? (
                      <p className="text-sm text-destructive">
                        {lineErrors.orderedQuantity}
                      </p>
                    ) : null}
                    {product ? (
                      <p className="text-xs text-muted-foreground">單位 {product.unit}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">請先選擇藥材</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>成交單價</Label>
                    <Input
                      aria-label={`訂單明細 ${lineNumber} 成交單價`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.finalUnitPrice}
                      onChange={(event) => {
                        updateLine(line.id, (currentLine) => ({
                          ...currentLine,
                          finalUnitPrice: event.target.value,
                        }))
                      }}
                    />
                    {lineErrors.finalUnitPrice ? (
                      <p className="text-sm text-destructive">
                        {lineErrors.finalUnitPrice}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {product
                        ? `建議價 ${formatCurrency(suggestedUnitPrice || product.basePrice)}${customer ? `，依客戶折扣 ${customer.discountRate}` : ""}`
                        : "選擇藥材後帶入建議價"}
                    </p>
                  </div>
                </div>

                {product ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">基準售價 {formatCurrency(product.basePrice)}</Badge>
                    <Badge variant="outline">
                      即時庫存 {formatQuantity(product.availableStock)} {product.unit}
                    </Badge>
                    {product.isLowStock ? <Badge variant="destructive">低庫存</Badge> : null}
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