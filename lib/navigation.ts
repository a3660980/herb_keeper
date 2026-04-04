export type AppNavigationItem = {
  title: string
  href: string
  description: string
}

export const mainNavigation: AppNavigationItem[] = [
  {
    title: "儀表板",
    href: "/dashboard",
    description: "查看營運摘要、庫存結構與開發進度。",
  },
  {
    title: "藥材管理",
    href: "/products",
    description: "建立與維護藥材品項、基準售價與低庫存門檻。",
  },
  {
    title: "客戶管理",
    href: "/customers",
    description: "管理客戶分類、聯絡方式與折扣率。",
  },
  {
    title: "訂單出貨",
    href: "/orders",
    description: "建立訂單、追蹤部分出貨與剩餘數量。",
  },
  {
    title: "現場銷貨",
    href: "/sales",
    description: "快速建立 POS 式現場交易並允許售價覆寫。",
  },
  {
    title: "庫存總覽",
    href: "/inventory",
    description: "即時查看庫存、低庫存提示與異動追蹤。",
  },
  {
    title: "報表分析",
    href: "/reports",
    description: "彙整日報、月報、利潤與熱銷品排行。",
  },
]
