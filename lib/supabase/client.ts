import { createBrowserClient } from '@supabase/ssr'

import { getSupabasePublicEnv } from '@/lib/supabase/env'

export function createClient() {
  const { url, publicKey } = getSupabasePublicEnv()

  return createBrowserClient(
    url,
    publicKey
  )
}
