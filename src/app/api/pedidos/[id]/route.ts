import { NextRequest, NextResponse } from 'next/server';
import { supabaseServidor } from '@/lib/supabase-servidor';
import { exigirSessaoDoPainel } from '@/lib/autenticacao-painel';
import {
  lerPedidosDoServidor,
  salvarPedidosNoServidor,
} from '@/servicos/armazenamento-pedidos-servidor';

export const dynamic = 'force-dynamic';

const SITUACOES_VALIDAS = new Set([
  'aguardando_pix',
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

    if (!body.situacao || !SITUACOES_VALIDAS.has(body.situacao)) {
      return NextResponse.json(
        { erro: 'Situação de pedido inválida ou não informada' },
        { status: 400 }
      );
    }

    // 1. Busca o pedido para checar loja e situação atual
    let pedidoAtual: any = null;
    try {
      const { data } = await supabaseServidor
        .from('pedidos')
        .select('*')
        .eq('id', params.id)
        .maybeSingle();
      if (data) pedidoAtual = data;
    } catch {}

    if (!pedidoAtual) {
      const pedidosLocais = lerPedidosDoServidor();
      pedidoAtual = pedidosLocais.find((p: any) => p.id === params.id);
    }

    if (pedidoAtual) {
      // Validação de autenticação
      const auth = await exigirSessaoDoPainel(req, pedidoAtual.loja_id);
      if (!auth.autorizado && auth.respostaErro) {
        return auth.respostaErro;
      }

      // Regra: Pedido em aguardando_pix só pode ir para cancelado
      if (
        pedidoAtual.situacao === 'aguardando_pix' &&
        body.situacao !== 'cancelado' &&
        !pedidoAtual.pix_pago
      ) {
        return NextResponse.json(
          {
            erro: 'Pedido aguardando pagamento Pix não pode ser aceito ou preparado antes da confirmação do pagamento.',
          },
          { status: 400 }
        );
      }
    } else {
      // Se nem no banco nem local existe, exige sessão
      const auth = await exigirSessaoDoPainel(req, null);
      if (!auth.autorizado && auth.respostaErro) {
        return auth.respostaErro;
      }
    }

    const agora = new Date().toISOString();

    // 2. Atualiza no Supabase usando o cliente do servidor
    try {
      await supabaseServidor
        .from('pedidos')
        .update({
          situacao: body.situacao,
          atualizado_em: agora,
        })
        .eq('id', params.id);
    } catch (err) {
      console.warn('Falha ao atualizar no Supabase via PATCH API:', err);
    }

    // 3. Atualiza no fallback do servidor local
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
  } catch (e: any) {
    return NextResponse.json({ erro: e?.message || 'Falha ao atualizar pedido' }, { status: 500 });
  }
}
