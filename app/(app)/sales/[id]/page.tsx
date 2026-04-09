import Link from "next/link"
import { notFound } from "next/navigation"

import { cancelDirectSaleAction } from "../actions"
import { CancelOrderButton } from "@/components/orders/cancel-order-button"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatQuantity, toNumberValue } from "@/lib/format"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

type DirectSalePageProps = {
  params: Promise<{ id: string }>
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
  phone: string
  discount_rate: number | string
}

type ProductRelation = {
  name: string
  unit: string
}

type RawDirectSaleItemRow = {
  id: string
  product_id: string
  quantity: number | string
  base_unit_price: number | string
  discount_rate_applied: number | string
  final_unit_price: number | string
  line_total: number | string
  product: ProductRelation | ProductRelation[] | null
}

type DirectSaleItemRow = {
  id: string
  product_id: string
  quantity: number | string
  base_unit_price: number | string
  discount_rate_applied: number | string
  final_unit_price: number | string
  line_total: number | string
  product: ProductRelation | null
}

type TransactionHistoryRow = {
  transaction_item_id: string
  unit_cost_snapshot: number | string
  cost_total: number | string
  profit_total: number | string
}

export default async function DirectSaleDetailPage({
  params,
}: DirectSalePageProps) {
  const { id } = await params
  const supabaseEnvReady = hasSupabaseEnv()

  if (!supabaseEnvReady) {
    notFound()
  }

  const supabase = await createClient()
  const { data: saleData, error: saleError } = await supabase
    .from("direct_sales")
    .select("id, customer_id, sale_date, note")
    .eq("id", id)
    .maybeSingle()

  if (saleError || !saleData) {
    notFound()
  }

  const sale = saleData as DirectSaleRow
  let customer: CustomerRow | null = null
  let items: DirectSaleItemRow[] = []
  let historyRows: TransactionHistoryRow[] = []
  let loadError = ""

  try {
    const [customerResponse, itemResponse, historyResponse] = await Promise.all([
      supabase
        .from("customers")
        .select("id, name, phone, discount_rate")
        .eq("id", sale.customer_id)
        .maybeSingle(),
      supabase
        .from("direct_sale_items")
        .select(
          "id, product_id, quantity, base_unit_price, discount_rate_applied, final_unit_price, line_total, product:products(name, unit)"
        )
        .eq("direct_sale_id", id)
        .order("created_at"),
      supabase
        .from("transaction_history_view")
        .select("transaction_item_id, unit_cost_snapshot, cost_total, profit_total")
        .eq("direct_sale_id", id),
    ])

    if (customerResponse.error) {
      loadError = customerResponse.error.message
    } else if (itemResponse.error) {
      loadError = itemResponse.error.message
    } else if (historyResponse.error) {
      loadError = historyResponse.error.message
    } else {
      customer = (customerResponse.data ?? null) as CustomerRow | null
      items = ((itemResponse.data ?? []) as RawDirectSaleItemRow[]).map((item) => ({
        ...item,
        product: Array.isArray(item.product) ? (item.product[0] ?? null) : item.product,
      }))
      historyRows = (historyResponse.data ?? []) as TransactionHistoryRow[]
    }
  } catch (requestError) {
    loadError =
      requestError instanceof Error
        ? requestError.message
        : "無法讀取現場銷貨詳情，請稍後再試。"
  }

  const historyMap = new Map(
    historyRows.map((row) => [
      row.transaction_item_id,
      {
        unitCostSnapshot: toNumberValue(row.unit_cost_snapshot),
        costTotal: toNumberValue(row.cost_total),
        profitTotal: toNumberValue(row.profit_total),
      },
    ])
  )

  const totalQuantity = items.reduce((sum, item) => sum + toNumberValue(item.quantity), 0)
  const totalRevenue = items.reduce((sum, item) => sum + toNumberValue(item.line_total), 0)
  const totalCost = items.reduce((sum, item) => {
    return sum + (historyMap.get(item.id)?.costTotal ?? 0)
  }, 0)
  const totalProfit = items.reduce((sum, item) => {
    return sum + (historyMap.get(item.id)?.profitTotal ?? 0)
  }, 0)

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="交易管理"
        title={`銷貨單 ${id.slice(0, 8).toUpperCase()}`}
        aside={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/sales">返回銷貨列表</Link>
            </Button>
            <CancelOrderButton
              action={cancelDirectSaleAction.bind(null, id, false)}
              label="撤銷銷貨"
              dialogTitle="確認撤銷銷貨"
              dialogDescription="撤銷後此筆銷貨紀錄將被刪除，庫存數量會自動回復。確定要撤銷嗎？"
            />
            <Button asChild>
              <Link href="/orders/new?type=sale">新增交易</Link>
            </Button>
          </div>
        }
      />

      {loadError ? <FormMessage message={loadError} tone="error" /> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>銷貨明細數</CardDescription>
            <CardTitle>{items.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>銷貨總量</CardDescription>
            <CardTitle>{formatQuantity(totalQuantity)}</CardTitle>
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
            <CardDescription>總毛利</CardDescription>
            <CardTitle>{formatCurrency(totalProfit)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_24rem]">
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle>銷貨明細</CardTitle>
            <CardDescription>保留基準售價、折扣倍率與最終成交單價，方便回查現場價格決策。</CardDescription>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center text-sm text-muted-foreground">
                這張銷貨單目前沒有明細資料。
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>藥材</TableHead>
                    <TableHead>數量</TableHead>
                    <TableHead>基準售價</TableHead>
                    <TableHead>折扣倍率</TableHead>
                    <TableHead>成交單價</TableHead>
                    <TableHead>營收</TableHead>
                    <TableHead>成本</TableHead>
                    <TableHead>毛利</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const history = historyMap.get(item.id)
                    const product = item.product

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {product?.name ?? item.product_id.slice(0, 8)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            成本快照 {formatCurrency(history?.unitCostSnapshot ?? 0)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatQuantity(item.quantity)} {product?.unit ?? "g"}
                        </TableCell>
                        <TableCell>{formatCurrency(item.base_unit_price)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.discount_rate_applied}</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(item.final_unit_price)}</TableCell>
                        <TableCell>{formatCurrency(item.line_total)}</TableCell>
                        <TableCell>{formatCurrency(history?.costTotal ?? 0)}</TableCell>
                        <TableCell>{formatCurrency(history?.profitTotal ?? 0)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle>客戶與備註</CardTitle>
            <CardDescription>這筆交易會直接納入 daily / monthly reports 與熱銷排行。</CardDescription>
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
                客戶折扣倍率 {customer ? customer.discount_rate : "-"}
              </div>
            </div>

            <div className="rounded-3xl border border-border/60 bg-background/70 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                備註
              </div>
              <p className="mt-2 leading-6 text-muted-foreground">
                {sale.note || "目前沒有備註。"}
              </p>
            </div>

            <div className="rounded-3xl border border-primary/15 bg-primary/8 p-4">
              <div className="text-sm font-medium text-foreground">成本法版本</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                毛利會依當次銷貨的平均成本自動計算，方便回看每筆交易的獲利表現。
              </p>
            </div>

            <div className="rounded-3xl border border-border/60 bg-background/70 p-4">
              <div className="text-sm font-medium text-foreground">總成本</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {formatCurrency(totalCost)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}