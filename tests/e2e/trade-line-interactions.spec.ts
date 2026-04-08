import { expect, test, type Page } from "@playwright/test"

import { login } from "./helpers/auth"

async function expectTradeLineInteractions(
  page: Page,
  route: string,
  lineTestId: string,
  scrollAreaTestId: string
) {
  await page.goto(route)

  const addLineButton = page.getByRole("button", { name: "新增一列" })
  const lines = page.getByTestId(lineTestId)
  const scrollArea = page.getByTestId(scrollAreaTestId)

  await expect(lines).toHaveCount(1)
  await expect(lines.first().getByRole("button", { name: "移除" })).toHaveCount(0)

  for (let index = 0; index < 5; index += 1) {
    await addLineButton.click()
  }

  await expect(lines).toHaveCount(6)
  await expect(lines.first().getByRole("button", { name: "移除" })).toBeVisible()
  await expect(lines.nth(5).getByRole("button", { name: "移除" })).toBeVisible()
  await expect(scrollArea).toBeVisible()
  await expect
    .poll(async () => scrollArea.evaluate((node) => node.scrollTop))
    .toBeGreaterThan(0)
}

test("order and sale line items auto-scroll on append and hide remove when only one line", async ({
  page,
}) => {
  await login(page)

  await expectTradeLineInteractions(page, "/orders/new", "order-line", "order-lines-scroll-area")
  await expectTradeLineInteractions(
    page,
    "/orders/new?type=sale",
    "sale-line",
    "sale-lines-scroll-area"
  )
})