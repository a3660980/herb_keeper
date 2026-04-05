import Link from "next/link"
import { notFound } from "next/navigation"

import { FormMessage } from "@/components/app/form-message"
import { PageIntro } from "@/components/app/page-intro"
import { ShipmentForm } from "@/components/orders/shipment-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatDateTime, formatQuantity, toNumberValue } from "@/lib/format"
import {
  createShipmentFormState,
  orderStatusLabels,
  type OrderDetailItem,
  type OrderStatus,
  type ShipmentLineFormValues,
} from "@/lib/features/orders"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"
import { getSingleSearchParam } from "@/lib/url"

import { cancelOrderAction, createShipmentAction } from "../actions"

type OrderPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
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

type OrderItemRow = {
  order_item_id: string
  product_id: string
  product_name: string
  unit: string
  ordered_quantity: number | string
  shipped_quantity: number | string
  remaining_quantity: number | string
  final_unit_price: number | string
}

type StockRow = {
  product_id: string
  ledger_stock_quantity: number | string
}

type ShipmentRow = {
  id: string
  shipment_date: string
  note: string | null
}

type ShipmentItemRow = {
  id: string
  shipment_id: string
  order_item_id: string
  shipped_quantity: number | string
}

function getStatusVariant(status: OrderStatus) {
  if (status === "completed") {
    return "secondary"
  }

  if (status === "partial") {
    return "default"
  }

  if (status === "canceled") {
    return "destructive"
  }

  return "outline"
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: OrderPageProps) {
  const { id } = await params
  const query = await searchParams
  const status = getSingleSearchParam(query.status)
  const error = getSingleSearchParam(query.error)
  const supabaseEnvReady = hasSupabaseEnv()

  if (!supabaseEnvReady) {
    notFound()
  }

  const supabase = await createClient()
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select("id, customer_id, order_date, status, note")
    .eq("id", id)
    .maybeSingle()

  if (orderError || !orderData) {
    notFound()
  }

  const order = orderData as OrderRow
  let customer: CustomerRow | null = null
  let items: OrderDetailItem[] = []
  let shipments: Array<ShipmentRow & { items: ShipmentItemRow[] }> = []
  let loadError = ""

  try {
    const [customerResponse, itemResponse, shipmentResponse] = await Promise.all([
      supabase
        .from("customers")
        .select("id, name, phone, discount_rate")
        .eq("id", order.customer_id)
        .maybeSingle(),
      supabase
        .from("order_fulfillment_view")
        .select(
          "order_item_id, product_id, product_name, unit, ordered_quantity, shipped_quantity, remaining_quantity, final_unit_price"
        )
        .eq("order_id", id)
        .order("product_name"),
      supabase
        .from("shipments")
        .select("id, shipment_date, note")
        .eq("order_id", id)
        .order("shipment_date", { ascending: false }),
    ])

    if (customerResponse.error) {
      loadError = customerResponse.error.message
    } else if (itemResponse.error) {
      loadError = itemResponse.error.message
    } else if (shipmentResponse.error) {
      loadError = shipmentResponse.error.message
    } else {
      customer = (customerResponse.data ?? null) as CustomerRow | null
      const rawItems = (itemResponse.data ?? []) as OrderItemRow[]
      const productIds = Array.from(new Set(rawItems.map((item) => item.product_id)))
      const shipmentIds = (shipmentResponse.data ?? []).map((shipment) => shipment.id)

      const [stockResponse, shipmentItemsResponse] = await Promise.all([
        productIds.length
          ? supabase
              .from("current_inventory_view")
              .select("product_id, ledger_stock_quantity")
              .in("product_id", productIds)
          : Promise.resolve({ data: [], error: null }),
        shipmentIds.length
          ? supabase
              .from("shipment_items")
              .select("id, shipment_id, order_item_id, shipped_quantity")
              .in("shipment_id", shipmentIds)
          : Promise.resolve({ data: [], error: null }),
      ])

      if (stockResponse.error) {
        loadError = stockResponse.error.message
      } else if (shipmentItemsResponse.error) {
        loadError = shipmentItemsResponse.error.message
      } else {
        const stockMap = new Map(
          ((stockResponse.data ?? []) as StockRow[]).map((stock) => [
            stock.product_id,
            toNumberValue(stock.ledger_stock_quantity),
          ])
        )

        items = rawItems.map((item) => ({
          orderItemId: item.order_item_id,
          productId: item.product_id,
          productName: item.product_name,
          unit: item.unit,
          orderedQuantity: toNumberValue(item.ordered_quantity),
          shippedQuantity: toNumberValue(item.shipped_quantity),
          remainingQuantity: toNumberValue(item.remaining_quantity),
          finalUnitPrice: toNumberValue(item.final_unit_price),
          availableStock: stockMap.get(item.product_id) ?? 0,
        }))

        const shipmentItems = (shipmentItemsResponse.data ?? []) as ShipmentItemRow[]

        shipments = ((shipmentResponse.data ?? []) as ShipmentRow[]).map((shipment) => ({
          ...shipment,
          items: shipmentItems.filter((item) => item.shipment_id === shipment.id),
        }))
      }
    }
  } catch (requestError) {
    loadError =
      requestError instanceof Error
        ? requestError.message
        : "無法讀取訂單詳情，請稍後再試。"
  }

  const totalOrderedQuantity = items.reduce(
    (total, item) => total + item.orderedQuantity,
    0
  )
  const totalShippedQuantity = items.reduce(
    (total, item) => total + item.shippedQuantity,
    0
  )
  const totalRemainingQuantity = items.reduce(
    (total, item) => total + item.remainingQuantity,
    0
  )
  const orderAmount = items.reduce(
    (total, item) => total + item.orderedQuantity * item.finalUnitPrice,
    0
  )
  const remainingItems = items.filter((item) => item.remainingQuantity > 0)
  const shipmentFormItems: ShipmentLineFormValues[] = remainingItems.map((item) => ({
    orderItemId: item.orderItemId,
    productId: item.productId,
    productName: item.productName,
    remainingQuantity: String(item.remainingQuantity),
    availableStock: String(item.availableStock),
    unit: item.unit,
    shippedQuantity: "0",
  }))
  const boundShipmentAction = createShipmentAction.bind(null, id)
  const itemMap = new Map(items.map((item) => [item.orderItemId, item]))
  const canEditOrder = order.status === "pending" && totalShippedQuantity === 0 && shipments.length === 0
  const canCancelOrder = canEditOrder
  const boundCancelAction = cancelOrderAction.bind(null, id, false)

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="交易管理"
        title={`訂單 ${id.slice(0, 8).toUpperCase()}`}
        aside={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/orders">返回訂單列表</Link>
            </Button>
            {canEditOrder ? (
              <Button asChild variant="secondary">
                <Link href={`/orders/${id}/edit`}>修改訂單</Link>
              </Button>
            ) : null}
            {canCancelOrder ? (
              <form action={boundCancelAction}>
                <Button type="submit" variant="destructive">
                  撤銷訂單
                </Button>
              </form>
            ) : null}
            <Button asChild>
              <Link href="/orders/new">新增交易</Link>
            </Button>
          </div>
        }
      />

      {status ? <FormMessage message={status} tone="success" /> : null}
      {error ? <FormMessage message={error} tone="error" /> : null}
      {loadError ? <FormMessage message={loadError} tone="error" /> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>訂單狀態</CardDescription>
            <CardTitle>
              <Badge variant={getStatusVariant(order.status)}>
                {orderStatusLabels[order.status]}
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>訂購總量</CardDescription>
            <CardTitle>{formatQuantity(totalOrderedQuantity)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>累計已出貨</CardDescription>
            <CardTitle>{formatQuantity(totalShippedQuantity)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>訂單總額</CardDescription>
            <CardTitle>{formatCurrency(orderAmount)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_24rem]">
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle>訂單明細</CardTitle>
            <CardDescription>依訂購、已出貨與剩餘待出貨數量追蹤履約狀態。</CardDescription>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center text-sm text-muted-foreground">
                這張訂單目前沒有明細資料。
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>藥材</TableHead>
                    <TableHead>訂購數量</TableHead>
                    <TableHead>已出貨</TableHead>
                    <TableHead>待出貨</TableHead>
                    <TableHead>成交單價</TableHead>
                    <TableHead>目前庫存</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.orderItemId}>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {item.productName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          明細 ID {item.orderItemId.slice(0, 8).toUpperCase()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatQuantity(item.orderedQuantity)} {item.unit}
                      </TableCell>
                      <TableCell>
                        {formatQuantity(item.shippedQuantity)} {item.unit}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <span>
                            {formatQuantity(item.remainingQuantity)} {item.unit}
                          </span>
                          {item.remainingQuantity > 0 ? (
                            <Badge variant="outline">待出貨</Badge>
                          ) : (
                            <Badge variant="secondary">已出完</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(item.finalUnitPrice)}</TableCell>
                      <TableCell>
                        {formatQuantity(item.availableStock)} {item.unit}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle>客戶與備註</CardTitle>
            <CardDescription>保存客戶折扣快照，後續報表會以這些資料計算訂單金額。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-3xl border border-border/60 bg-background/70 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                客戶
              </div>
              <div className="mt-2 text-base font-medium text-foreground">
                {customer?.name ?? "未知客戶"}
              </div>
              <div className="mt-1 text-muted-foreground">{customer?.phone ?? "-"}</div>
              <div className="mt-2 text-muted-foreground">
                折扣倍率 {customer ? customer.discount_rate : "-"}
              </div>
            </div>

            <div className="rounded-3xl border border-border/60 bg-background/70 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                備註
              </div>
              <p className="mt-2 leading-6 text-muted-foreground">
                {order.note || "目前沒有備註。"}
              </p>
            </div>

            <div className="rounded-3xl border border-primary/15 bg-primary/8 p-4">
              <div className="text-sm font-medium text-foreground">
                {order.status === "canceled" ? "訂單已撤銷" : "待出貨總量"}
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {order.status === "canceled"
                  ? "這張訂單已保留為撤銷狀態，不能再修改或建立出貨。"
                  : `目前還有 ${formatQuantity(totalRemainingQuantity)} g 尚未出貨，可直接在下方建立部分出貨，或使用全部出貨一次結單。`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card
        id="shipment-form"
        className="border border-border/60 bg-card/85 shadow-sm backdrop-blur"
      >
        <CardHeader>
          <CardTitle>{order.status === "canceled" ? "出貨流程已關閉" : "建立本次出貨"}</CardTitle>
          <CardDescription>
            {order.status === "canceled"
              ? "撤銷後會保留訂單資料，但不能再安排出貨。"
              : "輸入本次出貨數量後，訂單進度與庫存會立即更新；若庫存足夠，也可直接全部出貨一次結單。"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {order.status === "canceled" ? (
            <FormMessage
              message="這張訂單已撤銷，不可再建立 shipment。"
              tone="info"
            />
          ) : remainingItems.length === 0 ? (
            <FormMessage
              message="這張訂單已全部出貨完成，不需要再建立 shipment。"
              tone="info"
            />
          ) : (
            <ShipmentForm
              action={boundShipmentAction}
              initialState={createShipmentFormState({ items: shipmentFormItems })}
              submitLabel="建立出貨批次"
              pendingLabel="建立中..."
            />
          )}
        </CardContent>
      </Card>

      <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle>出貨歷史</CardTitle>
          <CardDescription>每次出貨都會保留批次與出貨明細，便於回查履約記錄。</CardDescription>
        </CardHeader>
        <CardContent>
          {shipments.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center text-sm text-muted-foreground">
              目前還沒有出貨紀錄。
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>出貨時間</TableHead>
                  <TableHead>批次編號</TableHead>
                  <TableHead>本次內容</TableHead>
                  <TableHead>備註</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.map((shipment) => (
                  <TableRow key={shipment.id}>
                    <TableCell>{formatDateTime(shipment.shipment_date)}</TableCell>
                    <TableCell>{shipment.id.slice(0, 8).toUpperCase()}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                        {shipment.items.map((item) => {
                          const orderItem = itemMap.get(item.order_item_id)

                          return (
                            <span key={item.id}>
                              {orderItem?.productName ?? item.order_item_id.slice(0, 8)}
                              {" · "}
                              {formatQuantity(item.shipped_quantity)} {orderItem?.unit ?? "g"}
                            </span>
                          )
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {shipment.note || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}