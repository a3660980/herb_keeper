import { redirect } from "next/navigation"

import { setFlashError } from "@/lib/flash"

export default async function RegisterPage() {
  await setFlashError("註冊入口已停用，請由管理者在 Supabase 開通帳號。")
  redirect("/auth/login")
}