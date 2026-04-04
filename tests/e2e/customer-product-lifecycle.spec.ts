import { expect, test } from "@playwright/test"

import { login } from "./helpers/auth"
import { createUniquePhone, createUniqueSuffix } from "./helpers/factories"
import {
  createCustomer,
  createProduct,
  searchCustomer,
  searchProduct,
} from "./helpers/operations"

test("operator can update and delete unreferenced customers and products", async ({ page }) => {
  const suffix = createUniqueSuffix()
  const customerName = `Lifecycle 客戶 ${suffix}`
  const updatedCustomerName = `${customerName} 已更新`
  const customerPhone = createUniquePhone()
  const productName = `Lifecycle 藥材 ${suffix}`
  const updatedProductName = `${productName} 已更新`

  await login(page)

  await createCustomer(page, {
    name: customerName,
    phone: customerPhone,
    type: "general",
    discountRate: "1",
  })

  await searchCustomer(page, customerName)
  const customerRow = page.getByRole("row", { name: new RegExp(customerName) })
  await customerRow.getByRole("link", { name: "編輯" }).click()
  await page.getByLabel("客戶名稱").fill(updatedCustomerName)
  await page.getByLabel("客戶類型").selectOption("wholesale")
  await page.getByLabel("折扣倍率").fill("0.85")
  await page.getByRole("button", { name: "儲存變更" }).click()

  await expect(page).toHaveURL(/\/customers\?status=/)
  await expect(page.getByText(`已更新客戶：${updatedCustomerName}`)).toBeVisible()
  await searchCustomer(page, updatedCustomerName)
  const updatedCustomerRow = page.getByRole("row", {
    name: new RegExp(updatedCustomerName),
  })
  await expect(updatedCustomerRow.getByText("批發")).toBeVisible()
  await expect(updatedCustomerRow.getByText("0.85")).toBeVisible()
  await updatedCustomerRow.getByRole("button", { name: "刪除" }).click()

  await expect(page).toHaveURL(/\/customers\?status=/)
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

  await expect(page).toHaveURL(/\/products\?status=/)
  await expect(page.getByText(`已更新藥材：${updatedProductName}`)).toBeVisible()
  await searchProduct(page, updatedProductName)
  const updatedProductRow = page.getByRole("row", {
    name: new RegExp(updatedProductName),
  })
  await expect(updatedProductRow.getByText("$72")).toBeVisible()
  await updatedProductRow.getByRole("button", { name: "刪除" }).click()

  await expect(page).toHaveURL(/\/products\?status=/)
  await expect(page.getByText(`已刪除藥材：${updatedProductName}`)).toBeVisible()
  await searchProduct(page, updatedProductName)
  await expect(page.getByText("找不到符合搜尋條件的藥材。")).toBeVisible()
})