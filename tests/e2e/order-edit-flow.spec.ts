import { expect, test } from "@playwright/test"

import { login } from "./helpers/auth"
import { runWithE2ECleanup } from "./helpers/cleanup"
import { createUniquePhone, createUniqueSuffix } from "./helpers/factories"
import { createCustomer, createProduct } from "./helpers/operations"
import { selectSearchableOption } from "./helpers/searchable-select"

test("operator can edit a pending order after creation", async ({ page }) => {
  const suffix = createUniqueSuffix()
  const customerName = `E2E 訂單修改客戶 ${suffix}`
  const customerPhone = createUniquePhone()
  const productName = `E2E 訂單修改藥材 ${suffix}`
  const initialNote = `E2E 初始訂單備註 ${suffix}`
  const updatedNote = `E2E 已修改訂單備註 ${suffix}`

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

      const createOrderLine = page.getByTestId("order-line").first()
      await selectSearchableOption(page, {
        trigger: createOrderLine.getByLabel("訂單明細 1 藥材"),
        searchPlaceholder: "搜尋藥材名稱",
        query: productName,
        optionName: productName,
      })
      await createOrderLine.getByLabel("訂單明細 1 訂購數量").fill("2")
      await createOrderLine.getByLabel("訂單明細 1 成交單價").fill("52")
      await page.getByLabel("備註").fill(initialNote)
      await page.getByRole("button", { name: "建立訂單" }).click()

      await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+(?:\?.*)?$/)
      await expect(page.getByText("已建立訂單，可直接安排出貨。")).toBeVisible()
      await expect(page.getByText(initialNote)).toBeVisible()

      await page.getByRole("link", { name: "修改訂單" }).click()
      await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+\/edit$/)

      const editOrderLine = page.getByTestId("order-line").first()
      await editOrderLine.getByLabel("訂單明細 1 訂購數量").fill("3.5")
      await editOrderLine.getByLabel("訂單明細 1 成交單價").fill("66")
      await page.getByLabel("備註").fill(updatedNote)
      await page.getByRole("button", { name: "儲存變更" }).click()

      await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+(?:\?.*)?$/)
      await expect(page.getByText("已更新訂單內容。")).toBeVisible()
      await expect(page.getByText(updatedNote)).toBeVisible()

      const detailRow = page.getByRole("row", { name: new RegExp(productName) })
      await expect(detailRow.getByRole("cell", { name: "3.5 g", exact: true })).toBeVisible()
      await expect(detailRow.getByRole("cell", { name: "$66", exact: true })).toBeVisible()

      await page.getByRole("link", { name: "返回訂單列表" }).click()
      await expect(page).toHaveURL(/\/orders$/)

      const orderRow = page.getByRole("row", { name: new RegExp(customerName) })
      await expect(orderRow.getByRole("link", { name: "修改" })).toBeVisible()
      await expect(orderRow.getByText(updatedNote)).toBeVisible()
    },
    {
      customerNames: [customerName],
      customerPhones: [customerPhone],
      productNames: [productName],
    }
  )
})