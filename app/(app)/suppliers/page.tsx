import Link from "next/link"

import { FormMessage } from "@/components/app/form-message"
import { PageIntro } from "@/components/app/page-intro"
import { QueryPagination } from "@/components/app/query-pagination"
import { SearchParamsForm } from "@/components/app/search-params-form"
import { SubmitButton } from "@/components/app/submit-button"
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
import { paginateItems, readPageParam } from "@/lib/pagination"
import { type SupplierRecord } from "@/lib/features/suppliers"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"
import { getSingleSearchParam, withQueryString } from "@/lib/url"

import { deleteSupplierAction } from "./actions"

type SuppliersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const PAGE_SIZE = 20

export default async function SuppliersPage({ searchParams }: SuppliersPageProps) {
  const params = await searchParams
  const query = getSingleSearchParam(params.q)?.trim() ?? ""
  const requestedPage = readPageParam(params.page)
  const supabaseEnvReady = hasSupabaseEnv()

  let suppliers: SupplierRecord[] = []
  let loadError = ""

  if (supabaseEnvReady) {
    try {
      const supabase = await createClient()
      let request = supabase
        .from("suppliers")
        .select("id, name, phone, address, note, updated_at")
        .order("name")

      if (query) {
        request = request.or(
          `name.ilike.%${query}%,phone.ilike.%${query}%,address.ilike.%${query}%`
        )
      }

      const { data, error } = await request

      if (error) {
        loadError = error.message
      } else {
        suppliers = (data ?? []) as SupplierRecord[]
      }
    } catch (requestError) {
      loadError =
        requestError instanceof Error
          ? requestError.message
          : "無法讀取供應商資料，請稍後再試。"
    }
  }

  const pagination = paginateItems(suppliers, requestedPage, PAGE_SIZE)
  const buildPageHref = (page: number) =>
    withQueryString("/suppliers", {
      q: query || undefined,
      page: page > 1 ? String(page) : undefined,
    })

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Suppliers"
        title="供應商管理"
        aside={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/products/inbounds">進貨歷史</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/products/inbounds/new">前往新增進貨</Link>
            </Button>
            <Button asChild>
              <Link href="/suppliers/new">新增供應商</Link>
            </Button>
          </div>
        }
      />

      <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle>搜尋與列表</CardTitle>
          <CardDescription>可依供應商名稱、電話或地址搜尋與維護。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchParamsForm className="flex flex-col gap-3 sm:flex-row">
            <input
              name="q"
              defaultValue={query}
              placeholder="搜尋供應商名稱、電話或地址"
              className="flex h-11 w-full rounded-[1.15rem] border border-border/70 bg-background/78 px-4 py-2 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] outline-none transition-[color,box-shadow,background-color,border-color] placeholder:text-muted-foreground focus-visible:border-primary/30 focus-visible:ring-4 focus-visible:ring-ring/15 sm:text-sm"
            />
            <div className="flex gap-3">
              <Button type="submit" variant="secondary">
                搜尋
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href="/suppliers">清除</Link>
              </Button>
            </div>
          </SearchParamsForm>

          {!supabaseEnvReady ? (
            <FormMessage message="尚未連接資料來源，供應商資料暫時無法載入。" tone="info" />
          ) : loadError ? (
            <FormMessage message={loadError} tone="error" />
          ) : suppliers.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center text-sm text-muted-foreground">
              {query ? "找不到符合條件的供應商。" : "目前還沒有供應商資料。"}
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>供應商</TableHead>
                    <TableHead>電話</TableHead>
                    <TableHead>地址</TableHead>
                    <TableHead>備註</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.items.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium text-foreground">{supplier.name}</TableCell>
                      <TableCell>{supplier.phone || "-"}</TableCell>
                      <TableCell>{supplier.address || "-"}</TableCell>
                      <TableCell>{supplier.note || "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/suppliers/${supplier.id}/edit`}>編輯</Link>
                          </Button>
                          <form action={deleteSupplierAction}>
                            <input type="hidden" name="supplierId" value={supplier.id} />
                            <input type="hidden" name="supplierName" value={supplier.name} />
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
                totalItems={suppliers.length}
                totalPages={pagination.totalPages}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}