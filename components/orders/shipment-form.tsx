"use client"

import { useActionState, useEffect, useEffectEvent, useRef, useState } from "react"

import { FormMessage } from "@/components/app/form-message"
import { SubmitButton } from "@/components/app/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatQuantity } from "@/lib/format"
import { type ShipmentFormState } from "@/lib/features/orders"

type ShipmentFormProps = {
  action: (
    state: ShipmentFormState,
    formData: FormData
  ) => Promise<ShipmentFormState>
  initialState: ShipmentFormState
  submitLabel: string
  pendingLabel: string
}

export function ShipmentForm({
  action,
  initialState,
  submitLabel,
  pendingLabel,
}: ShipmentFormProps) {
  const [state, formAction] = useActionState(action, initialState)
  const [values, setValues] = useState(state.values)
  const timezoneOffsetRef = useRef<HTMLInputElement>(null)
  const syncValuesFromAction = useEffectEvent((nextValues: typeof state.values) => {
    setValues(nextValues)
  })

  useEffect(() => {
    syncValuesFromAction(state.values)
  }, [state.values])

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
          <Label htmlFor="shipmentDate">出貨時間</Label>
          <Input
            id="shipmentDate"
            type="datetime-local"
            value={values.shipmentDate}
            onChange={(event) => {
              setValues((current) => ({
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

      {state.fieldErrors.items ? (
        <FormMessage message={state.fieldErrors.items} tone="error" />
      ) : null}

      <div className="space-y-3">
        {values.items.map((item) => {
          const itemErrors = state.itemErrors[item.orderItemId] ?? {}

          return (
            <div
              key={item.orderItemId}
              data-testid="shipment-line"
              className="grid gap-4 rounded-[1.75rem] border border-border/70 bg-card/70 p-4 shadow-sm md:grid-cols-[minmax(0,1.5fr)_10rem_10rem_10rem] sm:p-5"
            >
              <div>
                <div className="text-sm font-medium text-foreground">
                  {item.productName}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  剩餘待出貨 {formatQuantity(item.remainingQuantity)} {item.unit}
                  {" · "}
                  目前庫存 {formatQuantity(item.availableStock)} {item.unit}
                </div>
              </div>

              <div className="space-y-2">
                <Label>剩餘待出貨</Label>
                <div className="rounded-[1.15rem] border border-border/70 bg-background/74 px-4 py-2.5 text-sm text-muted-foreground">
                  {formatQuantity(item.remainingQuantity)} {item.unit}
                </div>
              </div>

              <div className="space-y-2">
                <Label>目前庫存</Label>
                <div className="rounded-[1.15rem] border border-border/70 bg-background/74 px-4 py-2.5 text-sm text-muted-foreground">
                  {formatQuantity(item.availableStock)} {item.unit}
                </div>
              </div>

              <div className="space-y-2">
                <Label>本次出貨數量</Label>
                <Input
                  aria-label={`${item.productName} 本次出貨數量`}
                  type="number"
                  min="0"
                  step="0.001"
                  max={Math.min(
                    Number(item.remainingQuantity || 0),
                    Number(item.availableStock || 0)
                  )}
                  value={item.shippedQuantity}
                  onChange={(event) => {
                    setValues((current) => ({
                      ...current,
                      items: current.items.map((line) =>
                        line.orderItemId === item.orderItemId
                          ? {
                              ...line,
                              shippedQuantity: event.target.value,
                            }
                          : line
                      ),
                    }))
                  }}
                />
                {itemErrors.shippedQuantity ? (
                  <p className="text-sm text-destructive">
                    {itemErrors.shippedQuantity}
                  </p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <SubmitButton pendingLabel={pendingLabel}>{submitLabel}</SubmitButton>
      </div>
    </form>
  )
}