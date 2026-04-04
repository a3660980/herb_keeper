import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { updateOrderAction } from "@/app/(app)/orders/actions"
import { FormMessage } from "@/components/app/form-message"
import { PageIntro } from "@/components/app/page-intro"
import { OrderForm } from "@/components/orders/order-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  createOrderFormState,
  orderRecordToFormValues,
  type EditableOrderItemRecord,
  type EditableOrderRecord,
  type OrderStatus,
} from "@/lib/features/orders"
import { type TradeCustomerOption, type TradeProductOption } from "@/lib/features/trades"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"
import { withQueryString } from "@/lib/url"

type EditOrderPageProps = {
  params: Promise<{ id: string }>
}

type OrderRow = {
  id: string
  customer_id: string
  order_date: string
  status: OrderStatus
  note: string | null
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

type OrderItemRow = {
  order_item_id: string
  product_id: string
  ordered_quantity: number | string
  shipped_quantity: number | string
  final_unit_price: number | string
}

export default async function EditOrderPage({ params }: EditOrderPageProps) {
  const { id } = await params
  const supabaseEnvReady = hasSupabaseEnv()

  if (!supabaseEnvReady) {
    notFound()
  }

  const supabase = await createClient()
  const [orderResponse, customersResponse, productsResponse, itemsResponse] = await Promise.all([
    supabase
      .from("orders")
      .select("id, customer_id, order_date, status, note")
      .eq("id", id)
      .maybeSingle(),
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
    supabase
      .from("order_items")
      .select(
        "id, product_id, ordered_quantity, shipped_quantity, final_unit_price"
      )
      .eq("order_id", id)
      .order("created_at"),
  ])

  if (orderResponse.error || !orderResponse.data) {
    notFound()
  }

  const order = orderResponse.data as OrderRow
  const rawItems = ((itemsResponse.data ?? []) as Array<{
    id: string
    product_id: string
    ordered_quantity: number | string
    shipped_quantity: number | string
    final_unit_price: number | string
  }>).map((item) => ({
    order_item_id: item.id,
    product_id: item.product_id,
    ordered_quantity: item.ordered_quantity,
    shipped_quantity: item.shipped_quantity,
    final_unit_price: item.final_unit_price,
  })) satisfies OrderItemRow[]

  const canEditOrder =
    order.status === "pending" &&
    rawItems.every((item) => Number(item.shipped_quantity ?? 0) === 0)

  if (!canEditOrder) {
    redirect(
      withQueryString(`/orders/${id}`, {
        error: "已有出貨紀錄的訂單不可修改，請改由出貨流程更新履約狀態。",
      })
    )
  }

  const loadError =
    customersResponse.error?.message ||
    productsResponse.error?.message ||
    itemsResponse.error?.message ||
    ""

  const customers: TradeCustomerOption[] = ((customersResponse.data ?? []) as CustomerRow[]).map(
    (customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      discountRate: Number(customer.discount_rate ?? 1),
    })
  )

  const products: TradeProductOption[] = ((productsResponse.data ?? []) as ProductRow[]).map(
    (product) => ({
      id: product.product_id,
      name: product.product_name,
      basePrice: Number(product.base_price ?? 0),
      unit: product.unit,
      availableStock: Number(product.ledger_stock_quantity ?? 0),
      isLowStock: product.is_low_stock,
    })
  )

  const initialValues = orderRecordToFormValues(
    {
      customerId: order.customer_id,
      orderDate: order.order_date,
      note: order.note,
    } satisfies EditableOrderRecord,
    rawItems.map((item) => ({
      id: item.order_item_id,
      productId: item.product_id,
      orderedQuantity: item.ordered_quantity,
      finalUnitPrice: item.final_unit_price,
    })) satisfies EditableOrderItemRecord[]
  )

  const boundAction = updateOrderAction.bind(null, id)

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="交易管理"
        title={`修改訂單 ${id.slice(0, 8).toUpperCase()}`}
        aside={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href={`/orders/${id}`}>返回訂單詳情</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/orders">返回訂單列表</Link>
            </Button>
          </div>
        }
      />

      {loadError ? (
        <FormMessage message={loadError} tone="error" />
      ) : (
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle>訂單主檔與明細</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderForm
              action={boundAction}
              initialState={createOrderFormState(initialValues)}
              customers={customers}
              products={products}
              submitLabel="儲存變更"
              pendingLabel="儲存中..."
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}