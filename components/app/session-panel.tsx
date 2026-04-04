import { signOutAction } from "@/app/auth/actions"
import { appRoleLabels, type ProfileSummary } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export async function SessionPanel() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active")
    .eq("id", user.id)
    .maybeSingle()

  const sessionProfile = profile as ProfileSummary | null
  const title = sessionProfile?.full_name || user.email || "已登入使用者"
  const subtitle = user.email ?? sessionProfile?.email ?? ""

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="hidden min-w-0 text-right sm:block">
        <div className="truncate text-sm font-medium text-foreground">{title}</div>
        <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
      </div>

      {sessionProfile ? (
        <Badge variant="outline" className="hidden bg-card/70 sm:inline-flex">
          {appRoleLabels[sessionProfile.role]}
        </Badge>
      ) : null}

      <form action={signOutAction}>
        <Button variant="outline" size="sm" type="submit">
          登出
        </Button>
      </form>
    </div>
  )
}