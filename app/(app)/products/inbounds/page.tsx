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
import { formatCurrency, formatDateTime, formatQuantity, toNumberValue } from "@/lib/format"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"
import { getSingleSearchParam, withQueryString } from "@/lib/url"

type InboundHistoryPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

type ProductRelation = {
  name: string
  unit: string
}

type SelectedProduct = {
  id: string
  name: string
  unit: string
}

type SupplierRelation = {
  id: string
  name: string
  phone: string | null
  address: string | null
}

type RawInboundRow = {
  id: string
  product_id: string
  supplier_id: string
  quantity: number | string
  unit_cost: number | string
  inbound_date: string
  note: string | null
  product: ProductRelation | ProductRelation[] | null
  supplier: SupplierRelation | SupplierRelation[] | null
}

type InboundRow = {
  id: string
  productId: string
  supplierId: string
  quantity: number | string
  unitCost: number | string
  inboundDate: string
  note: string
  product: ProductRelation | null
  supplier: SupplierRelation | null
}

type SupplierOption = {
  id: string
  name: string
}

const PAGE_SIZE = 20

function normalizeRelation<T>(value: T | T[] | null) {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function readUuidParam(value: string | string[] | undefined) {
  const normalizedValue = getSingleSearchParam(value)?.trim() ?? ""

  if (!normalizedValue) {
    return ""
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalizedValue
  )
    ? normalizedValue
    : ""
}

function readDateParam(value: string | string[] | undefined) {
  const normalizedValue = getSingleSearchParam(value)?.trim() ?? ""

  if (!normalizedValue) {
    return ""
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    return ""
  }

  const date = new Date(`${normalizedValue}T00:00:00`)

  return Number.isNaN(date.valueOf()) ? "" : normalizedValue
}

function toDateInputValue(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.valueOf())) {
    return ""
  }

  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")

  return `${year}-${month}-${day}`
}

function isInboundWithinDateRange(value: string, startDate: string, endDate: string) {
  const inboundDate = toDateInputValue(value)

  if (!inboundDate) {
    return false
  }

  if (startDate && inboundDate < startDate) {
    return false
  }

  if (endDate && inboundDate > endDate) {
    return false
  }

  return true
}

function readPageParam(value: string | string[] | undefined) {
  const normalizedValue = getSingleSearchParam(value)?.trim() ?? ""
  const page = Number.parseInt(normalizedValue, 10)

  return Number.isFinite(page) && page > 0 ? page : 1
}

function getPaginationItems(totalPages: number, currentPage: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "ellipsis", totalPages] as const
  }

  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const
  }

  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages] as const
}

