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
}

export function StatCard({
  label,
  value,
  description,
  badge,
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
              {value}
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-background text-primary">
            {badge}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
