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
      <CardHeader className="pr-28">
        <Badge
          variant="outline"
          className="absolute top-0 right-6 shrink-0 bg-background text-primary"
        >
          {badge}
        </Badge>

        <CardDescription className="text-[11px] font-medium tracking-[0.12em] uppercase">
          {label}
        </CardDescription>
        <CardTitle className="mt-3 min-w-0 font-heading [font-size:clamp(1rem,18cqw,2.85rem)] font-semibold leading-none tracking-tight tabular-nums">
          {href ? (
            <Link
              href={href}
              className="block min-w-0 rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={`${label}，前往${hrefLabel ?? "相關頁面"}`}
            >
              <span className="block min-w-0 whitespace-nowrap">{value}</span>
            </Link>
          ) : (
            <span className="block min-w-0 whitespace-nowrap">{value}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="min-w-0 text-sm leading-6 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
