import { createClient } from '@supabase/supabase-js';

const URL_FALLBACK = 'https://lugpqptvmptynjnokgpr.supabase.co';
const SERVICE_ROLE_FALLBACK =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1Z3BxcHR2bXB0eW5qbm9rZ3ByIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzMzNDEwOCwiZXhwIjoyMTA4OTEwMTA4fQ.KMXfQBKxFHhKC4NL2OcKZHpJ-Nqlx8CQVvF9aNsZCco';

// Sanitiza URLs e chaves removendo aspas e quebras acidentais de copia e cola na Vercel
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || URL_FALLBACK)
  .trim()
  .replace(/^["']|["']$/g, '')
  .replace(/\/$/, '');

const rawKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  SERVICE_ROLE_FALLBACK;

const serviceRoleKey = rawKey
  .trim()
  .replace(/^["']|["']$/g, '');

export const supabaseServidor = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
