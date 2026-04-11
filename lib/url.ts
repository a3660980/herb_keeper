export function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const BUSINESS_TIME_ZONE = "Asia/Taipei"
const BUSINESS_TIME_ZONE_OFFSET = "+08:00"

function parseDateInputParts(value: string) {
  if (!DATE_INPUT_PATTERN.test(value)) {
    return null
  }

  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    Number.isNaN(date.valueOf()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return { year, month, day }
}

function formatDateInputParts(year: number, month: number, day: number) {
  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`
}

function addDaysToDateInput(value: string, days: number) {
  const parts = parseDateInputParts(value)

  if (!parts) {
    return ""
  }

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days))

  return formatDateInputParts(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate()
  )
}

export function readDateParam(value: string | string[] | undefined) {
  const normalizedValue = getSingleSearchParam(value)?.trim() ?? ""

  if (!normalizedValue) {
    return ""
  }

  return parseDateInputParts(normalizedValue) ? normalizedValue : ""
}

export function hasInvalidDateRange(startDate: string, endDate: string) {
  return Boolean(startDate && endDate && startDate > endDate)
}

export function getDateRangeStartAt(startDate: string) {
  return startDate ? `${startDate}T00:00:00${BUSINESS_TIME_ZONE_OFFSET}` : ""
}

export function getDateRangeEndBefore(endDate: string) {
  const nextDate = addDaysToDateInput(endDate, 1)

  return nextDate ? `${nextDate}T00:00:00${BUSINESS_TIME_ZONE_OFFSET}` : ""
}

export function toDateInputValue(value: string | Date | number) {
  const date = new Date(value)

  if (Number.isNaN(date.valueOf())) {
    return ""
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)

  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value

  if (!year || !month || !day) {
    return ""
  }

  return `${year}-${month}-${day}`
}

export function withQueryString(
  path: string,
  params: Record<string, string | undefined>
) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value)
    }
  })

  const queryString = searchParams.toString()

  return queryString ? `${path}?${queryString}` : path
}