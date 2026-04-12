import Link from "next/link"
import { notFound } from "next/navigation"

import { FormMessage } from "@/components/app/form-message"
import { PageIntro } from "@/components/app/page-intro"
import { QueryPagination } from "@/components/app/query-pagination"
import { SearchParamsForm } from "@/components/app/search-params-form"
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
import { formatCurrency, formatDateTime, formatQuantity } from "@/lib/format"
import {
  buildOrderTradeSummaries,
  buildSaleTradeSummaries,
  filterTradeSummaries,
  type TradeKind,
  type TradeSummary,
} from "@/lib/features/trades"
import {
  customerTypeOptions,
  type CustomerRecord,
  type CustomerType,
} from "@/lib/features/customers"
import { orderStatusLabels, type OrderStatus } from "@/lib/features/orders"
import { paginateItems, readPageParam } from "@/lib/pagination"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"
import { getSingleSearchParam, withQueryString } from "@/lib/url"

type CustomerDetailPageProps = {
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

type OrderItemRow = {
  order_id: string
  ordered_quantity: number | string
  shipped_quantity: number | string
  final_unit_price: number | string
}

type DirectSaleRow = {
  id: string
  customer_id: string
  sale_date: string
  note: string | null
}

type DirectSaleItemRow = {
  direct_sale_id: string
  quantity: number | string
  line_total: number | string
}

const PAGE_SIZE = 20

const customerTypeLabels: Record<(typeof customerTypeOptions)[number], string> = {
  general: "一般客",
  vip: "VIP",
  wholesale: "批發",
}

function getTradeBadgeVariant(kind: TradeKind) {
  return kind === "order" ? "outline" : "secondary"
}

function getTradeStatusLabel(trade: TradeSummary) {
  if (trade.kind === "sale") {
    return "已完成"
  }

  return orderStatusLabels[trade.status]
}

function getTradeHref(trade: TradeSummary) {
  return trade.kind === "order" ? `/orders/${trade.id}` : `/sales/${trade.id}`
}

export default async function CustomerDetailPage({
  params,
  searchParams,
}: CustomerDetailPageProps) {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const query = getSingleSearchParam(resolvedSearchParams.q)?.trim() ?? ""
  const selectedType = getSingleSearchParam(resolvedSearchParams.type)?.trim() ?? ""
  const requestedPage = readPageParam(resolvedSearchParams.page)
  const supabaseEnvReady = hasSupabaseEnv()

  if (!supabaseEnvReady) {
    notFound()
  }

  const supabase = await createClient()
  const { data: customerData, error: customerError } = await supabase
    .from("customers")
    .select("id, name, phone, address, type, discount_rate")
    .eq("id", id)
    .maybeSingle()

  if (customerError || !customerData) {
    notFound()
  }

  const customer = customerData as CustomerRecord
  let trades: TradeSummary[] = []
  let loadError = ""

  try {
    const [ordersResponse, orderItemsResponse, salesResponse, saleItemsResponse] = await Promise.all([
      supabase
        .from("orders")
        .select("id, customer_id, order_date, status, note")
        .eq("customer_id", id)
        .order("order_date", { ascending: false }),
      supabase
        .from("orders")
        .select("id")
        .eq("customer_id", id),
      supabase
        .from("direct_sales")
        .select("id, customer_id, sale_date, note")
        .eq("customer_id", id)
        .order("sale_date", { ascending: false }),
      supabase
        .from("direct_sales")
        .select("id")
        .eq("customer_id", id),
    ])

    if (ordersResponse.error) {
      loadError = ordersResponse.error.message
    } else if (orderItemsResponse.error) {
      loadError = orderItemsResponse.error.message
    } else if (salesResponse.error) {
      loadError = salesResponse.error.message
    } else if (saleItemsResponse.error) {
      loadError = saleItemsResponse.error.message
    } else {
      const orderRows = (ordersResponse.data ?? []) as OrderRow[]
      const orderIds = orderRows.map((order) => order.id)
      const saleRows = (salesResponse.data ?? []) as DirectSaleRow[]
      const saleIds = saleRows.map((sale) => sale.id)

      const [resolvedOrderItemsResponse, resolvedSaleItemsResponse] = await Promise.all([
        orderIds.length
          ? supabase
              .from("order_items")
              .select("order_id, ordered_quantity, shipped_quantity, final_unit_price")
              .in("order_id", orderIds)
          : Promise.resolve({ data: [], error: null }),
        saleIds.length
          ? supabase
              .from("direct_sale_items")
              .select("direct_sale_id, quantity, line_total")
              .in("direct_sale_id", saleIds)
          : Promise.resolve({ data: [], error: null }),
      ])

      if (resolvedOrderItemsResponse.error) {
        loadError = resolvedOrderItemsResponse.error.message
      } else if (resolvedSaleItemsResponse.error) {
        loadError = resolvedSaleItemsResponse.error.message
      } else {
        const customerSummary = [{ id: customer.id, name: customer.name, phone: customer.phone }]

        trades = [
          ...buildOrderTradeSummaries(
            orderRows.map((order) => ({
              id: order.id,
              customerId: order.customer_id,
              occurredAt: order.order_date,
              status: order.status,
              note: order.note,
            })),
            customerSummary,
            ((resolvedOrderItemsResponse.data ?? []) as OrderItemRow[]).map((item) => ({
              tradeId: item.order_id,
              quantity: item.ordered_quantity,
              fulfilledQuantity: item.shipped_quantity,
              unitPrice: item.final_unit_price,
            }))
          ),
          ...buildSaleTradeSummaries(
            saleRows.map((sale) => ({
              id: sale.id,
              customerId: sale.customer_id,
              occurredAt: sale.sale_date,
              note: sale.note,
            })),
            customerSummary,
            ((resolvedSaleItemsResponse.data ?? []) as DirectSaleItemRow[]).map((item) => ({
              tradeId: item.direct_sale_id,
              quantity: item.quantity,
              lineTotal: item.line_total,
            }))
          ),
        ].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
      }
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : "無法讀取客戶交易歷史，請稍後再試。"
  }

  let filteredTrades = filterTradeSummaries(trades, query)

  if (selectedType === "order" || selectedType === "sale") {
    filteredTrades = filteredTrades.filter((trade) => trade.kind === selectedType)
  }

  const orderCount = trades.filter((trade) => trade.kind === "order").length
  const saleCount = trades.filter((trade) => trade.kind === "sale").length
  const totalAmount = trades.reduce((sum, trade) => sum + trade.totalAmount, 0)
  const pagination = paginateItems(filteredTrades, requestedPage, PAGE_SIZE)
  const buildPageHref = (page: number) =>
    withQueryString(`/customers/${id}`, {
      q: query || undefined,
      type: selectedType || undefined,
      page: page > 1 ? String(page) : undefined,
    })

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Customers"
        title={`${customer.name} 交易歷史`}
        description="集中查看這位客戶的訂單與現場銷貨往來紀錄。"
        aside={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/customers">返回客戶列表</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/customers/${id}/edit`}>編輯客戶</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur md:col-span-2">
          <CardHeader>
            <CardDescription>客戶資訊</CardDescription>
            <CardTitle>{customer.name}</CardTitle>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span>{customer.phone}</span>
              <span>{customer.address || "未填地址"}</span>
              <Badge variant="outline">{customerTypeLabels[customer.type as CustomerType]}</Badge>
            </div>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>訂單筆數</CardDescription>
            <CardTitle>{orderCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>現場銷貨筆數</CardDescription>
            <CardTitle>{saleCount}</CardTitle>
            <p className="text-xs text-muted-foreground">累計交易額 {formatCurrency(totalAmount)}</p>
          </CardHeader>
        </Card>
      </div>

      <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle>搜尋與列表</CardTitle>
          <CardDescription>可依交易單號、備註篩選，或切換只看訂單與現場銷貨。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchParamsForm className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_auto_auto]">
            <Input name="q" defaultValue={query} placeholder="搜尋交易單號或備註" />
            <select
              name="type"
              defaultValue={selectedType}
              className="flex h-11 w-full rounded-[1.15rem] border border-border/70 bg-background/78 px-4 py-2 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] outline-none transition-[color,box-shadow,background-color,border-color] focus-visible:border-primary/30 focus-visible:ring-4 focus-visible:ring-ring/15 sm:text-sm"
            >
              <option value="">全部交易</option>
              <option value="order">只看訂單</option>
              <option value="sale">只看現場銷貨</option>
            </select>
            <Button type="submit" variant="secondary">
              搜尋
            </Button>
            <Button asChild type="button" variant="outline">
              <Link href={`/customers/${id}`}>清除</Link>
            </Button>
          </SearchParamsForm>

          {loadError ? (
            <FormMessage message={loadError} tone="error" />
          ) : filteredTrades.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center text-sm text-muted-foreground">
              {query || selectedType ? "找不到符合條件的客戶交易紀錄。" : "這位客戶目前還沒有交易紀錄。"}
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>交易單號</TableHead>
                    <TableHead>類型</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead>明細數</TableHead>
                    <TableHead>交易數量</TableHead>
                    <TableHead>交易金額</TableHead>
                    <TableHead>備註</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.items.map((trade) => (
                    <TableRow key={`${trade.kind}-${trade.id}`}>
                      <TableCell>
                        <div className="font-medium text-foreground">{trade.id.slice(0, 8).toUpperCase()}</div>
                        <div className="text-xs text-muted-foreground">{formatDateTime(trade.occurredAt)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTradeBadgeVariant(trade.kind)}>
                          {trade.kind === "order" ? "訂單出貨" : "現場銷貨"}
                        </Badge>
                      </TableCell>
                      <TableCell>{getTradeStatusLabel(trade)}</TableCell>
                      <TableCell>{trade.itemCount}</TableCell>
                      <TableCell>{formatQuantity(trade.totalQuantity)}</TableCell>
                      <TableCell>{formatCurrency(trade.totalAmount)}</TableCell>
                      <TableCell className="max-w-[18rem] text-sm text-muted-foreground">{trade.note || "無備註"}</TableCell>
                      <TableCell>
                        <Button asChild size="sm" variant="outline">
                          <Link href={getTradeHref(trade)}>查看</Link>
                        </Button>
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
                totalItems={filteredTrades.length}
                totalPages={pagination.totalPages}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}