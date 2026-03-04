import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY environment variables');
}

if (supabasePublishableKey.startsWith('sb_secret_')) {
  throw new Error('Invalid frontend key: use a Supabase publishable key in the browser, never a secret key.');
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
