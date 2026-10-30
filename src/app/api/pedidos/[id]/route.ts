import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  lerPedidosDoServidor,
  salvarPedidosNoServidor,
} from '@/servicos/armazenamento-pedidos-servidor';

export const dynamic = 'force-dynamic';

const SITUACOES_VALIDAS = new Set([
  'recebido',
  'confirmado',
  'em_preparo',
  'pronto_para_retirada',
  'saiu_para_entrega',
  'entregue',
  'cancelado',
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    // Validação estrita: apenas o campo `situacao` pode ser alterado por este endpoint
    if (!body.situacao || !SITUACOES_VALIDAS.has(body.situacao)) {
      return NextResponse.json(
        { erro: 'Situação de pedido inválida ou não informada' },
        { status: 400 }
      );
    }

    const agora = new Date().toISOString();

    // 1. Atualiza no Supabase se for UUID ou registro no banco
    try {
      await supabase
        .from('pedidos')
        .update({
          situacao: body.situacao,
          atualizado_em: agora,
        })
        .eq('id', params.id);
    } catch (err) {
      console.warn('Falha ao atualizar no Supabase via PATCH API:', err);
    }

    // 2. Atualiza no fallback do servidor local
    const pedidos = lerPedidosDoServidor();
    const idx = pedidos.findIndex((p: any) => p.id === params.id);

    if (idx !== -1) {
      pedidos[idx] = {
        ...pedidos[idx],
        situacao: body.situacao,
        atualizado_em: agora,
      };
      salvarPedidosNoServidor(pedidos);
      return NextResponse.json(pedidos[idx]);
    }

    return NextResponse.json({
      id: params.id,
      situacao: body.situacao,
      atualizado_em: agora,
    });
  } catch (e) {
    return NextResponse.json({ erro: 'Falha ao atualizar pedido' }, { status: 500 });
  }
}
