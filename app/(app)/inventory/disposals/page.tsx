import Link from "next/link"

import { FormMessage } from "@/components/app/form-message"
import { PageIntro } from "@/components/app/page-intro"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
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
import {
  inventoryDisposalReasonLabels,
  inventoryDisposalReasonOptions,
  type InventoryDisposalReason,
} from "@/lib/features/inventory-disposals"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"
import { getSingleSearchParam, withQueryString } from "@/lib/url"

type InventoryDisposalsPageProps = {
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

type RawInventoryDisposalRow = {
  id: string
  product_id: string
  quantity: number | string
  reason: InventoryDisposalReason
  occurred_at: string
  unit_cost_snapshot: number | string
  note: string | null
  product: ProductRelation | ProductRelation[] | null
}

type InventoryDisposalRow = {
  id: string
  productId: string
  quantity: number | string
  reason: InventoryDisposalReason
  occurredAt: string
  unitCostSnapshot: number | string
  note: string
  product: ProductRelation | null
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

function isInventoryDisposalWithinDateRange(value: string, startDate: string, endDate: string) {
  const disposalDate = toDateInputValue(value)

  if (!disposalDate) {
    return false
  }

  if (startDate && disposalDate < startDate) {
    return false
  }

  if (endDate && disposalDate > endDate) {
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

function readReasonParam(value: string | string[] | undefined) {
  const normalizedValue = getSingleSearchParam(value)?.trim() ?? ""

  return inventoryDisposalReasonOptions.includes(normalizedValue as InventoryDisposalReason)
    ? (normalizedValue as InventoryDisposalReason)
    : ""
}

function getInventoryDisposalReasonBadgeVariant(reason: InventoryDisposalReason) {
  switch (reason) {
    case "damage":
    case "disaster":
      return "destructive" as const
    case "quality_return":
      return "secondary" as const
    default:
      return "outline" as const
  }
}

export default async function InventoryDisposalsPage({
  searchParams,
}: InventoryDisposalsPageProps) {
  const params = await searchParams
  const rawQuery = getSingleSearchParam(params.q)?.trim() ?? ""
  const query = rawQuery.toLowerCase()
  const selectedProductId = readUuidParam(params.productId)
  const selectedReason = readReasonParam(params.reason)
  const startDate = readDateParam(params.startDate)
  const endDate = readDateParam(params.endDate)
  const requestedPage = readPageParam(params.page)
  const status = getSingleSearchParam(params.status)
  const error = getSingleSearchParam(params.error)
  const supabaseEnvReady = hasSupabaseEnv()
  const dateRangeError =
    startDate && endDate && startDate > endDate
      ? "日期區間不正確，結束日不能早於開始日。"
      : ""

  let disposalRows: InventoryDisposalRow[] = []
  let selectedProduct: SelectedProduct | null = null
  let loadError = ""

  if (supabaseEnvReady) {
    try {
      const supabase = await createClient()
      let disposalRequest = supabase
        .from("inventory_adjustments")
        .select(
          "id, product_id, quantity, reason, occurred_at, unit_cost_snapshot, note, product:products(name, unit)"
        )
        .order("occurred_at", { ascending: false })

      if (selectedProductId) {
        disposalRequest = disposalRequest.eq("product_id", selectedProductId)
      }

      if (selectedReason) {
        disposalRequest = disposalRequest.eq("reason", selectedReason)
      }

      const [disposalsResponse, selectedProductResponse] = await Promise.all([
        disposalRequest,
        selectedProductId
          ? supabase
              .from("products")
              .select("id, name, unit")
              .eq("id", selectedProductId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ])

      if (disposalsResponse.error) {
        loadError = disposalsResponse.error.message
      } else if (selectedProductResponse.error) {
        loadError = selectedProductResponse.error.message
      } else {
        disposalRows = ((disposalsResponse.data ?? []) as RawInventoryDisposalRow[]).map((row) => ({
          id: row.id,
          productId: row.product_id,
          quantity: row.quantity,
          reason: row.reason,
          occurredAt: row.occurred_at,
          unitCostSnapshot: row.unit_cost_snapshot,
          note: row.note ?? "",
          product: normalizeRelation(row.product),
        }))
        selectedProduct = (selectedProductResponse.data as SelectedProduct | null) ?? null
      }
    } catch (requestError) {
      loadError =
        requestError instanceof Error
          ? requestError.message
          : "無法讀取庫存減損歷史，請稍後再試。"
    }
  }

  if (!dateRangeError && (startDate || endDate)) {
    disposalRows = disposalRows.filter((row) =>
      isInventoryDisposalWithinDateRange(row.occurredAt, startDate, endDate)
    )
  }

  if (query) {
    disposalRows = disposalRows.filter((row) => {
      const haystack = [
        row.product?.name ?? "",
        row.product?.unit ?? "",
        inventoryDisposalReasonLabels[row.reason],
        row.note,
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(query)
    })
  }

  const totalPages = Math.max(1, Math.ceil(disposalRows.length / PAGE_SIZE))
  const currentPage = disposalRows.length === 0 ? 1 : Math.min(requestedPage, totalPages)
  const pageStartIndex = (currentPage - 1) * PAGE_SIZE
  const paginatedRows = disposalRows.slice(pageStartIndex, pageStartIndex + PAGE_SIZE)
  const pageStart = disposalRows.length === 0 ? 0 : pageStartIndex + 1
  const pageEnd = disposalRows.length === 0 ? 0 : Math.min(pageStartIndex + PAGE_SIZE, disposalRows.length)
  const paginationItems = disposalRows.length === 0 ? [] : getPaginationItems(totalPages, currentPage)
  const totalDisposalQuantity = disposalRows.reduce((sum, row) => {
    return sum + toNumberValue(row.quantity)
  }, 0)
  const totalDisposalAmount = disposalRows.reduce((sum, row) => {
    return sum + toNumberValue(row.quantity) * toNumberValue(row.unitCostSnapshot)
  }, 0)
  const affectedProductCount = new Set(disposalRows.map((row) => row.productId)).size
  const latestDisposalDate = disposalRows[0]?.occurredAt ?? ""
  const hasActiveFilters = Boolean(rawQuery || selectedReason || startDate || endDate)
  const buildHistoryHref = (overrides: {
    productId?: string
    reason?: InventoryDisposalReason | ""
    q?: string
    startDate?: string
    endDate?: string
    page?: number
  }) =>
    withQueryString("/inventory/disposals", {
      productId: overrides.productId,
      reason: overrides.reason || undefined,
      q: overrides.q,
      startDate: overrides.startDate,
      endDate: overrides.endDate,
      page: overrides.page && overrides.page > 1 ? String(overrides.page) : undefined,
    })
  const buildPageHref = (page: number) =>
    buildHistoryHref({
      productId: selectedProductId || undefined,
      reason: selectedReason,
      q: rawQuery || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page,
    })

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Inventory"
        title={selectedProduct ? `${selectedProduct.name} 減損紀錄` : "庫存減損歷史"}
        description={
          selectedProduct
            ? `查看 ${selectedProduct.name} 的減損履歷與成本快照，便於追蹤非銷售性的庫存減量。`
            : "集中回查每筆庫存減損的時間、原因、數量與成本快照。"
        }
        aside={
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link
                href={
                  selectedProductId
                    ? withQueryString("/inventory/disposals/new", { productId: selectedProductId })
                    : "/inventory/disposals/new"
                }
              >
                新增減損
              </Link>
            </Button>
            {selectedProductId ? (
              <Button asChild variant="outline">
                <Link href="/inventory/disposals">查看全部減損</Link>
              </Button>
            ) : null}
            {selectedProductId ? (
              <Button asChild variant="outline">
                <Link href={`/products/${selectedProductId}`}>藥材詳情</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/inventory">返回庫存總覽</Link>
            </Button>
          </div>
        }
      />

      {status ? <FormMessage message={status} tone="success" /> : null}
      {error ? <FormMessage message={error} tone="error" /> : null}
      {dateRangeError ? <FormMessage message={dateRangeError} tone="error" /> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>減損筆數</CardDescription>
            <CardTitle>{disposalRows.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>減損總量</CardDescription>
            <CardTitle>
              {formatQuantity(totalDisposalQuantity)} {selectedProduct?.unit ?? "單位"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>估計損失成本</CardDescription>
            <CardTitle>{formatCurrency(totalDisposalAmount)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>受影響品項</CardDescription>
            <CardTitle>{affectedProductCount}</CardTitle>
            {latestDisposalDate ? (
              <p className="text-xs text-muted-foreground">最近一筆：{formatDateTime(latestDisposalDate)}</p>
            ) : null}
          </CardHeader>
        </Card>
      </div>

      <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle>搜尋與篩選</CardTitle>
          <CardDescription>可依藥材、減損原因與日期區間聚焦查找減損紀錄。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            method="get"
            className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_12rem_11rem_11rem_auto_auto]"
          >
            {selectedProductId ? <input type="hidden" name="productId" value={selectedProductId} /> : null}
            <Input name="q" defaultValue={rawQuery} placeholder="搜尋藥材名稱或備註" />
            <select
              name="reason"
              defaultValue={selectedReason}
              className="flex h-11 w-full rounded-[1.15rem] border border-border/70 bg-background/78 px-4 py-2 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] outline-none transition-[color,box-shadow,background-color,border-color] focus-visible:border-primary/30 focus-visible:ring-4 focus-visible:ring-ring/15 sm:text-sm"
            >
              <option value="">全部原因</option>
              {inventoryDisposalReasonOptions.map((reason) => (
                <option key={reason} value={reason}>
                  {inventoryDisposalReasonLabels[reason]}
                </option>
              ))}
            </select>
            <Input name="startDate" type="date" defaultValue={startDate} />
            <Input name="endDate" type="date" defaultValue={endDate} />
            <Button type="submit" variant="secondary">
              搜尋
            </Button>
            <Button asChild type="button" variant="outline">
              <Link href={buildHistoryHref({ productId: selectedProductId || undefined })}>清除</Link>
            </Button>
          </form>

          {selectedProduct ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">目前產品</span>
              <Badge variant="secondary">{selectedProduct.name}</Badge>
            </div>
          ) : null}

          {hasActiveFilters ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">目前篩選</span>
              {rawQuery ? <Badge variant="outline">關鍵字：{rawQuery}</Badge> : null}
              {selectedReason ? (
                <Badge variant="secondary">原因：{inventoryDisposalReasonLabels[selectedReason]}</Badge>
              ) : null}
              {startDate ? <Badge variant="outline">開始日：{startDate}</Badge> : null}
              {endDate ? <Badge variant="outline">結束日：{endDate}</Badge> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle>減損列表</CardTitle>
          <CardDescription>
            {disposalRows.length === 0
              ? "目前沒有符合條件的減損紀錄。"
              : `顯示第 ${pageStart} - ${pageEnd} 筆，共 ${disposalRows.length} 筆減損紀錄。`}
          </CardDescription>
          <CardAction>
            <Button
              asChild
              size="sm"
              variant="outline"
            >
              <Link
                href={
                  selectedProductId
                    ? withQueryString("/inventory/disposals/new", { productId: selectedProductId })
                    : "/inventory/disposals/new"
                }
              >
                新增減損
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          {!supabaseEnvReady ? (
            <FormMessage message="尚未連接資料來源，減損歷史暫時無法載入。" tone="info" />
          ) : loadError ? (
            <FormMessage message={loadError} tone="error" />
          ) : disposalRows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center text-sm text-muted-foreground">
              {rawQuery || selectedReason || startDate || endDate || selectedProductId
                ? "找不到符合條件的減損紀錄。"
                : "目前還沒有減損紀錄。"}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>減損時間</TableHead>
                    <TableHead>藥材</TableHead>
                    <TableHead>原因</TableHead>
                    <TableHead>減損數量</TableHead>
                    <TableHead>成本快照</TableHead>
                    <TableHead>估計損失</TableHead>
                    <TableHead>備註</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRows.map((row) => {
                    const lineAmount = toNumberValue(row.quantity) * toNumberValue(row.unitCostSnapshot)

                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">{formatDateTime(row.occurredAt)}</div>
                          <div className="text-xs text-muted-foreground">{row.id.slice(0, 8).toUpperCase()}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">{row.product?.name ?? "未知藥材"}</div>
                          <div className="text-xs text-muted-foreground">單位：{row.product?.unit ?? "-"}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getInventoryDisposalReasonBadgeVariant(row.reason)}>
                            {inventoryDisposalReasonLabels[row.reason]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatQuantity(row.quantity)} {row.product?.unit ?? ""}
                        </TableCell>
                        <TableCell>{formatCurrency(row.unitCostSnapshot)}</TableCell>
                        <TableCell>{formatCurrency(lineAmount)}</TableCell>
                        <TableCell className="max-w-[18rem] text-sm text-muted-foreground">
                          {row.note || "-"}
                        </TableCell>
                        <TableCell>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/products/${row.productId}`}>藥材詳情</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {paginationItems.length > 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-sm text-muted-foreground">
                  <div>
                    第 {pageStart} - {pageEnd} 筆，共 {disposalRows.length} 筆
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild size="sm" variant="outline" disabled={currentPage <= 1}>
                      <Link href={buildPageHref(Math.max(1, currentPage - 1))}>上一頁</Link>
                    </Button>
                    {paginationItems.map((item, index) =>
                      item === "ellipsis" ? (
                        <span key={`ellipsis-${index}`} className="px-1 text-muted-foreground">
                          ...
                        </span>
                      ) : (
                        <Button
                          key={item}
                          asChild
                          size="sm"
                          variant={item === currentPage ? "default" : "outline"}
                        >
                          <Link href={buildPageHref(item)}>{item}</Link>
                        </Button>
                      )
                    )}
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      disabled={currentPage >= totalPages}
                    >
                      <Link href={buildPageHref(Math.min(totalPages, currentPage + 1))}>下一頁</Link>
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}