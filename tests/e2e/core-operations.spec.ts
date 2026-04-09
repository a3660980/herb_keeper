import { expect, test } from "@playwright/test"

import { login } from "./helpers/auth"
import { runWithE2ECleanup } from "./helpers/cleanup"
import { createUniquePhone, createUniqueSuffix } from "./helpers/factories"
import { createCustomer, createProduct, searchCustomer, searchProduct } from "./helpers/operations"
import { selectSearchableOption } from "./helpers/searchable-select"

test("operator can complete the core customer, product, order, shipment, and sale flow", async ({ page }) => {
  const suffix = createUniqueSuffix()
  const customerName = `E2E 客戶 ${suffix}`
  const customerPhone = createUniquePhone()
  const productName = `E2E 藥材 ${suffix}`

  await runWithE2ECleanup(
    async () => {
      await login(page)

      await createCustomer(page, {
        name: customerName,
        phone: customerPhone,
        type: "vip",
        discountRate: "0.9",
      })
      await searchCustomer(page, customerName)
      await expect(page.getByRole("cell", { name: customerName })).toBeVisible()

      await createProduct(page, {
        name: productName,
        basePrice: "88",
        lowStockThreshold: "120",
      })
      await searchProduct(page, productName)
      await expect(page.getByRole("cell", { name: productName })).toBeVisible()

      await page.goto("/orders/new")
      await selectSearchableOption(page, {
        trigger: page.locator("#customerId"),
        searchPlaceholder: "搜尋客戶名稱或電話",
        query: customerName,
        optionName: `${customerName} (${customerPhone})`,
      })
      await expect(page.locator("#orderDate")).toHaveValue(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)

      const orderLine = page.getByTestId("order-line").first()
      await selectSearchableOption(page, {
        trigger: orderLine.getByLabel("訂單明細 1 藥材"),
        searchPlaceholder: "搜尋藥材名稱",
        query: "黃耆",
        optionName: "黃耆",
      })
      await orderLine.getByLabel("訂單明細 1 訂購數量").fill("2")
      await orderLine.getByLabel("訂單明細 1 成交單價").fill("52")
      await page.getByLabel("備註").fill("Playwright 訂單流程驗證")
      await page.getByRole("button", { name: "建立訂單", exact: true }).click()

      await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+(?:\?.*)?$/)
      await expect(page.getByText("已建立訂單，可直接安排出貨。")).toBeVisible()
      await expect(page.locator("#shipmentDate")).toHaveValue(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)

      const shipmentLine = page.getByTestId("shipment-line").first()
      await shipmentLine.getByLabel("黃耆 本次出貨數量").fill("1")
      await page.getByLabel("備註").fill("Playwright 部分出貨驗證")
      await page.getByRole("button", { name: "建立出貨批次" }).click()

      const shipmentConfirmDialog = page.getByRole("dialog", { name: "確認本次出貨" })
      await expect(shipmentConfirmDialog).toBeVisible()
      await shipmentConfirmDialog.getByRole("button", { name: "確認出貨" }).click()

      await expect(page.getByText("出貨完成，庫存與訂單狀態已同步更新。")).toBeVisible()
      await expect(page.getByText("部分出貨").first()).toBeVisible()

      await page.goto("/orders/new")
      await page.getByTestId("trade-type-sale").click()
      await selectSearchableOption(page, {
        trigger: page.locator("#customerId"),
        searchPlaceholder: "搜尋客戶名稱或電話",
        query: customerName,
        optionName: `${customerName} (${customerPhone})`,
      })
      await expect(page.locator("#saleDate")).toHaveValue(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)

      const saleLine = page.getByTestId("sale-line").first()
      await selectSearchableOption(page, {
        trigger: saleLine.getByLabel("銷貨明細 1 藥材"),
        searchPlaceholder: "搜尋藥材名稱",
        query: "黃耆",
        optionName: "黃耆",
      })
      await saleLine.getByLabel("銷貨明細 1 銷貨數量").fill("1")
      await saleLine.getByLabel("銷貨明細 1 成交單價").fill("52")
      await page.getByLabel("備註").fill("Playwright 現場銷貨驗證")
      await page.getByRole("button", { name: "建立現場銷貨", exact: true }).click()

      await expect(page).toHaveURL(/\/sales\/[0-9a-f-]+(?:\?.*)?$/)
      await expect(page.getByText("已建立現場銷貨，庫存與報表資料已同步更新。")).toBeVisible()
      await expect(page.getByText(customerName).first()).toBeVisible()

      await page.goto(`/products?q=${encodeURIComponent(productName)}&filter=low`)
      const inventoryRow = page.getByRole("row", { name: new RegExp(productName) })
      await expect(inventoryRow).toBeVisible()
      await expect(inventoryRow.getByText("低庫存", { exact: true })).toBeVisible()

      await page.goto(`/reports?q=${encodeURIComponent(customerName)}&type=direct_sale`)
      const reportRow = page
        .locator("#recent-transactions")
        .getByRole("row", { name: new RegExp(`${customerName}.*黃耆|黃耆.*${customerName}`) })
      await expect(reportRow).toBeVisible()
      await expect(reportRow.getByText("現場銷貨", { exact: true })).toBeVisible()

      await page.goto("/dashboard")
      await expect(page.getByText(customerName).first()).toBeVisible()
    },
    {
      customerNames: [customerName],
      customerPhones: [customerPhone],
      productNames: [productName],
    }
  )
})