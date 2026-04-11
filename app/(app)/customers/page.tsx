import Link from "next/link"

import { FormMessage } from "@/components/app/form-message"
import { PageIntro } from "@/components/app/page-intro"
import { QueryPagination } from "@/components/app/query-pagination"
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
import {
  customerTypeOptions,
  type CustomerRecord,
} from "@/lib/features/customers"
import { paginateItems, readPageParam } from "@/lib/pagination"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"
import { getSingleSearchParam, withQueryString } from "@/lib/url"

import { deleteCustomerAction } from "./actions"

type CustomersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const PAGE_SIZE = 20

const customerTypeLabels: Record<(typeof customerTypeOptions)[number], string> = {
  general: "一般客",
  vip: "VIP",
  wholesale: "批發",
}

function normalizeCustomerQuery(value: string) {
  return value.replaceAll(",", " ").trim()
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const params = await searchParams
  const query = getSingleSearchParam(params.q)?.trim() ?? ""
  const selectedType = getSingleSearchParam(params.type)?.trim() ?? ""
  const requestedPage = readPageParam(params.page)
  const supabaseEnvReady = hasSupabaseEnv()

  let customers: CustomerRecord[] = []
  let loadError = ""

  if (supabaseEnvReady) {
    try {
      const supabase = await createClient()
      let request = supabase
        .from("customers")
        .select("id, name, phone, address, type, discount_rate, updated_at")
        .order("name")

      if (query) {
        const normalizedQuery = normalizeCustomerQuery(query)
        request = request.or(
          `name.ilike.%${normalizedQuery}%,phone.ilike.%${normalizedQuery}%,address.ilike.%${normalizedQuery}%`
        )
      }

      if (
        selectedType &&
        customerTypeOptions.includes(selectedType as (typeof customerTypeOptions)[number])
      ) {
        request = request.eq("type", selectedType)
      }

      const { data, error } = await request

      if (error) {
        loadError = error.message
      } else {
        customers = (data ?? []) as CustomerRecord[]
      }
    } catch (requestError) {
      loadError =
        requestError instanceof Error
          ? requestError.message
          : "無法讀取客戶資料，請稍後再試。"
    }
  }

  const vipCount = customers.filter((customer) => customer.type === "vip").length
  const wholesaleCount = customers.filter(
    (customer) => customer.type === "wholesale"
  ).length
  const pagination = paginateItems(customers, requestedPage, PAGE_SIZE)
  const buildPageHref = (page: number) =>
    withQueryString("/customers", {
      q: query || undefined,
      type: selectedType || undefined,
      page: page > 1 ? String(page) : undefined,
    })

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Customers"
        title="客戶管理"
        aside={
          <Button asChild>
            <Link href="/customers/new">新增客戶</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>客戶總數</CardDescription>
            <CardTitle>{customers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>VIP 客戶</CardDescription>
            <CardTitle>{vipCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardDescription>批發客戶</CardDescription>
            <CardTitle>{wholesaleCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle>搜尋與列表</CardTitle>
          <CardDescription>支援依客戶名稱、電話與類型篩選。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_auto_auto]">
            <input
              name="q"
              defaultValue={query}
              placeholder="搜尋客戶名稱或電話"
              className="flex h-11 w-full rounded-[1.15rem] border border-border/70 bg-background/78 px-4 py-2 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] outline-none transition-[color,box-shadow,background-color,border-color] placeholder:text-muted-foreground focus-visible:border-primary/30 focus-visible:ring-4 focus-visible:ring-ring/15 sm:text-sm"
            />
            <select
              name="type"
              defaultValue={selectedType}
              className="flex h-11 w-full rounded-[1.15rem] border border-border/70 bg-background/78 px-4 py-2 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] outline-none transition-[color,box-shadow,background-color,border-color] focus-visible:border-primary/30 focus-visible:ring-4 focus-visible:ring-ring/15 sm:text-sm"
            >
              <option value="">全部類型</option>
              {customerTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {customerTypeLabels[type]}
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary">
              搜尋
            </Button>
            <Button asChild type="button" variant="outline">
              <Link href="/customers">清除</Link>
            </Button>
          </form>

          {!supabaseEnvReady ? (
            <FormMessage
              message="尚未連接資料來源，客戶資料暫時無法載入。"
              tone="info"
            />
          ) : loadError ? (
            <FormMessage message={loadError} tone="error" />
          ) : customers.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                {query || selectedType
                  ? "找不到符合條件的客戶。"
                  : "目前還沒有客戶資料，先建立第一位客戶吧。"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>客戶</TableHead>
                    <TableHead>電話</TableHead>
                    <TableHead>地址</TableHead>
                    <TableHead>類型</TableHead>
                    <TableHead>折扣倍率</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.items.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium text-foreground">
                        {customer.name}
                      </TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell>{customer.address || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{customerTypeLabels[customer.type]}</Badge>
                      </TableCell>
                      <TableCell>{customer.discount_rate}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="secondary">
                            <Link href={`/customers/${customer.id}`}>交易歷史</Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/customers/${customer.id}/edit`}>編輯</Link>
                          </Button>
                          <form action={deleteCustomerAction}>
                            <input type="hidden" name="customerId" value={customer.id} />
                            <input
                              type="hidden"
                              name="customerName"
                              value={customer.name}
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
                  ))}
                </TableBody>
              </Table>

              <QueryPagination
                buildPageHref={buildPageHref}
                currentPage={pagination.currentPage}
                pageEnd={pagination.pageEnd}
                pageSize={PAGE_SIZE}
                pageStart={pagination.pageStart}
                paginationItems={pagination.paginationItems}
                totalItems={customers.length}
                totalPages={pagination.totalPages}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
