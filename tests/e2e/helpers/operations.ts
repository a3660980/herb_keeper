import { expect, type Page } from "@playwright/test"

export async function createCustomer(page: Page, customer: {
  name: string
  phone: string
  address?: string
  type?: "general" | "vip" | "wholesale"
  discountRate?: string
}) {
  await page.goto("/customers/new")
  await page.getByLabel("客戶名稱").fill(customer.name)
  await page.getByLabel("聯絡電話").fill(customer.phone)

  if (customer.address) {
    await page.getByLabel("地址").fill(customer.address)
  }

  if (customer.type) {
    await page.getByLabel("客戶類型").selectOption(customer.type)
  }

  if (customer.discountRate) {
    await page.getByLabel("折扣倍率").fill(customer.discountRate)
  }

  await page.getByRole("button", { name: "建立客戶" }).click()
  await expect(page).toHaveURL(/\/customers\?status=/)
  await expect(page.getByText(`已建立客戶：${customer.name}`)).toBeVisible()
}

export async function createSupplier(page: Page, supplier: {
  name: string
  phone?: string
  address?: string
  note?: string
}) {
  await page.goto("/suppliers/new")
  await page.getByLabel("供應商名稱").fill(supplier.name)

  if (supplier.phone) {
    await page.getByLabel("聯絡電話").fill(supplier.phone)
  }

  if (supplier.address) {
    await page.getByLabel("地址").fill(supplier.address)
  }

  if (supplier.note) {
    await page.getByLabel("備註").fill(supplier.note)
  }

  await page.getByRole("button", { name: "建立供應商" }).click()
  await expect(page).toHaveURL(/\/suppliers\?status=/)
  await expect(page.getByText(`已建立供應商：${supplier.name}`)).toBeVisible()
}

export async function createProduct(page: Page, product: {
  name: string
  basePrice: string
  lowStockThreshold: string
}) {
  await page.goto("/products/new")
  await page.getByLabel("藥材名稱").fill(product.name)
  await page.getByLabel("基準售價").fill(product.basePrice)
  await page.getByLabel("低庫存門檻").fill(product.lowStockThreshold)
  await page.getByRole("button", { name: "建立藥材" }).click()
  await expect(page).toHaveURL(/\/products\?status=/)
  await expect(page.getByText(`已建立藥材：${product.name}`)).toBeVisible()
}

export async function searchCustomer(page: Page, keyword: string) {
  await page.goto("/customers")
  await page.getByPlaceholder("搜尋客戶名稱或電話").fill(keyword)
  await page.getByRole("button", { name: "搜尋" }).click()
}

export async function searchProduct(page: Page, keyword: string) {
  await page.goto("/products")
  await page.getByPlaceholder("搜尋藥材名稱").fill(keyword)
  await page.getByRole("button", { name: "搜尋" }).click()
}