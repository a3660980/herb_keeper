"use client"

import * as React from "react"
import { Tick02Icon, UnfoldMoreIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type SearchableSelectOption = {
  value: string
  label: string
  searchText?: string
  secondaryText?: string
}

type SearchableSelectProps = {
  id?: string
  value: string
  options: SearchableSelectOption[]
  placeholder: string
  searchPlaceholder: string
  emptyMessage: string
  clearLabel?: string
  ariaLabel?: string
  "aria-label"?: string
  invalid?: boolean
  disabled?: boolean
  onValueChange: (value: string) => void
}

const triggerClassName =
  "flex h-11 w-full items-center justify-between gap-2 rounded-[1.15rem] border border-border/70 bg-background/78 px-4 py-2 text-left text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition-[color,box-shadow,background-color,border-color] outline-none focus-visible:border-primary/30 focus-visible:ring-4 focus-visible:ring-ring/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/15 sm:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/30"

export function SearchableSelect({
  id,
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  clearLabel = "清除選擇",
  ariaLabel,
  "aria-label": ariaLabelProp,
  invalid = false,
  disabled = false,
  onValueChange,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const contentId = React.useId()

  const selectedOption = options.find((option) => option.value === value)
  const accessibleLabel = ariaLabel ?? ariaLabelProp
  const normalizedQuery = query.trim().toLowerCase()
  const filteredOptions = normalizedQuery
    ? options.filter((option) => {
        const haystack = `${option.label} ${option.searchText ?? ""}`.toLowerCase()
        return haystack.includes(normalizedQuery)
      })
    : options

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)

        if (!nextOpen) {
          setQuery("")
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-controls={contentId}
          aria-expanded={open}
          aria-label={accessibleLabel}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          className={triggerClassName}
        >
          <span className={cn("truncate", !selectedOption && "text-muted-foreground")}>
            {selectedOption?.label ?? placeholder}
          </span>

          <HugeiconsIcon
            icon={UnfoldMoreIcon}
            strokeWidth={2}
            className="size-4 shrink-0 text-muted-foreground"
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        id={contentId}
        align="start"
        className="gap-0 overflow-hidden rounded-[1.35rem] p-0"
        style={{ width: "var(--radix-popover-trigger-width)" }}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          inputRef.current?.focus()
        }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            ref={inputRef}
            value={query}
            onValueChange={setQuery}
            placeholder={searchPlaceholder}
          />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {value ? (
                <>
                  <CommandItem
                    value="__clear__"
                    onSelect={() => {
                      onValueChange("")
                      setOpen(false)
                      setQuery("")
                    }}
                  >
                    <span className="truncate text-muted-foreground">{clearLabel}</span>
                  </CommandItem>
                  <CommandSeparator />
                </>
              ) : null}

              {filteredOptions.map((option) => {
                const isSelected = option.value === value

                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onValueChange(option.value)
                      setOpen(false)
                      setQuery("")
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{option.label}</div>
                      {option.secondaryText ? (
                        <div className="truncate text-xs text-muted-foreground">
                          {option.secondaryText}
                        </div>
                      ) : null}
                    </div>

                    <HugeiconsIcon
                      icon={Tick02Icon}
                      strokeWidth={2}
                      className={cn(
                        "size-4 shrink-0 text-primary transition-opacity",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}