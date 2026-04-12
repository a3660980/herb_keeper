import Link from "next/link"

import { createInboundBatchAction } from "@/app/(app)/products/inbounds/actions"
import { FormMessage } from "@/components/app/form-message"
import { PageIntro } from "@/components/app/page-intro"
import { BatchInboundForm } from "@/components/inbounds/batch-inbound-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  createInboundBatchFormState,
  type InboundProductOption,
  type InboundSupplierOption,
} from "@/lib/features/inbounds"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

type InventoryProductRow = {
  product_id: string
  product_name: string
  unit: string
  base_price: number | string
  avg_unit_cost: number | string
  ledger_stock_quantity: number | string
}

type SupplierRow = {
  id: string
  name: string
  phone: string | null
  address: string | null
}

export default async function BatchInboundPage() {
  const supabaseEnvReady = hasSupabaseEnv()

  let products: InboundProductOption[] = []
  let suppliers: InboundSupplierOption[] = []
  let loadError = ""

  if (supabaseEnvReady) {
    try {
      const supabase = await createClient()
      const [productsResponse, suppliersResponse] = await Promise.all([
        supabase
          .from("current_inventory_view")
          .select(
            "product_id, product_name, unit, base_price, avg_unit_cost, ledger_stock_quantity"
          )
          .order("product_name"),
        supabase
          .from("suppliers")
          .select("id, name, phone, address")
          .order("name"),
      ])

      if (productsResponse.error) {
        loadError = productsResponse.error.message
      } else if (suppliersResponse.error) {
        loadError = suppliersResponse.error.message
      } else {
        products = ((productsResponse.data ?? []) as InventoryProductRow[]).map(
          (product) => ({
            id: product.product_id,
            name: product.product_name,
            unit: product.unit,
            basePrice: Number(product.base_price ?? 0),
            avgUnitCost: Number(product.avg_unit_cost ?? 0),
            availableStock: Number(product.ledger_stock_quantity ?? 0),
          })
        )
        suppliers = ((suppliersResponse.data ?? []) as SupplierRow[]).map(
          (supplier) => ({
            id: supplier.id,
            name: supplier.name,
            phone: supplier.phone ?? "",
            address: supplier.address ?? "",
          })
        )
      }
    } catch (error) {
      loadError =
        error instanceof Error ? error.message : "無法讀取批次進貨所需資料。"
    }
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Products"
        title="批次進貨"
        description="同一家供應商可一次登錄多種藥材的到貨數量與成本，適合同張採購單或同批到貨作業。"
        aside={
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/products/inbounds/new">單筆進貨</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/products/inbounds">進貨歷史</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/suppliers">供應商管理</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/products">返回藥材庫存管理</Link>
            </Button>
          </div>
        }
      />

      {!supabaseEnvReady ? (
        <FormMessage
          message="尚未連接資料來源，批次進貨暫時無法建立。"
          tone="info"
        />
      ) : loadError ? (
        <FormMessage message={loadError} tone="error" />
      ) : products.length === 0 ? (
        <FormMessage
          message="目前還沒有藥材資料，請先建立至少一筆藥材。"
          tone="info"
        />
      ) : suppliers.length === 0 ? (
        <FormMessage
          message="目前還沒有供應商，可先到供應商管理建立第一筆，或在表單內使用快速新增。"
          tone="info"
        />
      ) : (
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle>批次進貨資料</CardTitle>
          </CardHeader>
          <CardContent>
            <BatchInboundForm
              action={createInboundBatchAction}
              initialState={createInboundBatchFormState()}
              products={products}
              suppliers={suppliers}
              submitLabel="建立批次進貨"
              pendingLabel="建立中..."
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
