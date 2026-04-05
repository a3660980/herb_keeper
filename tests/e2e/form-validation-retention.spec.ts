import { expect, test } from "@playwright/test"

import { login } from "./helpers/auth"
import { runWithE2ECleanup } from "./helpers/cleanup"
import { createUniquePhone, createUniqueSuffix } from "./helpers/factories"
import { createCustomer } from "./helpers/operations"
import { selectSearchableOption } from "./helpers/searchable-select"

test("order, shipment, and sale forms retain business selections after validation errors", async ({ page }) => {
  const suffix = createUniqueSuffix()
  const customerName = `Retention 客戶 ${suffix}`
  const customerPhone = createUniquePhone()

  await runWithE2ECleanup(
    async () => {
      await login(page)

      await createCustomer(page, {
        name: customerName,
        phone: customerPhone,
        type: "vip",
        discountRate: "0.9",
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
        query: "黃耆",
        optionName: "黃耆",
      })
      await page.getByRole("button", { name: "建立訂單" }).click()

      await expect(page.getByText("請修正訂單欄位後再送出。")).toBeVisible()
      await expect(page.getByText("請輸入數量")).toBeVisible()
      await expect(page.locator("#customerId")).toContainText(
        `${customerName} (${customerPhone})`
      )
      await expect(orderLine.getByLabel("訂單明細 1 藥材")).toContainText("黃耆")
      await expect(page.locator("#orderDate")).toHaveValue(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)

      await orderLine.getByLabel("訂單明細 1 訂購數量").fill("2")
      await orderLine.getByLabel("訂單明細 1 成交單價").fill("52")
      await page.getByRole("button", { name: "建立訂單" }).click()

      await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+\?status=/)
      const shipmentLine = page.getByTestId("shipment-line").first()
      await shipmentLine.getByLabel("黃耆 本次出貨數量").fill("1")
      await page.locator("#shipmentDate").fill("")
      await page.getByRole("button", { name: "建立出貨批次" }).click()

      const shipmentConfirmDialog = page.getByRole("dialog", { name: "確認本次出貨" })
      await expect(shipmentConfirmDialog).toBeVisible()
      await shipmentConfirmDialog.getByRole("button", { name: "確認出貨" }).click()

      await expect(page.getByText("請修正出貨欄位後再送出。")).toBeVisible()
      await expect(page.getByText("請選擇出貨時間")).toBeVisible()
      await expect(page.locator("#shipmentDate")).toHaveValue("")
      await expect(shipmentLine.getByLabel("黃耆 本次出貨數量")).toHaveValue("1")

      await page.goto("/sales/new")
      await selectSearchableOption(page, {
        trigger: page.locator("#customerId"),
        searchPlaceholder: "搜尋客戶名稱或電話",
        query: customerName,
        optionName: `${customerName} (${customerPhone})`,
      })

      const saleLine = page.getByTestId("sale-line").first()
      await selectSearchableOption(page, {
        trigger: saleLine.getByLabel("銷貨明細 1 藥材"),
        searchPlaceholder: "搜尋藥材名稱",
        query: "黃耆",
        optionName: "黃耆",
      })
      await page.getByRole("button", { name: "建立現場銷貨" }).click()

      await expect(page.getByText("請修正銷貨欄位後再送出。")).toBeVisible()
      await expect(page.getByText("請輸入數量")).toBeVisible()
      await expect(page.locator("#customerId")).toContainText(
        `${customerName} (${customerPhone})`
      )
      await expect(saleLine.getByLabel("銷貨明細 1 藥材")).toContainText("黃耆")
      await expect(page.locator("#saleDate")).toHaveValue(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)
    },
    {
      customerNames: [customerName],
      customerPhones: [customerPhone],
    }
  )
})