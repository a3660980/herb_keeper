import Link from "next/link"

import { FormMessage } from "@/components/app/form-message"
import { PageIntro } from "@/components/app/page-intro"
import { SubmitButton } from "@/components/app/submit-button"
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
import { type ProductListItem } from "@/lib/features/products"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"
import { getSingleSearchParam } from "@/lib/url"

import { deleteProductAction } from "./actions"

type ProductsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const currencyFormatter = new Intl.NumberFormat("zh-TW", {
  style: "currency",
  currency: "TWD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const quantityFormatter = new Intl.NumberFormat("zh-TW", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
})

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0)
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams
  const query = getSingleSearchParam(params.q)?.trim() ?? ""
  const supabaseEnvReady = hasSupabaseEnv()

  let products: ProductListItem[] = []
  let loadError = ""

  if (supabaseEnvReady) {
    try {
      const supabase = await createClient()
      let request = supabase
        .from("current_inventory_view")
        .select(
          "product_id, product_name, unit, base_price, avg_unit_cost, low_stock_threshold, cached_stock_quantity, ledger_stock_quantity, is_low_stock, updated_at"
        )
        .order("product_name")

      if (query) {
        request = request.ilike("product_name", `%${query}%`)
      }

      const { data, error } = await request

      if (error) {
        loadError = error.message
      } else {
        products = (data ?? []) as ProductListItem[]
      }
    } catch (requestError) {
      loadError =
        requestError instanceof Error
          ? requestError.message
          : "無法讀取藥材資料，請稍後再試。"
    }
  }

  const lowStockCount = products.filter((product) => product.is_low_stock).length
  const mismatchCount = products.filter((product) => {
    return (
      toNumber(product.cached_stock_quantity) !==
      toNumber(product.ledger_stock_quantity)
    )
  }).length

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Products"
        title="藥材管理"
        aside={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/products/inbounds">進貨歷史</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/products/inbounds/new">新增進貨</Link>
            </Button>
            <Button asChild>
              <Link href="/products/new">新增藥材</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>藥材品項</CardDescription>
            <CardTitle>{products.length}</CardTitle>
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
          <CardDescription>目前支援依藥材名稱搜尋，點擊藥材名稱可直接查看該藥材的基本資料、庫存與進貨紀錄。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" className="flex flex-col gap-3 sm:flex-row">
            <input
              name="q"
              defaultValue={query}
              placeholder="搜尋藥材名稱"
              className="flex h-11 w-full rounded-[1.15rem] border border-border/70 bg-background/78 px-4 py-2 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] outline-none transition-[color,box-shadow,background-color,border-color] placeholder:text-muted-foreground focus-visible:border-primary/30 focus-visible:ring-4 focus-visible:ring-ring/15 sm:text-sm"
            />
            <div className="flex gap-3">
              <Button type="submit" variant="secondary">
                搜尋
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href="/products">清除</Link>
              </Button>
            </div>
          </form>

          {!supabaseEnvReady ? (
            <FormMessage
              message="尚未連接資料來源，藥材資料暫時無法載入。"
              tone="info"
            />
          ) : loadError ? (
            <FormMessage message={loadError} tone="error" />
          ) : products.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                {query
                  ? "找不到符合搜尋條件的藥材。"
                  : "目前還沒有藥材資料，先建立第一筆藥材吧。"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>藥材</TableHead>
                  <TableHead>基準售價</TableHead>
                  <TableHead>平均成本</TableHead>
                  <TableHead>系統庫存</TableHead>
                  <TableHead>帳面庫存</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const cachedQuantity = toNumber(product.cached_stock_quantity)
                  const ledgerQuantity = toNumber(product.ledger_stock_quantity)
                  const hasMismatch = cachedQuantity !== ledgerQuantity

                  return (
                    <TableRow key={product.product_id}>
                      <TableCell>
                        <Link
                          href={`/products/${product.product_id}`}
                          className="font-medium text-foreground transition hover:text-primary hover:underline"
                        >
                          {product.product_name}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          單位：{product.unit}
                        </div>
                      </TableCell>
                      <TableCell>
                        {currencyFormatter.format(toNumber(product.base_price))}
                      </TableCell>
                      <TableCell>
                        {currencyFormatter.format(toNumber(product.avg_unit_cost))}
                      </TableCell>
                      <TableCell>
                        {quantityFormatter.format(cachedQuantity)} {product.unit}
                      </TableCell>
                      <TableCell>
                        {quantityFormatter.format(ledgerQuantity)} {product.unit}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {product.is_low_stock ? (
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
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="secondary">
                            <Link href={`/products/inbounds/new?productId=${product.product_id}`}>
                              進貨
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/products/${product.product_id}/edit`}>
                              編輯
                            </Link>
                          </Button>
                          <form action={deleteProductAction}>
                            <input
                              type="hidden"
                              name="productId"
                              value={product.product_id}
                            />
                            <input
                              type="hidden"
                              name="productName"
                              value={product.product_name}
                            />
                            <SubmitButton
                              size="sm"
                              variant="destructive"
                              pendingLabel="刪除中..."
                            >
                              刪除
                            </SubmitButton>
                          </form>
                        </div>
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
