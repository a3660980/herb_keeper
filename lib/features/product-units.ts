import { z } from "zod"

export const productUnitFormSchema = z.object({
  name: z.string().trim().min(1, "請輸入單位名稱").max(20, "單位名稱不可超過 20 字"),
})

export type ProductUnitPayload = z.output<typeof productUnitFormSchema>

export type ProductUnitFormValues = {
  name: string
}

export type ProductUnitFormState = {
  message: string
  fieldErrors: Partial<Record<keyof ProductUnitFormValues, string>>
  values: ProductUnitFormValues
  createdUnit: { id: string; name: string } | null
}

export const emptyProductUnitFormValues: ProductUnitFormValues = {
  name: "",
}

export function createProductUnitFormState(
  values: Partial<ProductUnitFormValues> = {},
  message = "",
  createdUnit: { id: string; name: string } | null = null
): ProductUnitFormState {
  return {
    message,
    fieldErrors: {},
    values: {
      ...emptyProductUnitFormValues,
      ...values,
    },
    createdUnit,
  }
}

export function readProductUnitFormValues(formData: FormData): ProductUnitFormValues {
  return {
    name: String(formData.get("name") ?? ""),
  }
}

export function getProductUnitFieldErrors(error: z.ZodError<ProductUnitPayload>) {
  const fieldErrors = error.flatten().fieldErrors

  return {
    name: fieldErrors.name?.[0],
  } satisfies Partial<Record<keyof ProductUnitFormValues, string>>
}