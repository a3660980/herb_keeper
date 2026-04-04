import Link from "next/link"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type TradeModuleSwitchProps = {
  active: "orders" | "sales"
  className?: string
}

export function TradeModuleSwitch({ active, className }: TradeModuleSwitchProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button asChild size="sm" variant={active === "orders" ? "default" : "outline"}>
        <Link href="/orders">訂單出貨</Link>
      </Button>
      <Button asChild size="sm" variant={active === "sales" ? "default" : "outline"}>
        <Link href="/sales">現場銷貨</Link>
      </Button>
    </div>
  )
}