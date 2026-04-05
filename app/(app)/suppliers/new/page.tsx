import Link from "next/link"

import { PageIntro } from "@/components/app/page-intro"
import { SupplierForm } from "@/components/suppliers/supplier-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  createSupplierFormState,
  emptySupplierFormValues,
} from "@/lib/features/suppliers"

import { createSupplierAction } from "../actions"

export default function NewSupplierPage() {
  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Suppliers"
        title="新增供應商"
        aside={
          <Button asChild variant="outline">
            <Link href="/suppliers">返回供應商列表</Link>
          </Button>
        }
      />

      <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle>供應商基本資料</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplierForm
            action={createSupplierAction}
            initialState={createSupplierFormState(emptySupplierFormValues)}
            submitLabel="建立供應商"
            pendingLabel="建立中..."
          />
        </CardContent>
      </Card>
    </div>
  )
}