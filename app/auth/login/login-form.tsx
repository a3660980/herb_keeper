"use client"

import * as React from "react"

import { SubmitButton } from "@/components/app/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

import { signInAction } from "../actions"

const REMEMBERED_EMAIL_STORAGE_KEY = "herbkeeper.remembered-email"

function getRememberedEmail() {
  try {
    return window.localStorage.getItem(REMEMBERED_EMAIL_STORAGE_KEY)
  } catch {
    return null
  }
}

function persistRememberedEmail(email: string) {
  try {
    window.localStorage.setItem(REMEMBERED_EMAIL_STORAGE_KEY, email)
  } catch {
    // Ignore storage failures and continue the login flow.
  }
}

function clearRememberedEmail() {
  try {
    window.localStorage.removeItem(REMEMBERED_EMAIL_STORAGE_KEY)
  } catch {
    // Ignore storage failures and continue the login flow.
  }
}

export function LoginForm() {
  const emailInputRef = React.useRef<HTMLInputElement>(null)
  const rememberEmailRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    const rememberedEmail = getRememberedEmail()

    if (!rememberedEmail) {
      return
    }

    if (emailInputRef.current) {
      emailInputRef.current.value = rememberedEmail
    }

    if (rememberEmailRef.current) {
      rememberEmailRef.current.checked = true
    }
  }, [])

  function handleSubmit() {
    const email = emailInputRef.current?.value.trim().toLowerCase() ?? ""
    const shouldRememberEmail = rememberEmailRef.current?.checked ?? false

    if (shouldRememberEmail && email) {
      persistRememberedEmail(email)
      return
    }

    clearRememberedEmail()
  }

  return (
    <form action={signInAction} className="flex flex-col gap-5" onSubmit={handleSubmit}>
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
          ref={emailInputRef}
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

      <div className="flex items-center gap-3">
        <input
          id="rememberEmail"
          name="rememberEmail"
          type="checkbox"
          ref={rememberEmailRef}
          className={cn(
            "size-4 rounded-sm border border-border/70 bg-background/78 accent-primary outline-none transition-shadow focus-visible:ring-4 focus-visible:ring-ring/15"
          )}
        />
        <Label
          htmlFor="rememberEmail"
          className="cursor-pointer text-sm font-medium tracking-normal text-foreground"
        >
          記住帳號
        </Label>
      </div>

      <SubmitButton type="submit" size="lg" className="w-full" pendingLabel="登入中...">
        登入工作台
      </SubmitButton>
    </form>
  )
}