"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { FullscreenToggle } from "@/components/app/fullscreen-toggle"
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
import { mainNavigation, type AppNavigationItem } from "@/lib/navigation"
import { cn } from "@/lib/utils"

function isActivePath(pathname: string, item: AppNavigationItem) {
  const prefixes = item.matchPrefixes ?? [item.href]

  if (item.href === "/dashboard") {
    return prefixes.some((prefix) => pathname === prefix)
  }

  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

type NavigationListProps = {
  pathname: string
  mobile?: boolean
  collapsed?: boolean
}

function NavigationList({ pathname, mobile = false, collapsed = false }: NavigationListProps) {
  const compact = collapsed && !mobile

  return (
    <nav
      className={cn(
        "flex flex-col gap-3",
        mobile && "gap-2.5",
        compact && "items-center gap-2"
      )}
    >
      {mainNavigation.map((item, index) => {
        const active = isActivePath(pathname, item)
        const moduleInitial = Array.from(item.title).slice(0, 2).join("") || String(index + 1)

        const link = (
          <Link
            href={item.href}
            aria-label={compact ? item.title : undefined}
            title={compact ? item.title : undefined}
            className={cn(
              "group relative flex items-center rounded-[1.2rem] border transition duration-200",
              compact
                ? "size-14 justify-center overflow-visible px-0 py-0"
                : "gap-3 overflow-hidden px-4 py-3",
              active
                ? "border-primary/25 bg-primary/8 text-foreground shadow-[0_16px_36px_-28px_rgba(37,99,235,0.35)]"
                : "border-border/80 bg-card/76 text-foreground hover:-translate-y-0.5 hover:border-primary/18 hover:bg-card"
            )}
          >
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-[0.9rem] border font-semibold",
                compact ? "size-10 text-sm tracking-[0.02em]" : "size-9 text-[11px] tracking-[0.18em]",
                active
                  ? "border-primary/20 bg-background text-primary"
                  : "border-border/70 bg-background/85 text-muted-foreground group-hover:text-primary"
              )}
            >
              {compact ? moduleInitial : String(index + 1).padStart(2, "0")}
            </span>

            {compact ? (
              <>
                <span className="sr-only">{item.title}</span>
                <span
                  className={cn(
                    "pointer-events-none absolute left-full top-1/2 z-20 ml-3 -translate-y-1/2 rounded-xl border border-border/80 bg-background/96 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-foreground opacity-0 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.28)] transition duration-200",
                    "-translate-x-1 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
                  )}
                >
                  {item.title}
                </span>
              </>
            ) : (
              <>
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
              </>
            )}
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
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "hidden border-r border-border/70 transition-[width] duration-300 lg:block lg:h-screen",
        collapsed ? "lg:w-[5.75rem]" : "lg:w-[17.25rem] xl:w-[18.5rem]"
      )}
    >
      <div
        className={cn(
          "flex h-full min-h-0 flex-col px-3.5 py-5 transition-[padding] duration-300",
          collapsed ? "items-center px-2.5 py-4" : "xl:px-4"
        )}
      >
        <div
          className={cn(
            "rounded-[1.5rem] border border-border/80 bg-sidebar/94 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.2)] backdrop-blur-xl transition-all duration-300",
            collapsed ? "flex w-full flex-col items-center gap-3 p-3" : "p-3.5 xl:p-4"
          )}
        >
          <div className={cn("flex items-center", collapsed ? "flex-col gap-3" : "justify-between gap-3")}>
            <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
              <div className="flex size-11 items-center justify-center rounded-[1rem] bg-primary text-sm font-semibold text-primary-foreground shadow-[0_14px_28px_-16px_rgba(37,99,235,0.45)]">
                HK
              </div>

              {collapsed ? (
                <span className="sr-only">HerbKeeper 中藥行進銷存</span>
              ) : (
                <div>
                  <div className="text-xs font-semibold text-primary">HerbKeeper</div>
                  <div className="text-sm text-muted-foreground">中藥行進銷存</div>
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={collapsed ? "展開側邊欄" : "收合側邊欄"}
              title={collapsed ? "展開側邊欄" : "收合側邊欄"}
              onClick={() => setCollapsed((current) => !current)}
              className="rounded-full border border-border/70 bg-background/86 text-foreground shadow-none hover:bg-card"
            >
              <span aria-hidden className="text-sm font-semibold leading-none">
                {collapsed ? ">" : "<"}
              </span>
              <span className="sr-only">{collapsed ? "展開側邊欄" : "收合側邊欄"}</span>
            </Button>
          </div>
        </div>

        <div className={cn("mt-5 flex-1 min-h-0 sidebar-scrollbar overflow-y-auto", collapsed && "w-full")}>
          <NavigationList pathname={pathname} collapsed={collapsed} />
        </div>

        <div className={cn("mt-5", collapsed && "w-full")}>
          <div
            className={cn(
              "rounded-[1.5rem] border border-border/80 bg-sidebar/94 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.2)] backdrop-blur-xl transition-all duration-300",
              collapsed ? "flex justify-center p-3" : "p-3.5 xl:p-4"
            )}
          >
            <FullscreenToggle
              className={cn(
                "bg-background/86 shadow-none",
                collapsed
                  ? "rounded-full"
                  : "w-full justify-start rounded-[1rem] border-border/70"
              )}
              labelClassName={collapsed ? "sr-only" : undefined}
              size={collapsed ? "icon-lg" : "sm"}
            />
          </div>
        </div>
      </div>
    </aside>
  )
}

export function MobileNavigation() {
  const pathname = usePathname()

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
        showCloseButton={false}
        className="w-[88vw] max-w-sm border-r border-border/70 bg-sidebar/96 p-0 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.5)]"
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-border/70 bg-background/66 px-6 py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">HerbKeeper</div>
                <div className="text-xs text-muted-foreground">中藥行進銷存</div>
              </div>

              <SheetClose asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 rounded-full bg-secondary text-foreground shadow-sm"
                >
                  <span aria-hidden className="text-sm font-medium leading-none">
                    X
                  </span>
                  <span className="sr-only">關閉導覽</span>
                </Button>
              </SheetClose>
            </div>

            <SheetTitle className="sr-only">模組導覽</SheetTitle>
            <SheetDescription className="sr-only">
              瀏覽 HerbKeeper 的主要模組與目前所在頁面。
            </SheetDescription>
          </SheetHeader>

          <div className="sidebar-scrollbar flex-1 overflow-y-auto px-4 py-4">
            <NavigationList pathname={pathname} mobile />
          </div>

          <div className="border-t border-border/70 px-4 py-4">
            <FullscreenToggle
              className="w-full justify-start rounded-[1rem] border-border/70 bg-background/86 shadow-none"
              size="sm"
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
