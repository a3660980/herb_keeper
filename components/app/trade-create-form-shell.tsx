"use client"

import { useState } from "react"

import { OrderForm } from "@/components/orders/order-form"
import { SaleForm } from "@/components/sales/sale-form"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { OrderFormState } from "@/lib/features/orders"
import { tradeCreateModeConfig, type TradeCustomerOption, type TradeKind, type TradeProductOption } from "@/lib/features/trades"
import type { SaleFormState } from "@/lib/features/sales"

type TradeCreateFormShellProps = {
  initialMode: TradeKind
  customers: TradeCustomerOption[]
  products: TradeProductOption[]
  orderAction: (state: OrderFormState, formData: FormData) => Promise<OrderFormState>
  saleAction: (state: SaleFormState, formData: FormData) => Promise<SaleFormState>
  orderInitialState: OrderFormState
  saleInitialState: SaleFormState
}

const tradeTypeDescriptions: Record<TradeKind, string> = {
  order: "先記錄客戶需求，之後可安排部分出貨並追蹤剩餘待出貨數量。",
  sale: "當場完成交易並直接扣庫存，適合門市現場銷貨。",
}

const tradeTypeLabels: Record<TradeKind, string> = {
  order: "訂單出貨",
  sale: "現場銷貨",
}

const tradeTypeBadges: Record<TradeKind, string> = {
  order: "可後續出貨",
  sale: "立即完成",
}

export function TradeCreateFormShell({
  initialMode,
  customers,
  products,
  orderAction,
  saleAction,
  orderInitialState,
  saleInitialState,
}: TradeCreateFormShellProps) {
  const [selectedMode, setSelectedMode] = useState<TradeKind>(initialMode)
  const selectedConfig = tradeCreateModeConfig[selectedMode]

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-[1.35rem] border border-border/70 bg-background/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
        <div>
          <p className="text-sm font-semibold text-foreground">交易類型</p>
          <p className="mt-1 text-sm text-muted-foreground">先選擇交易模式，再填寫下方欄位。</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {(["order", "sale"] as const).map((mode) => {
            const active = selectedMode === mode

            return (
              <button
                key={mode}
                type="button"
                data-testid={`trade-type-${mode}`}
                aria-pressed={active}
                onClick={() => setSelectedMode(mode)}
                className={cn(
                  "cursor-pointer rounded-[1.15rem] border px-4 py-4 text-left transition-[border-color,background-color,box-shadow,transform] duration-150 outline-none focus-visible:ring-4 focus-visible:ring-ring/18 active:scale-[0.992]",
                  active
                    ? "border-primary/30 bg-primary/8 shadow-[0_22px_38px_-26px_rgba(34,120,87,0.45)] hover:-translate-y-0.5 hover:shadow-[0_26px_44px_-26px_rgba(34,120,87,0.52)]"
                    : "border-border/70 bg-card/70 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.2)] hover:-translate-y-0.5 hover:border-primary/20 hover:bg-card hover:shadow-[0_22px_40px_-24px_rgba(15,23,42,0.24)]"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{tradeTypeLabels[mode]}</p>
                  <Badge variant={active ? "secondary" : "outline"}>{tradeTypeBadges[mode]}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{tradeTypeDescriptions[mode]}</p>
              </button>
            )
          })}
        </div>
      </section>

      <section className="space-y-4 rounded-[1.35rem] border border-border/70 bg-card/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] sm:p-5">
        <div>
          <p className="text-base font-semibold text-foreground">{selectedConfig.cardTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{tradeTypeDescriptions[selectedMode]}</p>
        </div>

        {selectedMode === "order" ? (
          <OrderForm
            key="order"
            action={orderAction}
            initialState={orderInitialState}
            customers={customers}
            products={products}
            submitLabel={selectedConfig.submitLabel}
            pendingLabel={selectedConfig.pendingLabel}
          />
        ) : (
          <SaleForm
            key="sale"
            action={saleAction}
            initialState={saleInitialState}
            customers={customers}
            products={products}
            submitLabel={selectedConfig.submitLabel}
            pendingLabel={selectedConfig.pendingLabel}
          />
        )}
      </section>
    </div>
  )
}