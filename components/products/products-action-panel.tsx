import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type ActionItem = {
  href: string
  label: string
  hint: string
}

const navigationActions: ActionItem[] = [
  {
    href: "/products/inbounds",
    label: "進貨歷史",
    hint: "查看補貨節奏與成本變化",
  },
  {
    href: "/products/disposals",
    label: "減損歷史",
    hint: "追蹤損耗原因與庫存異常",
  },
]

const creationActions: ActionItem[] = [
  {
    href: "/products/new",
    label: "新增藥材",
    hint: "建立新的藥材主檔",
  },
  {
    href: "/products/inbounds/new",
    label: "新增進貨",
    hint: "補貨並更新平均成本",
  },
  {
    href: "/products/disposals/new",
    label: "新增減損",
    hint: "登錄非銷售性的庫存減量",
  },
]

export function ProductsActionPanel() {
  return (
    <div className="grid gap-3">
      <section className="rounded-[1.1rem] border border-border/70 bg-background/70 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">跳頁操作</p>
            <p className="mt-1 text-xs text-muted-foreground">快速切到歷史列表</p>
          </div>
          <Badge variant="outline">Browse</Badge>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {navigationActions.map((item) => (
            <Button
              key={item.href}
              asChild
              variant="ghost"
              className="h-12 justify-between rounded-[0.95rem] border border-border/70 bg-card/75 px-3.5 text-left shadow-none hover:bg-card"
            >
              <Link href={item.href}>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-none">{item.label}</span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">{item.hint}</span>
                </span>
                <span className="text-sm text-muted-foreground">›</span>
              </Link>
            </Button>
          ))}
        </div>
      </section>

      <section className="rounded-[1.1rem] border border-border/70 bg-background/70 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">新增動作</p>
            <p className="mt-1 text-xs text-muted-foreground">建立資料與登錄異動</p>
          </div>
          <Badge variant="secondary">Create</Badge>
        </div>

        <div className="mt-3 grid gap-2">
          <Button asChild size="lg" className="h-12 justify-between rounded-[0.95rem] px-3.5 shadow-none">
            <Link href={creationActions[0].href}>
              <span className="min-w-0 text-left">
                <span className="block text-sm font-semibold leading-none">{creationActions[0].label}</span>
                <span className="mt-1 block text-[11px] text-primary-foreground/78">
                  {creationActions[0].hint}
                </span>
              </span>
              <span className="text-sm">+</span>
            </Link>
          </Button>

          <div className="grid gap-2 sm:grid-cols-2">
            {creationActions.slice(1).map((item) => (
              <Button
                key={item.href}
                asChild
                variant="outline"
                className="h-12 justify-between rounded-[0.95rem] border-border/70 bg-background/88 px-3.5 text-left shadow-none"
              >
                <Link href={item.href}>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-none">{item.label}</span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">{item.hint}</span>
                  </span>
                  <span className="text-sm text-muted-foreground">+</span>
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}