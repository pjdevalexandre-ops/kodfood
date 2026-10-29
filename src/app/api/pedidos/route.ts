import { NextRequest, NextResponse } from 'next/server';
import {
  lerPedidosDoServidor,
  salvarPedidosNoServidor,
} from '@/servicos/armazenamento-pedidos-servidor';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const lojaId = req.nextUrl.searchParams.get('loja_id');
  const pedidos = lerPedidosDoServidor();
  const filtrados = lojaId
    ? pedidos.filter((p: any) => p.loja_id === lojaId)
    : pedidos;
  return NextResponse.json(filtrados);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pedidos = lerPedidosDoServidor();
    pedidos.unshift(body); // mais recente primeiro
    salvarPedidosNoServidor(pedidos);
    return NextResponse.json(
      {
        pedido_id: body.id,
        numero: body.numero,
        codigo_acompanhamento: body.codigo_acompanhamento,
        total_centavos: body.total_centavos,
      },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json({ erro: 'Falha ao salvar pedido' }, { status: 500 });
  }
}
