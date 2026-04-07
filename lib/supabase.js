import { createClient } from '@supabase/supabase-js'

// Client admin (service role) — uniquement côté serveur (API routes)
// Ne jamais exposer cette clé côté client !
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}
