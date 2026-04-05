import Link from "next/link"
import { notFound } from "next/navigation"

import { CustomerForm } from "@/components/customers/customer-form"
import { PageIntro } from "@/components/app/page-intro"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  createCustomerFormState,
  customerRecordToFormValues,
  type CustomerRecord,
} from "@/lib/features/customers"
import { createClient } from "@/lib/supabase/server"

import { updateCustomerAction } from "../../actions"

type EditCustomerPageProps = {
  params: Promise<{ id: string }>
}

export default async function EditCustomerPage({ params }: EditCustomerPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone, address, type, discount_rate")
    .eq("id", id)
    .maybeSingle()

  if (error || !data) {
    notFound()
  }

  const customer = data as CustomerRecord
  const boundAction = updateCustomerAction.bind(null, id)

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Customers"
        title={`編輯客戶：${customer.name}`}
        aside={
          <Button asChild variant="outline">
            <Link href="/customers">返回客戶列表</Link>
          </Button>
        }
      />

      <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle>客戶資料編輯</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm
            action={boundAction}
            initialState={createCustomerFormState(customerRecordToFormValues(customer))}
            submitLabel="儲存變更"
            pendingLabel="儲存中..."
          />
        </CardContent>
      </Card>
    </div>
  )
}