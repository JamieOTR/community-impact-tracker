// PATH: src/services/supabase.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

/*
|--------------------------------------------------------------------------
| Environment Validation
|--------------------------------------------------------------------------
*/

if (!supabaseUrl) {
  throw new Error(
    'Missing VITE_SUPABASE_URL. Add it to your .env file and restart the dev server.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_ANON_KEY. Add it to your .env file and restart the dev server.'
  );
}

/*
|--------------------------------------------------------------------------
| URL Format Validation
|--------------------------------------------------------------------------
*/

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl)) {
  throw new Error(`Invalid VITE_SUPABASE_URL format: ${supabaseUrl}`);
}

/*
|--------------------------------------------------------------------------
| Diagnostic Logging (safe masked output)
|--------------------------------------------------------------------------
*/

console.log('SUPABASE URL IN APP:', supabaseUrl);

console.log(
  'SUPABASE KEY CHECK:',
  `${supabaseAnonKey.slice(0, 10)}...${supabaseAnonKey.slice(-6)} | length=${supabaseAnonKey.length}`
);

/*
|--------------------------------------------------------------------------
| Supabase Client
|--------------------------------------------------------------------------
*/

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});