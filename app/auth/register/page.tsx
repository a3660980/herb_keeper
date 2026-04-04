import Link from "next/link"

import { FormMessage } from "@/components/app/form-message"
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

import { signUpAction } from "../actions"

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams
  const status = getSingleSearchParam(params.status)
  const error = getSingleSearchParam(params.error)

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_30rem]">
      <div className="hidden rounded-[2.25rem] border border-border/70 bg-card/88 p-8 shadow-[0_28px_70px_-46px_rgba(38,39,28,0.48)] backdrop-blur-md lg:block">
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          建立工作帳號
        </Badge>
        <h1 className="mt-6 font-heading text-4xl leading-tight text-foreground">
          新增工作帳號
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          建立可登入系統的工作帳號。第一位帳號會具備完整管理權限，之後新增的帳號可再由管理端安排權限。
        </p>

        <div className="mt-8 flex flex-col gap-3 text-sm leading-6 text-muted-foreground">
          <div className="rounded-[1.6rem] border border-border/60 bg-background/74 p-4">
            完成註冊後即可登入工作台，開始處理訂單、銷貨與庫存作業。
          </div>
          <div className="rounded-[1.6rem] border border-border/60 bg-background/74 p-4">
            如需調整使用權限或停用帳號，可由管理者後續統一維護。
          </div>
        </div>
      </div>

      <Card className="border border-border/70 bg-card/92 backdrop-blur-md">
        <CardHeader>
          <CardTitle>註冊帳號</CardTitle>
          <CardDescription>使用電子郵件與密碼建立 HerbKeeper 工作帳號。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {status ? <FormMessage message={status} tone="success" /> : null}
          {error ? <FormMessage message={error} tone="error" /> : null}

          <form action={signUpAction} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="fullName">顯示名稱</Label>
              <Input id="fullName" name="fullName" autoComplete="name" />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">電子郵件</Label>
              <Input id="email" name="email" type="email" autoComplete="email" />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">密碼</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">確認密碼</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full">
              建立帳號
            </Button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-sm text-muted-foreground">
            <span>已經有帳號？</span>
            <Button asChild variant="ghost" size="sm">
              <Link href="/auth/login">返回登入</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}