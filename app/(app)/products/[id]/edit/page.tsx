import Link from "next/link"
import { notFound } from "next/navigation"

import { PageIntro } from "@/components/app/page-intro"
import { ProductForm } from "@/components/products/product-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  createProductFormState,
  productRecordToFormValues,
  type ProductRecord,
} from "@/lib/features/products"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

import { updateProductAction } from "../../actions"

type EditProductPageProps = {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params
  const supabaseEnvReady = hasSupabaseEnv()

  if (!supabaseEnvReady) {
    notFound()
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("products")
    .select("id, name, base_price, low_stock_threshold, unit")
    .eq("id", id)
    .maybeSingle()

  if (error || !data) {
    notFound()
  }

  const product = data as ProductRecord
  const boundAction = updateProductAction.bind(null, id)

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Products"
        title={`編輯藥材：${product.name}`}
        description="更新藥材名稱、基準售價與低庫存門檻。平均成本與實際庫存仍由交易與進貨流程控制。"
        aside={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/products">返回藥材列表</Link>
            </Button>
          </div>
        }
      />

      <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle>藥材資料編輯</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm
            action={boundAction}
            initialState={createProductFormState(productRecordToFormValues(product))}
            submitLabel="儲存變更"
            pendingLabel="儲存中..."
          />
        </CardContent>
      </Card>
    </div>
  )
}