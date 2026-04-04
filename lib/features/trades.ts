import { toNumberValue } from "@/lib/format"

export type TradeKind = "order" | "sale"
export type TradeStatus = "pending" | "partial" | "completed"

export type TradeCustomerOption = {
  id: string
  name: string
  phone: string
  discountRate: number
}

export type TradeProductOption = {
  id: string
  name: string
  basePrice: number
  unit: string
  availableStock: number
  isLowStock: boolean
}

export type TradeSummary = {
  id: string
  kind: TradeKind
  customerId: string
  customerName: string
  occurredAt: string
  note: string
  itemCount: number
  totalQuantity: number
  fulfilledQuantity: number
  remainingQuantity: number
  totalAmount: number
  status: TradeStatus
}

type TradeCustomerNameRow = {
  id: string
  name: string
}

type OrderTradeRow = {
  id: string
  customerId: string
  occurredAt: string
  status: TradeStatus
  note: string | null
}

type OrderTradeItemRow = {
  tradeId: string
  quantity: number | string
  fulfilledQuantity: number | string
  unitPrice: number | string
}

type SaleTradeRow = {
  id: string
  customerId: string
  occurredAt: string
  note: string | null
}

type SaleTradeItemRow = {
  tradeId: string
  quantity: number | string
  lineTotal: number | string
}

export const tradeCreateModeConfig = {
  order: {
    switchLabel: "訂單",
    returnHref: "/orders",
    returnLabel: "返回訂單列表",
    cardTitle: "訂單主檔與明細",
    submitLabel: "建立訂單",
    pendingLabel: "建立中...",
  },
  sale: {
    switchLabel: "銷貨",
    returnHref: "/sales",
    returnLabel: "返回銷貨列表",
    cardTitle: "銷貨主檔與明細",
    submitLabel: "建立現場銷貨",
    pendingLabel: "建立中...",
  },
} as const

function buildCustomerNameMap(customers: TradeCustomerNameRow[]) {
  return new Map(customers.map((customer) => [customer.id, customer.name]))
}

export function buildOrderTradeSummaries(
  orders: OrderTradeRow[],
  customers: TradeCustomerNameRow[],
  items: OrderTradeItemRow[]
): TradeSummary[] {
  const customerMap = buildCustomerNameMap(customers)
  const itemsByTradeId = new Map<string, OrderTradeItemRow[]>()

  items.forEach((item) => {
    const currentItems = itemsByTradeId.get(item.tradeId) ?? []
    currentItems.push(item)
    itemsByTradeId.set(item.tradeId, currentItems)
  })

  return orders.map((order) => {
    const tradeItems = itemsByTradeId.get(order.id) ?? []
    const totalQuantity = tradeItems.reduce(
      (total, item) => total + toNumberValue(item.quantity),
      0
    )
    const fulfilledQuantity = tradeItems.reduce(
      (total, item) => total + toNumberValue(item.fulfilledQuantity),
      0
    )
    const totalAmount = tradeItems.reduce(
      (total, item) => total + toNumberValue(item.quantity) * toNumberValue(item.unitPrice),
      0
    )

    return {
      id: order.id,
      kind: "order",
      customerId: order.customerId,
      customerName: customerMap.get(order.customerId) ?? "未知客戶",
      occurredAt: order.occurredAt,
      note: order.note ?? "",
      itemCount: tradeItems.length,
      totalQuantity,
      fulfilledQuantity,
      remainingQuantity: Math.max(totalQuantity - fulfilledQuantity, 0),
      totalAmount,
      status: order.status,
    }
  })
}

export function buildSaleTradeSummaries(
  sales: SaleTradeRow[],
  customers: TradeCustomerNameRow[],
  items: SaleTradeItemRow[]
): TradeSummary[] {
  const customerMap = buildCustomerNameMap(customers)
  const itemsByTradeId = new Map<string, SaleTradeItemRow[]>()

  items.forEach((item) => {
    const currentItems = itemsByTradeId.get(item.tradeId) ?? []
    currentItems.push(item)
    itemsByTradeId.set(item.tradeId, currentItems)
  })

  return sales.map((sale) => {
    const tradeItems = itemsByTradeId.get(sale.id) ?? []
    const totalQuantity = tradeItems.reduce(
      (total, item) => total + toNumberValue(item.quantity),
      0
    )
    const totalAmount = tradeItems.reduce(
      (total, item) => total + toNumberValue(item.lineTotal),
      0
    )

    return {
      id: sale.id,
      kind: "sale",
      customerId: sale.customerId,
      customerName: customerMap.get(sale.customerId) ?? "未知客戶",
      occurredAt: sale.occurredAt,
      note: sale.note ?? "",
      itemCount: tradeItems.length,
      totalQuantity,
      fulfilledQuantity: totalQuantity,
      remainingQuantity: 0,
      totalAmount,
      status: "completed",
    }
  })
}

export function filterTradeSummaries(trades: TradeSummary[], query: string) {
  if (!query) {
    return trades
  }

  const normalizedQuery = query.toLowerCase()

  return trades.filter((trade) => {
    return (
      trade.customerName.toLowerCase().includes(normalizedQuery) ||
      trade.note.toLowerCase().includes(normalizedQuery) ||
      trade.id.toLowerCase().includes(normalizedQuery)
    )
  })
}

export function getCurrentDateTimeLocalValue(date = new Date()) {
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60_000)

  return localDate.toISOString().slice(0, 16)
}

export function localDateTimeToIsoString(
  value: string,
  timezoneOffsetMinutes: number
) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)

  if (!match) {
    return null
  }

  const [, year, month, day, hour, minute] = match
  const utcTimestamp =
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute)
    ) + timezoneOffsetMinutes * 60_000

  return new Date(utcTimestamp).toISOString()
}