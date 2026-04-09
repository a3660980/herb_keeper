import { getSingleSearchParam } from "@/lib/url"

export type PaginationItem = number | "ellipsis"

export type PaginationState = {
  totalItems: number
  pageSize: number
  totalPages: number
  currentPage: number
  pageStartIndex: number
  pageStart: number
  pageEnd: number
  paginationItems: PaginationItem[]
}

export function readPageParam(value: string | string[] | undefined) {
  const normalizedValue = getSingleSearchParam(value)?.trim() ?? ""
  const page = Number.parseInt(normalizedValue, 10)

  return Number.isFinite(page) && page > 0 ? page : 1
}

export function getPaginationItems(
  totalPages: number,
  currentPage: number
): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "ellipsis", totalPages]
  }

  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }

  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages]
}

export function getPaginationState(
  totalItems: number,
  requestedPage: number,
  pageSize: number
): PaginationState {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const currentPage = totalItems === 0 ? 1 : Math.min(requestedPage, totalPages)
  const pageStartIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize
  const pageStart = totalItems === 0 ? 0 : pageStartIndex + 1
  const pageEnd = totalItems === 0 ? 0 : Math.min(pageStartIndex + pageSize, totalItems)

  return {
    totalItems,
    pageSize,
    totalPages,
    currentPage,
    pageStartIndex,
    pageStart,
    pageEnd,
    paginationItems: totalItems === 0 ? [] : getPaginationItems(totalPages, currentPage),
  }
}

export function paginateItems<T>(items: T[], requestedPage: number, pageSize: number) {
  const pagination = getPaginationState(items.length, requestedPage, pageSize)

  return {
    ...pagination,
    items: items.slice(
      pagination.pageStartIndex,
      pagination.pageStartIndex + pageSize
    ),
  }
}