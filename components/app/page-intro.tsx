import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type PageIntroProps = {
  eyebrow: string
  title: string
  description: string
  badges?: string[]
  aside?: ReactNode
  className?: string
}

export function PageIntro({
  eyebrow,
  title,
  description,
  badges = [],
  aside,
  className,
}: PageIntroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] border border-border/80 bg-card/94 p-6 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.14)] backdrop-blur-sm sm:p-8 lg:p-9",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="inline-flex rounded-full border border-border/80 bg-background px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
              {eyebrow}
            </p>
          </div>

          <h1 className="mt-4 max-w-4xl font-heading text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem]">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            {description}
          </p>

          {badges.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2.5">
              {badges.map((badge) => (
                <Badge key={badge} variant="outline" className="bg-background/90">
                  {badge}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        {aside ? (
          <div className="w-full max-w-sm lg:max-w-md">
            <div className="rounded-[1.25rem] border border-border/80 bg-background p-4 shadow-sm sm:p-5">
              {aside}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
