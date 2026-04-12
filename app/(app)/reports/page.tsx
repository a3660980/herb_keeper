import Link from "next/link"

import { QueryPagination } from "@/components/app/query-pagination"
import { ReportDateRangePicker } from "@/components/app/report-date-range-picker"
import { FormMessage } from "@/components/app/form-message"
import { PageIntro } from "@/components/app/page-intro"
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
import { formatCurrency, formatDateTime, formatQuantity, toNumberValue } from "@/lib/format"
import { paginateItems, readPageParam } from "@/lib/pagination"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"
import {
  getDateRangeEndBefore,
  getDateRangeStartAt,
  getSingleSearchParam,
  hasInvalidDateRange,
  readDateParam,
  toDateInputValue,
  withQueryString,
} from "@/lib/url"

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
  product_id: string
  customer_name: string
  product_name: string
  unit: string
  quantity: number | string
  final_unit_price: number | string
  revenue: number | string
  cost_total: number | string
  profit_total: number | string
}

const PAGE_SIZE = 20
const DATE_RANGE_MODE_ALL = "all"

function getCurrentMonthDateRange() {
  const today = toDateInputValue(new Date())

  if (!today) {
    return {
      startDate: "",
      endDate: "",
    }
  }

  const [year, month] = today.slice(0, 7).split("-").map(Number)

  return {
    startDate: toDateInputValue(new Date(Date.UTC(year, month - 1, 1))),
    endDate: toDateInputValue(new Date(Date.UTC(year, month, 0))),
  }
}

function getTransactionLabel(type: TransactionRow["transaction_type"]) {
  return type === "shipment" ? "訂單出貨" : "現場銷貨"
}

function getTransactionBadgeVariant(type: TransactionRow["transaction_type"]) {
  return type === "shipment" ? "outline" : "secondary"
}

function roundMetric(value: number, fractionDigits = 2) {
  return Number(value.toFixed(fractionDigits))
}

function getTransactionKey(row: TransactionRow) {
  return `${row.transaction_type}:${row.transaction_id}`
}

function buildDailySummaryRows(transactions: TransactionRow[]) {
  const rowsByDate = new Map<
    string,
    {
      sales_date: string
      total_revenue: number
      total_cost: number
      total_profit: number
      transactionIds: Set<string>
    }
  >()

  transactions.forEach((row) => {
    const salesDate = toDateInputValue(row.transaction_date)

    if (!salesDate) {
      return
    }

    const current =
      rowsByDate.get(salesDate) ?? {
        sales_date: salesDate,
        total_revenue: 0,
        total_cost: 0,
        total_profit: 0,
        transactionIds: new Set<string>(),
      }

    current.total_revenue += toNumberValue(row.revenue)
    current.total_cost += toNumberValue(row.cost_total)
    current.total_profit += toNumberValue(row.profit_total)
    current.transactionIds.add(getTransactionKey(row))
    rowsByDate.set(salesDate, current)
  })

  return Array.from(rowsByDate.values())
    .map((row) => ({
      sales_date: row.sales_date,
      total_revenue: roundMetric(row.total_revenue),
      total_cost: roundMetric(row.total_cost),
      total_profit: roundMetric(row.total_profit),
      transaction_count: row.transactionIds.size,
    }))
    .sort((left, right) => right.sales_date.localeCompare(left.sales_date))
}

function buildMonthlySummaryRows(transactions: TransactionRow[]) {
  const rowsByMonth = new Map<
    string,
    {
      sales_month: string
      total_revenue: number
      total_cost: number
      total_profit: number
      transactionIds: Set<string>
    }
  >()

  transactions.forEach((row) => {
    const salesDate = toDateInputValue(row.transaction_date)

    if (!salesDate) {
      return
    }

    const salesMonth = salesDate.slice(0, 7)
    const current =
      rowsByMonth.get(salesMonth) ?? {
        sales_month: salesMonth,
        total_revenue: 0,
        total_cost: 0,
        total_profit: 0,
        transactionIds: new Set<string>(),
      }

    current.total_revenue += toNumberValue(row.revenue)
    current.total_cost += toNumberValue(row.cost_total)
    current.total_profit += toNumberValue(row.profit_total)
    current.transactionIds.add(getTransactionKey(row))
    rowsByMonth.set(salesMonth, current)
  })

  return Array.from(rowsByMonth.values())
    .map((row) => ({
      sales_month: row.sales_month,
      total_revenue: roundMetric(row.total_revenue),
      total_cost: roundMetric(row.total_cost),
      total_profit: roundMetric(row.total_profit),
      transaction_count: row.transactionIds.size,
    }))
    .sort((left, right) => right.sales_month.localeCompare(left.sales_month))
}

