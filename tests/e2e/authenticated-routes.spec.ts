import { expect, test } from "@playwright/test"

import { login } from "./helpers/auth"

const authenticatedRoutes = [
  { href: "/dashboard", heading: "營運總覽" },
  { href: "/products", heading: "藥材庫存管理" },
  { href: "/products/disposals", heading: "庫存減損歷史" },
  { href: "/products/inbounds", heading: "進貨歷史" },
  { href: "/products/inbounds/batch", heading: "批次進貨" },
  { href: "/customers", heading: "客戶管理" },
  { href: "/suppliers", heading: "供應商管理" },
  { href: "/orders", heading: "訂單與部分出貨" },
  { href: "/sales", heading: "現場銷貨" },
  { href: "/reports", heading: "報表分析" },
]

test("authenticated user can open all major operational routes", async ({
  page,
}) => {
  await login(page)

  for (const route of authenticatedRoutes) {
    await page.goto(route.href)
    await expect(
      page.getByRole("heading", { name: route.heading })
    ).toBeVisible()
  }
})
