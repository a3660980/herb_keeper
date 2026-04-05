import Link from "next/link"

import { FormMessage } from "@/components/app/form-message"
import { PageIntro } from "@/components/app/page-intro"
import { StatCard } from "@/components/app/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCurrency, formatDateTime, formatQuantity, toNumberValue } from "@/lib/format"
import { orderStatusLabels, type OrderStatus } from "@/lib/features/orders"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

type DailySummaryRow = {
  sales_date: string
  total_revenue: number | string
  total_profit: number | string
  transaction_count: number | string
}

type MonthlySummaryRow = {
  sales_month: string
  total_revenue: number | string
  total_profit: number | string
}

type TopSellingRow = {
  product_id: string
  product_name: string
  unit: string
  total_quantity_sold: number | string
  total_revenue: number | string
  total_profit: number | string
}

type InventoryRow = {
  product_id: string
  product_name: string
  unit: string
  low_stock_threshold: number | string
  ledger_stock_quantity: number | string
  is_low_stock: boolean
}

type TransactionRow = {
  transaction_type: "shipment" | "direct_sale"
  transaction_id: string
  transaction_date: string
  customer_name: string
  product_id: string
  product_name: string
  quantity: number | string
  revenue: number | string
  profit_total: number | string
}

type OrderRow = {
  id: string
  customer_id: string
  order_date: string
  status: OrderStatus
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

type OrderQueueItem = {
  id: string
  customerName: string
  orderDate: string
  status: OrderStatus
  remainingQuantity: number
  orderAmount: number
}

const shortDateFormatter = new Intl.DateTimeFormat("zh-TW", {
  month: "numeric",
  day: "numeric",
  weekday: "short",
})

const monthFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "long",
})

function getTransactionLabel(type: TransactionRow["transaction_type"]) {
  return type === "shipment" ? "訂單出貨" : "現場銷貨"
}

function getTransactionBadgeVariant(type: TransactionRow["transaction_type"]) {
  return type === "shipment" ? "outline" : "secondary"
}

function getOrderStatusVariant(status: OrderStatus) {
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

function formatShortDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return shortDateFormatter.format(date)
}

function formatMonthLabel(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return monthFormatter.format(date)
}

