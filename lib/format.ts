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

const dateTimeFormatter = new Intl.DateTimeFormat("zh-TW", {
  dateStyle: "medium",
  timeStyle: "short",
})

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0)
}

export function formatCurrency(value: number | string | null | undefined) {
  return currencyFormatter.format(toNumber(value))
}

export function formatQuantity(value: number | string | null | undefined) {
  return quantityFormatter.format(toNumber(value))
}

export function formatDateTime(value: string | Date | number) {
  return dateTimeFormatter.format(new Date(value))
}

export function formatDecimalInput(value: number) {
  return Number(value.toFixed(2)).toString()
}

export function toNumberValue(value: number | string | null | undefined) {
  return toNumber(value)
}