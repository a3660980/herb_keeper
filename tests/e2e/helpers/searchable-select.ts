import { type Locator, type Page } from "@playwright/test"

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

type SelectSearchableOptionParams = {
  trigger: Locator
  searchPlaceholder: string
  query: string
  optionName: string
}

export async function selectSearchableOption(
  page: Page,
  params: SelectSearchableOptionParams
) {
  const { trigger, searchPlaceholder, query, optionName } = params

  await trigger.click()
  await page.getByPlaceholder(searchPlaceholder).fill(query)
  await page
    .getByRole("option", { name: new RegExp(escapeRegExp(optionName)) })
    .click()
}