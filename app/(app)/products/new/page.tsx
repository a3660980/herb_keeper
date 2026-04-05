import Link from "next/link"

import { PageIntro } from "@/components/app/page-intro"
import { ProductForm } from "@/components/products/product-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  createProductFormState,
  emptyProductFormValues,
  type ProductUnitRecord,
} from "@/lib/features/products"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

import { createProductAction } from "../actions"

export default async function NewProductPage() {
  const supabaseEnvReady = hasSupabaseEnv()
  let units: ProductUnitRecord[] = []

  if (supabaseEnvReady) {
    try {
      const supabase = await createClient()
      const { data } = await supabase.from("product_units").select("id, name").order("name")

      units = (data ?? []) as ProductUnitRecord[]
    } catch {
      units = []
    }
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Products"
        title="新增藥材"
        aside={
          <Button asChild variant="outline">
            <Link href="/products">返回藥材列表</Link>
          </Button>
        }
      />

      <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle>藥材基本資料</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm
            action={createProductAction}
            initialState={createProductFormState({
              ...emptyProductFormValues,
              unit: units[0]?.name ?? "",
            })}
            units={units}
            submitLabel={supabaseEnvReady ? "建立藥材" : "資料來源未連接"}
            pendingLabel="建立中..."
          />
        </CardContent>
      </Card>
    </div>
  )
}