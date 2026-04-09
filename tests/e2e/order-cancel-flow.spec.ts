import { expect, test } from "@playwright/test"

import { login } from "./helpers/auth"
import { runWithE2ECleanup } from "./helpers/cleanup"
import { createUniquePhone, createUniqueSuffix } from "./helpers/factories"
import { createCustomer, createProduct } from "./helpers/operations"
import { selectSearchableOption } from "./helpers/searchable-select"

test("operator can cancel a pending order before any shipment", async ({ page }) => {
  const suffix = createUniqueSuffix()
  const customerName = `E2E 訂單撤銷客戶 ${suffix}`
  const customerPhone = createUniquePhone()
  const productName = `E2E 訂單撤銷藥材 ${suffix}`
  const orderNote = `E2E 待撤銷訂單 ${suffix}`

  await runWithE2ECleanup(
    async () => {
      await login(page)

      await createCustomer(page, {
        name: customerName,
        phone: customerPhone,
        type: "vip",
        discountRate: "0.9",
      })

      await createProduct(page, {
        name: productName,
        basePrice: "88",
        lowStockThreshold: "120",
      })

      await page.goto("/orders/new")
      await selectSearchableOption(page, {
        trigger: page.locator("#customerId"),
        searchPlaceholder: "搜尋客戶名稱或電話",
        query: customerName,
        optionName: `${customerName} (${customerPhone})`,
      })

      const orderLine = page.getByTestId("order-line").first()
      await selectSearchableOption(page, {
        trigger: orderLine.getByLabel("訂單明細 1 藥材"),
        searchPlaceholder: "搜尋藥材名稱",
        query: productName,
        optionName: productName,
      })
      await orderLine.getByLabel("訂單明細 1 訂購數量").fill("2")
      await orderLine.getByLabel("訂單明細 1 成交單價").fill("52")
      await page.getByLabel("備註").fill(orderNote)
      await page.getByRole("button", { name: "建立訂單", exact: true }).click()

      await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+(?:\?.*)?$/)
      await expect(page.getByText("已建立訂單，可直接安排出貨。")).toBeVisible()
      await expect(page.getByRole("button", { name: "撤銷訂單" })).toBeVisible()

      await page.getByRole("button", { name: "撤銷訂單" }).click()
      await expect(page.getByRole("heading", { name: "確認撤銷訂單" })).toBeVisible()
      await expect(
        page.getByText("撤銷後訂單將無法再修改或出貨，確定要撤銷嗎？")
      ).toBeVisible()
      await page.getByRole("button", { name: "確認撤銷" }).click()

      await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+(?:\?.*)?$/)
      await expect(page.getByText("已撤銷訂單，不能再修改或出貨。")).toBeVisible()
      await expect(page.getByText("這張訂單已撤銷，不可再建立 shipment。")).toBeVisible()
      await expect(page.getByRole("link", { name: "修改訂單" })).toHaveCount(0)

      const statusCard = page.getByText("已撤銷", { exact: true })
      await expect(statusCard.first()).toBeVisible()

      await page.getByRole("link", { name: "返回訂單列表" }).click()
      await expect(page).toHaveURL(/\/orders$/)

      const orderRow = page.getByRole("row", { name: new RegExp(customerName) })
      await expect(orderRow.getByText("已撤銷", { exact: true })).toBeVisible()
      await expect(orderRow.getByRole("link", { name: "修改" })).toHaveCount(0)
      await expect(orderRow.getByRole("link", { name: "出貨" })).toHaveCount(0)
    },
    {
      customerNames: [customerName],
      customerPhones: [customerPhone],
      productNames: [productName],
    }
  )
})
