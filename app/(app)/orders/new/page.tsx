import Link from "next/link"

import { FormMessage } from "@/components/app/form-message"
import { PageIntro } from "@/components/app/page-intro"
import { OrderForm } from "@/components/orders/order-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  createOrderFormState,
  type OrderCustomerOption,
  type OrderProductOption,
} from "@/lib/features/orders"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

import { createOrderAction } from "../actions"

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

export default async function NewOrderPage() {
  const supabaseEnvReady = hasSupabaseEnv()
  let customers: OrderCustomerOption[] = []
  let products: OrderProductOption[] = []
  let loadError = ""

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
        error instanceof Error ? error.message : "無法讀取訂單建立所需資料。"
    }
  }

  const missingPrerequisites = [
    customers.length === 0 ? "至少需要一位客戶" : "",
    products.length === 0 ? "至少需要一筆藥材資料" : "",
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Orders & Shipments"
        title="建立訂單"
        description="建立訂單時會保留客戶折扣與成交單價，之後可直接從訂單詳情安排分批出貨。"
        aside={
          <Button asChild variant="outline">
            <Link href="/orders">返回訂單列表</Link>
          </Button>
        }
      />

      {!supabaseEnvReady ? (
        <FormMessage
          message="尚未連接資料來源，訂單暫時無法建立。"
          tone="info"
        />
      ) : loadError ? (
        <FormMessage message={loadError} tone="error" />
      ) : missingPrerequisites.length > 0 ? (
        <FormMessage
          message={`尚未符合建立訂單的前置條件：${missingPrerequisites.join("、")}。`}
          tone="info"
        />
      ) : (
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle>訂單主檔與明細</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderForm
              action={createOrderAction}
              initialState={createOrderFormState()}
              customers={customers}
              products={products}
              submitLabel="建立訂單"
              pendingLabel="建立中..."
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}