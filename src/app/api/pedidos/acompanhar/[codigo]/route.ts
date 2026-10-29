import { NextRequest, NextResponse } from 'next/server';
import { lerPedidosDoServidor } from '@/servicos/armazenamento-pedidos-servidor';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { codigo: string } }
) {
  const pedidos = lerPedidosDoServidor();
  const pedido = pedidos.find((p: any) => p.codigo_acompanhamento === params.codigo);
  if (!pedido) {
    return NextResponse.json(null, { status: 404 });
  }
  return NextResponse.json(pedido);
}
