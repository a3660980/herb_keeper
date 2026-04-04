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
import { formatCurrency, formatDateTime, formatQuantity } from "@/lib/format"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"
import { getSingleSearchParam } from "@/lib/url"

type ReportsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

type TransactionType = "" | "shipment" | "direct_sale"

type DailySummaryRow = {
  sales_date: string
  total_revenue: number | string
  total_cost: number | string
  total_profit: number | string
  transaction_count: number | string
}

type MonthlySummaryRow = {
  sales_month: string
  total_revenue: number | string
  total_cost: number | string
  total_profit: number | string
  transaction_count: number | string
}

type TopSellingRow = {
  product_id: string
  product_name: string
  unit: string
  total_quantity_sold: number | string
  total_revenue: number | string
  total_profit: number | string
}

type TransactionRow = {
  transaction_type: "shipment" | "direct_sale"
  transaction_id: string
  transaction_date: string
  customer_name: string
  product_name: string
  quantity: number | string
  final_unit_price: number | string
  revenue: number | string
  cost_total: number | string
  profit_total: number | string
}

function getTransactionLabel(type: TransactionRow["transaction_type"]) {
  return type === "shipment" ? "訂單出貨" : "現場銷貨"
}

function getTransactionBadgeVariant(type: TransactionRow["transaction_type"]) {
  return type === "shipment" ? "outline" : "secondary"
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams
  const query = getSingleSearchParam(params.q)?.trim() ?? ""
  const selectedType = (getSingleSearchParam(params.type)?.trim() ?? "") as TransactionType
  const supabaseEnvReady = hasSupabaseEnv()

  let dailyRows: DailySummaryRow[] = []
  let monthlyRows: MonthlySummaryRow[] = []
  let topRows: TopSellingRow[] = []
  let transactionRows: TransactionRow[] = []
  let loadError = ""

  if (supabaseEnvReady) {
    try {
      const supabase = await createClient()

      let transactionsRequest = supabase
        .from("transaction_history_view")
        .select(
          "transaction_type, transaction_id, transaction_date, customer_name, product_name, quantity, final_unit_price, revenue, cost_total, profit_total"
        )
        .order("transaction_date", { ascending: false })
        .limit(60)

      if (selectedType === "shipment" || selectedType === "direct_sale") {
        transactionsRequest = transactionsRequest.eq("transaction_type", selectedType)
      }

      if (query) {
        transactionsRequest = transactionsRequest.or(
          `customer_name.ilike.%${query}%,product_name.ilike.%${query}%`
        )
      }

      const [dailyResponse, monthlyResponse, topResponse, transactionsResponse] =
        await Promise.all([
          supabase
            .from("sales_summary_daily_view")
            .select("sales_date, total_revenue, total_cost, total_profit, transaction_count")
            .order("sales_date", { ascending: false })
            .limit(14),
          supabase
            .from("sales_summary_monthly_view")
            .select("sales_month, total_revenue, total_cost, total_profit, transaction_count")
            .order("sales_month", { ascending: false })
            .limit(12),
          supabase
            .from("top_selling_products_view")
            .select("product_id, product_name, unit, total_quantity_sold, total_revenue, total_profit")
            .limit(10),
          transactionsRequest,
        ])

      if (dailyResponse.error) {
        loadError = dailyResponse.error.message
      } else if (monthlyResponse.error) {
        loadError = monthlyResponse.error.message
      } else if (topResponse.error) {
        loadError = topResponse.error.message
      } else if (transactionsResponse.error) {
        loadError = transactionsResponse.error.message
      } else {
        dailyRows = (dailyResponse.data ?? []) as DailySummaryRow[]
        monthlyRows = (monthlyResponse.data ?? []) as MonthlySummaryRow[]
        topRows = (topResponse.data ?? []) as TopSellingRow[]
        transactionRows = (transactionsResponse.data ?? []) as TransactionRow[]
      }
    } catch (requestError) {
      loadError =
        requestError instanceof Error
          ? requestError.message
          : "無法讀取報表資料，請稍後再試。"
    }
  }

  const latestDay = dailyRows[0]
  const latestMonth = monthlyRows[0]
  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Reports"
        title="報表分析"
        description="快速查看日報、月報、熱銷排行與近期交易，掌握營收、成本與毛利變化。"
        badges={["日報 / 月報", "交易明細", "平均成本"]}
        aside={
          <Button asChild variant="outline">
            <a href="#recent-transactions">查看交易明細</a>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>最新日營收</CardDescription>
            <CardTitle>{formatCurrency(latestDay?.total_revenue ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>最新日毛利</CardDescription>
            <CardTitle>{formatCurrency(latestDay?.total_profit ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>最新月營收</CardDescription>
            <CardTitle>{formatCurrency(latestMonth?.total_revenue ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>最新月毛利</CardDescription>
            <CardTitle>{formatCurrency(latestMonth?.total_profit ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {!supabaseEnvReady ? (
        <FormMessage
          message="尚未連接資料來源，報表資料暫時無法載入。"
          tone="info"
        />
      ) : loadError ? (
        <FormMessage message={loadError} tone="error" />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle>近 14 日日報</CardTitle>
            <CardDescription>快速查看每日營收、成本、毛利與交易筆數。</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyRows.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center text-sm text-muted-foreground">
                目前沒有日報資料。
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日期</TableHead>
                    <TableHead>營收</TableHead>
                    <TableHead>成本</TableHead>
                    <TableHead>毛利</TableHead>
                    <TableHead>筆數</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyRows.map((row) => (
                    <TableRow key={row.sales_date}>
                      <TableCell>{row.sales_date}</TableCell>
                      <TableCell>{formatCurrency(row.total_revenue)}</TableCell>
                      <TableCell>{formatCurrency(row.total_cost)}</TableCell>
                      <TableCell>{formatCurrency(row.total_profit)}</TableCell>
                      <TableCell>{row.transaction_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle>熱銷藥材排行</CardTitle>
            <CardDescription>依總銷量排序，可快速對照營收與毛利表現。</CardDescription>
          </CardHeader>
          <CardContent>
            {topRows.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center text-sm text-muted-foreground">
                目前沒有熱銷排行資料。
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>藥材</TableHead>
                    <TableHead>銷量</TableHead>
                    <TableHead>營收</TableHead>
                    <TableHead>毛利</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topRows.map((row) => (
                    <TableRow key={row.product_id}>
                      <TableCell className="font-medium text-foreground">
                        {row.product_name}
                      </TableCell>
                      <TableCell>
                        {formatQuantity(row.total_quantity_sold)} {row.unit}
                      </TableCell>
                      <TableCell>{formatCurrency(row.total_revenue)}</TableCell>
                      <TableCell>{formatCurrency(row.total_profit)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card id="recent-transactions" className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle>交易明細</CardTitle>
          <CardDescription>可依交易類型、客戶與藥材快速篩選最近交易。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_auto_auto]">
            <Input name="q" defaultValue={query} placeholder="搜尋客戶或藥材" />
            <select
              name="type"
              defaultValue={selectedType}
              className="flex h-11 w-full rounded-[1.15rem] border border-border/70 bg-background/78 px-4 py-2 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] outline-none transition-[color,box-shadow,background-color,border-color] focus-visible:border-primary/30 focus-visible:ring-4 focus-visible:ring-ring/15 sm:text-sm"
            >
              <option value="">全部交易類型</option>
              <option value="shipment">訂單出貨</option>
              <option value="direct_sale">現場銷貨</option>
            </select>
            <Button type="submit" variant="secondary">
              篩選
            </Button>
            <Button asChild type="button" variant="outline">
              <a href="/reports">清除</a>
            </Button>
          </form>

          {transactionRows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center text-sm text-muted-foreground">
              {query || selectedType ? "找不到符合條件的交易。" : "目前沒有交易明細資料。"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>時間</TableHead>
                  <TableHead>類型</TableHead>
                  <TableHead>客戶</TableHead>
                  <TableHead>藥材</TableHead>
                  <TableHead>數量</TableHead>
                  <TableHead>成交單價</TableHead>
                  <TableHead>營收</TableHead>
                  <TableHead>成本</TableHead>
                  <TableHead>毛利</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionRows.map((row) => (
                  <TableRow key={`${row.transaction_type}-${row.transaction_id}-${row.product_name}`}>
                    <TableCell>{formatDateTime(row.transaction_date)}</TableCell>
                    <TableCell>
                      <Badge variant={getTransactionBadgeVariant(row.transaction_type)}>
                        {getTransactionLabel(row.transaction_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.customer_name}</TableCell>
                    <TableCell className="font-medium text-foreground">
                      {row.product_name}
                    </TableCell>
                    <TableCell>{formatQuantity(row.quantity)}</TableCell>
                    <TableCell>{formatCurrency(row.final_unit_price)}</TableCell>
                    <TableCell>{formatCurrency(row.revenue)}</TableCell>
                    <TableCell>{formatCurrency(row.cost_total)}</TableCell>
                    <TableCell>{formatCurrency(row.profit_total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle>月報摘要</CardTitle>
          <CardDescription>按月聚合營收、成本、毛利與交易筆數。</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyRows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center text-sm text-muted-foreground">
              目前沒有月報資料。
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>月份</TableHead>
                  <TableHead>營收</TableHead>
                  <TableHead>成本</TableHead>
                  <TableHead>毛利</TableHead>
                  <TableHead>筆數</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyRows.map((row) => (
                  <TableRow key={row.sales_month}>
                    <TableCell>{row.sales_month}</TableCell>
                    <TableCell>{formatCurrency(row.total_revenue)}</TableCell>
                    <TableCell>{formatCurrency(row.total_cost)}</TableCell>
                    <TableCell>{formatCurrency(row.total_profit)}</TableCell>
                    <TableCell>{row.transaction_count}</TableCell>
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
