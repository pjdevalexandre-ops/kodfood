import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { lerPedidosDoServidor } from '@/servicos/armazenamento-pedidos-servidor';
import { processarTransacaoPix } from '@/servicos/confirmacao-pagamento';

export const dynamic = 'force-dynamic';

function extrairMetaDescricao(descricao: string | null): Record<string, any> {
  if (!descricao) return {};
  const match = descricao.match(/<!--kodfood_meta:([\s\S]*?)-->/);
  if (!match) return {};
  try {
    return JSON.parse(match[1]);
  } catch {
    return {};
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { codigo: string } }
) {
  // 1. Tenta buscar no Supabase
  try {
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        lojas ( nome, link, telefone_whatsapp, cor_principal, endereco, chave_pix, nome_titular_pix, descricao ),
        pedido_itens (
          id, nome_produto, quantidade, preco_unitario_centavos, observacao,
          pedido_item_adicionais ( id, nome_adicional, preco_centavos )
        )
      `)
      .eq('codigo_acompanhamento', params.codigo)
      .maybeSingle();

    if (!error && data) {
      // Se for PIX, não estiver pago e estiver aguardando, confere diretamente no Mercado Pago
      if (
        data.forma_pagamento === 'pix' &&
        !data.pix_pago &&
        data.pix_id_transacao &&
        data.situacao === 'aguardando_pix'
      ) {
        let tokenLoja: string | null = null;
        if (data.lojas?.descricao) {
          const meta = extrairMetaDescricao(data.lojas.descricao);
          tokenLoja = meta.mercado_pago_access_token || null;
        }

        try {
          const resVerificacao = await processarTransacaoPix(data.pix_id_transacao, tokenLoja, data);
          if (resVerificacao.pago) {
            data.pix_pago = true;
            data.situacao = 'recebido';
          }
        } catch (e) {
          console.warn('[Acompanhar] Falha na conferência de PIX ativo:', e);
        }
      }

      // Sanitiza referencia caso tenha JSON legado gravado por versões antigas
      let referenciaSanitizada = data.referencia;
      if (referenciaSanitizada && typeof referenciaSanitizada === 'string' && referenciaSanitizada.trim().startsWith('{')) {
        referenciaSanitizada = null;
      }

      const formatado = {
        ...data,
        referencia: referenciaSanitizada,
        itens: (data.pedido_itens || []).map((it: any) => ({
          ...it,
          adicionais: it.pedido_item_adicionais || [],
        })),
      };
      return NextResponse.json(formatado);
    }
  } catch (err) {
    console.warn('Erro ao consultar acompanhamento no Supabase via API:', err);
  }

  // 2. Fallback de servidor local
  const pedidos = lerPedidosDoServidor();
  const pedido = pedidos.find((p: any) => p.codigo_acompanhamento === params.codigo);
  if (!pedido) {
    return NextResponse.json(null, { status: 404 });
  }

  if (pedido.referencia && typeof pedido.referencia === 'string' && pedido.referencia.trim().startsWith('{')) {
    pedido.referencia = null;
  }

  return NextResponse.json(pedido);
}
