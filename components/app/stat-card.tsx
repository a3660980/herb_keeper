import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type StatCardProps = {
  label: string
  value: string
  description: string
  badge: string
  href?: string
  hrefLabel?: string
}

export function StatCard({
  label,
  value,
  description,
  badge,
  href,
  hrefLabel,
}: StatCardProps) {
  return (
    <Card className="border border-border/80 bg-card/96">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardDescription className="text-[11px] font-medium tracking-[0.12em] uppercase">
              {label}
            </CardDescription>
            <CardTitle className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-[2.1rem]">
              {href ? (
                <Link
                  href={href}
                  className="inline-flex items-baseline rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label={`${label}，前往${hrefLabel ?? "相關頁面"}`}
                >
                  <span>{value}</span>
                </Link>
              ) : (
                value
              )}
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-background text-primary">
            {badge}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          {href ? (
            <Link
              href={href}
              className="shrink-0 text-xs font-medium text-primary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              前往{hrefLabel ?? "詳情"}
            </Link>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
