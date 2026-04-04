import { cn } from "@/lib/utils"

type FormMessageProps = {
  message: string
  tone?: "success" | "error" | "info"
  className?: string
}

const toneClassNames: Record<NonNullable<FormMessageProps["tone"]>, string> = {
  success:
    "border-emerald-500/18 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100",
  error: "border-destructive/18 bg-destructive/10 text-destructive",
  info: "border-border/70 bg-card/82 text-foreground",
}

export function FormMessage({
  message,
  tone = "info",
  className,
}: FormMessageProps) {
  return (
    <div
      className={cn(
        "rounded-[1.5rem] border px-4 py-3.5 text-sm leading-6 shadow-sm",
        toneClassNames[tone],
        className
      )}
    >
      {message}
    </div>
  )
}