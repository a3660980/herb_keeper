import type { ReactNode } from "react"
import Link from "next/link"
import packageJson from "@/package.json"

import { AppNavigation, MobileNavigation } from "@/components/app/app-navigation"
import { MobileQuickCreateTrade } from "@/components/app/mobile-quick-create-trade"
import { SessionPanel } from "@/components/app/session-panel"
import { Button } from "@/components/ui/button"

type AppShellProps = {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const appVersion = `v${packageJson.version}`
  const todayLabel = new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date())

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="relative mx-auto min-h-screen max-w-[1680px] lg:grid lg:h-screen lg:grid-cols-[auto_minmax(0,1fr)] lg:overflow-hidden">
        <AppNavigation />

        <div className="min-w-0 lg:flex lg:h-screen lg:min-h-0 lg:flex-col">
          <div className="content-scrollbar lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            <header className="sticky top-0 z-30 border-b border-border/80 bg-background/78 backdrop-blur-xl supports-[backdrop-filter]:bg-background/68">
              <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-3">
                  <MobileNavigation />

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium tracking-[0.08em] text-primary">HerbKeeper</span>
                      <span className="size-1 rounded-full bg-border" />
                      <span>{todayLabel}</span>
                    </div>
                    <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                      <h1 className="truncate font-heading text-xl font-semibold leading-none text-foreground sm:text-2xl">
                        中藥行進銷存系統
                      </h1>
                      <span className="rounded-full border border-primary/16 bg-primary/8 px-2.5 py-1 text-[11px] font-semibold tracking-[0.12em] text-primary">
                        {appVersion}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                  <Button asChild className="hidden md:inline-flex">
                    <Link href="/orders/new">新增交易</Link>
                  </Button>
                  <SessionPanel />
                </div>
              </div>
            </header>

            <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 md:pb-10 lg:px-8 xl:pb-12">
              {children}
            </main>
          </div>
        </div>
      </div>

      <MobileQuickCreateTrade />
    </div>
  )
}
