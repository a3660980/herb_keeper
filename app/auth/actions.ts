"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAbsoluteUrl } from "@/lib/site-url"
import { createClient } from "@/lib/supabase/server"
import { withQueryString } from "@/lib/url"

function normalizeEmail(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().toLowerCase()
}

function getAuthErrorMessage(error: { message: string }) {
  if (error.message.includes("Invalid login credentials")) {
    return "帳號或密碼不正確。"
  }

  if (error.message.includes("Email not confirmed")) {
    return "請先完成信箱驗證後再登入。"
  }

  if (error.message.includes("User already registered")) {
    return "這個 Email 已經註冊過，請直接登入。"
  }

  if (error.message.includes("Email address") && error.message.includes("is invalid")) {
    return "電子郵件格式不正確。"
  }

  if (error.message.toLowerCase().includes("email rate limit exceeded")) {
    return "寄送驗證信過於頻繁，請稍後再試。"
  }

  if (error.message.includes("Database error querying schema")) {
    return "登入失敗，帳號資料異常，請稍後再試或聯絡管理員。"
  }

  return error.message || "驗證失敗，請稍後再試。"
}

export async function signInAction(formData: FormData) {
  const email = normalizeEmail(formData.get("email"))
  const password = String(formData.get("password") ?? "")

  if (!email || !password) {
    redirect(
      withQueryString("/auth/login", {
        error: "請輸入電子郵件與密碼。",
      })
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect(
      withQueryString("/auth/login", {
        error: getAuthErrorMessage(error),
      })
    )
  }

  revalidatePath("/", "layout")
  redirect("/dashboard")
}

export async function signUpAction(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim()
  const email = normalizeEmail(formData.get("email"))
  const password = String(formData.get("password") ?? "")
  const confirmPassword = String(formData.get("confirmPassword") ?? "")

  if (!email || !password) {
    redirect(
      withQueryString("/auth/register", {
        error: "請輸入完整的註冊資訊。",
      })
    )
  }

  if (password !== confirmPassword) {
    redirect(
      withQueryString("/auth/register", {
        error: "兩次輸入的密碼不一致。",
      })
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getAbsoluteUrl("/auth/login"),
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    redirect(
      withQueryString("/auth/register", {
        error: getAuthErrorMessage(error),
      })
    )
  }

  revalidatePath("/", "layout")

  if (data.session) {
    redirect("/dashboard")
  }

  redirect(
    withQueryString("/auth/login", {
      status:
        "帳號已建立。若專案啟用信箱驗證，請先完成驗證；否則可直接登入。",
    })
  )
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  revalidatePath("/", "layout")
  redirect(
    withQueryString("/auth/login", {
      status: "已安全登出。",
    })
  )
}