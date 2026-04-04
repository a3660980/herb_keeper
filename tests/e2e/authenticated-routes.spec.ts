import { expect, test } from "@playwright/test"

import { login } from "./helpers/auth"

const authenticatedRoutes = [
  { href: "/dashboard", heading: "營運總覽" },
  { href: "/products", heading: "藥材管理" },
  { href: "/products/inbounds", heading: "進貨歷史" },
  { href: "/customers", heading: "客戶管理" },
  { href: "/suppliers", heading: "供應商管理" },
  { href: "/orders", heading: "訂單與部分出貨" },
  { href: "/sales", heading: "現場銷貨" },
  { href: "/inventory", heading: "庫存總覽" },
  { href: "/reports", heading: "報表分析" },
]

test("authenticated user can open all major operational routes", async ({ page }) => {
  await login(page)

  for (const route of authenticatedRoutes) {
    await page.goto(route.href)
    await expect(page.getByRole("heading", { name: route.heading })).toBeVisible()
  }
})