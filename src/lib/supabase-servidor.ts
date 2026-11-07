import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    '[Supabase Servidor] AVISO: SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente. Operações administrativas de webhook e pagamentos podem sofrer bloqueio de RLS.'
  );
}

export const supabaseServidor = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
