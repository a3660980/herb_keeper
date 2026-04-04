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

const loginHints = ["延續你的角色權限與工作資料。", "尚未開通帳號時，可先前往建立帳號。"] as const

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const status = getSingleSearchParam(params.status)
  const error = getSingleSearchParam(params.error)

  return (
    <div className="mx-auto flex w-full max-w-[30rem] justify-center">
      <Card className="relative w-full overflow-hidden border border-border/80 bg-card/96 shadow-[0_30px_70px_-42px_rgba(15,23,42,0.18)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />

        <CardHeader className="gap-4 pb-4">
          <div className="flex items-center justify-between gap-3">
            <Badge variant="outline" className="w-fit bg-background/90 text-primary">
              帳號登入
            </Badge>
            <span className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
              工作台入口
            </span>
          </div>
          <CardTitle className="font-heading text-3xl leading-tight sm:text-[2.2rem]">
            登入 HerbKeeper
          </CardTitle>
          <CardDescription>
            使用電子郵件與密碼即可進入系統。
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          {status ? <FormMessage message={status} tone="success" /> : null}
          {error ? <FormMessage message={error} tone="error" /> : null}

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

          <div className="rounded-[1.35rem] border border-border/70 bg-background/78 p-4">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              提醒
            </p>
            <div className="mt-3 flex flex-col gap-2.5 text-sm leading-6 text-muted-foreground">
              {loginHints.map((item) => (
                <div key={item} className="flex gap-3">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">還沒有帳號？</span>
              <Button asChild variant="outline" size="sm">
                <Link href="/auth/register">建立帳號</Link>
              </Button>
            </div>
            <p className="text-xs leading-6 text-muted-foreground">如果是新同事，請先建立或啟用工作帳號。</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}