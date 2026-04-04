import { expect, type Page } from "@playwright/test"

function requireEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(
      `Missing ${name}. Run Playwright with ${name} and the matching E2E credentials configured.`
    )
  }

  return value
}

export function getE2ECredentials() {
  return {
    email: requireEnv("E2E_USER_EMAIL"),
    password: requireEnv("E2E_USER_PASSWORD"),
  }
}

export async function login(page: Page) {
  const { email, password } = getE2ECredentials()

  await page.goto("/auth/login")
  await page.getByLabel("電子郵件").fill(email)
  await page.getByLabel("密碼").fill(password)
  await page.getByRole("button", { name: "登入工作台" }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole("heading", { name: "營運總覽" })).toBeVisible()
}