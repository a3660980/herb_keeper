import { FormMessage } from "@/components/app/form-message"
import { SubmitButton } from "@/components/app/submit-button"
import { Badge } from "@/components/ui/badge"
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
          <CardDescription>使用已開通的電子郵件與密碼即可進入系統。</CardDescription>
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
        </CardContent>
      </Card>
    </div>
  )
}