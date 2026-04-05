"use client"

import { useActionState, useEffect, useEffectEvent, useRef, useState } from "react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { FormMessage } from "@/components/app/form-message"
import { SubmitButton } from "@/components/app/submit-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatQuantity } from "@/lib/format"
import {
  canShipAllShipmentItems,
  fillShipmentFormWithAllRemaining,
  getShipmentLineLimit,
  type ShipmentFormState,
} from "@/lib/features/orders"

type ShipmentFormProps = {
  action: (
    state: ShipmentFormState,
    formData: FormData
  ) => Promise<ShipmentFormState>
  initialState: ShipmentFormState
  submitLabel: string
  pendingLabel: string
}

function normalizeShippedQuantityInput(rawValue: string, maxQuantity: number) {
  if (!rawValue.trim()) {
    return ""
  }

  const numericValue = Number(rawValue)

  if (!Number.isFinite(numericValue)) {
    return rawValue
  }

  if (numericValue < 0) {
    return "0"
  }

  if (numericValue > maxQuantity) {
    return String(maxQuantity)
  }

  return rawValue
}

export function ShipmentForm({
  action,
  initialState,
  submitLabel,
  pendingLabel,
}: ShipmentFormProps) {
  const [state, formAction] = useActionState(action, initialState)
  const [values, setValues] = useState(state.values)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const payloadRef = useRef<HTMLInputElement>(null)
  const timezoneOffsetRef = useRef<HTMLInputElement>(null)
  const shouldSubmitRef = useRef(false)
  const valuesRef = useRef(state.values)
  const syncValuesFromAction = useEffectEvent((nextValues: typeof state.values) => {
    valuesRef.current = nextValues
    setValues(nextValues)
  })

  function updateValues(
    updater:
      | typeof state.values
      | ((current: typeof state.values) => typeof state.values)
  ) {
    setValues((current) => {
      const baseValues = valuesRef.current ?? current
      const nextValues =
        typeof updater === "function"
          ? updater(baseValues)
          : updater

      valuesRef.current = nextValues

      return nextValues
    })
  }

  useEffect(() => {
    syncValuesFromAction(state.values)
  }, [state.values])

  const payload = JSON.stringify({
    ...values,
  })
  const clientItemErrors = new Map<string, string>()

  values.items.forEach((item) => {
    if (!item.shippedQuantity.trim()) {
      return
    }

    const shippedQuantity = Number(item.shippedQuantity)
    const remainingQuantity = Number(item.remainingQuantity || 0)
    const availableStock = Number(item.availableStock || 0)

    if (!Number.isFinite(shippedQuantity)) {
      return
    }

    if (shippedQuantity > remainingQuantity) {
      clientItemErrors.set(
        item.orderItemId,
        `本次出貨量不可超過待出貨 ${formatQuantity(remainingQuantity)}。`
      )
      return
    }

    if (shippedQuantity > availableStock) {
      clientItemErrors.set(
        item.orderItemId,
        `本次出貨量不可超過目前庫存 ${formatQuantity(availableStock)}。`
      )
    }
  })

  const hasClientItemErrors = clientItemErrors.size > 0
  const shipmentPreviewItems = values.items
    .map((item) => ({
      ...item,
      numericRemainingQuantity: Number(item.remainingQuantity || 0),
      numericShippedQuantity: Number(item.shippedQuantity || 0),
    }))
    .filter((item) => item.numericShippedQuantity > 0)
  const totalPreviewRemainingQuantity = shipmentPreviewItems.reduce(
    (total, item) => total + item.numericRemainingQuantity,
    0
  )
  const totalPreviewShippedQuantity = shipmentPreviewItems.reduce(
    (total, item) => total + item.numericShippedQuantity,
    0
  )
  const canShipAll = canShipAllShipmentItems(values.items)

  function handleShipAll() {
    updateValues((current) => fillShipmentFormWithAllRemaining(current))
    shouldSubmitRef.current = false
    setConfirmOpen(true)
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-6"
      onSubmit={(event) => {
        if (payloadRef.current) {
          payloadRef.current.value = JSON.stringify(valuesRef.current)
        }

        if (hasClientItemErrors) {
          event.preventDefault()
          shouldSubmitRef.current = false
          setConfirmOpen(false)
          return
        }

        if (!shouldSubmitRef.current) {
          event.preventDefault()
          setConfirmOpen(true)
          return
        }

        shouldSubmitRef.current = false

        if (timezoneOffsetRef.current) {
          timezoneOffsetRef.current.value = String(new Date().getTimezoneOffset())
        }
      }}
    >
      {state.message ? <FormMessage message={state.message} tone="error" /> : null}

      <input ref={payloadRef} type="hidden" name="payload" value={payload} />
      <input ref={timezoneOffsetRef} type="hidden" name="timezoneOffsetMinutes" defaultValue="0" />

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="shipmentDate">出貨時間</Label>
          <Input
            id="shipmentDate"
            type="datetime-local"
            value={values.shipmentDate}
            onChange={(event) => {
              updateValues((current) => ({
                ...current,
                shipmentDate: event.target.value,
              }))
            }}
          />
          {state.fieldErrors.shipmentDate ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.shipmentDate}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="shipmentNote">備註</Label>
          <Textarea
            id="shipmentNote"
            value={values.note}
            placeholder="例如：先出一半、等待下一批補貨。"
            onChange={(event) => {
              updateValues((current) => ({
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

      {state.fieldErrors.items ? (
        <FormMessage message={state.fieldErrors.items} tone="error" />
      ) : null}
      {!state.fieldErrors.items && hasClientItemErrors ? (
        <FormMessage message="請修正超出待出貨的出貨數量後再送出。" tone="error" />
      ) : null}

      <div className="space-y-3">
        {values.items.map((item) => {
          const itemErrors = state.itemErrors[item.orderItemId] ?? {}
          const editableLimit = getShipmentLineLimit(item)
          const shippedQuantityError =
            clientItemErrors.get(item.orderItemId) ?? itemErrors.shippedQuantity

          return (
            <div
              key={item.orderItemId}
              data-testid="shipment-line"
              className="rounded-[1.75rem] border border-border/70 bg-card/70 p-4 shadow-sm sm:p-5"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {item.productName}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      單位 {item.unit}，依待出貨量輸入這次要出的數量。
                    </div>
                  </div>

                  <div className="rounded-full border border-border/70 bg-background/74 px-3 py-1 text-xs text-muted-foreground">
                    目前庫存 {formatQuantity(item.availableStock)} {item.unit}
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                  <div className="rounded-[1.4rem] border border-border/70 bg-background/74 px-4 py-4">
                    <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      待出貨
                    </div>
                    <div className="mt-2 text-base font-medium text-foreground">
                      {formatQuantity(item.remainingQuantity)} {item.unit}
                    </div>
                  </div>

                  <div className="rounded-[1.4rem] border border-primary/20 bg-primary/8 p-4">
                    <div className="space-y-2">
                      <Label>本次出貨數量</Label>
                      <Input
                        aria-label={`${item.productName} 本次出貨數量`}
                        type="number"
                        min="0"
                        step="0.001"
                        max={editableLimit}
                        value={item.shippedQuantity}
                        onChange={(event) => {
                          const nextValue = normalizeShippedQuantityInput(
                            event.target.value,
                            editableLimit
                          )

                          updateValues((current) => ({
                            ...current,
                            items: current.items.map((line) =>
                              line.orderItemId === item.orderItemId
                                ? {
                                    ...line,
                                    shippedQuantity: nextValue,
                                  }
                                : line
                            ),
                          }))
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        最多可出 {formatQuantity(editableLimit)} {item.unit}
                      </p>
                      {shippedQuantityError ? (
                        <p className="text-sm text-destructive">
                          {shippedQuantityError}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-2 sm:items-end">
        {!canShipAll ? (
          <p className="text-sm text-muted-foreground">
            目前有品項庫存不足，暫時無法全部出貨結單。
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            data-testid="ship-all-button"
            disabled={!canShipAll}
            onClick={handleShipAll}
          >
            全部出貨
          </Button>
          <Button type="submit">
            {submitLabel}
          </Button>
        </div>
      </div>

      <DialogPrimitive.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 duration-100 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 w-[min(calc(100vw-2rem),36rem)] -translate-x-1/2 -translate-y-1/2 rounded-[1.75rem] border border-border/70 bg-popover/98 text-popover-foreground shadow-xl duration-200 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <div className="flex flex-col gap-1.5 p-6 pb-4">
              <DialogPrimitive.Title className="font-heading text-base font-medium text-foreground">
                確認本次出貨
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-muted-foreground">
              送出後會立即更新訂單進度與庫存，請先確認本次出貨內容。
              </DialogPrimitive.Description>
            </div>

            <div className="space-y-4 px-6 pb-2">
              {shipmentPreviewItems.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-border/70 bg-background/70 px-4 py-6 text-center text-sm text-muted-foreground">
                  尚未輸入任何本次出貨數量，請先回到表單填寫。
                </div>
              ) : (
                <>
                  <div className="rounded-[1.25rem] border border-border/70 bg-background/72 px-4 py-4">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">本次出貨合計</span>
                      <span className="font-medium text-foreground">
                        {formatQuantity(totalPreviewShippedQuantity)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">涉及待出貨合計</span>
                      <span className="font-medium text-foreground">
                        {formatQuantity(totalPreviewRemainingQuantity)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {shipmentPreviewItems.map((item) => (
                      <div
                        key={item.orderItemId}
                        className="rounded-[1.25rem] border border-border/70 bg-background/72 px-4 py-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-foreground">
                              {item.productName}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              待出貨 {formatQuantity(item.numericRemainingQuantity)} {item.unit}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">本次出貨</div>
                            <div className="mt-1 text-sm font-medium text-foreground">
                              {formatQuantity(item.numericShippedQuantity)} {item.unit}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-border/60 p-6 pt-4 sm:flex-row sm:justify-end">
              <DialogPrimitive.Close asChild>
                <Button type="button" variant="outline">
                  返回調整
                </Button>
              </DialogPrimitive.Close>
              <SubmitButton
                type="button"
                pendingLabel={pendingLabel}
                disabled={shipmentPreviewItems.length === 0 || hasClientItemErrors}
                onClick={() => {
                  if (!formRef.current) {
                    return
                  }

                  shouldSubmitRef.current = true
                  setConfirmOpen(false)
                  formRef.current.requestSubmit()
                }}
              >
                確認出貨
              </SubmitButton>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </form>
  )
}