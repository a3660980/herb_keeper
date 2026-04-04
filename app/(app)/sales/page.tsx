import Link from "next/link"

import { FormMessage } from "@/components/app/form-message"
import { PageIntro } from "@/components/app/page-intro"
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
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"
import { getSingleSearchParam } from "@/lib/url"

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

type DirectSaleSummary = {
  id: string
  customerName: string
  saleDate: string
  note: string
  itemCount: number
  totalQuantity: number
  totalAmount: number
}

export default async function SalesPage({ searchParams }: SalesPageProps) {
  const params = await searchParams
  const query = getSingleSearchParam(params.q)?.trim() ?? ""
  const status = getSingleSearchParam(params.status)
  const error = getSingleSearchParam(params.error)
  const supabaseEnvReady = hasSupabaseEnv()

  let sales: DirectSaleSummary[] = []
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
          const customerMap = new Map(
            ((customersResponse.data ?? []) as CustomerRow[]).map((customer) => [
              customer.id,
              customer.name,
            ])
          )
          const itemsBySaleId = new Map<string, DirectSaleItemRow[]>()

          ;((itemsResponse.data ?? []) as DirectSaleItemRow[]).forEach((item) => {
            const currentItems = itemsBySaleId.get(item.direct_sale_id) ?? []
            currentItems.push(item)
            itemsBySaleId.set(item.direct_sale_id, currentItems)
          })

          sales = rawSales.map((sale) => {
            const items = itemsBySaleId.get(sale.id) ?? []

            return {
              id: sale.id,
              customerName: customerMap.get(sale.customer_id) ?? "未知客戶",
              saleDate: sale.sale_date,
              note: sale.note ?? "",
              itemCount: items.length,
              totalQuantity: items.reduce(
                (sum, item) => sum + toNumberValue(item.quantity),
                0
              ),
              totalAmount: items.reduce(
                (sum, item) => sum + toNumberValue(item.line_total),
                0
              ),
            }
          })

          if (query) {
            const normalizedQuery = query.toLowerCase()
            sales = sales.filter((sale) => {
              return (
                sale.customerName.toLowerCase().includes(normalizedQuery) ||
                sale.note.toLowerCase().includes(normalizedQuery) ||
                sale.id.toLowerCase().includes(normalizedQuery)
              )
            })
          }
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

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Direct Sales"
        title="現場銷貨"
        description="現場銷貨現在已經接上真實資料流程，可直接選客戶、帶出折扣建議價、手動覆寫成交單價，並在送出後即時扣庫存。"
        badges={["門市銷貨", "價格可覆寫", "即時扣庫存"]}
        aside={
          <Button asChild>
            <Link href="/sales/new">新增銷貨</Link>
          </Button>
        }
      />

      {status ? <FormMessage message={status} tone="success" /> : null}
      {error ? <FormMessage message={error} tone="error" /> : null}

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
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {sale.id.slice(0, 8).toUpperCase()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(sale.saleDate)}
                      </div>
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
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/sales/${sale.id}`}>查看</Link>
                      </Button>
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
