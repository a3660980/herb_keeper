"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  inputMode,
  autoComplete,
  onKeyDown,
  onPaste,
  step,
  ...props
}: React.ComponentProps<"input">) {
  const isNumberInput = type === "number"

  return (
    <input
      // Keep native number input controls, but use integer stepping so +/- changes
      // the whole-number portion while still allowing manual decimal entry.
      type={type}
      inputMode={isNumberInput ? inputMode ?? "decimal" : inputMode}
      autoComplete={isNumberInput ? autoComplete ?? "off" : autoComplete}
      step={isNumberInput ? "any" : step}
      onKeyDown={(event) => {
        if (isNumberInput && ["+", "-", "e", "E"].includes(event.key)) {
          event.preventDefault()
          return
        }

        onKeyDown?.(event)
      }}
      onPaste={(event) => {
        if (isNumberInput) {
          const pastedText = event.clipboardData.getData("text")

          if (/[+\-eE]/.test(pastedText)) {
            event.preventDefault()
            return
          }
        }

        onPaste?.(event)
      }}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-[1.15rem] border border-border/70 bg-background/78 px-4 py-2 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition-[color,box-shadow,background-color,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-primary/30 focus-visible:ring-4 focus-visible:ring-ring/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/15 sm:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/30",
        className
      )}
      {...props}
    />
  )
}

export { Input }
