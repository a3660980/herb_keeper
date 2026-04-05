import { expect, type Page } from "@playwright/test"

import { confirmEmailForE2EUser } from "./supabase-admin"

type E2ECredentials = {
  email: string
  password: string
}

function requireEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(
      `Missing ${name}. Run Playwright with ${name} and the matching E2E credentials configured.`
    )
  }

  return value
}

async function expectDashboard(page: Page) {
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole("heading", { name: "營運總覽" })).toBeVisible()
}

async function signIn(page: Page, credentials: E2ECredentials) {
  await page.goto("/auth/login")
  await page.getByLabel("電子郵件").fill(credentials.email)
  await page.getByLabel("密碼", { exact: true }).fill(credentials.password)
  await page.getByRole("button", { name: "登入工作台" }).click()

  await expectDashboard(page)
}

async function completeEmailVerification(page: Page, credentials: E2ECredentials) {
  await confirmEmailForE2EUser(credentials.email)
  await signIn(page, credentials)
}

type PasswordLoginResult =
  | "dashboard"
  | "email-not-confirmed"
  | "invalid-credentials"

async function tryPasswordLogin(page: Page, credentials: E2ECredentials) {
  await page.goto("/auth/login")
  await page.getByLabel("電子郵件").fill(credentials.email)
  await page.getByLabel("密碼", { exact: true }).fill(credentials.password)
  await page.getByRole("button", { name: "登入工作台" }).click()

  await page.waitForLoadState("networkidle")

  if (/\/dashboard$/.test(page.url())) {
    await expect(page.getByRole("heading", { name: "營運總覽" })).toBeVisible()
    return "dashboard" as const
  }

  if (
    await page
      .getByText("請先完成信箱驗證後再登入。", { exact: false })
      .isVisible()
  ) {
    return "email-not-confirmed" as const
  }

  if (
    await page
      .getByText("帳號或密碼不正確。", { exact: false })
      .isVisible()
  ) {
    return "invalid-credentials" as const
  }

  throw new Error(`Unexpected login result while running E2E auth flow: ${page.url()}`)
}

async function finishLogin(page: Page, credentials: E2ECredentials, result: PasswordLoginResult) {
  if (result === "dashboard") {
    return
  }

  if (result === "email-not-confirmed") {
    await completeEmailVerification(page, credentials)
    return
  }

  throw new Error("E2E_USER_EMAIL 或 E2E_USER_PASSWORD 不正確，無法完成登入。")
}

export function getE2ECredentials(): E2ECredentials {
  return {
    email: requireEnv("E2E_USER_EMAIL"),
    password: requireEnv("E2E_USER_PASSWORD"),
  }
}

export async function login(page: Page) {
  const credentials = getE2ECredentials()
  const result = await tryPasswordLogin(page, credentials)

  if (result === "invalid-credentials") {
    throw new Error(
      "E2E_USER_EMAIL 尚未在 Supabase Auth 建立，或 E2E_USER_PASSWORD 不正確。請先在 Supabase 建立測試帳號後再執行 E2E。"
    )
  }

  await finishLogin(page, credentials, result)
}