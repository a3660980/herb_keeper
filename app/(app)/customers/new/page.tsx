import Link from "next/link"

import { CustomerForm } from "@/components/customers/customer-form"
import { PageIntro } from "@/components/app/page-intro"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  createCustomerFormState,
  emptyCustomerFormValues,
} from "@/lib/features/customers"

import { createCustomerAction } from "../actions"

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Customers"
        title="新增客戶"
        description="建立新的客戶資料，電話與客戶類型會用於後續報價、訂單與門市銷售。"
        aside={
          <Button asChild variant="outline">
            <Link href="/customers">返回客戶列表</Link>
          </Button>
        }
      />

      <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle>客戶基本資料</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm
            action={createCustomerAction}
            initialState={createCustomerFormState(emptyCustomerFormValues)}
            submitLabel="建立客戶"
            pendingLabel="建立中..."
          />
        </CardContent>
      </Card>
    </div>
  )
}