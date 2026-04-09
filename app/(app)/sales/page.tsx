import Link from "next/link"

import { cancelDirectSaleAction } from "./actions"
import { CancelOrderButton } from "@/components/orders/cancel-order-button"
import { FormMessage } from "@/components/app/form-message"
import { PageIntro } from "@/components/app/page-intro"
import { QueryPagination } from "@/components/app/query-pagination"
import { TradeModuleSwitch } from "@/components/app/trade-module-switch"
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
  buildSaleTradeSummaries,
  filterTradeSummaries,
  type TradeSummary,
} from "@/lib/features/trades"
import { paginateItems, readPageParam } from "@/lib/pagination"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"
import { getSingleSearchParam, withQueryString } from "@/lib/url"

type SalesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

type DirectSaleRow = {
  id: string
  customer_id: string
  sale_date: string
  note: string | null
}

type CustomerRow = {
  id: string
  name: string
}

type DirectSaleItemRow = {
  direct_sale_id: string
  quantity: number | string
  line_total: number | string
}

const PAGE_SIZE = 20

export default async function SalesPage({ searchParams }: SalesPageProps) {
  const params = await searchParams
  const query = getSingleSearchParam(params.q)?.trim() ?? ""
  const requestedPage = readPageParam(params.page)
  const supabaseEnvReady = hasSupabaseEnv()

  let sales: TradeSummary[] = []
  let loadError = ""

  if (supabaseEnvReady) {
    try {
      const supabase = await createClient()
      const { data: salesRows, error: salesError } = await supabase
        .from("direct_sales")
        .select("id, customer_id, sale_date, note")
        .order("sale_date", { ascending: false })

      if (salesError) {
        loadError = salesError.message
      } else {
        const rawSales = (salesRows ?? []) as DirectSaleRow[]
        const saleIds = rawSales.map((sale) => sale.id)
        const customerIds = Array.from(new Set(rawSales.map((sale) => sale.customer_id)))

        const [customersResponse, itemsResponse] = await Promise.all([
          customerIds.length
            ? supabase.from("customers").select("id, name").in("id", customerIds)
            : Promise.resolve({ data: [], error: null }),
          saleIds.length
            ? supabase
                .from("direct_sale_items")
                .select("direct_sale_id, quantity, line_total")
                .in("direct_sale_id", saleIds)
            : Promise.resolve({ data: [], error: null }),
        ])

        if (customersResponse.error) {
          loadError = customersResponse.error.message
        } else if (itemsResponse.error) {
          loadError = itemsResponse.error.message
        } else {
          sales = filterTradeSummaries(
            buildSaleTradeSummaries(
              rawSales.map((sale) => ({
                id: sale.id,
                customerId: sale.customer_id,
                occurredAt: sale.sale_date,
                note: sale.note,
              })),
              (customersResponse.data ?? []) as CustomerRow[],
              ((itemsResponse.data ?? []) as DirectSaleItemRow[]).map((item) => ({
                tradeId: item.direct_sale_id,
                quantity: item.quantity,
                lineTotal: item.line_total,
              }))
            ),
            query
          )
        }
      }
    } catch (requestError) {
      loadError =
        requestError instanceof Error
          ? requestError.message
          : "無法讀取現場銷貨資料，請稍後再試。"
    }
  }

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0)
  const totalQuantity = sales.reduce((sum, sale) => sum + sale.totalQuantity, 0)
  const customerCount = new Set(sales.map((sale) => sale.customerName)).size
  const pagination = paginateItems(sales, requestedPage, PAGE_SIZE)
  const buildPageHref = (page: number) =>
    withQueryString("/sales", {
      q: query || undefined,
      page: page > 1 ? String(page) : undefined,
    })

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="交易管理"
        title="現場銷貨"
        aside={
          <div className="flex flex-col gap-3">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                切換交易檢視
              </p>
              <TradeModuleSwitch active="sales" />
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button asChild size="sm">
                <Link href="/orders/new?type=sale">新增交易</Link>
              </Button>
            </div>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>銷貨筆數</CardDescription>
            <CardTitle>{sales.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>總營收</CardDescription>
            <CardTitle>{formatCurrency(totalRevenue)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>銷出總量</CardDescription>
            <CardTitle>{formatQuantity(totalQuantity)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>成交客戶數</CardDescription>
            <CardTitle>{customerCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle>搜尋與列表</CardTitle>
          <CardDescription>支援依客戶、備註或銷貨單號搜尋。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" className="flex flex-col gap-3 sm:flex-row">
            <Input name="q" defaultValue={query} placeholder="搜尋客戶、備註或銷貨單號" />
            <div className="flex gap-3">
              <Button type="submit" variant="secondary">
                搜尋
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href="/sales">清除</Link>
              </Button>
            </div>
          </form>

          {!supabaseEnvReady ? (
            <FormMessage
              message="尚未連接資料來源，銷貨資料暫時無法載入。"
              tone="info"
            />
          ) : loadError ? (
            <FormMessage message={loadError} tone="error" />
          ) : sales.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center text-sm text-muted-foreground">
              {query ? "找不到符合條件的銷貨紀錄。" : "目前還沒有現場銷貨資料。"}
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>銷貨單</TableHead>
                    <TableHead>客戶</TableHead>
                    <TableHead>明細數</TableHead>
                    <TableHead>銷貨總量</TableHead>
                    <TableHead>銷貨金額</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.items.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {sale.id.slice(0, 8).toUpperCase()}
                        </div>
                        <div className="text-xs text-muted-foreground">{formatDateTime(sale.occurredAt)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{sale.customerName}</div>
                        <div className="text-xs text-muted-foreground">
                          {sale.note || "無備註"}
                        </div>
                      </TableCell>
                      <TableCell>{sale.itemCount}</TableCell>
                      <TableCell>{formatQuantity(sale.totalQuantity)}</TableCell>
                      <TableCell>{formatCurrency(sale.totalAmount)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/sales/${sale.id}`}>查看</Link>
                          </Button>
                          <CancelOrderButton
                            action={cancelDirectSaleAction.bind(null, sale.id, true)}
                            size="sm"
                            label="撤銷"
                            dialogTitle="確認撤銷銷貨"
                            dialogDescription="撤銷後此筆銷貨紀錄將被刪除，庫存數量會自動回復。確定要撤銷嗎？"
                          />
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
                totalItems={sales.length}
                totalPages={pagination.totalPages}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
