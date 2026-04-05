import { redirect } from "next/navigation"

import { withQueryString } from "@/lib/url"

export default function RegisterPage() {
  redirect(
    withQueryString("/auth/login", {
      status: "註冊入口已停用，請由管理者在 Supabase 開通帳號。",
    })
  )
}