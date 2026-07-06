import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";

/**
 * Service-role client. Bypasses RLS — use ONLY inside server code paths that
 * have already verified the caller (e.g. the ingestion pipeline, admin ops).
 */
export function createAdminClient(): SupabaseClient {
  const pub = publicEnv();
  const srv = serverEnv();
  return createSupabaseClient(pub.NEXT_PUBLIC_SUPABASE_URL, srv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
