import { NextResponse } from 'next/server';
import { supabaseServidor } from '@/lib/supabase-servidor';

export const dynamic = 'force-dynamic';

export async function GET() {
  const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  let dbStatus = 'pendente';
  let dbErro = null;

  try {
    const { count, error } = await supabaseServidor
      .from('pedidos')
      .select('*', { count: 'exact', head: true });

    if (error) {
      dbStatus = 'erro';
      dbErro = error.message;
    } else {
      dbStatus = 'conectado';
    }
  } catch (e: any) {
    dbStatus = 'excecao';
    dbErro = e?.message;
  }

  return NextResponse.json({
    status: 'ok',
    dbStatus,
    dbErro,
    keyPrefix: envKey ? envKey.substring(0, 10) + '...' : 'nao-definido',
    keyLength: envKey.length,
    envMercadoPago: !!process.env.MERCADO_PAGO_ACCESS_TOKEN,
  });
}
