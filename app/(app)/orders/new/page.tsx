import { getSingleSearchParam } from "@/lib/url"
import type { TradeKind } from "@/lib/features/trades"

import { TradeCreatePage } from "@/components/app/trade-create-page"

type NewOrderPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function NewOrderPage({ searchParams }: NewOrderPageProps) {
  const params = await searchParams
  const selectedType = getSingleSearchParam(params.type)
  const initialMode: TradeKind = selectedType === "sale" ? "sale" : "order"

  return <TradeCreatePage initialMode={initialMode} />
}