export default async function DashboardPage() {
  const supabaseEnvReady = hasSupabaseEnv()

  let dailyRows: DailySummaryRow[] = []
  let monthlyRows: MonthlySummaryRow[] = []
  let topRows: TopSellingRow[] = []
  let inventoryRows: InventoryRow[] = []
  let recentTransactions: TransactionRow[] = []
  let orderQueue: OrderQueueItem[] = []
  let loadError = ""

  if (supabaseEnvReady) {
    try {
      const supabase = await createClient()

      const [
        dailyResponse,
        monthlyResponse,
        topResponse,
        inventoryResponse,
        transactionResponse,
        ordersResponse,
      ] = await Promise.all([
        supabase
          .from("sales_summary_daily_view")
          .select("sales_date, total_revenue, total_profit, transaction_count")
          .order("sales_date", { ascending: false })
          .limit(7),
        supabase
          .from("sales_summary_monthly_view")
          .select("sales_month, total_revenue, total_profit")
          .order("sales_month", { ascending: false })
          .limit(3),
        supabase
          .from("top_selling_products_view")
          .select(
            "product_id, product_name, unit, total_quantity_sold, total_revenue, total_profit"
          )
          .limit(5),
        supabase
          .from("current_inventory_view")
          .select(
            "product_id, product_name, unit, low_stock_threshold, ledger_stock_quantity, is_low_stock"
          )
          .order("is_low_stock", { ascending: false })
          .order("ledger_stock_quantity")
          .limit(12),
        supabase
          .from("transaction_history_view")
          .select(
            "transaction_type, transaction_id, transaction_date, customer_name, product_id, product_name, quantity, revenue, profit_total"
          )
          .order("transaction_date", { ascending: false })
          .limit(6),
        supabase
          .from("orders")
          .select("id, customer_id, order_date, status")
          .order("order_date", { ascending: false })
          .limit(30),
      ])

      if (dailyResponse.error) {
        loadError = dailyResponse.error.message
      } else if (monthlyResponse.error) {
        loadError = monthlyResponse.error.message
      } else if (topResponse.error) {
        loadError = topResponse.error.message
      } else if (inventoryResponse.error) {
        loadError = inventoryResponse.error.message
      } else if (transactionResponse.error) {
        loadError = transactionResponse.error.message
      } else if (ordersResponse.error) {
        loadError = ordersResponse.error.message
      } else {
        dailyRows = (dailyResponse.data ?? []) as DailySummaryRow[]
        monthlyRows = (monthlyResponse.data ?? []) as MonthlySummaryRow[]
        topRows = (topResponse.data ?? []) as TopSellingRow[]
        inventoryRows = (inventoryResponse.data ?? []) as InventoryRow[]
        recentTransactions = (transactionResponse.data ?? []) as TransactionRow[]

        const rawOrders = (ordersResponse.data ?? []) as OrderRow[]
        const orderIds = rawOrders.map((order) => order.id)
        const customerIds = Array.from(new Set(rawOrders.map((order) => order.customer_id)))

        const [customersResponse, orderItemsResponse] = await Promise.all([
          customerIds.length
            ? supabase.from("customers").select("id, name").in("id", customerIds)
            : Promise.resolve({ data: [], error: null }),
          orderIds.length
            ? supabase
                .from("order_items")
                .select("order_id, ordered_quantity, shipped_quantity, final_unit_price")
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

          orderQueue = rawOrders
            .map((order) => {
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
                remainingQuantity: Math.max(orderedQuantity - shippedQuantity, 0),
                orderAmount,
              }
            })
            .filter(
              (order) =>
                order.status !== "completed" &&
                order.status !== "canceled" &&
                order.remainingQuantity > 0
            )
            .sort((left, right) => {
              if (left.status === right.status) {
                return right.remainingQuantity - left.remainingQuantity
              }

              if (left.status === "pending") {
                return -1
              }

              if (right.status === "pending") {
                return 1
              }

              return 0
            })
            .slice(0, 6)
        }
      }
    } catch (requestError) {
      loadError =
        requestError instanceof Error
          ? requestError.message
          : "無法讀取營運總覽資料，請稍後再試。"
    }
  }

  const latestDay = dailyRows[0]
  const latestMonth = monthlyRows[0]
  const latestMonthRevenue = toNumberValue(latestMonth?.total_revenue)
  const latestMonthProfit = toNumberValue(latestMonth?.total_profit)
  const latestMonthMargin =
    latestMonthRevenue > 0 ? Math.round((latestMonthProfit / latestMonthRevenue) * 100) : 0
  const lowStockItems = inventoryRows.filter((item) => item.is_low_stock).slice(0, 5)
  const totalRemainingQuantity = orderQueue.reduce(
    (total, order) => total + order.remainingQuantity,
    0
  )
  const partialCount = orderQueue.filter((order) => order.status === "partial").length
  const recentSalesWindow = [...dailyRows].reverse()
  const peakRevenue = Math.max(
    ...recentSalesWindow.map((row) => toNumberValue(row.total_revenue)),
    1
  )
  const weeklyRevenue = dailyRows.reduce(
    (total, row) => total + toNumberValue(row.total_revenue),
    0
  )
  const weeklyProfit = dailyRows.reduce(
    (total, row) => total + toNumberValue(row.total_profit),
    0
  )

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Operations Overview"
        title="營運總覽"
        aside={
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/orders/new">新增交易</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/reports">查看報表</Link>
            </Button>
          </div>
        }
      />

      {!supabaseEnvReady ? (
        <FormMessage
          message="尚未連接資料來源，總覽指標暫時無法載入。"
          tone="info"
        />
      ) : loadError ? (
        <FormMessage message={loadError} tone="error" />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="最近營業日營收"
          value={formatCurrency(latestDay?.total_revenue ?? 0)}
          description={
            latestDay
              ? `${formatShortDate(latestDay.sales_date)} 共 ${latestDay.transaction_count} 筆交易`
              : "尚無交易資料"
          }
          badge="Revenue"
          href="/reports"
          hrefLabel="報表分析"
        />
        <StatCard
          label="本月毛利"
          value={formatCurrency(latestMonth?.total_profit ?? 0)}
          description={
            latestMonth
              ? `${formatMonthLabel(latestMonth.sales_month)} 毛利率 ${latestMonthMargin}%`
              : "尚無月度資料"
          }
          badge="Profit"
          href="/reports"
          hrefLabel="報表分析"
        />
        <StatCard
          label="待出貨訂單"
          value={String(orderQueue.length)}
          description={
            orderQueue.length > 0
              ? `待履約 ${formatQuantity(totalRemainingQuantity)}，部分出貨 ${partialCount} 筆`
              : "目前沒有待處理訂單"
          }
          badge="Fulfillment"
          href="/orders"
          hrefLabel="交易管理"
        />
        <StatCard
          label="低庫存提醒"
          value={String(lowStockItems.length)}
          description={
            lowStockItems.length > 0
              ? `${lowStockItems[0]?.product_name} 需要優先補貨`
              : "目前沒有低庫存品項"
          }
          badge="Inventory"
          href="/inventory"
          hrefLabel="庫存總覽"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(19rem,0.95fr)]">
        <Card className="border border-border/80 bg-card/94">
          <CardHeader className="border-b border-border/70">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>近期交易</CardTitle>
                <CardDescription>
                  最近的銷貨與出貨紀錄，可快速確認交易節奏與毛利表現。
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/reports">完整報表</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {recentTransactions.length === 0 ? (
              <div className="rounded-[1.25rem] border border-dashed border-border/70 bg-background/70 px-6 py-10 text-center text-sm text-muted-foreground">
                目前還沒有交易資料。
              </div>
            ) : (
              recentTransactions.map((transaction) => (
                <div
                  key={`${transaction.transaction_type}-${transaction.transaction_id}-${transaction.product_id}`}
                  className="rounded-[1.25rem] border border-border/80 bg-background/90 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={getTransactionBadgeVariant(transaction.transaction_type)}>
                          {getTransactionLabel(transaction.transaction_type)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(transaction.transaction_date)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-col gap-1">
                        <div className="text-sm font-semibold text-foreground">
                          {transaction.customer_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {transaction.product_name} ・ {formatQuantity(transaction.quantity)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-semibold text-foreground">
                        {formatCurrency(transaction.revenue)}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        毛利 {formatCurrency(transaction.profit_total)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border border-border/80 bg-card/94">
            <CardHeader className="border-b border-border/70">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>待處理訂單</CardTitle>
                  <CardDescription>
                    先處理尚未完成的訂單，避免客戶交期延誤。
                  </CardDescription>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/orders">查看全部</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-6">
              {orderQueue.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-border/70 bg-background/70 px-5 py-8 text-center text-sm text-muted-foreground">
                  目前沒有待處理訂單。
                </div>
              ) : (
                orderQueue.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="block rounded-[1.25rem] border border-border/80 bg-background/90 p-4 transition hover:-translate-y-0.5 hover:border-primary/20"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold text-foreground">
                            {order.customerName}
                          </div>
                          <Badge variant={getOrderStatusVariant(order.status)}>
                            {orderStatusLabels[order.status]}
                          </Badge>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {formatDateTime(order.orderDate)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-semibold text-foreground">
                          待出貨 {formatQuantity(order.remainingQuantity)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          訂單金額 {formatCurrency(order.orderAmount)}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/80 bg-card/94">
            <CardHeader className="border-b border-border/70">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>低庫存提醒</CardTitle>
                  <CardDescription>
                    優先補貨即將低於安全水位的藥材，避免影響接單與門市銷售。
                  </CardDescription>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/inventory?filter=low">前往庫存</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-6">
              {lowStockItems.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-border/70 bg-background/70 px-5 py-8 text-center text-sm text-muted-foreground">
                  目前沒有低庫存提醒。
                </div>
              ) : (
                lowStockItems.map((item) => {
                  const stock = toNumberValue(item.ledger_stock_quantity)
                  const threshold = toNumberValue(item.low_stock_threshold)
                  const shortage = Math.max(threshold - stock, 0)

                  return (
                    <div
                      key={item.product_id}
                      className="rounded-[1.25rem] border border-border/80 bg-background/90 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {item.product_name}
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            目前庫存 {formatQuantity(stock)} {item.unit}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-destructive">
                            門檻 {formatQuantity(threshold)} {item.unit}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            尚差 {formatQuantity(shortage)} {item.unit}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card className="border border-border/80 bg-card/94">
          <CardHeader className="border-b border-border/70">
            <CardTitle>近 7 日營運節奏</CardTitle>
            <CardDescription>
              用每日營收與交易筆數觀察最近一週的出貨與銷售強度。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-border/80 bg-background/90 p-4">
                <div className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  近 7 日營收
                </div>
                <div className="mt-3 text-2xl font-semibold text-foreground">
                  {formatCurrency(weeklyRevenue)}
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-border/80 bg-background/90 p-4">
                <div className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  近 7 日毛利
                </div>
                <div className="mt-3 text-2xl font-semibold text-foreground">
                  {formatCurrency(weeklyProfit)}
                </div>
              </div>
            </div>

            {recentSalesWindow.length === 0 ? (
              <div className="rounded-[1.25rem] border border-dashed border-border/70 bg-background/70 px-6 py-10 text-center text-sm text-muted-foreground">
                目前沒有最近 7 日的銷售摘要。
              </div>
            ) : (
              <div className="space-y-3">
                {recentSalesWindow.map((row) => {
                  const revenue = toNumberValue(row.total_revenue)
                  const width = Math.max(Math.round((revenue / peakRevenue) * 100), 10)

                  return (
                    <div
                      key={row.sales_date}
                      className="rounded-[1.25rem] border border-border/80 bg-background/90 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="sm:w-28">
                          <div className="text-sm font-semibold text-foreground">
                            {formatShortDate(row.sales_date)}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {row.transaction_count} 筆交易
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                        </div>

                        <div className="text-right sm:w-28">
                          <div className="text-sm font-semibold text-foreground">
                            {formatCurrency(row.total_revenue)}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            毛利 {formatCurrency(row.total_profit)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/94">
          <CardHeader className="border-b border-border/70">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>熱銷品項</CardTitle>
                <CardDescription>
                  結合銷量、營收與毛利，快速看出近期推動營收的主力品項。
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/reports">更多排行</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {topRows.length === 0 ? (
              <div className="rounded-[1.25rem] border border-dashed border-border/70 bg-background/70 px-6 py-10 text-center text-sm text-muted-foreground">
                目前沒有熱銷排行資料。
              </div>
            ) : (
              topRows.map((row, index) => (
                <div
                  key={row.product_id}
                  className="rounded-[1.25rem] border border-border/80 bg-background/90 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-[0.9rem] bg-primary/10 text-sm font-semibold text-primary">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {row.product_name}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          銷量 {formatQuantity(row.total_quantity_sold)} {row.unit}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-semibold text-foreground">
                        {formatCurrency(row.total_revenue)}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        毛利 {formatCurrency(row.total_profit)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
