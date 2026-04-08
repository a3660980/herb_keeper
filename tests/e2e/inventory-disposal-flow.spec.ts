import { expect, test } from "@playwright/test"

import { login } from "./helpers/auth"
import { runWithE2ECleanup } from "./helpers/cleanup"
import { createUniqueSuffix } from "./helpers/factories"
import { createProduct, createSupplier } from "./helpers/operations"
import { selectSearchableOption } from "./helpers/searchable-select"

test("operator can record inventory disposal and see stock update", async ({ page }) => {
  const suffix = createUniqueSuffix()
  const supplierName = `E2E 減損供應商 ${suffix}`
  const productName = `E2E 減損藥材 ${suffix}`

  await runWithE2ECleanup(
    async () => {
      await login(page)

      await createSupplier(page, {
        name: supplierName,
        phone: "02-5555-7788",
        address: "台北市大同區民權西路 10 號",
      })

      await createProduct(page, {
        name: productName,
        basePrice: "88",
        lowStockThreshold: "3",
      })

      await page.goto("/products/inbounds/new")
      await selectSearchableOption(page, {
        trigger: page.locator("#productId"),
        searchPlaceholder: "搜尋藥材名稱",
        query: productName,
        optionName: productName,
      })
      await selectSearchableOption(page, {
        trigger: page.locator("#supplierId"),
        searchPlaceholder: "搜尋供應商名稱、電話或地址",
        query: supplierName,
        optionName: supplierName,
      })
      await page.getByLabel("進貨數量").fill("10")
      await page.getByLabel("進貨單價").fill("25")
      await page.getByLabel("備註").fill("E2E 減損流程補庫")
      await page.getByRole("button", { name: "建立進貨紀錄" }).click()

      await expect(page).toHaveURL(/\/products\/inbounds(?:\?.*)?$/)
      await expect(page.getByText("已登錄進貨，庫存、平均成本與進貨歷史已同步更新。")).toBeVisible()

      await page.goto(`/products?q=${encodeURIComponent(productName)}`)
      const inventoryRow = page.getByRole("row", { name: new RegExp(productName) })
      const inventoryDisposalLink = inventoryRow
        .getByRole("cell")
        .last()
        .getByRole("link", { name: "減損", exact: true })
      await expect(inventoryRow).toBeVisible()
      await expect(inventoryDisposalLink).toBeVisible()

      await inventoryDisposalLink.click()
      await expect(page).toHaveURL(/\/products\/disposals\/new\?productId=/)
      await expect(page.getByLabel("減損數量")).toHaveValue("")

      await page.getByLabel("減損數量").fill("2.5")
      await page.getByLabel("減損原因").selectOption("disaster")
      await page.getByLabel("備註").fill("E2E 天災損失")
      await page.getByRole("button", { name: "建立減損紀錄" }).click()

      await expect(page).toHaveURL(/\/products\/disposals\?productId=[0-9a-f-]+$/)
      await expect(page.getByText("已登錄庫存減損，庫存與減損歷史已同步更新。")).toBeVisible()

      const disposalRow = page.getByRole("row", { name: new RegExp(productName) })
      await expect(disposalRow.getByText("天災損失", { exact: true })).toBeVisible()
      await expect(disposalRow.getByText("2.5 g", { exact: true })).toBeVisible()
      await expect(disposalRow.getByText("E2E 天災損失")).toBeVisible()

      await page.goto(`/products?q=${encodeURIComponent(productName)}`)
      const updatedInventoryRow = page.getByRole("row", { name: new RegExp(productName) })
      await expect(updatedInventoryRow).toBeVisible()
      await expect(
        updatedInventoryRow.locator("td").filter({ hasText: /^7.5 g$/ })
      ).toHaveCount(2)
    },
    {
      productNames: [productName],
      supplierNames: [supplierName],
    }
  )
})