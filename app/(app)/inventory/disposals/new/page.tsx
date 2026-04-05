import Link from "next/link"

import { createInventoryDisposalAction } from "@/app/(app)/inventory/disposals/actions"
import { FormMessage } from "@/components/app/form-message"
import { PageIntro } from "@/components/app/page-intro"
import { InventoryDisposalForm } from "@/components/inventory/inventory-disposal-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  createInventoryDisposalFormState,
  type InventoryDisposalProductOption,
} from "@/lib/features/inventory-disposals"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"
import { getSingleSearchParam } from "@/lib/url"

type NewInventoryDisposalPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

type InventoryProductRow = {
  product_id: string
  product_name: string
  unit: string
  base_price: number | string
  avg_unit_cost: number | string
  ledger_stock_quantity: number | string
  is_low_stock: boolean
}

export default async function NewInventoryDisposalPage({
  searchParams,
}: NewInventoryDisposalPageProps) {
  const params = await searchParams
  const selectedProductId = getSingleSearchParam(params.productId)?.trim() ?? ""
  const supabaseEnvReady = hasSupabaseEnv()

  let products: InventoryDisposalProductOption[] = []
  let loadError = ""

  if (supabaseEnvReady) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from("current_inventory_view")
        .select(
          "product_id, product_name, unit, base_price, avg_unit_cost, ledger_stock_quantity, is_low_stock"
        )
        .order("product_name")

      if (error) {
        loadError = error.message
      } else {
        products = ((data ?? []) as InventoryProductRow[])
          .map((product) => ({
            id: product.product_id,
            name: product.product_name,
            unit: product.unit,
            basePrice: Number(product.base_price ?? 0),
            avgUnitCost: Number(product.avg_unit_cost ?? 0),
            availableStock: Number(product.ledger_stock_quantity ?? 0),
            isLowStock: Boolean(product.is_low_stock),
          }))
          .filter((product) => product.availableStock > 0)
      }
    } catch (error) {
      loadError = error instanceof Error ? error.message : "無法讀取減損所需資料。"
    }
  }

  const hasSelectedProduct = products.some((product) => product.id === selectedProductId)

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Inventory"
        title="新增庫存減損"
        description="記錄天災、品質毀損、退貨等非銷售性庫存減量，系統會同步寫入減損歷史與帳面庫存。"
        aside={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/inventory/disposals">減損歷史</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/inventory">返回庫存總覽</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/products">返回藥材管理</Link>
            </Button>
          </div>
        }
      />

      {!supabaseEnvReady ? (
        <FormMessage message="尚未連接資料來源，庫存減損暫時無法建立。" tone="info" />
      ) : loadError ? (
        <FormMessage message={loadError} tone="error" />
      ) : products.length === 0 ? (
        <FormMessage
          message="目前沒有可減損的帳面庫存，請先建立進貨或確認庫存資料。"
          tone="info"
        />
      ) : (
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle>減損資料</CardTitle>
          </CardHeader>
          <CardContent>
            <InventoryDisposalForm
              action={createInventoryDisposalAction}
              initialState={createInventoryDisposalFormState({
                productId: hasSelectedProduct ? selectedProductId : "",
              })}
              products={products}
              submitLabel="建立減損紀錄"
              pendingLabel="建立中..."
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}