import { createClient, type EmailOtpType } from "@supabase/supabase-js"

import {
  getSupabasePublicEnv,
  getSupabaseServiceRoleKey,
} from "../../../lib/supabase/env"

export type E2ECleanupTargets = {
  customerNames?: string[]
  customerPhones?: string[]
  productNames?: string[]
  supplierNames?: string[]
}

const EMAIL_OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]

function getUniqueValues(values?: string[]) {
  return [...new Set(values?.map((value) => value.trim()).filter(Boolean) ?? [])]
}

function collectIds(rows: Array<{ id: string }> | null | undefined) {
  return [...new Set(rows?.map(({ id }) => id) ?? [])]
}

function throwIfError(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`)
  }
}

function isEmailOtpType(value: string): value is EmailOtpType {
  return EMAIL_OTP_TYPES.includes(value as EmailOtpType)
}

function createAdminClient() {
  const { url } = getSupabasePublicEnv()

  return createClient(url, getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function createPublicClient() {
  const { url, publicKey } = getSupabasePublicEnv()

  return createClient(url, publicKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function confirmEmailForE2EUser(email: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
  })

  if (error) {
    throw new Error(
      `Failed to generate E2E email verification link for ${email}: ${error.message}`
    )
  }

  const verificationType = data.properties.verification_type

  if (!isEmailOtpType(verificationType)) {
    throw new Error(
      `Unsupported E2E email verification type for ${email}: ${verificationType}`
    )
  }

  const publicClient = createPublicClient()
  const { error: verifyError } = await publicClient.auth.verifyOtp({
    type: verificationType,
    token_hash: data.properties.hashed_token,
  })

  if (verifyError) {
    throw new Error(
      `Failed to confirm E2E email for ${email}: ${verifyError.message}`
    )
  }

  return verificationType
}

async function loadCustomerIds(supabase: ReturnType<typeof createAdminClient>, targets: E2ECleanupTargets) {
  const customerIds = new Set<string>()
  const customerNames = getUniqueValues(targets.customerNames)
  const customerPhones = getUniqueValues(targets.customerPhones)

  if (customerNames.length > 0) {
    const { data, error } = await supabase
      .from("customers")
      .select("id")
      .in("name", customerNames)

    throwIfError(error, "Failed to load E2E customers by name")

    collectIds(data).forEach((id) => customerIds.add(id))
  }

  if (customerPhones.length > 0) {
    const { data, error } = await supabase
      .from("customers")
      .select("id")
      .in("phone", customerPhones)

    throwIfError(error, "Failed to load E2E customers by phone")

    collectIds(data).forEach((id) => customerIds.add(id))
  }

  return [...customerIds]
}

async function deleteLedgerEntries(
  supabase: ReturnType<typeof createAdminClient>,
  sourceType: "inbound" | "shipment" | "direct_sale" | "adjustment",
  sourceIds: string[]
) {
  if (sourceIds.length === 0) {
    return
  }

  const { error } = await supabase
    .from("inventory_ledger")
    .delete()
    .eq("source_type", sourceType)
    .in("source_id", sourceIds)

  throwIfError(error, `Failed to delete E2E ${sourceType} ledger entries`)
}

export async function cleanupE2EData(targets: E2ECleanupTargets) {
  const supabase = createAdminClient()
  const customerIds = await loadCustomerIds(supabase, targets)

  if (customerIds.length > 0) {
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id")
      .in("customer_id", customerIds)

    throwIfError(ordersError, "Failed to load E2E orders")

    const orderIds = collectIds(orders)

    if (orderIds.length > 0) {
      const { data: shipments, error: shipmentsError } = await supabase
        .from("shipments")
        .select("id")
        .in("order_id", orderIds)

      throwIfError(shipmentsError, "Failed to load E2E shipments")

      const shipmentIds = collectIds(shipments)
      await deleteLedgerEntries(supabase, "shipment", shipmentIds)

      if (shipmentIds.length > 0) {
        const { error: deleteShipmentsError } = await supabase
          .from("shipments")
          .delete()
          .in("id", shipmentIds)

        throwIfError(deleteShipmentsError, "Failed to delete E2E shipments")
      }

      const { error: deleteOrdersError } = await supabase
        .from("orders")
        .delete()
        .in("id", orderIds)

      throwIfError(deleteOrdersError, "Failed to delete E2E orders")
    }

    const { data: directSales, error: directSalesError } = await supabase
      .from("direct_sales")
      .select("id")
      .in("customer_id", customerIds)

    throwIfError(directSalesError, "Failed to load E2E direct sales")

    const directSaleIds = collectIds(directSales)
    await deleteLedgerEntries(supabase, "direct_sale", directSaleIds)

    if (directSaleIds.length > 0) {
      const { error: deleteDirectSalesError } = await supabase
        .from("direct_sales")
        .delete()
        .in("id", directSaleIds)

      throwIfError(deleteDirectSalesError, "Failed to delete E2E direct sales")
    }

    const { error: deleteCustomersError } = await supabase
      .from("customers")
      .delete()
      .in("id", customerIds)

    throwIfError(deleteCustomersError, "Failed to delete E2E customers")
  }

  const productNames = getUniqueValues(targets.productNames)
  let productIds: string[] = []

  if (productNames.length > 0) {
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id")
      .in("name", productNames)

    throwIfError(productsError, "Failed to load E2E products")

    productIds = collectIds(products)
  }

  const supplierNames = getUniqueValues(targets.supplierNames)
  let supplierIds: string[] = []

  if (supplierNames.length > 0) {
    const { data: suppliers, error: suppliersError } = await supabase
      .from("suppliers")
      .select("id")
      .in("name", supplierNames)

    throwIfError(suppliersError, "Failed to load E2E suppliers")

    supplierIds = collectIds(suppliers)
  }

  if (productIds.length > 0 || supplierIds.length > 0) {
    const inboundIds = new Set<string>()
    const inventoryAdjustmentIds = new Set<string>()

    if (productIds.length > 0) {
      const [{ data: inboundsByProduct, error: inboundsByProductError }, { data: adjustments, error: adjustmentsError }] =
        await Promise.all([
          supabase.from("inbounds").select("id").in("product_id", productIds),
          supabase.from("inventory_adjustments").select("id").in("product_id", productIds),
        ])

      throwIfError(inboundsByProductError, "Failed to load E2E inbounds by product")
      throwIfError(adjustmentsError, "Failed to load E2E inventory adjustments")

      collectIds(inboundsByProduct).forEach((id) => inboundIds.add(id))
      collectIds(adjustments).forEach((id) => inventoryAdjustmentIds.add(id))
    }

    if (supplierIds.length > 0) {
      const { data: inboundsBySupplier, error: inboundsBySupplierError } = await supabase
        .from("inbounds")
        .select("id")
        .in("supplier_id", supplierIds)

      throwIfError(inboundsBySupplierError, "Failed to load E2E inbounds by supplier")

      collectIds(inboundsBySupplier).forEach((id) => inboundIds.add(id))
    }

    const resolvedInboundIds = [...inboundIds]
    const resolvedInventoryAdjustmentIds = [...inventoryAdjustmentIds]

    await deleteLedgerEntries(supabase, "inbound", resolvedInboundIds)
    await deleteLedgerEntries(supabase, "adjustment", resolvedInventoryAdjustmentIds)

    if (resolvedInventoryAdjustmentIds.length > 0) {
      const { error: deleteInventoryAdjustmentsError } = await supabase
        .from("inventory_adjustments")
        .delete()
        .in("id", resolvedInventoryAdjustmentIds)

      throwIfError(deleteInventoryAdjustmentsError, "Failed to delete E2E inventory adjustments")
    }

    if (resolvedInboundIds.length > 0) {
      const { error: deleteInboundsError } = await supabase
        .from("inbounds")
        .delete()
        .in("id", resolvedInboundIds)

      throwIfError(deleteInboundsError, "Failed to delete E2E inbounds")
    }

    if (productIds.length > 0) {
      const { error: deleteProductsError } = await supabase
        .from("products")
        .delete()
        .in("id", productIds)

      throwIfError(deleteProductsError, "Failed to delete E2E products")
    }
  }

  if (supplierIds.length > 0) {
      const { error: deleteSuppliersError } = await supabase
        .from("suppliers")
        .delete()
        .in("id", supplierIds)

      throwIfError(deleteSuppliersError, "Failed to delete E2E suppliers")
  }
}