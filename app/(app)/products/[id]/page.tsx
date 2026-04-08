import Link from "next/link"
import { notFound } from "next/navigation"

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
  type InventoryDisposalReason,
} from "@/lib/features/inventory-disposals"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"
import { getSingleSearchParam, withQueryString } from "@/lib/url"

type ProductDetailPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

type ProductRow = {
  id: string
  name: string
  base_price: number | string
  avg_unit_cost: number | string
  low_stock_threshold: number | string
  unit: string
  created_at: string
  updated_at: string
}

type InventoryRow = {
  product_id: string
  cached_stock_quantity: number | string
  ledger_stock_quantity: number | string
  is_low_stock: boolean
  updated_at: string
}

type SupplierRelation = {
  id: string
  name: string
  phone: string | null
  address: string | null
}

type RawInboundRow = {
  id: string
  supplier_id: string
  quantity: number | string
  unit_cost: number | string
  inbound_date: string
  note: string | null
  supplier: SupplierRelation | SupplierRelation[] | null
}

type InboundRow = {
  id: string
  supplierId: string
  quantity: number | string
  unitCost: number | string
  inboundDate: string
  note: string
  supplier: SupplierRelation | null
}

type SupplierOption = {
  id: string
  name: string
}

type RawInventoryDisposalRow = {
  id: string
  quantity: number | string
  reason: InventoryDisposalReason
  occurred_at: string
  unit_cost_snapshot: number | string
  note: string | null
}

type InventoryDisposalRow = {
  id: string
  quantity: number | string
  reason: InventoryDisposalReason
  occurredAt: string
  unitCostSnapshot: number | string
  note: string
}

type RawTransactionRow = {
  transaction_type: "shipment" | "direct_sale"
  transaction_id: string
  transaction_date: string
  order_id: string | null
  direct_sale_id: string | null
  customer_name: string
  quantity: number | string
  final_unit_price: number | string
  revenue: number | string
  cost_total: number | string
  profit_total: number | string
}

type TransactionRow = {
  transactionType: "shipment" | "direct_sale"
  transactionId: string
  transactionDate: string
  orderId: string | null
  directSaleId: string | null
  customerName: string
  quantity: number | string
  finalUnitPrice: number | string
  revenue: number | string
  costTotal: number | string
  profitTotal: number | string
}

const INBOUND_PAGE_SIZE = 12
const DISPOSAL_PAGE_SIZE = 12
const TRANSACTION_PAGE_SIZE = 12

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

