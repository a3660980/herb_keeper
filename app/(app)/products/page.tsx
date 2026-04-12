import Link from "next/link"

import { FormMessage } from "@/components/app/form-message"
import { PageIntro } from "@/components/app/page-intro"
import { QueryPagination } from "@/components/app/query-pagination"
import { SearchParamsForm } from "@/components/app/search-params-form"
import { SubmitButton } from "@/components/app/submit-button"
import { ProductsActionPanel } from "@/components/products/products-action-panel"
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
import { type ProductListItem } from "@/lib/features/products"
import { paginateItems, readPageParam } from "@/lib/pagination"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"
import { getSingleSearchParam, withQueryString } from "@/lib/url"

import { deleteProductAction } from "./actions"

type ProductsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

type ProductFilter = "" | "low" | "mismatch"

const PAGE_SIZE = 20

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams
  const query = getSingleSearchParam(params.q)?.trim() ?? ""
  const selectedFilter = (getSingleSearchParam(params.filter)?.trim() ?? "") as ProductFilter
  const requestedPage = readPageParam(params.page)
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

  if (selectedFilter === "low") {
    products = products.filter((product) => product.is_low_stock)
  }

  if (selectedFilter === "mismatch") {
    products = products.filter((product) => {
      return (
        toNumberValue(product.cached_stock_quantity) !==
        toNumberValue(product.ledger_stock_quantity)
      )
    })
  }

  const totalProducts = products.length
  const lowStockCount = products.filter((product) => product.is_low_stock).length
  const mismatchCount = products.filter((product) => {
    return (
      toNumberValue(product.cached_stock_quantity) !==
      toNumberValue(product.ledger_stock_quantity)
    )
  }).length
  const totalLedgerStock = products.reduce(
    (sum, product) => sum + toNumberValue(product.ledger_stock_quantity),
    0
  )
  const pagination = paginateItems(products, requestedPage, PAGE_SIZE)
  const currentViewBadges = [
    query ? `關鍵字：${query}` : "",
    selectedFilter === "low"
      ? "檢視：低庫存"
      : selectedFilter === "mismatch"
        ? "檢視：帳存差異"
        : "檢視：全部品項",
  ].filter(Boolean)
  const buildPageHref = (page: number) =>
    withQueryString("/products", {
      q: query || undefined,
      filter: selectedFilter || undefined,
      page: page > 1 ? String(page) : undefined,
    })

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Products"
        title="藥材庫存管理"
        description="把藥材主檔、即時庫存、帳存差異與補貨／減損操作集中在同一個工作台處理。"
        aside={<ProductsActionPanel />}
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
          <CardDescription>可依藥材名稱搜尋，並快速聚焦低庫存或帳存差異品項，直接執行進貨、減損、編輯與刪除。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchParamsForm className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_auto_auto]">
            <Input
              name="q"
              defaultValue={query}
              placeholder="搜尋藥材名稱"
            />
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
              <Link href="/products">清除</Link>
            </Button>
          </SearchParamsForm>

          <div className="rounded-[1.25rem] border border-border/60 bg-background/66 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold tracking-[0.14em] text-muted-foreground">
                篩選狀態
              </span>
              {currentViewBadges.map((label) => (
                <Badge key={label} variant="outline">
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          {!supabaseEnvReady ? (
            <FormMessage
              message="尚未連接資料來源，藥材資料暫時無法載入。"
              tone="info"
            />
          ) : loadError ? (
            <FormMessage message={loadError} tone="error" />
          ) : products.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                {query || selectedFilter
                  ? "找不到符合條件的藥材庫存資料。"
                  : "目前還沒有藥材資料，先建立第一筆藥材吧。"}
              </p>
              {!query && !selectedFilter ? (
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Button asChild>
                    <Link href="/products/new">新增第一筆藥材</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/products/inbounds">先看進貨歷史</Link>
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
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
                  {pagination.items.map((product) => {
                    const cachedQuantity = toNumberValue(product.cached_stock_quantity)
                    const ledgerQuantity = toNumberValue(product.ledger_stock_quantity)
                    const quantityDelta = ledgerQuantity - cachedQuantity
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
                        <TableCell>{formatCurrency(product.base_price)}</TableCell>
                        <TableCell>{formatCurrency(product.avg_unit_cost)}</TableCell>
                        <TableCell>
                          {formatQuantity(product.low_stock_threshold)} {product.unit}
                        </TableCell>
                        <TableCell>
                          {formatQuantity(cachedQuantity)} {product.unit}
                        </TableCell>
                        <TableCell>
                          {formatQuantity(ledgerQuantity)} {product.unit}
                        </TableCell>
                        <TableCell>
                          {quantityDelta > 0 ? "+" : ""}
                          {formatQuantity(quantityDelta)} {product.unit}
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
                            {ledgerQuantity > 0 ? (
                              <Button asChild size="sm" variant="outline">
                                <Link
                                  href={`/products/disposals/new?productId=${product.product_id}`}
                                >
                                  減損
                                </Link>
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" disabled>
                                減損
                              </Button>
                            )}
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

              <QueryPagination
                buildPageHref={buildPageHref}
                currentPage={pagination.currentPage}
                pageEnd={pagination.pageEnd}
                pageSize={PAGE_SIZE}
                pageStart={pagination.pageStart}
                paginationItems={pagination.paginationItems}
                totalItems={products.length}
                totalPages={pagination.totalPages}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
