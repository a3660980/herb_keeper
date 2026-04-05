import Link from "next/link"

import { cn } from "@/lib/utils"

type TradeModuleSwitchProps = {
  active: "orders" | "sales"
  className?: string
  orderHref?: string
  saleHref?: string
  orderLabel?: string
  saleLabel?: string
  ariaLabel?: string
}

const defaultTradeSwitchItems = {
  orders: {
    href: "/orders",
    label: "訂單出貨",
  },
  sales: {
    href: "/sales",
    label: "現場銷貨",
  },
} as const

export function TradeModuleSwitch({
  active,
  className,
  orderHref = defaultTradeSwitchItems.orders.href,
  saleHref = defaultTradeSwitchItems.sales.href,
  orderLabel = defaultTradeSwitchItems.orders.label,
  saleLabel = defaultTradeSwitchItems.sales.label,
  ariaLabel = "交易模式切換",
}: TradeModuleSwitchProps) {
  const items = [
    {
      key: "orders",
      href: orderHref,
      label: orderLabel,
    },
    {
      key: "sales",
      href: saleHref,
      label: saleLabel,
    },
  ] as const

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "rounded-[1.35rem] border border-border/80 bg-background/78 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]",
        className
      )}
    >
      <div className="grid grid-cols-2 gap-1.5">
        {items.map((item) => {
          const isActive = active === item.key

          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center justify-center rounded-[1rem] px-4 py-2.5 text-sm font-semibold transition-[background-color,color,box-shadow,transform] outline-none focus-visible:ring-4 focus-visible:ring-ring/18",
                isActive
                  ? "bg-primary text-primary-foreground shadow-[0_16px_24px_-18px_rgba(34,120,87,0.65)]"
                  : "text-muted-foreground hover:bg-card hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}