function isWithinDateRange(value: string, startDate: string, endDate: string) {
  const currentDate = toDateInputValue(value)

  if (!currentDate) {
    return false
  }

  if (startDate && currentDate < startDate) {
    return false
  }

  if (endDate && currentDate > endDate) {
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

function formatSignedQuantity(value: number) {
  if (value === 0) {
    return "0"
  }

  return `${value > 0 ? "+" : ""}${formatQuantity(value)}`
}

function getTransactionLabel(type: TransactionRow["transactionType"]) {
  return type === "shipment" ? "訂單出貨" : "現場銷貨"
}

function getTransactionBadgeVariant(type: TransactionRow["transactionType"]) {
  return type === "shipment" ? "outline" : "secondary"
}

function getTransactionDetailHref(row: TransactionRow) {
  if (row.transactionType === "shipment") {
    return row.orderId ? `/orders/${row.orderId}` : null
  }

  return row.directSaleId ? `/sales/${row.directSaleId}` : null
}

function getTransactionDetailLabel(row: TransactionRow) {
  return row.transactionType === "shipment" ? "查看訂單" : "查看銷貨"
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

export default async function ProductDetailPage({
  params,
  searchParams,
}: ProductDetailPageProps) {
  const { id } = await params
  const query = await searchParams
  const selectedSupplierId = readUuidParam(query.supplierId)
  const startDate = readDateParam(query.startDate)
  const endDate = readDateParam(query.endDate)
  const requestedInboundPage = readPageParam(query.inboundPage ?? query.page)
  const requestedDisposalPage = readPageParam(query.disposalPage)
  const requestedTransactionPage = readPageParam(query.transactionPage)
  const supabaseEnvReady = hasSupabaseEnv()
  const dateRangeError =
    startDate && endDate && startDate > endDate
      ? "日期區間不正確，結束日不能早於開始日。"
      : ""

  if (!supabaseEnvReady) {
    notFound()
  }

  const supabase = await createClient()
  const [productResponse, inventoryResponse, inboundResponse, disposalResponse, transactionResponse] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, base_price, avg_unit_cost, low_stock_threshold, unit, created_at, updated_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("current_inventory_view")
      .select("product_id, cached_stock_quantity, ledger_stock_quantity, is_low_stock, updated_at")
      .eq("product_id", id)
      .maybeSingle(),
    supabase
      .from("inbounds")
      .select("id, supplier_id, quantity, unit_cost, inbound_date, note, supplier:suppliers(id, name, phone, address)")
      .eq("product_id", id)
      .order("inbound_date", { ascending: false }),
    supabase
      .from("inventory_adjustments")
      .select("id, quantity, reason, occurred_at, unit_cost_snapshot, note")
      .eq("product_id", id)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("transaction_history_view")
      .select(
        "transaction_type, transaction_id, transaction_date, order_id, direct_sale_id, customer_name, quantity, final_unit_price, revenue, cost_total, profit_total"
      )
      .eq("product_id", id)
      .order("transaction_date", { ascending: false }),
  ])

  if (productResponse.error || !productResponse.data) {
    notFound()
  }

  const product = productResponse.data as ProductRow
  const inventory = (inventoryResponse.data ?? {
    product_id: id,
    cached_stock_quantity: 0,
    ledger_stock_quantity: 0,
    is_low_stock: false,
    updated_at: product.updated_at,
  }) as InventoryRow
  const allInboundRows: InboundRow[] = ((inboundResponse.data ?? []) as RawInboundRow[]).map((row) => ({
    id: row.id,
    supplierId: row.supplier_id,
    quantity: row.quantity,
    unitCost: row.unit_cost,
    inboundDate: row.inbound_date,
    note: row.note ?? "",
    supplier: normalizeRelation(row.supplier),
  }))
  const allDisposalRows: InventoryDisposalRow[] =
    ((disposalResponse.data ?? []) as RawInventoryDisposalRow[]).map((row) => ({
      id: row.id,
      quantity: row.quantity,
      reason: row.reason,
      occurredAt: row.occurred_at,
      unitCostSnapshot: row.unit_cost_snapshot,
      note: row.note ?? "",
    }))
  const allTransactionRows: TransactionRow[] =
    ((transactionResponse.data ?? []) as RawTransactionRow[]).map((row) => ({
      transactionType: row.transaction_type,
      transactionId: row.transaction_id,
      transactionDate: row.transaction_date,
      orderId: row.order_id,
      directSaleId: row.direct_sale_id,
      customerName: row.customer_name,
      quantity: row.quantity,
      finalUnitPrice: row.final_unit_price,
      revenue: row.revenue,
      costTotal: row.cost_total,
      profitTotal: row.profit_total,
    }))
  const loadError =
    inventoryResponse.error?.message ??
    inboundResponse.error?.message ??
    disposalResponse.error?.message ??
    transactionResponse.error?.message ??
    ""
  const supplierOptions: SupplierOption[] = Array.from(
    new Map(
      allInboundRows
        .filter((row) => row.supplier?.id)
        .map((row) => [row.supplier!.id, { id: row.supplier!.id, name: row.supplier!.name }])
    ).values()
  ).sort((left, right) => left.name.localeCompare(right.name, "zh-Hant"))

  let inboundRows = allInboundRows
  let disposalRows = allDisposalRows
  let transactionRows = allTransactionRows

  if (!dateRangeError && (startDate || endDate)) {
    inboundRows = inboundRows.filter((row) =>
      isWithinDateRange(row.inboundDate, startDate, endDate)
    )
    disposalRows = disposalRows.filter((row) =>
      isWithinDateRange(row.occurredAt, startDate, endDate)
    )
    transactionRows = transactionRows.filter((row) =>
      isWithinDateRange(row.transactionDate, startDate, endDate)
    )
  }

  if (selectedSupplierId) {
    inboundRows = inboundRows.filter((row) => row.supplierId === selectedSupplierId)
  }

  const cachedStock = toNumberValue(inventory.cached_stock_quantity)
  const ledgerStock = toNumberValue(inventory.ledger_stock_quantity)
  const inventoryDifference = ledgerStock - cachedStock
  const hasMismatch = cachedStock !== ledgerStock
  const totalInboundAmount = inboundRows.reduce((sum, row) => {
    return sum + toNumberValue(row.quantity) * toNumberValue(row.unitCost)
  }, 0)
  const totalInboundQuantity = inboundRows.reduce((sum, row) => {
    return sum + toNumberValue(row.quantity)
  }, 0)
  const totalDisposalAmount = disposalRows.reduce((sum, row) => {
    return sum + toNumberValue(row.quantity) * toNumberValue(row.unitCostSnapshot)
  }, 0)
  const totalDisposalQuantity = disposalRows.reduce((sum, row) => {
    return sum + toNumberValue(row.quantity)
  }, 0)
  const totalTransactionRevenue = transactionRows.reduce((sum, row) => {
    return sum + toNumberValue(row.revenue)
  }, 0)
  const totalTransactionProfit = transactionRows.reduce((sum, row) => {
    return sum + toNumberValue(row.profitTotal)
  }, 0)
  const totalTransactionQuantity = transactionRows.reduce((sum, row) => {
    return sum + toNumberValue(row.quantity)
  }, 0)
  const supplierCount = new Set(
    allInboundRows.map((row) => row.supplier?.id).filter(Boolean)
  ).size
  const latestInboundDate = inboundRows[0]?.inboundDate ?? ""
  const latestDisposalDate = disposalRows[0]?.occurredAt ?? ""
  const latestTransactionDate = transactionRows[0]?.transactionDate ?? ""
  const hasActiveFilters = Boolean(selectedSupplierId || startDate || endDate)
  const inboundTotalPages = Math.max(1, Math.ceil(inboundRows.length / INBOUND_PAGE_SIZE))
  const currentInboundPage = inboundRows.length === 0 ? 1 : Math.min(requestedInboundPage, inboundTotalPages)
  const inboundStartIndex = (currentInboundPage - 1) * INBOUND_PAGE_SIZE
  const paginatedInboundRows = inboundRows.slice(inboundStartIndex, inboundStartIndex + INBOUND_PAGE_SIZE)
  const inboundPageStart = inboundRows.length === 0 ? 0 : inboundStartIndex + 1
  const inboundPageEnd = inboundRows.length === 0 ? 0 : Math.min(inboundStartIndex + INBOUND_PAGE_SIZE, inboundRows.length)
  const inboundPaginationItems = inboundRows.length === 0 ? [] : getPaginationItems(inboundTotalPages, currentInboundPage)
  const disposalTotalPages = Math.max(1, Math.ceil(disposalRows.length / DISPOSAL_PAGE_SIZE))
  const currentDisposalPage =
    disposalRows.length === 0 ? 1 : Math.min(requestedDisposalPage, disposalTotalPages)
  const disposalStartIndex = (currentDisposalPage - 1) * DISPOSAL_PAGE_SIZE
  const paginatedDisposalRows = disposalRows.slice(
    disposalStartIndex,
    disposalStartIndex + DISPOSAL_PAGE_SIZE
  )
  const disposalPageStart = disposalRows.length === 0 ? 0 : disposalStartIndex + 1
  const disposalPageEnd =
    disposalRows.length === 0
      ? 0
      : Math.min(disposalStartIndex + DISPOSAL_PAGE_SIZE, disposalRows.length)
  const disposalPaginationItems =
    disposalRows.length === 0 ? [] : getPaginationItems(disposalTotalPages, currentDisposalPage)
  const transactionTotalPages = Math.max(1, Math.ceil(transactionRows.length / TRANSACTION_PAGE_SIZE))
  const currentTransactionPage =
    transactionRows.length === 0 ? 1 : Math.min(requestedTransactionPage, transactionTotalPages)
  const transactionStartIndex = (currentTransactionPage - 1) * TRANSACTION_PAGE_SIZE
  const paginatedTransactionRows = transactionRows.slice(
    transactionStartIndex,
    transactionStartIndex + TRANSACTION_PAGE_SIZE
  )
  const transactionPageStart = transactionRows.length === 0 ? 0 : transactionStartIndex + 1
  const transactionPageEnd =
    transactionRows.length === 0
      ? 0
      : Math.min(transactionStartIndex + TRANSACTION_PAGE_SIZE, transactionRows.length)
  const transactionPaginationItems =
    transactionRows.length === 0
      ? []
      : getPaginationItems(transactionTotalPages, currentTransactionPage)
  const selectedSupplierName =
    supplierOptions.find((supplier) => supplier.id === selectedSupplierId)?.name ?? "已選供應商"
  const buildDetailHref = (overrides: {
    supplierId?: string
    startDate?: string
    endDate?: string
    inboundPage?: number
    disposalPage?: number
    transactionPage?: number
  }) =>
    withQueryString(`/products/${id}`, {
      supplierId: overrides.supplierId,
      startDate: overrides.startDate,
      endDate: overrides.endDate,
      inboundPage:
        overrides.inboundPage && overrides.inboundPage > 1
          ? String(overrides.inboundPage)
          : undefined,
      disposalPage:
        overrides.disposalPage && overrides.disposalPage > 1
          ? String(overrides.disposalPage)
          : undefined,
      transactionPage:
        overrides.transactionPage && overrides.transactionPage > 1
          ? String(overrides.transactionPage)
          : undefined,
    })
  const buildInboundPageHref = (page: number) =>
    buildDetailHref({
      supplierId: selectedSupplierId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      inboundPage: page,
      disposalPage: currentDisposalPage,
      transactionPage: currentTransactionPage,
    })
  const buildDisposalPageHref = (page: number) =>
    buildDetailHref({
      supplierId: selectedSupplierId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      inboundPage: currentInboundPage,
      disposalPage: page,
      transactionPage: currentTransactionPage,
    })
  const buildTransactionPageHref = (page: number) =>
    buildDetailHref({
      supplierId: selectedSupplierId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      inboundPage: currentInboundPage,
      disposalPage: currentDisposalPage,
      transactionPage: page,
    })

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Products"
        title={product.name}
        description={`單位 ${product.unit}，在同一頁查看基本資料、庫存概況，以及完整的進貨、減損、出貨與銷貨履歷。`}
        aside={
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={withQueryString("/products/inbounds/new", { productId: id })}>
                新增進貨
              </Link>
            </Button>
            {ledgerStock > 0 ? (
              <Button asChild variant="outline">
                <Link href={withQueryString("/inventory/disposals/new", { productId: id })}>
                  新增減損
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href={`/products/${id}/edit`}>編輯藥材</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/products">返回藥材管理</Link>
            </Button>
          </div>
        }
      />

      {loadError ? <FormMessage message={loadError} tone="error" /> : null}
      {dateRangeError ? <FormMessage message={dateRangeError} tone="error" /> : null}

      <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle>履歷篩選</CardTitle>
          <CardDescription>
            日期區間會同時套用進貨、減損與出貨/銷貨紀錄；供應商篩選只會套用在進貨紀錄。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" className="grid gap-3 xl:grid-cols-[11rem_11rem_14rem_max-content] xl:items-end">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">開始日</span>
              <Input name="startDate" type="date" defaultValue={startDate} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">結束日</span>
              <Input name="endDate" type="date" defaultValue={endDate} />
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
            <div className="flex flex-wrap items-center gap-2 xl:self-end">
              <Button type="submit" size="sm" variant="secondary">
                套用篩選
              </Button>
              <Button asChild type="button" size="sm" variant="outline">
                <Link href={`/products/${id}`}>清除</Link>
              </Button>
            </div>
          </form>

          {hasActiveFilters ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">目前篩選</span>
              {startDate ? <Badge variant="outline">開始日：{startDate}</Badge> : null}
              {endDate ? <Badge variant="outline">結束日：{endDate}</Badge> : null}
              {selectedSupplierId ? (
                <Badge variant="secondary">供應商：{selectedSupplierName}</Badge>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>系統庫存</CardDescription>
            <CardTitle>
              {formatQuantity(cachedStock)} {product.unit}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>帳面庫存</CardDescription>
            <CardTitle>
              {formatQuantity(ledgerStock)} {product.unit}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>平均成本</CardDescription>
            <CardTitle>{formatCurrency(product.avg_unit_cost)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>累計進貨金額</CardDescription>
            <CardTitle>{formatCurrency(totalInboundAmount)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>銷貨營收</CardDescription>
            <CardTitle>{formatCurrency(totalTransactionRevenue)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>銷貨毛利</CardDescription>
            <CardTitle>{formatCurrency(totalTransactionProfit)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_24rem]">
        <div className="space-y-6">
          <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle>進貨紀錄</CardTitle>
              <CardDescription>
                共 {inboundRows.length} 筆，累計進貨 {formatQuantity(totalInboundQuantity)} {product.unit}。
                {latestInboundDate ? ` 最近一筆進貨：${formatDateTime(latestInboundDate)}。` : ""}
              </CardDescription>
              <CardAction>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                >
                  <Link
                    href={withQueryString("/products/inbounds", {
                      productId: id,
                      supplierId: selectedSupplierId || undefined,
                      startDate: startDate || undefined,
                      endDate: endDate || undefined,
                    })}
                  >
                    進階檢視
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-4">
              {inboundRows.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center text-sm text-muted-foreground">
                  {hasActiveFilters ? "目前篩選條件下找不到進貨紀錄。" : "這個藥材目前還沒有進貨紀錄。"}
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>進貨時間</TableHead>
                        <TableHead>供應商</TableHead>
                        <TableHead>進貨數量</TableHead>
                        <TableHead>進貨單價</TableHead>
                        <TableHead>採購金額</TableHead>
                        <TableHead>備註</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedInboundRows.map((row) => {
                        const lineTotal = toNumberValue(row.quantity) * toNumberValue(row.unitCost)

                        return (
                          <TableRow key={row.id}>
                            <TableCell>
                              <div className="font-medium text-foreground">{formatDateTime(row.inboundDate)}</div>
                              <div className="text-xs text-muted-foreground">{row.id.slice(0, 8).toUpperCase()}</div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-foreground">{row.supplier?.name ?? "未知供應商"}</div>
                              <div className="flex flex-wrap gap-2 pt-1">
                                {row.supplier?.phone ? <Badge variant="outline">{row.supplier.phone}</Badge> : null}
                                {row.supplier?.address ? <Badge variant="secondary">{row.supplier.address}</Badge> : null}
                              </div>
                            </TableCell>
                            <TableCell>
                              {formatQuantity(row.quantity)} {product.unit}
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
                      顯示第 {inboundPageStart} 至 {inboundPageEnd} 筆，共 {inboundRows.length} 筆。
                    </p>

                    {inboundTotalPages > 1 ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {currentInboundPage > 1 ? (
                          <Button asChild size="sm" variant="outline">
                            <Link href={buildInboundPageHref(currentInboundPage - 1)}>上一頁</Link>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled>
                            上一頁
                          </Button>
                        )}

                        {inboundPaginationItems.map((item, index) => {
                          if (item === "ellipsis") {
                            return (
                              <span key={`inbound-ellipsis-${index}`} className="px-1 text-sm text-muted-foreground">
                                …
                              </span>
                            )
                          }

                          if (item === currentInboundPage) {
                            return (
                              <Button key={item} size="sm" variant="secondary" disabled aria-current="page">
                                {item}
                              </Button>
                            )
                          }

                          return (
                            <Button key={item} asChild size="sm" variant="outline">
                              <Link href={buildInboundPageHref(item)}>{item}</Link>
                            </Button>
                          )
                        })}

                        {currentInboundPage < inboundTotalPages ? (
                          <Button asChild size="sm" variant="outline">
                            <Link href={buildInboundPageHref(currentInboundPage + 1)}>下一頁</Link>
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

          <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle>減損紀錄</CardTitle>
              <CardDescription>
                共 {disposalRows.length} 筆，累計減損 {formatQuantity(totalDisposalQuantity)} {product.unit}，估計損失成本 {formatCurrency(totalDisposalAmount)}。
                {latestDisposalDate ? ` 最近一筆減損：${formatDateTime(latestDisposalDate)}。` : ""}
              </CardDescription>
              <CardAction>
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={withQueryString("/inventory/disposals", {
                      productId: id,
                      startDate: startDate || undefined,
                      endDate: endDate || undefined,
                    })}
                  >
                    進階檢視
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-4">
              {disposalRows.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center text-sm text-muted-foreground">
                  {startDate || endDate ? "目前日期區間內找不到減損紀錄。" : "這個藥材目前還沒有減損紀錄。"}
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>減損時間</TableHead>
                        <TableHead>原因</TableHead>
                        <TableHead>減損數量</TableHead>
                        <TableHead>成本快照</TableHead>
                        <TableHead>估計損失</TableHead>
                        <TableHead>備註</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedDisposalRows.map((row) => {
                        const lineAmount =
                          toNumberValue(row.quantity) * toNumberValue(row.unitCostSnapshot)

                        return (
                          <TableRow key={row.id}>
                            <TableCell>
                              <div className="font-medium text-foreground">{formatDateTime(row.occurredAt)}</div>
                              <div className="text-xs text-muted-foreground">{row.id.slice(0, 8).toUpperCase()}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getInventoryDisposalReasonBadgeVariant(row.reason)}>
                                {inventoryDisposalReasonLabels[row.reason]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatQuantity(row.quantity)} {product.unit}
                            </TableCell>
                            <TableCell>{formatCurrency(row.unitCostSnapshot)}</TableCell>
                            <TableCell>{formatCurrency(lineAmount)}</TableCell>
                            <TableCell>{row.note || "-"}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>

                  <div className="flex flex-col gap-3 border-t border-border/60 pt-4 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm text-muted-foreground">
                      顯示第 {disposalPageStart} 至 {disposalPageEnd} 筆，共 {disposalRows.length} 筆。
                    </p>

                    {disposalTotalPages > 1 ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {currentDisposalPage > 1 ? (
                          <Button asChild size="sm" variant="outline">
                            <Link href={buildDisposalPageHref(currentDisposalPage - 1)}>上一頁</Link>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled>
                            上一頁
                          </Button>
                        )}

                        {disposalPaginationItems.map((item, index) => {
                          if (item === "ellipsis") {
                            return (
                              <span key={`disposal-ellipsis-${index}`} className="px-1 text-sm text-muted-foreground">
                                …
                              </span>
                            )
                          }

                          if (item === currentDisposalPage) {
                            return (
                              <Button key={item} size="sm" variant="secondary" disabled aria-current="page">
                                {item}
                              </Button>
                            )
                          }

                          return (
                            <Button key={item} asChild size="sm" variant="outline">
                              <Link href={buildDisposalPageHref(item)}>{item}</Link>
                            </Button>
                          )
                        })}

                        {currentDisposalPage < disposalTotalPages ? (
                          <Button asChild size="sm" variant="outline">
                            <Link href={buildDisposalPageHref(currentDisposalPage + 1)}>下一頁</Link>
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

          <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle>出貨與銷貨紀錄</CardTitle>
              <CardDescription>
                共 {transactionRows.length} 筆，累計出貨／銷貨 {formatQuantity(totalTransactionQuantity)} {product.unit}。
                {latestTransactionDate ? ` 最近一筆交易：${formatDateTime(latestTransactionDate)}。` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {transactionRows.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center text-sm text-muted-foreground">
                  {startDate || endDate ? "目前日期區間內找不到出貨或銷貨紀錄。" : "這個藥材目前還沒有出貨或銷貨紀錄。"}
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>交易時間</TableHead>
                        <TableHead>類型</TableHead>
                        <TableHead>客戶</TableHead>
                        <TableHead>數量</TableHead>
                        <TableHead>成交單價</TableHead>
                        <TableHead>營收</TableHead>
                        <TableHead>毛利</TableHead>
                        <TableHead>詳情</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTransactionRows.map((row) => {
                        const detailHref = getTransactionDetailHref(row)

                        return (
                          <TableRow key={`${row.transactionType}-${row.transactionId}`}>
                            <TableCell>
                              <div className="font-medium text-foreground">{formatDateTime(row.transactionDate)}</div>
                              <div className="text-xs text-muted-foreground">{row.transactionId.slice(0, 8).toUpperCase()}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getTransactionBadgeVariant(row.transactionType)}>
                                {getTransactionLabel(row.transactionType)}
                              </Badge>
                            </TableCell>
                            <TableCell>{row.customerName}</TableCell>
                            <TableCell>
                              {formatQuantity(row.quantity)} {product.unit}
                            </TableCell>
                            <TableCell>{formatCurrency(row.finalUnitPrice)}</TableCell>
                            <TableCell>{formatCurrency(row.revenue)}</TableCell>
                            <TableCell>{formatCurrency(row.profitTotal)}</TableCell>
                            <TableCell>
                              {detailHref ? (
                                <Button asChild size="sm" variant="outline">
                                  <Link href={detailHref}>{getTransactionDetailLabel(row)}</Link>
                                </Button>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>

                  <div className="flex flex-col gap-3 border-t border-border/60 pt-4 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm text-muted-foreground">
                      顯示第 {transactionPageStart} 至 {transactionPageEnd} 筆，共 {transactionRows.length} 筆。
                    </p>

                    {transactionTotalPages > 1 ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {currentTransactionPage > 1 ? (
                          <Button asChild size="sm" variant="outline">
                            <Link href={buildTransactionPageHref(currentTransactionPage - 1)}>上一頁</Link>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled>
                            上一頁
                          </Button>
                        )}

                        {transactionPaginationItems.map((item, index) => {
                          if (item === "ellipsis") {
                            return (
                              <span key={`transaction-ellipsis-${index}`} className="px-1 text-sm text-muted-foreground">
                                …
                              </span>
                            )
                          }

                          if (item === currentTransactionPage) {
                            return (
                              <Button key={item} size="sm" variant="secondary" disabled aria-current="page">
                                {item}
                              </Button>
                            )
                          }

                          return (
                            <Button key={item} asChild size="sm" variant="outline">
                              <Link href={buildTransactionPageHref(item)}>{item}</Link>
                            </Button>
                          )
                        })}

                        {currentTransactionPage < transactionTotalPages ? (
                          <Button asChild size="sm" variant="outline">
                            <Link href={buildTransactionPageHref(currentTransactionPage + 1)}>下一頁</Link>
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

        <div className="space-y-6">
          <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle>基本資料</CardTitle>
              <CardDescription>藥材主檔與售價設定。</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm">
                <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
                  <dt className="text-muted-foreground">藥材名稱</dt>
                  <dd className="text-right font-medium text-foreground">{product.name}</dd>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
                  <dt className="text-muted-foreground">單位</dt>
                  <dd className="text-right font-medium text-foreground">{product.unit}</dd>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
                  <dt className="text-muted-foreground">基準售價</dt>
                  <dd className="text-right font-medium text-foreground">{formatCurrency(product.base_price)}</dd>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
                  <dt className="text-muted-foreground">低庫存門檻</dt>
                  <dd className="text-right font-medium text-foreground">
                    {formatQuantity(product.low_stock_threshold)} {product.unit}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
                  <dt className="text-muted-foreground">建立時間</dt>
                  <dd className="text-right font-medium text-foreground">{formatDateTime(product.created_at)}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted-foreground">最近更新</dt>
                  <dd className="text-right font-medium text-foreground">
                    {formatDateTime(inventory.updated_at || product.updated_at)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle>庫存概況</CardTitle>
              <CardDescription>對照系統庫存、帳面庫存與目前狀態。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {inventory.is_low_stock ? (
                  <Badge variant="destructive">低庫存</Badge>
                ) : (
                  <Badge variant="secondary">庫存正常</Badge>
                )}
                {hasMismatch ? <Badge variant="outline">帳存差異</Badge> : null}
              </div>

              <dl className="grid gap-4 text-sm">
                <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
                  <dt className="text-muted-foreground">系統庫存</dt>
                  <dd className="text-right font-medium text-foreground">
                    {formatQuantity(cachedStock)} {product.unit}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
                  <dt className="text-muted-foreground">帳面庫存</dt>
                  <dd className="text-right font-medium text-foreground">
                    {formatQuantity(ledgerStock)} {product.unit}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
                  <dt className="text-muted-foreground">帳存差異</dt>
                  <dd className="text-right font-medium text-foreground">
                    {formatSignedQuantity(inventoryDifference)} {product.unit}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted-foreground">合作供應商</dt>
                  <dd className="text-right font-medium text-foreground">{supplierCount}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}