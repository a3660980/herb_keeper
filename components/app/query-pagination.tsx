import Link from "next/link"

import { Button } from "@/components/ui/button"
import { type PaginationItem } from "@/lib/pagination"

type QueryPaginationProps = {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  pageStart: number
  pageEnd: number
  paginationItems: PaginationItem[]
  buildPageHref: (page: number) => string
}

export function QueryPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageStart,
  pageEnd,
  paginationItems,
  buildPageHref,
}: QueryPaginationProps) {
  if (totalItems === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border/60 pt-4 md:flex-row md:items-center md:justify-between">
      <p className="text-sm text-muted-foreground">
        顯示第 {pageStart} 至 {pageEnd} 筆，共 {totalItems} 筆，每頁 {pageSize} 筆。
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
                <span
                  key={`ellipsis-${index}`}
                  className="px-1 text-sm text-muted-foreground"
                >
                  ...
                </span>
              )
            }

            if (item === currentPage) {
              return (
                <Button key={item} size="sm" variant="secondary" disabled>
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
  )
}