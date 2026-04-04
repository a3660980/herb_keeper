export type AppNavigationItem = {
  title: string
  href: string
}

export const mainNavigation: AppNavigationItem[] = [
  {
    title: "儀表板",
    href: "/dashboard",
  },
  {
    title: "藥材管理",
    href: "/products",
  },
  {
    title: "客戶管理",
    href: "/customers",
  },
  {
    title: "訂單出貨",
    href: "/orders",
  },
  {
    title: "現場銷貨",
    href: "/sales",
  },
  {
    title: "庫存總覽",
    href: "/inventory",
  },
  {
    title: "報表分析",
    href: "/reports",
  },
]
