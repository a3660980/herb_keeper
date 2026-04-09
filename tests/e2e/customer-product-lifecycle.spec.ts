import { expect, test } from "@playwright/test"

import { login } from "./helpers/auth"
import { runWithE2ECleanup } from "./helpers/cleanup"
import { createUniquePhone, createUniqueSuffix } from "./helpers/factories"
import {
  createCustomer,
  createProduct,
  createSupplier,
  searchCustomer,
  searchProduct,
} from "./helpers/operations"

test("operator can update and delete unreferenced customers and products", async ({ page }) => {
  const suffix = createUniqueSuffix()
  const customerName = `Lifecycle 客戶 ${suffix}`
  const updatedCustomerName = `${customerName} 已更新`
  const customerPhone = createUniquePhone()
  const customerAddress = `台北市中山區示範路 ${suffix} 號`
  const productName = `Lifecycle 藥材 ${suffix}`
  const updatedProductName = `${productName} 已更新`
  const supplierName = `Lifecycle 供應商 ${suffix}`
  const updatedSupplierName = `${supplierName} 已更新`

  await runWithE2ECleanup(
    async () => {
      await login(page)

      await createCustomer(page, {
        name: customerName,
        phone: customerPhone,
        address: customerAddress,
        type: "general",
        discountRate: "1",
      })

      await searchCustomer(page, customerName)
      const customerRow = page.getByRole("row", { name: new RegExp(customerName) })
      await customerRow.getByRole("link", { name: "編輯" }).click()
      await page.getByLabel("客戶名稱").fill(updatedCustomerName)
      await page.getByLabel("地址").fill(`${customerAddress} 3 樓`)
      await page.getByLabel("客戶類型").selectOption("wholesale")
      await page.getByLabel("折扣倍率").fill("0.85")
      await page.getByRole("button", { name: "儲存變更" }).click()

      await expect(page).toHaveURL(/\/customers(?:\?.*)?$/)
      await expect(page.getByText(`已更新客戶：${updatedCustomerName}`)).toBeVisible()
      await searchCustomer(page, updatedCustomerName)
      const updatedCustomerRow = page.getByRole("row", {
        name: new RegExp(updatedCustomerName),
      })
      await expect(updatedCustomerRow.getByText(`${customerAddress} 3 樓`)).toBeVisible()
      await expect(updatedCustomerRow.getByText("批發")).toBeVisible()
      await expect(updatedCustomerRow.getByText("0.85")).toBeVisible()
      await updatedCustomerRow.getByRole("button", { name: "刪除" }).click()

      await expect(page).toHaveURL(/\/customers(?:\?.*)?$/)
      await expect(page.getByText(`已刪除客戶：${updatedCustomerName}`)).toBeVisible()
      await searchCustomer(page, updatedCustomerName)
      await expect(page.getByText("找不到符合條件的客戶。")).toBeVisible()

      await createProduct(page, {
        name: productName,
        basePrice: "66",
        lowStockThreshold: "50",
      })

      await searchProduct(page, productName)
      const productRow = page.getByRole("row", { name: new RegExp(productName) })
      await productRow.getByRole("link", { name: "編輯" }).click()
      await page.getByLabel("藥材名稱").fill(updatedProductName)
      await page.getByLabel("基準售價").fill("72")
      await page.getByLabel("低庫存門檻").fill("60")
      await page.getByRole("button", { name: "儲存變更" }).click()

      await expect(page).toHaveURL(/\/products(?:\?.*)?$/)
      await expect(page.getByText(`已更新藥材：${updatedProductName}`)).toBeVisible()
      await searchProduct(page, updatedProductName)
      const updatedProductRow = page.getByRole("row", {
        name: new RegExp(updatedProductName),
      })
      await expect(updatedProductRow.getByText("$72")).toBeVisible()
      await updatedProductRow.getByRole("button", { name: "刪除" }).click()

      await expect(page).toHaveURL(/\/products(?:\?.*)?$/)
      await expect(page.getByText(`已刪除藥材：${updatedProductName}`)).toBeVisible()
      await searchProduct(page, updatedProductName)
      await expect(page.getByText("找不到符合條件的藥材庫存資料。")).toBeVisible()

      await createSupplier(page, {
        name: supplierName,
        phone: "02-2555-8899",
        address: "台北市大同區示範路 99 號",
        note: "E2E 測試供應商",
      })

      const supplierRow = page.getByRole("row", { name: new RegExp(supplierName) })
      await supplierRow.getByRole("link", { name: "編輯" }).click()
      await page.getByLabel("供應商名稱").fill(updatedSupplierName)
      await page.getByLabel("備註").fill("已更新備註")
      await page.getByRole("button", { name: "儲存變更" }).click()

      await expect(page).toHaveURL(/\/suppliers(?:\?.*)?$/)
      await expect(page.getByText(`已更新供應商：${updatedSupplierName}`)).toBeVisible()

      await page.getByPlaceholder("搜尋供應商名稱、電話或地址").fill(updatedSupplierName)
      await page.getByRole("button", { name: "搜尋" }).click()

      const updatedSupplierRow = page.getByRole("row", {
        name: new RegExp(updatedSupplierName),
      })
      await expect(updatedSupplierRow.getByText("已更新備註")).toBeVisible()
      await updatedSupplierRow.getByRole("button", { name: "刪除" }).click()

      await expect(page).toHaveURL(/\/suppliers(?:\?.*)?$/)
      await expect(page.getByText(`已刪除供應商：${updatedSupplierName}`)).toBeVisible()
    },
    {
      customerNames: [customerName, updatedCustomerName],
      customerPhones: [customerPhone],
      productNames: [productName, updatedProductName],
      supplierNames: [supplierName, updatedSupplierName],
    }
  )
})