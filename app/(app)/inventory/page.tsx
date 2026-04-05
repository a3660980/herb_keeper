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
import { formatCurrency, formatQuantity, toNumberValue } from "@/lib/format"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"
import { getSingleSearchParam, withQueryString } from "@/lib/url"

type InventoryPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

type InventoryFilter = "" | "low" | "mismatch"

type InventoryRow = {
  product_id: string
  product_name: string
  unit: string
  base_price: number | string
  avg_unit_cost: number | string
  low_stock_threshold: number | string
  cached_stock_quantity: number | string
  ledger_stock_quantity: number | string
  is_low_stock: boolean
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const params = await searchParams
  const query = getSingleSearchParam(params.q)?.trim() ?? ""
  const selectedFilter = (getSingleSearchParam(params.filter)?.trim() ?? "") as InventoryFilter
  const supabaseEnvReady = hasSupabaseEnv()

  let items: InventoryRow[] = []
  let loadError = ""

  if (supabaseEnvReady) {
    try {
      const supabase = await createClient()
      let request = supabase
        .from("current_inventory_view")
        .select(
          "product_id, product_name, unit, base_price, avg_unit_cost, low_stock_threshold, cached_stock_quantity, ledger_stock_quantity, is_low_stock"
        )
        .order("product_name")

      if (query) {
        request = request.ilike("product_name", `%${query}%`)
      }

      const { data, error } = await request

      if (error) {
        loadError = error.message
      } else {
        items = (data ?? []) as InventoryRow[]
      }
    } catch (requestError) {
      loadError =
        requestError instanceof Error
          ? requestError.message
          : "無法讀取庫存資料，請稍後再試。"
    }
  }

  if (selectedFilter === "low") {
    items = items.filter((item) => item.is_low_stock)
  }

  if (selectedFilter === "mismatch") {
    items = items.filter((item) => {
      return (
        toNumberValue(item.cached_stock_quantity) !==
        toNumberValue(item.ledger_stock_quantity)
      )
    })
  }

  const totalProducts = items.length
  const lowStockCount = items.filter((item) => item.is_low_stock).length
  const mismatchCount = items.filter((item) => {
    return (
      toNumberValue(item.cached_stock_quantity) !==
      toNumberValue(item.ledger_stock_quantity)
    )
  }).length
  const totalLedgerStock = items.reduce(
    (sum, item) => sum + toNumberValue(item.ledger_stock_quantity),
    0
  )

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Inventory"
        title="庫存總覽"
        aside={
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/inventory/disposals/new">新增減損</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/inventory/disposals">減損歷史</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/products">前往藥材管理</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>品項數</CardDescription>
            <CardTitle>{totalProducts}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>帳面總庫存</CardDescription>
            <CardTitle>{formatQuantity(totalLedgerStock)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>低庫存品項</CardDescription>
            <CardTitle>{lowStockCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>帳存差異</CardDescription>
            <CardTitle>{mismatchCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle>搜尋與列表</CardTitle>
          <CardDescription>可依藥材名稱搜尋，或聚焦查看低庫存與帳存差異品項。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_auto_auto]">
            <Input name="q" defaultValue={query} placeholder="搜尋藥材名稱" />
            <select
              name="filter"
              defaultValue={selectedFilter}
              className="flex h-11 w-full rounded-[1.15rem] border border-border/70 bg-background/78 px-4 py-2 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] outline-none transition-[color,box-shadow,background-color,border-color] focus-visible:border-primary/30 focus-visible:ring-4 focus-visible:ring-ring/15 sm:text-sm"
            >
              <option value="">全部品項</option>
              <option value="low">只看低庫存</option>
              <option value="mismatch">只看帳存差異</option>
            </select>
            <Button type="submit" variant="secondary">
              搜尋
            </Button>
            <Button asChild type="button" variant="outline">
              <Link href="/inventory">清除</Link>
            </Button>
          </form>

          {!supabaseEnvReady ? (
            <FormMessage
              message="尚未連接資料來源，庫存資料暫時無法載入。"
              tone="info"
            />
          ) : loadError ? (
            <FormMessage message={loadError} tone="error" />
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center text-sm text-muted-foreground">
              {query || selectedFilter ? "找不到符合條件的庫存資料。" : "目前沒有庫存資料。"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>藥材</TableHead>
                  <TableHead>基準售價</TableHead>
                  <TableHead>平均成本</TableHead>
                  <TableHead>低庫存門檻</TableHead>
                  <TableHead>系統庫存</TableHead>
                  <TableHead>帳面庫存</TableHead>
                  <TableHead>差異</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const cached = toNumberValue(item.cached_stock_quantity)
                  const ledger = toNumberValue(item.ledger_stock_quantity)
                  const delta = ledger - cached
                  const hasMismatch = delta !== 0

                  return (
                    <TableRow key={item.product_id}>
                      <TableCell>
                        <Link
                          href={`/products/${item.product_id}`}
                          className="font-medium text-foreground transition-colors hover:text-primary"
                        >
                          {item.product_name}
                        </Link>
                        <div className="text-xs text-muted-foreground">單位：{item.unit}</div>
                      </TableCell>
                      <TableCell>{formatCurrency(item.base_price)}</TableCell>
                      <TableCell>{formatCurrency(item.avg_unit_cost)}</TableCell>
                      <TableCell>
                        {formatQuantity(item.low_stock_threshold)} {item.unit}
                      </TableCell>
                      <TableCell>
                        {formatQuantity(cached)} {item.unit}
                      </TableCell>
                      <TableCell>
                        {formatQuantity(ledger)} {item.unit}
                      </TableCell>
                      <TableCell>
                        {delta > 0 ? "+" : ""}
                        {formatQuantity(delta)} {item.unit}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {item.is_low_stock ? (
                            <Badge variant="destructive">低庫存</Badge>
                          ) : (
                            <Badge variant="secondary">正常</Badge>
                          )}
                          {hasMismatch ? (
                            <Badge variant="outline">帳存差異</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {ledger > 0 ? (
                          <Button asChild size="sm" variant="outline">
                            <Link
                              href={withQueryString("/inventory/disposals/new", {
                                productId: item.product_id,
                              })}
                            >
                              減損
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">無可減損庫存</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
