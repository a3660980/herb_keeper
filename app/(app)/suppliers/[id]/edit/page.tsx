import Link from "next/link"
import { notFound } from "next/navigation"

import { PageIntro } from "@/components/app/page-intro"
import { SupplierForm } from "@/components/suppliers/supplier-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  createSupplierFormState,
  supplierRecordToFormValues,
  type SupplierRecord,
} from "@/lib/features/suppliers"
import { createClient } from "@/lib/supabase/server"

import { updateSupplierAction } from "../../actions"

type EditSupplierPageProps = {
  params: Promise<{ id: string }>
}

export default async function EditSupplierPage({ params }: EditSupplierPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, phone, address, note")
    .eq("id", id)
    .maybeSingle()

  if (error || !data) {
    notFound()
  }

  const supplier = data as SupplierRecord
  const boundAction = updateSupplierAction.bind(null, id)

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Suppliers"
        title={`編輯供應商：${supplier.name}`}
        aside={
          <Button asChild variant="outline">
            <Link href="/suppliers">返回供應商列表</Link>
          </Button>
        }
      />

      <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle>供應商資料編輯</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplierForm
            action={boundAction}
            initialState={createSupplierFormState(supplierRecordToFormValues(supplier))}
            submitLabel="儲存變更"
            pendingLabel="儲存中..."
          />
        </CardContent>
      </Card>
    </div>
  )
}