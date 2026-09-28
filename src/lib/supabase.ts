import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** null si faltan las variables de entorno (ver .env.example). */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        // PKCE deja el código en ?code= y no choca con la navegación por #/ruta.
        auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true },
      })
    : null;
