"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { mainNavigation } from "@/lib/navigation"
import { cn } from "@/lib/utils"

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

const operationalHighlights = [
  "先處理低庫存，再安排待出貨訂單。",
  "門市銷貨完成後，營收與庫存會同步更新。",
  "客戶折扣、銷貨價格與報表可在同一工作台完成。",
]

type NavigationListProps = {
  pathname: string
  mobile?: boolean
}

function NavigationList({ pathname, mobile = false }: NavigationListProps) {
  return (
    <nav className={cn("flex flex-col gap-3", mobile && "gap-2.5")}>
      {mainNavigation.map((item, index) => {
        const active = isActivePath(pathname, item.href)

        const link = (
          <Link
            href={item.href}
            className={cn(
              "group relative flex items-start gap-3 overflow-hidden rounded-[1.2rem] border px-4 py-3.5 transition duration-200",
              active
                ? "border-primary/25 bg-primary/8 text-foreground shadow-[0_16px_36px_-28px_rgba(37,99,235,0.35)]"
                : "border-border/80 bg-card/76 text-foreground hover:-translate-y-0.5 hover:border-primary/18 hover:bg-card"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[0.9rem] border text-[11px] font-semibold tracking-[0.18em]",
                active
                  ? "border-primary/20 bg-background text-primary"
                  : "border-border/70 bg-background/85 text-muted-foreground group-hover:text-primary"
              )}
            >
              {String(index + 1).padStart(2, "0")}
            </span>

            <span className="min-w-0">
              <span className="block text-sm font-semibold tracking-[0.04em]">
                {item.title}
              </span>
              <span
                className={cn(
                  "mt-1 block text-xs leading-6",
                  active ? "text-foreground/72" : "text-muted-foreground"
                )}
              >
                {item.description}
              </span>
            </span>
          </Link>
        )

        if (mobile) {
          return (
            <SheetClose key={item.href} asChild>
              {link}
            </SheetClose>
          )
        }

        return <div key={item.href}>{link}</div>
      })}
    </nav>
  )
}

export function AppNavigation() {
  const pathname = usePathname()

  return (
    <aside className="hidden border-r border-border/70 lg:block">
      <div className="sticky top-0 flex min-h-screen flex-col px-4 py-5 xl:px-5">
        <div className="rounded-[1.75rem] border border-border/80 bg-sidebar/94 p-5 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.2)] backdrop-blur-xl xl:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-[1rem] bg-primary text-sm font-semibold text-primary-foreground shadow-[0_14px_28px_-16px_rgba(37,99,235,0.45)]">
              HK
            </div>
            <div>
              <div className="text-xs font-semibold text-primary">HerbKeeper</div>
              <div className="text-sm text-muted-foreground">中藥行進銷存</div>
            </div>
          </div>

          <h2 className="mt-5 font-heading text-[1.45rem] font-semibold leading-tight text-foreground">
            營運入口
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            藥材、客戶、訂單、門市銷貨、庫存與報表集中在同一個入口，讓日常作業更直接。
          </p>

          <div className="mt-5 rounded-[1rem] border border-border/70 bg-background/90 px-4 py-4 text-sm leading-6 text-muted-foreground">
            從左側切換模組即可延續同一份營運資料，不需要在不同頁面間重複確認。
          </div>
        </div>

        <div className="mt-6 flex-1">
          <NavigationList pathname={pathname} />
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-border/70 bg-secondary/60 p-5">
          <p className="text-[10px] uppercase tracking-[0.28em] text-primary">
            營運提醒
          </p>
          <div className="mt-3 text-sm font-semibold text-foreground">
            先看提醒，再處理交易
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {operationalHighlights.map((item) => (
              <div key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}

export function MobileNavigation() {
  const pathname = usePathname()
  const activeItem =
    mainNavigation.find((item) => isActivePath(pathname, item.href)) ??
    mainNavigation[0]

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          className="rounded-full border-border/70 bg-card/78 shadow-sm lg:hidden"
        >
          <span className="sr-only">開啟導覽</span>
          <span aria-hidden className="flex flex-col gap-1.5">
            <span className="block h-px w-4 bg-foreground" />
            <span className="block h-px w-4 bg-foreground/80" />
            <span className="block h-px w-4 bg-foreground/60" />
          </span>
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="w-[88vw] max-w-sm border-r border-border/70 bg-sidebar/96 p-0 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.5)]"
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-border/70 bg-background/66 px-6 py-6">
            <div className="text-sm font-medium text-primary">HerbKeeper</div>
            <SheetTitle className="mt-3 text-2xl leading-tight">
              營運入口
            </SheetTitle>
            <SheetDescription className="mt-2 leading-6">
              目前位於 {activeItem.title}，可直接切換到訂單、銷貨、庫存與報表作業。
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <NavigationList pathname={pathname} mobile />
          </div>

          <div className="border-t border-border/70 px-6 py-5">
            <div className="text-sm font-semibold text-foreground">常用作業</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              可快速切換到訂單、銷貨、庫存與報表，維持同一份日常營運資料。
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
