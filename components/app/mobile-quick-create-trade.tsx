"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"

function shouldHideQuickCreate(pathname: string) {
  const normalizedPath = pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname

  return normalizedPath.endsWith("/new") || normalizedPath.endsWith("/edit")
}

export function MobileQuickCreateTrade() {
  const pathname = usePathname()

  if (shouldHideQuickCreate(pathname)) {
    return null
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 px-4 md:hidden">
      <Button asChild size="lg" className="pointer-events-auto w-full shadow-[0_20px_40px_-22px_rgba(37,99,235,0.5)]">
        <Link href="/orders/new">快速新增交易</Link>
      </Button>
    </div>
  )
}