export type AppNavigationItem = {
  title: string
  href: string
  matchPrefixes?: string[]
}

export const mainNavigation: AppNavigationItem[] = [
  {
    title: "儀表板",
    href: "/dashboard",
  },
  {
    title: "藥材庫存管理",
    href: "/products",
    matchPrefixes: ["/products"],
  },
  {
    title: "客戶管理",
    href: "/customers",
  },
  {
    title: "供應商管理",
    href: "/suppliers",
  },
  {
    title: "交易管理",
    href: "/orders",
    matchPrefixes: ["/orders", "/sales"],
  },
  {
    title: "報表分析",
    href: "/reports",
  },
]