function buildTopSellingRows(transactions: TransactionRow[]) {
  const rowsByProduct = new Map<
    string,
    {
      product_id: string
      product_name: string
      unit: string
      total_quantity_sold: number
      total_revenue: number
      total_profit: number
    }
  >()

  transactions.forEach((row) => {
    const key = `${row.product_id}:${row.unit}`
    const current =
      rowsByProduct.get(key) ?? {
        product_id: row.product_id,
        product_name: row.product_name,
        unit: row.unit,
        total_quantity_sold: 0,
        total_revenue: 0,
        total_profit: 0,
      }

    current.total_quantity_sold += toNumberValue(row.quantity)
    current.total_revenue += toNumberValue(row.revenue)
    current.total_profit += toNumberValue(row.profit_total)
    rowsByProduct.set(key, current)
  })

  return Array.from(rowsByProduct.values())
    .map((row) => ({
      ...row,
      total_quantity_sold: roundMetric(row.total_quantity_sold, 3),
      total_revenue: roundMetric(row.total_revenue),
      total_profit: roundMetric(row.total_profit),
    }))
    .sort((left, right) => {
      const quantityDiff = right.total_quantity_sold - left.total_quantity_sold

      if (quantityDiff !== 0) {
        return quantityDiff
      }

      return right.total_revenue - left.total_revenue
    })
    .slice(0, 10)
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams
  const query = getSingleSearchParam(params.q)?.trim() ?? ""
  const selectedType = (getSingleSearchParam(params.type)?.trim() ?? "") as TransactionType
  const requestedDateRangeMode = getSingleSearchParam(params.dateRange)?.trim() ?? ""
  const usesUnlimitedDateRange = requestedDateRangeMode === DATE_RANGE_MODE_ALL
  const requestedStartDate = readDateParam(params.startDate)
  const requestedEndDate = readDateParam(params.endDate)
  const usesDefaultMonthRange = !usesUnlimitedDateRange && !requestedStartDate && !requestedEndDate
  const defaultMonthRange = usesDefaultMonthRange ? getCurrentMonthDateRange() : null
  const startDate = usesUnlimitedDateRange
    ? ""
    : requestedStartDate || defaultMonthRange?.startDate || ""
  const endDate = usesUnlimitedDateRange
    ? ""
    : requestedEndDate || defaultMonthRange?.endDate || ""
  const requestedPage = readPageParam(params.page)
  const supabaseEnvReady = hasSupabaseEnv()
  const dateRangeError = hasInvalidDateRange(startDate, endDate)
    ? "日期區間不正確，結束日不能早於開始日。"
    : ""

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
          "transaction_type, transaction_id, transaction_date, product_id, customer_name, product_name, unit, quantity, final_unit_price, revenue, cost_total, profit_total"
        )
        .order("transaction_date", { ascending: false })

      if (selectedType === "shipment" || selectedType === "direct_sale") {
        transactionsRequest = transactionsRequest.eq("transaction_type", selectedType)
      }

      if (query) {
        transactionsRequest = transactionsRequest.or(
          `customer_name.ilike.%${query}%,product_name.ilike.%${query}%`
        )
      }

      if (!dateRangeError && startDate) {
        transactionsRequest = transactionsRequest.gte(
          "transaction_date",
          getDateRangeStartAt(startDate)
        )
      }

      if (!dateRangeError && endDate) {
        transactionsRequest = transactionsRequest.lt(
          "transaction_date",
          getDateRangeEndBefore(endDate)
        )
      }

      const { data: transactionsData, error: transactionsError } = await transactionsRequest

      if (transactionsError) {
        loadError = transactionsError.message
      } else {
        transactionRows = (transactionsData ?? []) as TransactionRow[]
        dailyRows = buildDailySummaryRows(transactionRows)
        monthlyRows = buildMonthlySummaryRows(transactionRows)
        topRows = buildTopSellingRows(transactionRows)
      }
    } catch (requestError) {
      loadError =
        requestError instanceof Error
          ? requestError.message
          : "無法讀取報表資料，請稍後再試。"
    }
  }

  const totalRevenue = transactionRows.reduce(
    (sum, row) => sum + toNumberValue(row.revenue),
    0
  )
  const totalCost = transactionRows.reduce(
    (sum, row) => sum + toNumberValue(row.cost_total),
    0
  )
  const totalProfit = transactionRows.reduce(
    (sum, row) => sum + toNumberValue(row.profit_total),
    0
  )
  const transactionCount = new Set(transactionRows.map(getTransactionKey)).size
  const hasTransactionFilters = Boolean(query || selectedType)
  const hasExplicitDateFilters = Boolean(!usesDefaultMonthRange && (startDate || endDate))
  const hasActiveFilters = Boolean(hasTransactionFilters || hasExplicitDateFilters)
  const transactionPagination = paginateItems(
    transactionRows,
    requestedPage,
    PAGE_SIZE
  )
  const buildPageHref = (page: number) => {
    const href = withQueryString("/reports", {
      q: query || undefined,
      type: selectedType || undefined,
      dateRange: usesUnlimitedDateRange ? DATE_RANGE_MODE_ALL : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page: page > 1 ? String(page) : undefined,
    })

    return `${href}#recent-transactions`
  }
  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Reports"
        title="報表分析"
        description="依日期區間檢視營收、成本、毛利與交易明細。"
        aside={
          <Button asChild variant="outline">
            <a href="#recent-transactions">查看交易明細</a>
          </Button>
        }
      />

      {dateRangeError ? <FormMessage message={dateRangeError} tone="error" /> : null}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-end">
          <ReportDateRangePicker
            endDate={endDate}
            startDate={startDate}
            className="w-full sm:w-auto"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
            <CardHeader>
              <CardDescription>區間營收</CardDescription>
              <CardTitle>{formatCurrency(totalRevenue)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
            <CardHeader>
              <CardDescription>區間成本</CardDescription>
              <CardTitle>{formatCurrency(totalCost)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
            <CardHeader>
              <CardDescription>區間毛利</CardDescription>
              <CardTitle>{formatCurrency(totalProfit)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
            <CardHeader>
              <CardDescription>交易筆數</CardDescription>
              <CardTitle>{transactionCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>
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
            <CardTitle>區間日報</CardTitle>
            <CardDescription>依目前日期區間查看每日營收、成本、毛利與交易筆數。</CardDescription>
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
            <CardDescription>依目前日期區間的總銷量排序，可快速對照營收與毛利表現。</CardDescription>
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
          <CardDescription>可依交易類型、客戶與藥材快速篩選目前日期區間內的交易。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchParamsForm className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_12rem_auto_auto] xl:items-end">
            {usesUnlimitedDateRange ? (
              <input type="hidden" name="dateRange" value={DATE_RANGE_MODE_ALL} />
            ) : null}
            {startDate ? <input type="hidden" name="startDate" value={startDate} /> : null}
            {endDate ? <input type="hidden" name="endDate" value={endDate} /> : null}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">關鍵字</span>
              <Input name="q" defaultValue={query} placeholder="搜尋客戶或藥材" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">交易類型</span>
              <select
                name="type"
                defaultValue={selectedType}
                className="flex h-11 w-full rounded-[1.15rem] border border-border/70 bg-background/78 px-4 py-2 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] outline-none transition-[color,box-shadow,background-color,border-color] focus-visible:border-primary/30 focus-visible:ring-4 focus-visible:ring-ring/15 sm:text-sm"
              >
                <option value="">全部交易類型</option>
                <option value="shipment">訂單出貨</option>
                <option value="direct_sale">現場銷貨</option>
              </select>
            </label>
            <Button type="submit" variant="secondary" className="xl:self-end">
              篩選
            </Button>
            <Button asChild type="button" variant="outline" className="xl:self-end">
              <Link
                href={withQueryString("/reports", {
                  dateRange: usesUnlimitedDateRange ? DATE_RANGE_MODE_ALL : undefined,
                  startDate: startDate || undefined,
                  endDate: endDate || undefined,
                })}
              >
                清除
              </Link>
            </Button>
          </SearchParamsForm>

          {hasActiveFilters ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">目前篩選</span>
              {query ? <Badge variant="outline">關鍵字：{query}</Badge> : null}
              {selectedType ? <Badge variant="outline">類型：{getTransactionLabel(selectedType)}</Badge> : null}
              {hasExplicitDateFilters ? <Badge variant="secondary">日期：自訂區間</Badge> : null}
            </div>
          ) : null}

          {transactionRows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center text-sm text-muted-foreground">
              {hasActiveFilters ? "找不到符合條件的交易。" : "目前沒有交易明細資料。"}
            </div>
          ) : (
            <div className="space-y-4">
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
                  {transactionPagination.items.map((row) => (
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

              <QueryPagination
                buildPageHref={buildPageHref}
                currentPage={transactionPagination.currentPage}
                pageEnd={transactionPagination.pageEnd}
                pageSize={PAGE_SIZE}
                pageStart={transactionPagination.pageStart}
                paginationItems={transactionPagination.paginationItems}
                totalItems={transactionRows.length}
                totalPages={transactionPagination.totalPages}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle>區間月報</CardTitle>
          <CardDescription>按目前日期區間聚合營收、成本、毛利與交易筆數。</CardDescription>
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
