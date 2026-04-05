import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type PageIntroProps = {
  eyebrow: string
  title: string
  description?: string
  aside?: ReactNode
  className?: string
}

export function PageIntro({
  eyebrow,
  title,
  description,
  aside,
  className,
}: PageIntroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[1.5rem] border border-border/80 bg-card/94 p-5 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.14)] backdrop-blur-sm sm:p-6 lg:p-7",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="inline-flex rounded-full border border-border/80 bg-background px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
              {eyebrow}
            </p>
          </div>

          <h1 className="mt-3 max-w-4xl font-heading text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl lg:text-[2.25rem]">
            {title}
          </h1>

          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
          ) : null}
        </div>

        {aside ? (
          <div className="w-full max-w-sm lg:w-auto lg:max-w-md">
            <div className="rounded-[1.15rem] border border-border/80 bg-background p-3.5 shadow-sm sm:p-4">
              {aside}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
