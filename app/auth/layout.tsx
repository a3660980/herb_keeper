import Link from "next/link"
import type { ReactNode } from "react"

type AuthLayoutProps = {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_26%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,251,235,0.95))]" />
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.32),transparent_74%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
      <div className="pointer-events-none absolute right-[-8rem] top-24 size-[22rem] rounded-full bg-accent/18 blur-3xl" />
      <div className="pointer-events-none absolute left-[-6rem] bottom-[-5rem] size-[20rem] rounded-full bg-primary/6 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3 py-2">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-3 rounded-full border border-border/80 bg-card/88 px-3 py-2 shadow-[0_16px_36px_-26px_rgba(15,23,42,0.18)] backdrop-blur-md transition hover:-translate-y-0.5"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-[0_14px_28px_-18px_rgba(37,99,235,0.52)]">
              HK
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold tracking-[0.08em] text-foreground">
                HerbKeeper
              </span>
              <span className="block text-xs text-muted-foreground">
                中藥行進銷存系統
              </span>
            </span>
          </Link>

          <p className="hidden text-sm text-muted-foreground md:block">
            門市與內勤共用的營運入口
          </p>
        </header>

        <main className="relative flex flex-1 items-center justify-center py-6 lg:py-10">
          {children}
        </main>

        <footer className="hidden items-center justify-between gap-4 border-t border-border/70 px-1 py-4 text-xs text-muted-foreground md:flex">
          <p>HerbKeeper 將藥材、客戶、訂單、銷貨、庫存與報表整理在同一套營運流程。</p>
          <p>適合日常交班、查詢與門市作業。</p>
        </footer>
      </div>
    </div>
  )
}