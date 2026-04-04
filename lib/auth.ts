export const appRoleLabels = {
  admin: "管理員",
  operator: "操作員",
  viewer: "唯讀",
} as const

export type AppRole = keyof typeof appRoleLabels

export type ProfileSummary = {
  id: string
  email: string
  full_name: string | null
  role: AppRole
  is_active: boolean
}