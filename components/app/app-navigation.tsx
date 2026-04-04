"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
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
              "group relative flex items-center gap-3 overflow-hidden rounded-[1.2rem] border px-4 py-3 transition duration-200",
              active
                ? "border-primary/25 bg-primary/8 text-foreground shadow-[0_16px_36px_-28px_rgba(37,99,235,0.35)]"
                : "border-border/80 bg-card/76 text-foreground hover:-translate-y-0.5 hover:border-primary/18 hover:bg-card"
            )}
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-[0.9rem] border text-[11px] font-semibold tracking-[0.18em]",
                active
                  ? "border-primary/20 bg-background text-primary"
                  : "border-border/70 bg-background/85 text-muted-foreground group-hover:text-primary"
              )}
            >
              {String(index + 1).padStart(2, "0")}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold tracking-[0.04em]">
                {item.title}
              </span>
            </span>

            <span
              aria-hidden
              className={cn(
                "size-2 shrink-0 rounded-full transition duration-200",
                active
                  ? "bg-primary shadow-[0_0_0_5px_rgba(37,99,235,0.12)]"
                  : "bg-border/90 group-hover:bg-primary/32"
              )}
            />
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
  const activeItem =
    mainNavigation.find((item) => isActivePath(pathname, item.href)) ??
    mainNavigation[0]

  return (
    <aside className="hidden border-r border-border/70 lg:block lg:h-screen lg:overflow-hidden">
      <div className="sidebar-scrollbar flex h-full min-h-0 flex-col overflow-y-auto px-4 py-5 xl:px-5">
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

          <div className="mt-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-[1.45rem] font-semibold leading-tight text-foreground">
                營運入口
              </h2>
              <p className="mt-1 text-xs tracking-[0.12em] text-muted-foreground uppercase">
                {mainNavigation.length} 個模組
              </p>
            </div>

            <span className="rounded-full border border-primary/16 bg-primary/8 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-primary uppercase">
              目前
            </span>
          </div>

          <div className="mt-5 rounded-[1rem] border border-border/70 bg-background/88 px-4 py-3.5">
            <div className="text-[10px] font-semibold tracking-[0.24em] text-primary uppercase">
              當前模組
            </div>
            <div className="mt-2 text-sm font-semibold text-foreground">
              {activeItem.title}
            </div>
          </div>
        </div>

        <div className="mt-5 flex-1">
          <NavigationList pathname={pathname} />
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
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-primary">HerbKeeper</div>
              <div className="rounded-full border border-primary/16 bg-primary/8 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-primary uppercase">
                {activeItem.title}
              </div>
            </div>
            <SheetTitle className="mt-3 text-2xl leading-tight">
              營運入口
            </SheetTitle>
          </SheetHeader>

          <div className="sidebar-scrollbar flex-1 overflow-y-auto px-4 py-4">
            <NavigationList pathname={pathname} mobile />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
