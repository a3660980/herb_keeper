import Link from "next/link"

import { FormMessage } from "@/components/app/form-message"
import { PageIntro } from "@/components/app/page-intro"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
  orderStatusLabels,
  orderStatusOptions,
  type OrderStatus,
} from "@/lib/features/orders"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"
import { getSingleSearchParam } from "@/lib/url"

type OrdersPageProps = {
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
}

type OrderItemRow = {
  order_id: string
  ordered_quantity: number | string
  shipped_quantity: number | string
  final_unit_price: number | string
}

type OrderSummary = {
  id: string
  customerName: string
  orderDate: string
  status: OrderStatus
  note: string
  itemCount: number
  orderedQuantity: number
  shippedQuantity: number
  remainingQuantity: number
  orderAmount: number
}

function getStatusVariant(status: OrderStatus) {
  if (status === "completed") {
    return "secondary"
  }

  if (status === "partial") {
    return "default"
  }

  return "outline"
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams
  const query = getSingleSearchParam(params.q)?.trim() ?? ""
  const selectedStatus = getSingleSearchParam(params.status)?.trim() ?? ""
  const statusMessage = getSingleSearchParam(params.statusMessage)
  const error = getSingleSearchParam(params.error)
  const supabaseEnvReady = hasSupabaseEnv()

  let orders: OrderSummary[] = []
  let loadError = ""

  if (supabaseEnvReady) {
    try {
      const supabase = await createClient()
      let ordersRequest = supabase
        .from("orders")
        .select("id, customer_id, order_date, status, note")
        .order("order_date", { ascending: false })

      if (orderStatusOptions.includes(selectedStatus as OrderStatus)) {
        ordersRequest = ordersRequest.eq("status", selectedStatus as OrderStatus)
      }

      const { data: orderRows, error: ordersError } = await ordersRequest

      if (ordersError) {
        loadError = ordersError.message
      } else {
        const rawOrders = (orderRows ?? []) as OrderRow[]
        const orderIds = rawOrders.map((order) => order.id)
        const customerIds = Array.from(new Set(rawOrders.map((order) => order.customer_id)))

        const [customersResponse, orderItemsResponse] = await Promise.all([
          customerIds.length
            ? supabase
                .from("customers")
                .select("id, name")
                .in("id", customerIds)
            : Promise.resolve({ data: [], error: null }),
          orderIds.length
            ? supabase
                .from("order_items")
                .select(
                  "order_id, ordered_quantity, shipped_quantity, final_unit_price"
                )
                .in("order_id", orderIds)
            : Promise.resolve({ data: [], error: null }),
        ])

        if (customersResponse.error) {
          loadError = customersResponse.error.message
        } else if (orderItemsResponse.error) {
          loadError = orderItemsResponse.error.message
        } else {
          const customerMap = new Map(
            ((customersResponse.data ?? []) as CustomerRow[]).map((customer) => [
              customer.id,
              customer.name,
            ])
          )
          const itemsByOrderId = new Map<string, OrderItemRow[]>()

          ;((orderItemsResponse.data ?? []) as OrderItemRow[]).forEach((item) => {
            const currentItems = itemsByOrderId.get(item.order_id) ?? []
            currentItems.push(item)
            itemsByOrderId.set(item.order_id, currentItems)
          })

          orders = rawOrders.map((order) => {
            const items = itemsByOrderId.get(order.id) ?? []
            const orderedQuantity = items.reduce(
              (total, item) => total + toNumberValue(item.ordered_quantity),
              0
            )
            const shippedQuantity = items.reduce(
              (total, item) => total + toNumberValue(item.shipped_quantity),
              0
            )
            const orderAmount = items.reduce(
              (total, item) =>
                total +
                toNumberValue(item.ordered_quantity) *
                  toNumberValue(item.final_unit_price),
              0
            )

            return {
              id: order.id,
              customerName: customerMap.get(order.customer_id) ?? "未知客戶",
              orderDate: order.order_date,
              status: order.status,
              note: order.note ?? "",
              itemCount: items.length,
              orderedQuantity,
              shippedQuantity,
              remainingQuantity: Math.max(orderedQuantity - shippedQuantity, 0),
              orderAmount,
            }
          })

          if (query) {
            const normalizedQuery = query.toLowerCase()
            orders = orders.filter((order) => {
              return (
                order.customerName.toLowerCase().includes(normalizedQuery) ||
                order.note.toLowerCase().includes(normalizedQuery) ||
                order.id.toLowerCase().includes(normalizedQuery)
              )
            })
          }
        }
      }
    } catch (error) {
      loadError =
        error instanceof Error ? error.message : "無法讀取訂單資料，請稍後再試。"
    }
  }

  const pendingCount = orders.filter((order) => order.status === "pending").length
  const partialCount = orders.filter((order) => order.status === "partial").length
  const completedCount = orders.filter((order) => order.status === "completed").length

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Orders & Shipments"
        title="訂單與部分出貨"
        description="集中管理訂單與出貨進度，建立訂單後可分批履約，並隨時掌握每張訂單的剩餘待出貨數量。"
        badges={["分次出貨", "履約追蹤", "狀態同步"]}
        aside={
          <Button asChild>
            <Link href="/orders/new">新增訂單</Link>
          </Button>
        }
      />

      {statusMessage ? <FormMessage message={statusMessage} tone="success" /> : null}
      {error ? <FormMessage message={error} tone="error" /> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>訂單總數</CardDescription>
            <CardTitle>{orders.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>待出貨</CardDescription>
            <CardTitle>{pendingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>部分出貨</CardDescription>
            <CardTitle>{partialCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>已完成</CardDescription>
            <CardTitle>{completedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle>搜尋與列表</CardTitle>
          <CardDescription>支援依客戶、備註或訂單編號搜尋，並依狀態篩選。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_auto_auto]">
            <Input name="q" defaultValue={query} placeholder="搜尋客戶、備註或訂單編號" />
            <select
              name="status"
              defaultValue={selectedStatus}
              className="flex h-11 w-full rounded-[1.15rem] border border-border/70 bg-background/78 px-4 py-2 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] outline-none transition-[color,box-shadow,background-color,border-color] focus-visible:border-primary/30 focus-visible:ring-4 focus-visible:ring-ring/15 sm:text-sm"
            >
              <option value="">全部狀態</option>
              {orderStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {orderStatusLabels[status]}
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary">
              搜尋
            </Button>
            <Button asChild type="button" variant="outline">
              <Link href="/orders">清除</Link>
            </Button>
          </form>

          {!supabaseEnvReady ? (
            <FormMessage
              message="尚未連接資料來源，訂單資料暫時無法載入。"
              tone="info"
            />
          ) : loadError ? (
            <FormMessage message={loadError} tone="error" />
          ) : orders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center text-sm text-muted-foreground">
              {query || selectedStatus
                ? "找不到符合條件的訂單。"
                : "目前還沒有訂單資料，先建立第一張訂單吧。"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>訂單</TableHead>
                  <TableHead>客戶</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>明細數</TableHead>
                  <TableHead>履約進度</TableHead>
                  <TableHead>訂單金額</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {order.id.slice(0, 8).toUpperCase()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(order.orderDate)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {order.customerName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.note || "無備註"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(order.status)}>
                        {orderStatusLabels[order.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.itemCount}</TableCell>
                    <TableCell>
                      {formatQuantity(order.shippedQuantity)} / {formatQuantity(order.orderedQuantity)}
                    </TableCell>
                    <TableCell>{formatCurrency(order.orderAmount)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/orders/${order.id}`}>查看</Link>
                        </Button>
                        {order.remainingQuantity > 0 ? (
                          <Button asChild size="sm" variant="secondary">
                            <Link href={`/orders/${order.id}#shipment-form`}>出貨</Link>
                          </Button>
                        ) : null}
                      </div>
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
