import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  lerPedidosDoServidor,
  salvarPedidosNoServidor,
} from '@/servicos/armazenamento-pedidos-servidor';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const lojaId = req.nextUrl.searchParams.get('loja_id');

  // 1. Tenta buscar direto do Supabase
  if (lojaId) {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          pedido_itens (
            id, pedido_id, produto_id, nome_produto, preco_unitario_centavos, quantidade, observacao,
            pedido_item_adicionais (
              id, item_id, adicional_id, nome_adicional, preco_centavos
            )
          )
        `)
        .eq('loja_id', lojaId)
        .order('feito_em', { ascending: false });

      if (!error && Array.isArray(data)) {
        const mapeados = data.map((p: any) => ({
          ...p,
          itens: (p.pedido_itens || []).map((it: any) => ({
            ...it,
            adicionais: it.pedido_item_adicionais || [],
          })),
        }));
        return NextResponse.json(mapeados);
      }
    } catch (err) {
      console.warn('Erro ao buscar pedidos no Supabase pela API:', err);
    }
  }

  // 2. Fallback de arquivo local se Supabase não retornar
  const pedidos = lerPedidosDoServidor();
  const filtrados = lojaId
    ? pedidos.filter((p: any) => p.loja_id === lojaId)
    : pedidos;
  return NextResponse.json(filtrados);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Se o pedido possui loja_id em formato UUID e itens estruturados, chama a RPC criar_pedido
    const ehUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.loja_id || '');
    if (ehUuid && Array.isArray(body.itens) && body.itens.length > 0) {
      try {
        const payloadItens = body.itens.map((it: any) => ({
          produto_id: it.produto_id,
          quantidade: it.quantidade,
          observacao: it.observacao?.trim() || null,
          adicionais: it.adicionais || [],
        }));

        const { data: rpcRes, error: rpcErr } = await supabase.rpc('criar_pedido', {
          p_loja_id: body.loja_id,
          p_nome: body.nome_cliente || body.nome,
          p_telefone: body.telefone_cliente || body.telefone,
          p_tipo: body.tipo,
          p_pagamento: body.forma_pagamento || body.pagamento,
          p_itens: payloadItens,
          p_bairro_id: body.bairro_id || null,
          p_rua: body.rua || null,
          p_numero_casa: body.numero_casa || null,
          p_complemento: body.complemento || null,
          p_referencia: body.referencia || null,
          p_troco_para_centavos: body.troco_para_centavos || null,
          p_observacao: body.observacao || null,
        });

        if (!rpcErr && rpcRes) {
          return NextResponse.json(rpcRes, { status: 201 });
        }
      } catch (err) {
        console.warn('RPC via API falhou, continuando para fallback:', err);
      }
    }

    // Fallback de memória/JSON local
    const pedidos = lerPedidosDoServidor();
    pedidos.unshift(body);
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
