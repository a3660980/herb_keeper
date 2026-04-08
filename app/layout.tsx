import type { Metadata } from "next"
import { Noto_Sans_TC } from "next/font/google"
import { Suspense } from "react"
import { Toaster } from "sonner"

import "./globals.css"
import { ToastNotification } from "@/components/app/toast-notification"
import { consumeFlashError, consumeFlashSuccess } from "@/lib/flash"
import { getSiteUrl } from "@/lib/site-url"
import { cn } from "@/lib/utils"

const bodyFont = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-body",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "HerbKeeper | 中藥行進銷存系統",
    template: "%s | HerbKeeper",
  },
  description:
    "HerbKeeper 是為中藥行設計的 Web-based 進銷存系統，支援藥材管理、訂單部分出貨、現場銷貨與營運報表。",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const flashError = await consumeFlashError()
  const flashSuccess = await consumeFlashSuccess()

  return (
    <html
      lang="zh-Hant"
      className={cn(
        "min-h-full bg-background text-foreground antialiased",
        bodyFont.variable
      )}
    >
      <body className="min-h-screen">
        <Suspense>
          <ToastNotification flashError={flashError} flashSuccess={flashSuccess} />
        </Suspense>
        <Toaster position="top-right" duration={5000} richColors closeButton />
        {children}
      </body>
    </html>
  )
}
