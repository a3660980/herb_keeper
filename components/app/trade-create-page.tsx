import Link from "next/link"

import { createOrderAction } from "@/app/(app)/orders/actions"
import { createDirectSaleAction } from "@/app/(app)/sales/actions"
import { FormMessage } from "@/components/app/form-message"
import { PageIntro } from "@/components/app/page-intro"
import { TradeModuleSwitch } from "@/components/app/trade-module-switch"
import { OrderForm } from "@/components/orders/order-form"
import { SaleForm } from "@/components/sales/sale-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  createOrderFormState,
} from "@/lib/features/orders"
import { createSaleFormState } from "@/lib/features/sales"
import {
  tradeCreateModeConfig,
  type TradeCustomerOption,
  type TradeProductOption,
} from "@/lib/features/trades"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

type TradeCreatePageProps = {
  mode: "order" | "sale"
}

type CustomerRow = {
  id: string
  name: string
  phone: string
  discount_rate: number | string
}

type ProductRow = {
  product_id: string
  product_name: string
  base_price: number | string
  unit: string
  ledger_stock_quantity: number | string
  is_low_stock: boolean
}

export async function TradeCreatePage({ mode }: TradeCreatePageProps) {
  const supabaseEnvReady = hasSupabaseEnv()
  let customers: TradeCustomerOption[] = []
  let products: TradeProductOption[] = []
  let loadError = ""
  const modeConfig = tradeCreateModeConfig[mode]

  if (supabaseEnvReady) {
    try {
      const supabase = await createClient()
      const [customersResponse, productsResponse] = await Promise.all([
        supabase
          .from("customers")
          .select("id, name, phone, discount_rate")
          .order("name"),
        supabase
          .from("current_inventory_view")
          .select(
            "product_id, product_name, base_price, unit, ledger_stock_quantity, is_low_stock"
          )
          .order("product_name"),
      ])

      if (customersResponse.error) {
        loadError = customersResponse.error.message
      } else if (productsResponse.error) {
        loadError = productsResponse.error.message
      } else {
        customers = ((customersResponse.data ?? []) as CustomerRow[]).map((customer) => ({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          discountRate: Number(customer.discount_rate ?? 1),
        }))

        products = ((productsResponse.data ?? []) as ProductRow[]).map((product) => ({
          id: product.product_id,
          name: product.product_name,
          basePrice: Number(product.base_price ?? 0),
          unit: product.unit,
          availableStock: Number(product.ledger_stock_quantity ?? 0),
          isLowStock: product.is_low_stock,
        }))
      }
    } catch (error) {
      loadError =
        error instanceof Error ? error.message : "無法讀取交易建立所需資料。"
    }
  }

  const missingPrerequisites = [
    products.length === 0 ? "至少需要一筆藥材資料" : "",
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="交易管理"
        title="新增交易"
        aside={
          <div className="flex flex-col gap-3">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                切換建立模式
              </p>
              <TradeModuleSwitch
                active={mode === "order" ? "orders" : "sales"}
                orderHref="/orders/new"
                saleHref="/sales/new"
                ariaLabel="交易建立模式切換"
              />
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button asChild size="sm" variant="outline">
                <Link href={modeConfig.returnHref}>{modeConfig.returnLabel}</Link>
              </Button>
            </div>
          </div>
        }
      />

      {!supabaseEnvReady ? (
        <FormMessage message="尚未連接資料來源，交易暫時無法建立。" tone="info" />
      ) : loadError ? (
        <FormMessage message={loadError} tone="error" />
      ) : missingPrerequisites.length > 0 ? (
        <FormMessage
          message={`尚未符合建立交易的前置條件：${missingPrerequisites.join("、")}。`}
          tone="info"
        />
      ) : (
        <div className="space-y-4">
          {customers.length === 0 ? (
            <FormMessage
              message="目前還沒有客戶，可以直接在下方客戶欄位使用快速新增客戶。"
              tone="info"
            />
          ) : null}

          <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle>{modeConfig.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              {mode === "order" ? (
                <OrderForm
                  action={createOrderAction}
                  initialState={createOrderFormState()}
                  customers={customers}
                  products={products}
                  submitLabel={modeConfig.submitLabel}
                  pendingLabel={modeConfig.pendingLabel}
                />
              ) : (
                <SaleForm
                  action={createDirectSaleAction}
                  initialState={createSaleFormState()}
                  customers={customers}
                  products={products}
                  submitLabel={modeConfig.submitLabel}
                  pendingLabel={modeConfig.pendingLabel}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}