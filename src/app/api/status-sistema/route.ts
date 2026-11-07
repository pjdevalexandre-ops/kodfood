import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    versao: '2026-11-07-21-55',
    commit: 'verificacao-deploy',
    envServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    envMercadoPago: !!process.env.MERCADO_PAGO_ACCESS_TOKEN,
  });
}
