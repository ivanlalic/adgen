import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Cliente público — para usar en el cliente (browser)
// Solo tiene acceso a lo que las RLS policies permitan
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente de servicio — SOLO para usar en API routes (server-side)
// Bypasea RLS, nunca exponer al cliente
export function getServiceClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurada');
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
}
