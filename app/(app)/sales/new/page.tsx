import { redirect } from "next/navigation"

export default async function NewDirectSalePage() {
  redirect("/orders/new?type=sale")
}