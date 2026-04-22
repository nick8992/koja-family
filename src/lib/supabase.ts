import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cached: SupabaseClient | null = null;

/**
 * Server-side Supabase client using the service_role key. Never ship this
 * key or this client to the browser; imports are gated by `server-only`.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  if (!url) throw new Error('SUPABASE_URL is not set');
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  cached = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}

export const PROFILE_PHOTOS_BUCKET = 'profile-photos';
