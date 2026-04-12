"use client"

import * as React from "react"

import { Calendar03Icon, Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { format, isSameDay } from "date-fns"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { DateRange, Modifiers } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type ReportDateRangePickerProps = {
  startDate: string
  endDate: string
  className?: string
  autoApply?: boolean
  startDateFieldName?: string
  endDateFieldName?: string
}

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DATE_RANGE_MODE_ALL = "all"

function parseDateInputValue(value: string) {
  if (!DATE_INPUT_PATTERN.test(value)) {
    return undefined
  }

  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(year, month - 1, day)

  if (
    Number.isNaN(date.valueOf()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined
  }

  return date
}

function formatDateInputValue(value: Date) {
  return format(value, "yyyy-MM-dd")
}

function formatDisplayDate(value?: Date) {
  return value ? format(value, "yyyy/MM/dd") : "不限"
}

function isDateBetweenExclusive(date: Date, start: Date, end: Date) {
  const dateTime = date.getTime()
  const startTime = start.getTime()
  const endTime = end.getTime()
  const minTime = Math.min(startTime, endTime)
  const maxTime = Math.max(startTime, endTime)

  return dateTime > minTime && dateTime < maxTime
}

function isDateBefore(date: Date, comparedDate: Date) {
  return date.getTime() < comparedDate.getTime()
}

function createDateRange(startDate: string, endDate: string): DateRange | undefined {
  const from = parseDateInputValue(startDate)
  const to = parseDateInputValue(endDate)

  if (!from && !to) {
    return undefined
  }

  return {
    from,
    to,
  }
}

export function ReportDateRangePicker({
  startDate,
  endDate,
  className,
  autoApply = true,
  startDateFieldName = "startDate",
  endDateFieldName = "endDate",
}: ReportDateRangePickerProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()
  const [range, setRange] = React.useState<DateRange | undefined>(() =>
    createDateRange(startDate, endDate)
  )
  const [hoveredDate, setHoveredDate] = React.useState<Date | undefined>()

  React.useEffect(() => {
    setRange(createDateRange(startDate, endDate))
    setHoveredDate(undefined)
  }, [endDate, startDate])

  const buttonLabel = `${formatDisplayDate(range?.from)} ~ ${formatDisplayDate(range?.to)}`
  const hasSelectedRange = Boolean(range?.from || range?.to)
  const pendingRangeStart = range?.from && !range.to ? range.from : undefined
  const isPreviewReversed = Boolean(
    pendingRangeStart && hoveredDate && isDateBefore(hoveredDate, pendingRangeStart)
  )

  const applyRange = React.useCallback(
    (nextRange?: DateRange) => {
      if (!nextRange?.from || !nextRange?.to) {
        return
      }

      const params = new URLSearchParams(searchParams.toString())
      params.delete("dateRange")
      params.set("startDate", formatDateInputValue(nextRange.from))
      params.set("endDate", formatDateInputValue(nextRange.to))
      params.delete("page")

      const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname

      startTransition(() => {
        router.push(nextUrl)
      })

      setHoveredDate(undefined)
      setOpen(false)
    },
    [pathname, router, searchParams]
  )

  const clearRange = React.useCallback(() => {
    if (!autoApply) {
      setRange(undefined)
      setHoveredDate(undefined)
      setOpen(false)
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    params.set("dateRange", DATE_RANGE_MODE_ALL)
    params.delete("startDate")
    params.delete("endDate")
    params.delete("page")

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname

    setRange(undefined)
    setHoveredDate(undefined)
    setOpen(false)

    startTransition(() => {
      router.push(nextUrl)
    })
  }, [autoApply, pathname, router, searchParams])

  const handleSelect = React.useCallback(
    (nextRange: DateRange | undefined) => {
      setRange(nextRange)
      setHoveredDate(undefined)

      if (!autoApply && nextRange?.from && nextRange.to) {
        setOpen(false)
        return
      }

      if (autoApply && nextRange?.from && nextRange.to) {
        applyRange(nextRange)
      }
    },
    [applyRange, autoApply]
  )

  const handleDayMouseEnter = React.useCallback((day: Date, modifiers: Modifiers) => {
    if (modifiers.outside || !pendingRangeStart || isSameDay(day, pendingRangeStart)) {
      setHoveredDate(undefined)
      return
    }

    setHoveredDate(day)
  }, [pendingRangeStart])

  const handleCalendarMouseLeave = React.useCallback(() => {
    setHoveredDate(undefined)
  }, [])

  const modifiers = React.useMemo(
    () => ({
      previewRangeAnchorForward: (date: Date) =>
        Boolean(
          pendingRangeStart &&
            hoveredDate &&
            !isPreviewReversed &&
            isSameDay(date, pendingRangeStart)
        ),
      previewRangeAnchorBackward: (date: Date) =>
        Boolean(
          pendingRangeStart &&
            hoveredDate &&
            isPreviewReversed &&
            isSameDay(date, pendingRangeStart)
        ),
      previewRangeMiddle: (date: Date) =>
        Boolean(
          pendingRangeStart &&
            hoveredDate &&
            isDateBetweenExclusive(date, pendingRangeStart, hoveredDate)
        ),
      previewRangeHoverForward: (date: Date) =>
        Boolean(
          pendingRangeStart && hoveredDate && !isPreviewReversed && isSameDay(date, hoveredDate)
        ),
      previewRangeHoverBackward: (date: Date) =>
        Boolean(
          pendingRangeStart && hoveredDate && isPreviewReversed && isSameDay(date, hoveredDate)
        ),
    }),
    [hoveredDate, isPreviewReversed, pendingRangeStart]
  )

  const modifiersClassNames = React.useMemo(
    () => ({
      previewRangeAnchorForward:
        "relative isolate z-0 rounded-l-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-muted [&_button]:rounded-(--cell-radius) [&_button]:rounded-l-(--cell-radius) [&_button]:bg-primary [&_button]:text-primary-foreground",
      previewRangeAnchorBackward:
        "relative isolate z-0 rounded-r-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-muted [&_button]:rounded-(--cell-radius) [&_button]:rounded-r-(--cell-radius) [&_button]:bg-primary [&_button]:text-primary-foreground",
      previewRangeMiddle:
        "rounded-none bg-muted/90 [&_button]:rounded-none [&_button]:bg-muted/90 [&_button]:text-foreground",
      previewRangeHoverForward:
        "relative isolate z-0 rounded-r-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-muted [&_button]:rounded-(--cell-radius) [&_button]:rounded-r-(--cell-radius) [&_button]:bg-[oklch(0.46_0.11_156.5)] [&_button]:text-primary-foreground",
      previewRangeHoverBackward:
        "relative isolate z-0 rounded-l-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-muted [&_button]:rounded-(--cell-radius) [&_button]:rounded-l-(--cell-radius) [&_button]:bg-[oklch(0.46_0.11_156.5)] [&_button]:text-primary-foreground",
    }),
    []
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("group relative w-full", className)}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start gap-0 text-left font-normal hover:translate-y-0 active:translate-y-0",
              hasSelectedRange && "pr-11"
            )}
          >
            <span className="inline-flex items-center justify-start gap-1">
              <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} />
              <span className="truncate">{isPending ? "套用中..." : buttonLabel}</span>
            </span>
          </Button>
        </PopoverTrigger>

        {hasSelectedRange ? (
          <button
            type="button"
            aria-label="清除日期範圍"
            className="absolute inset-y-0 right-3 my-auto flex size-5 items-center justify-center text-muted-foreground opacity-0 transition-[opacity,color] group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              clearRange()
            }}
            onMouseDown={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
          </button>
        ) : null}
      </div>
      <PopoverContent align="end" className="w-auto p-0">
        <PopoverHeader className="px-4 pt-4">
          <PopoverTitle>日期區間</PopoverTitle>
          <PopoverDescription>
            {autoApply
              ? "第一下選開始日，第二下選結束日，完成後才會自動套用。"
              : "第一下選開始日，第二下選結束日，完成後再按搜尋套用。"}
          </PopoverDescription>
        </PopoverHeader>
        <div className="border-t border-border/60 px-2 py-3" onMouseLeave={handleCalendarMouseLeave}>
          <Calendar
            mode="range"
            selected={range}
            onSelect={handleSelect}
            onDayMouseEnter={handleDayMouseEnter}
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            resetOnSelect
            numberOfMonths={2}
            defaultMonth={range?.from ?? new Date()}
            className="[--cell-size:--spacing(9)]"
          />
        </div>
      </PopoverContent>

      {!autoApply ? (
        <>
          {range?.from ? (
            <input
              type="hidden"
              name={startDateFieldName}
              value={formatDateInputValue(range.from)}
            />
          ) : null}
          {range?.to ? (
            <input
              type="hidden"
              name={endDateFieldName}
              value={formatDateInputValue(range.to)}
            />
          ) : null}
        </>
      ) : null}
    </Popover>
  )
}