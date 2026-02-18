// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

// Fail fast: no fallbacks.
if (!supabaseUrl) throw new Error('Missing VITE_SUPABASE_URL. Set it in your .env file.');
if (!supabaseAnonKey) throw new Error('Missing VITE_SUPABASE_ANON_KEY. Set it in your .env file.');

// Basic sanity check
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl)) {
  throw new Error(`Invalid VITE_SUPABASE_URL format: ${supabaseUrl}`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
