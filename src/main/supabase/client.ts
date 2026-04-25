import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    const url = import.meta.env.SUPABASE_URL as string;
    const key = import.meta.env.SUPABASE_ANON_KEY as string;
    if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env');
    _client = createClient(url, key);
  }
  return _client;
}
