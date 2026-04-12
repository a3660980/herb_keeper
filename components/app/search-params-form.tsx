"use client"

import type { ComponentProps } from "react"
import { startTransition } from "react"
import { usePathname, useRouter } from "next/navigation"

type SearchParamsFormProps = Omit<ComponentProps<"form">, "method"> & {
  action?: string
}

function buildSearchHref(pathname: string, formData: FormData) {
  const params = new URLSearchParams()

  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string" || value.length === 0) {
      continue
    }

    params.append(key, value)
  }

  const search = params.toString()

  return search ? `${pathname}?${search}` : pathname
}

export function SearchParamsForm({
  action,
  onSubmit,
  ...props
}: SearchParamsFormProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSubmit: NonNullable<ComponentProps<"form">["onSubmit"]> = (event) => {
    onSubmit?.(event)

    if (event.defaultPrevented) {
      return
    }

    event.preventDefault()

    const href = buildSearchHref(action ?? pathname, new FormData(event.currentTarget))

    startTransition(() => {
      router.push(href, { scroll: false })
    })
  }

  return <form method="get" action={action ?? pathname} onSubmit={handleSubmit} {...props} />
}