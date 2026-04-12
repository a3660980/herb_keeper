import { expect, test } from "@playwright/test"

import { login } from "./helpers/auth"
import { runWithE2ECleanup } from "./helpers/cleanup"
import { createUniquePhone, createUniqueSuffix } from "./helpers/factories"
import { createCustomer } from "./helpers/operations"

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitFullscreenEnabled?: boolean
}

async function isFullscreenActive(page: Parameters<typeof test>[0]["page"]) {
  return page.evaluate(() => {
    const doc = document as FullscreenDocument

    return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement)
  })
}

test("customer search keeps fullscreen mode after submitting filters", async ({ page }) => {
  const suffix = createUniqueSuffix()
  const customerName = `Fullscreen 客戶 ${suffix}`
  const customerPhone = createUniquePhone()

  await runWithE2ECleanup(
    async () => {
      await login(page)
      await createCustomer(page, {
        name: customerName,
        phone: customerPhone,
      })

      const fullscreenSupported = await page.evaluate(() => {
        const doc = document as FullscreenDocument
        const element = document.documentElement

        return Boolean(
          doc.fullscreenEnabled ||
            doc.webkitFullscreenEnabled ||
            element.requestFullscreen
        )
      })

      test.skip(!fullscreenSupported, "Current browser does not support the Fullscreen API.")

      await page.goto("/customers")

      const fullscreenToggle = page.getByRole("button", { name: "進入全螢幕" })
      await expect(fullscreenToggle).toBeVisible()
      await fullscreenToggle.click()

      await expect.poll(() => isFullscreenActive(page)).toBe(true)

      await page.getByPlaceholder("搜尋客戶名稱或電話").fill(customerName)
      await page.getByRole("button", { name: "搜尋" }).click()

      await expect(page).toHaveURL(/\/customers(?:\?.*)?$/)
      await expect
        .poll(() => new URL(page.url()).searchParams.get("q"))
        .toBe(customerName)
      await expect.poll(() => isFullscreenActive(page)).toBe(true)
      await expect(page.getByRole("cell", { name: customerName })).toBeVisible()

      await page.getByRole("button", { name: "離開全螢幕" }).click()
      await expect.poll(() => isFullscreenActive(page)).toBe(false)
    },
    {
      customerNames: [customerName],
      customerPhones: [customerPhone],
    }
  )
})