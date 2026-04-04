import Link from "next/link"

import { FormMessage } from "@/components/app/form-message"
import { SubmitButton } from "@/components/app/submit-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getSingleSearchParam } from "@/lib/url"

import { signInAction } from "../actions"

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const loginHighlights = [
  {
    title: "訂單與出貨",
    detail: "同一流程追蹤待出貨、部分出貨與完成狀態，現場與內勤都能快速接手。",
  },
  {
    title: "門市銷貨與庫存",
    detail: "每筆銷貨與出貨送出後會同步更新庫存與營運資料，避免重複確認。",
  },
  {
    title: "客戶與價格紀錄",
    detail: "保留客戶資訊、折扣與交易單價脈絡，方便追蹤後續回購與報價。",
  },
] as const

const workflowPoints = [
  "先確認今日待處理訂單與低庫存項目。",
  "門市交易與出貨完成後，營運資料會同步更新。",
  "所有人員都從同一入口登入與交班。",
] as const

const loginAssurances = [
  "登入後會延續你的角色權限與最新工作資料。",
  "若帳號由管理者建立，可直接前往註冊頁完成啟用。",
] as const

const quickActions = [
  {
    title: "登入後可直接開始作業",
    description: "可立即查看待出貨、建立現場銷貨，並追蹤低庫存與營收概況。",
  },
] as const

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const status = getSingleSearchParam(params.status)
  const error = getSingleSearchParam(params.error)

  return (
    <div className="grid w-full gap-5 lg:grid-cols-[minmax(0,1fr)_28rem] xl:gap-6">
      <Card className="order-1 relative overflow-hidden border border-border/80 bg-card/96 backdrop-blur-xl lg:order-2 lg:min-h-[38rem] lg:justify-self-end">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />

        <CardHeader className="gap-3">
          <Badge variant="outline" className="w-fit bg-background/90 text-primary">
            帳號登入
          </Badge>
          <CardTitle className="text-2xl sm:text-[2rem]">登入 HerbKeeper</CardTitle>
          <CardDescription>
            使用電子郵件與密碼進入日常營運工作台，直接延續你的角色權限與工作資料。
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          {status ? <FormMessage message={status} tone="success" /> : null}
          {error ? <FormMessage message={error} tone="error" /> : null}

          <div className="rounded-[1.4rem] border border-border/70 bg-background/76 p-4">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              登入提醒
            </p>
            <div className="mt-3 flex flex-col gap-2.5 text-sm leading-6 text-muted-foreground">
              {loginAssurances.map((item) => (
                <div key={item} className="flex gap-3">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <form action={signInAction} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">電子郵件</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@herbkeeper.tw"
                autoFocus
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">密碼</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="請輸入密碼"
                required
              />
            </div>

            <SubmitButton type="submit" size="lg" className="w-full" pendingLabel="登入中...">
              登入工作台
            </SubmitButton>
          </form>

          <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">還沒有帳號？</span>
              <Button asChild variant="outline" size="sm">
                <Link href="/auth/register">建立帳號</Link>
              </Button>
            </div>
            <p className="text-xs leading-6 text-muted-foreground">
              若帳號尚未開通，可由管理者建立後直接進入註冊與啟用流程。
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="order-2 relative overflow-hidden rounded-[2rem] border border-border/80 bg-card/94 p-6 shadow-[0_26px_70px_-44px_rgba(15,23,42,0.18)] backdrop-blur-md lg:order-1 lg:min-h-[38rem] lg:p-8 xl:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.12),transparent_34%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />

        <div className="relative flex h-full flex-col">
          <p className="text-sm font-medium tracking-[0.08em] text-primary">
            中藥行門市與內勤共用的營運入口
          </p>

          <div className="mt-6 max-w-2xl">
            <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl xl:text-[3.15rem]">
              讓訂單、銷貨與庫存維持在同一份營運資料上。
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              HerbKeeper 將中藥行日常會用到的藥材、客戶、訂單、門市銷貨、庫存與報表整理進同一套流程，讓查詢、交班與決策都更直接。
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {loginHighlights.map((item) => (
              <article
                key={item.title}
                className="rounded-[1.45rem] border border-border/70 bg-background/78 p-4 shadow-sm"
              >
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.detail}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 grid gap-4 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="rounded-[1.6rem] border border-border/70 bg-background/76 p-5">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
                  每日交班重點
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  先掌握待處理工作，再進入日常作業
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                {workflowPoints.map((item, index) => (
                  <div key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card/80 text-xs font-semibold text-foreground">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-primary/15 bg-primary/8 p-5">
              <p className="text-[11px] font-semibold tracking-[0.22em] text-primary uppercase">
                常用工作
              </p>
              <div className="mt-4 flex flex-col gap-3">
                {quickActions.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[1.2rem] border border-primary/10 bg-background/72 p-3.5"
                  >
                    <div className="text-sm font-semibold text-foreground">{item.title}</div>
                    <p className="mt-1 text-xs leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}