import type { ReactNode } from "react"

import { AppNavigation, MobileNavigation } from "@/components/app/app-navigation"
import { SessionPanel } from "@/components/app/session-panel"

type AppShellProps = {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const todayLabel = new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date())

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="relative mx-auto min-h-screen max-w-[1680px] lg:grid lg:h-screen lg:grid-cols-[19rem_minmax(0,1fr)] lg:overflow-hidden xl:grid-cols-[21rem_minmax(0,1fr)]">
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
                    <div className="mt-2 flex flex-col gap-1">
                      <h1 className="truncate font-heading text-xl font-semibold leading-none text-foreground sm:text-2xl">
                        營運工作台
                      </h1>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                  <SessionPanel />
                </div>
              </div>
            </header>

            <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8 xl:pb-12">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
