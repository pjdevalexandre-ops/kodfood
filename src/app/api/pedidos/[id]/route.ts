import { NextRequest, NextResponse } from 'next/server';
import {
  lerPedidosDoServidor,
  salvarPedidosNoServidor,
} from '@/servicos/armazenamento-pedidos-servidor';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const pedidos = lerPedidosDoServidor();
    const idx = pedidos.findIndex((p: any) => p.id === params.id);
    if (idx === -1) {
      return NextResponse.json({ erro: 'Pedido não encontrado' }, { status: 404 });
    }
    pedidos[idx] = {
      ...pedidos[idx],
      ...body,
      atualizado_em: new Date().toISOString(),
    };
    salvarPedidosNoServidor(pedidos);
    return NextResponse.json(pedidos[idx]);
  } catch (e) {
    return NextResponse.json({ erro: 'Falha ao atualizar pedido' }, { status: 500 });
  }
}