export default async function InboundHistoryPage({ searchParams }: InboundHistoryPageProps) {
  const params = await searchParams
  const rawQuery = getSingleSearchParam(params.q)?.trim() ?? ""
  const query = rawQuery.toLowerCase()
  const selectedProductId = readUuidParam(params.productId)
  const selectedSupplierId = readUuidParam(params.supplierId)
  const startDate = readDateParam(params.startDate)
  const endDate = readDateParam(params.endDate)
  const requestedPage = readPageParam(params.page)
  const supabaseEnvReady = hasSupabaseEnv()
  const dateRangeError =
    startDate && endDate && startDate > endDate
      ? "日期區間不正確，結束日不能早於開始日。"
      : ""

  let inboundRows: InboundRow[] = []
  let supplierOptions: SupplierOption[] = []
  let selectedProduct: SelectedProduct | null = null
  let loadError = ""

  if (supabaseEnvReady) {
    try {
      const supabase = await createClient()
      let inboundRequest = supabase
        .from("inbounds")
        .select(
          "id, product_id, supplier_id, quantity, unit_cost, inbound_date, note, product:products(name, unit), supplier:suppliers(id, name, phone, address)"
        )
        .order("inbound_date", { ascending: false })

      if (selectedProductId) {
        inboundRequest = inboundRequest.eq("product_id", selectedProductId)
      }

      if (selectedSupplierId) {
        inboundRequest = inboundRequest.eq("supplier_id", selectedSupplierId)
      }

      const [inboundsResponse, suppliersResponse, selectedProductResponse] = await Promise.all([
        inboundRequest,
        supabase.from("suppliers").select("id, name").order("name"),
        selectedProductId
          ? supabase
              .from("products")
              .select("id, name, unit")
              .eq("id", selectedProductId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ])

      if (inboundsResponse.error) {
        loadError = inboundsResponse.error.message
      } else if (suppliersResponse.error) {
        loadError = suppliersResponse.error.message
      } else if (selectedProductResponse.error) {
        loadError = selectedProductResponse.error.message
      } else {
        inboundRows = ((inboundsResponse.data ?? []) as RawInboundRow[]).map((row) => ({
          id: row.id,
          productId: row.product_id,
          supplierId: row.supplier_id,
          quantity: row.quantity,
          unitCost: row.unit_cost,
          inboundDate: row.inbound_date,
          note: row.note ?? "",
          product: normalizeRelation(row.product),
          supplier: normalizeRelation(row.supplier),
        }))
        supplierOptions = (suppliersResponse.data ?? []) as SupplierOption[]
        selectedProduct = (selectedProductResponse.data as SelectedProduct | null) ?? null
      }
    } catch (requestError) {
      loadError =
        requestError instanceof Error
          ? requestError.message
          : "無法讀取進貨歷史，請稍後再試。"
    }
  }

  if (!dateRangeError && (startDate || endDate)) {
    inboundRows = inboundRows.filter((row) =>
      isInboundWithinDateRange(row.inboundDate, startDate, endDate)
    )
  }

  if (query) {
    inboundRows = inboundRows.filter((row) => {
      const haystack = [
        row.product?.name ?? "",
        row.product?.unit ?? "",
        row.supplier?.name ?? "",
        row.supplier?.phone ?? "",
        row.supplier?.address ?? "",
        row.note,
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(query)
    })
  }

  const totalPages = Math.max(1, Math.ceil(inboundRows.length / PAGE_SIZE))
  const currentPage = inboundRows.length === 0 ? 1 : Math.min(requestedPage, totalPages)
  const pageStartIndex = (currentPage - 1) * PAGE_SIZE
  const paginatedRows = inboundRows.slice(pageStartIndex, pageStartIndex + PAGE_SIZE)
  const pageStart = inboundRows.length === 0 ? 0 : pageStartIndex + 1
  const pageEnd = inboundRows.length === 0 ? 0 : Math.min(pageStartIndex + PAGE_SIZE, inboundRows.length)
  const paginationItems = inboundRows.length === 0 ? [] : getPaginationItems(totalPages, currentPage)
  const totalAmount = inboundRows.reduce((sum, row) => {
    return sum + toNumberValue(row.quantity) * toNumberValue(row.unitCost)
  }, 0)
  const supplierCount = new Set(inboundRows.map((row) => row.supplierId)).size
  const productCount = new Set(inboundRows.map((row) => row.product?.name ?? row.id)).size
  const latestInboundDate = inboundRows[0]?.inboundDate ?? ""
  const hasActiveFilters = Boolean(rawQuery || selectedProductId || selectedSupplierId || startDate || endDate)
  const buildHistoryHref = (overrides: {
    productId?: string
    supplierId?: string
    q?: string
    startDate?: string
    endDate?: string
    page?: number
  }) =>
    withQueryString("/products/inbounds", {
      productId: overrides.productId,
      supplierId: overrides.supplierId,
      q: overrides.q,
      startDate: overrides.startDate,
      endDate: overrides.endDate,
      page: overrides.page && overrides.page > 1 ? String(overrides.page) : undefined,
    })
  const buildPageHref = (page: number) =>
    buildHistoryHref({
      productId: selectedProductId || undefined,
      supplierId: selectedSupplierId || undefined,
      q: rawQuery || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page,
    })
  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Products"
        title={selectedProduct ? `${selectedProduct.name} 進貨紀錄` : "進貨歷史"}
        description={
          selectedProduct
            ? `目前查看 ${selectedProduct.name} 的進貨紀錄，可回頭查每次向哪個供應商採購、進了多少與成本是多少。`
            : "回頭查每筆進貨是向哪個供應商採購、進了多少、成本是多少。"
        }
        aside={
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link
                href={
                  selectedProductId
                    ? withQueryString("/products/inbounds/new", { productId: selectedProductId })
                    : "/products/inbounds/new"
                }
              >
                新增進貨
              </Link>
            </Button>
            {selectedProductId ? (
              <Button asChild variant="outline">
                <Link href="/products/inbounds">查看全部進貨</Link>
              </Button>
            ) : null}
            {selectedProductId ? (
              <Button asChild variant="outline">
                <Link href={`/products/${selectedProductId}`}>藥材詳情</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/products">返回藥材管理</Link>
            </Button>
          </div>
        }
      />

      {dateRangeError ? <FormMessage message={dateRangeError} tone="error" /> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>進貨筆數</CardDescription>
            <CardTitle>{inboundRows.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>供應商數</CardDescription>
            <CardTitle>{supplierCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>涉及品項</CardDescription>
            <CardTitle>{productCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>採購總額</CardDescription>
            <CardTitle>{formatCurrency(totalAmount)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle>搜尋與列表</CardTitle>
          <CardDescription>
            可依藥材、供應商、電話、地址或備註搜尋，也可限定日期區間。{selectedProduct ? `目前已鎖定藥材：${selectedProduct.name}。` : ""}{latestInboundDate ? `最近一筆進貨時間：${formatDateTime(latestInboundDate)}。` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_14rem_11rem_11rem_auto_auto] xl:items-end">
            {selectedProductId ? <input type="hidden" name="productId" value={selectedProductId} /> : null}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">關鍵字</span>
              <Input
                name="q"
                defaultValue={rawQuery}
                placeholder="搜尋藥材、供應商、電話、地址或備註"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">供應商</span>
              <select
                name="supplierId"
                defaultValue={selectedSupplierId}
                className="flex h-11 w-full rounded-[1.15rem] border border-border/70 bg-background/78 px-4 py-2 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] outline-none transition-[color,box-shadow,background-color,border-color] focus-visible:border-primary/30 focus-visible:ring-4 focus-visible:ring-ring/15 sm:text-sm"
              >
                <option value="">全部供應商</option>
                {supplierOptions.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">開始日</span>
              <Input name="startDate" type="date" defaultValue={startDate} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">結束日</span>
              <Input name="endDate" type="date" defaultValue={endDate} />
            </label>
            <Button type="submit" variant="secondary" className="xl:self-end">
              套用篩選
            </Button>
            <Button asChild type="button" variant="outline" className="xl:self-end">
              <Link href="/products/inbounds">清除</Link>
            </Button>
          </form>

          {hasActiveFilters ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">目前篩選</span>
              {selectedProduct ? <Badge variant="outline">藥材：{selectedProduct.name}</Badge> : null}
              {rawQuery ? <Badge variant="outline">關鍵字：{rawQuery}</Badge> : null}
              {selectedSupplierId ? (
                <Badge variant="outline">
                  供應商：{supplierOptions.find((supplier) => supplier.id === selectedSupplierId)?.name ?? "已選供應商"}
                </Badge>
              ) : null}
              {startDate ? <Badge variant="secondary">開始日：{startDate}</Badge> : null}
              {endDate ? <Badge variant="secondary">結束日：{endDate}</Badge> : null}
            </div>
          ) : null}

          {!supabaseEnvReady ? (
            <FormMessage message="尚未連接資料來源，進貨歷史暫時無法載入。" tone="info" />
          ) : loadError ? (
            <FormMessage message={loadError} tone="error" />
          ) : inboundRows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center text-sm text-muted-foreground">
              {hasActiveFilters ? "找不到符合條件的進貨資料。" : "目前還沒有進貨紀錄。"}
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>進貨時間</TableHead>
                    <TableHead>藥材</TableHead>
                    <TableHead>供應商</TableHead>
                    <TableHead>數量</TableHead>
                    <TableHead>進貨單價</TableHead>
                    <TableHead>採購金額</TableHead>
                    <TableHead>備註</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRows.map((row) => {
                    const unit = row.product?.unit ?? ""
                    const lineTotal = toNumberValue(row.quantity) * toNumberValue(row.unitCost)

                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">{formatDateTime(row.inboundDate)}</div>
                          <div className="text-xs text-muted-foreground">{row.id.slice(0, 8).toUpperCase()}</div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <Link
                              href={`/products/${row.productId}`}
                              className="font-medium text-foreground transition hover:text-primary hover:underline"
                            >
                              {row.product?.name ?? "未知藥材"}
                            </Link>
                          </div>
                          <div className="text-xs text-muted-foreground">單位：{unit || "-"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">{row.supplier?.name ?? "未知供應商"}</div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {row.supplier?.phone ? <Badge variant="outline">{row.supplier.phone}</Badge> : null}
                            {row.supplier?.address ? <Badge variant="secondary">{row.supplier.address}</Badge> : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatQuantity(row.quantity)} {unit}
                        </TableCell>
                        <TableCell>{formatCurrency(row.unitCost)}</TableCell>
                        <TableCell>{formatCurrency(lineTotal)}</TableCell>
                        <TableCell>{row.note || "-"}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-3 border-t border-border/60 pt-4 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-muted-foreground">
                  顯示第 {pageStart} 至 {pageEnd} 筆，共 {inboundRows.length} 筆，每頁 {PAGE_SIZE} 筆。
                </p>

                {totalPages > 1 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {currentPage > 1 ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={buildPageHref(currentPage - 1)}>上一頁</Link>
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled>
                        上一頁
                      </Button>
                    )}

                    {paginationItems.map((item, index) => {
                      if (item === "ellipsis") {
                        return (
                          <span key={`ellipsis-${index}`} className="px-1 text-sm text-muted-foreground">
                            …
                          </span>
                        )
                      }

                      if (item === currentPage) {
                        return (
                          <Button key={item} size="sm" variant="secondary" disabled aria-current="page">
                            {item}
                          </Button>
                        )
                      }

                      return (
                        <Button key={item} asChild size="sm" variant="outline">
                          <Link href={buildPageHref(item)}>{item}</Link>
                        </Button>
                      )
                    })}

                    {currentPage < totalPages ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={buildPageHref(currentPage + 1)}>下一頁</Link>
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled>
                        下一頁
                      </Button>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}