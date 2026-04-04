"use client"

import { useActionState, useEffect, useEffectEvent, useRef, useState } from "react"

import { FormMessage } from "@/components/app/form-message"
import { SubmitButton } from "@/components/app/submit-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency, formatDecimalInput, formatQuantity } from "@/lib/format"
import {
  createOrderLineFormValue,
  type OrderCustomerOption,
  type OrderFormState,
  type OrderProductOption,
} from "@/lib/features/orders"

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

const selectClassName =
  "flex h-11 w-full rounded-[1.15rem] border border-border/70 bg-background/78 px-4 py-2 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] outline-none transition-[color,box-shadow,background-color,border-color] focus-visible:border-primary/30 focus-visible:ring-4 focus-visible:ring-ring/15 sm:text-sm"

export function OrderForm({
  action,
  initialState,
  customers,
  products,
  submitLabel,
  pendingLabel,
}: OrderFormProps) {
  const [state, formAction] = useActionState(action, initialState)
  const [values, setValues] = useState(state.values)
  const timezoneOffsetRef = useRef<HTMLInputElement>(null)
  const syncValuesFromAction = useEffectEvent((nextValues: typeof state.values) => {
    setValues(nextValues)
  })

  useEffect(() => {
    syncValuesFromAction(state.values)
  }, [state.values])

  function findCustomer(customerId: string) {
    return customers.find((customer) => customer.id === customerId)
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

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerId">客戶</Label>
          <select
            id="customerId"
            value={values.customerId}
            className={selectClassName}
            onChange={(event) => {
              const nextCustomerId = event.target.value

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
          >
            <option value="">請選擇客戶</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} ({customer.phone})
              </option>
            ))}
          </select>
          {state.fieldErrors.customerId ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.customerId}
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

        <div className="space-y-4">
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
                className="rounded-[1.75rem] border border-border/70 bg-card/70 p-4 shadow-sm sm:p-5"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-foreground">
                    明細 {lineNumber}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setValues((current) => ({
                        ...current,
                        items:
                          current.items.length === 1
                            ? [createOrderLineFormValue()]
                            : current.items.filter((item) => item.id !== line.id),
                      }))
                    }}
                  >
                    移除
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,1.5fr)_11rem_11rem]">
                  <div className="space-y-2">
                    <Label>藥材</Label>
                    <select
                      aria-label={`訂單明細 ${lineNumber} 藥材`}
                      value={line.productId}
                      className={selectClassName}
                      onChange={(event) => {
                        const nextProductId = event.target.value

                        updateLine(line.id, (currentLine) => ({
                          ...currentLine,
                          productId: nextProductId,
                          finalUnitPrice: getSuggestedUnitPrice(
                            nextProductId,
                            values.customerId
                          ),
                        }))
                      }}
                    >
                      <option value="">請選擇藥材</option>
                      {products.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                    {lineErrors.productId ? (
                      <p className="text-sm text-destructive">
                        {lineErrors.productId}
                      </p>
                    ) : null}
                    {product ? (
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">基準售價 {formatCurrency(product.basePrice)}</Badge>
                        <Badge variant="outline">
                          即時庫存 {formatQuantity(product.availableStock)} {product.unit}
                        </Badge>
                        {product.isLowStock ? (
                          <Badge variant="destructive">低庫存</Badge>
                        ) : null}
                      </div>
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
                    {product ? (
                      <p className="text-xs text-muted-foreground">
                        建議價 {formatCurrency(suggestedUnitPrice || product.basePrice)}
                        {customer ? `，依客戶折扣 ${customer.discountRate}` : ""}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <SubmitButton pendingLabel={pendingLabel}>{submitLabel}</SubmitButton>
      </div>
    </form>
  )
}