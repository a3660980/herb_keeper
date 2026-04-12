import Link from "next/link"

import { cancelOrderAction } from "./actions"
import { CancelOrderButton } from "@/components/orders/cancel-order-button"
import { FormMessage } from "@/components/app/form-message"
import { PageIntro } from "@/components/app/page-intro"
import { QueryPagination } from "@/components/app/query-pagination"
import { ReportDateRangePicker } from "@/components/app/report-date-range-picker"
import { SearchParamsForm } from "@/components/app/search-params-form"
import { TradeModuleSwitch } from "@/components/app/trade-module-switch"
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
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatDateTime, formatQuantity } from "@/lib/format"
import {
  buildOrderTradeSummaries,
  filterTradeSummaries,
  type TradeSummary,
} from "@/lib/features/trades"
import {
  orderStatusLabels,
  orderStatusOptions,
  type OrderStatus,
} from "@/lib/features/orders"
import { paginateItems, readPageParam } from "@/lib/pagination"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"
import {
  getDateRangeEndBefore,
  getDateRangeStartAt,
  getSingleSearchParam,
  hasInvalidDateRange,
  readDateParam,
  withQueryString,
} from "@/lib/url"

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
  phone: string
}

type OrderItemRow = {
  order_id: string
  ordered_quantity: number | string
  shipped_quantity: number | string
  final_unit_price: number | string
}

const PAGE_SIZE = 20

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

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams
  const query = getSingleSearchParam(params.q)?.trim() ?? ""
  const selectedStatus = getSingleSearchParam(params.status)?.trim() ?? ""
  const startDate = readDateParam(params.startDate)
  const endDate = readDateParam(params.endDate)
  const requestedPage = readPageParam(params.page)
  const supabaseEnvReady = hasSupabaseEnv()
  const dateRangeError = hasInvalidDateRange(startDate, endDate)
    ? "日期區間不正確，結束日不能早於開始日。"
    : ""

  let orders: TradeSummary[] = []
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

      if (!dateRangeError && startDate) {
        ordersRequest = ordersRequest.gte("order_date", getDateRangeStartAt(startDate))
      }

      if (!dateRangeError && endDate) {
        ordersRequest = ordersRequest.lt("order_date", getDateRangeEndBefore(endDate))
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
                .select("id, name, phone")
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
          orders = filterTradeSummaries(
            buildOrderTradeSummaries(
              rawOrders.map((order) => ({
                id: order.id,
                customerId: order.customer_id,
                occurredAt: order.order_date,
                status: order.status,
                note: order.note,
              })),
              (customersResponse.data ?? []) as CustomerRow[],
              ((orderItemsResponse.data ?? []) as OrderItemRow[]).map((item) => ({
                tradeId: item.order_id,
                quantity: item.ordered_quantity,
                fulfilledQuantity: item.shipped_quantity,
                unitPrice: item.final_unit_price,
              }))
            ),
            query
          )
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
  const canceledCount = orders.filter((order) => order.status === "canceled").length
  const hasActiveFilters = Boolean(query || selectedStatus || startDate || endDate)
  const pagination = paginateItems(orders, requestedPage, PAGE_SIZE)
  const buildPageHref = (page: number) =>
    withQueryString("/orders", {
      q: query || undefined,
      status: selectedStatus || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page: page > 1 ? String(page) : undefined,
    })

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="交易管理"
        title="訂單與部分出貨"
        aside={
          <div className="flex flex-col gap-3">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                切換交易檢視
              </p>
              <TradeModuleSwitch active="orders" />
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button asChild size="sm">
                <Link href="/orders/new">新增交易</Link>
              </Button>
            </div>
          </div>
        }
      />

      {dateRangeError ? <FormMessage message={dateRangeError} tone="error" /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>已撤銷</CardDescription>
            <CardTitle>{canceledCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle>搜尋與列表</CardTitle>
          <CardDescription>支援依客戶名稱、客戶電話、備註或訂單編號搜尋，並依狀態與日期區間篩選。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchParamsForm className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_11rem_minmax(14rem,16rem)_auto_auto] xl:items-end">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">關鍵字</span>
              <Input name="q" defaultValue={query} placeholder="搜尋客戶名稱、電話、備註或訂單編號" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">狀態</span>
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
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">日期區間</span>
              <ReportDateRangePicker
                endDate={endDate}
                startDate={startDate}
                autoApply={false}
                className="w-full"
              />
            </label>
            <Button type="submit" variant="secondary" className="xl:self-end">
              搜尋
            </Button>
            <Button asChild type="button" variant="outline" className="xl:self-end">
              <Link href="/orders">清除</Link>
            </Button>
          </SearchParamsForm>

          {hasActiveFilters ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">目前篩選</span>
              {query ? <Badge variant="outline">關鍵字：{query}</Badge> : null}
              {selectedStatus ? <Badge variant="outline">狀態：{orderStatusLabels[selectedStatus as OrderStatus]}</Badge> : null}
              {startDate ? <Badge variant="secondary">開始日：{startDate}</Badge> : null}
              {endDate ? <Badge variant="secondary">結束日：{endDate}</Badge> : null}
            </div>
          ) : null}

          {!supabaseEnvReady ? (
            <FormMessage
              message="尚未連接資料來源，訂單資料暫時無法載入。"
              tone="info"
            />
          ) : loadError ? (
            <FormMessage message={loadError} tone="error" />
          ) : orders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center text-sm text-muted-foreground">
              {hasActiveFilters
                ? "找不到符合條件的訂單。"
                : "目前還沒有訂單資料，先建立第一張訂單吧。"}
            </div>
          ) : (
            <div className="space-y-4">
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
                  {pagination.items.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {order.id.slice(0, 8).toUpperCase()}
                        </div>
                        <div className="text-xs text-muted-foreground">{formatDateTime(order.occurredAt)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {order.customerName}
                        </div>
                        {order.customerPhone ? (
                          <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                        ) : null}
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
                        {formatQuantity(order.fulfilledQuantity)} / {formatQuantity(order.totalQuantity)}
                      </TableCell>
                      <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/orders/${order.id}`}>查看</Link>
                          </Button>
                          {order.status === "pending" ? (
                            <Button asChild size="sm" variant="secondary">
                              <Link href={`/orders/${order.id}/edit`}>修改</Link>
                            </Button>
                          ) : null}
                          {order.status !== "canceled" && order.remainingQuantity > 0 ? (
                            <Button asChild size="sm">
                              <Link href={`/orders/${order.id}#shipment-form`}>出貨</Link>
                            </Button>
                          ) : null}
                          {order.status === "pending" && order.fulfilledQuantity === 0 ? (
                            <CancelOrderButton
                              action={cancelOrderAction.bind(null, order.id, true)}
                              size="sm"
                              label="撤銷"
                            />
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <QueryPagination
                buildPageHref={buildPageHref}
                currentPage={pagination.currentPage}
                pageEnd={pagination.pageEnd}
                pageSize={PAGE_SIZE}
                pageStart={pagination.pageStart}
                paginationItems={pagination.paginationItems}
                totalItems={orders.length}
                totalPages={pagination.totalPages}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
