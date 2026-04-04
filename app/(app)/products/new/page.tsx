import Link from "next/link"

import { PageIntro } from "@/components/app/page-intro"
import { ProductForm } from "@/components/products/product-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  createProductFormState,
  emptyProductFormValues,
} from "@/lib/features/products"
import { hasSupabaseEnv } from "@/lib/supabase/env"

import { createProductAction } from "../actions"

export default function NewProductPage() {
  const supabaseEnvReady = hasSupabaseEnv()

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Products"
        title="新增藥材"
        description="建立新的藥材品項，基準售價與低庫存門檻會立即進入 Products 列表。平均成本維持由進貨資料自動推算。"
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
            initialState={createProductFormState(emptyProductFormValues)}
            submitLabel={supabaseEnvReady ? "建立藥材" : "資料來源未連接"}
            pendingLabel="建立中..."
          />
        </CardContent>
      </Card>
    </div>
  )
}